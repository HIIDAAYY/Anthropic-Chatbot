/**
 * DEMO — Hubungkan bot ke WhatsApp lewat SCAN QR (tanpa Twilio, tanpa approval Meta).
 *
 * Pakai whatsapp-web.js (di balik layar memakai puppeteer yang sudah terinstall).
 * Cukup scan QR sekali dengan WhatsApp di HP, lalu setiap pesan masuk diteruskan
 * ke endpoint /api/chat lokal dan balasan bot dikirim balik ke WhatsApp.
 *
 * Jalankan di terminal KEDUA (sementara `npm run dev` jalan di terminal pertama):
 *   npx tsx scripts/whatsapp-qr.ts
 *
 * ⚠️  CATATAN: ini koneksi WhatsApp TIDAK RESMI (melanggar ToS WhatsApp).
 * Aman untuk demo cepat, tapi JANGAN pakai nomor yang tidak siap di-banned.
 *
 * Hapus demo: hapus file ini + folder `.wwebjs_auth` dan `.wwebjs_cache`.
 */

import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import pkg from "whatsapp-web.js";
import qrcode from "qrcode-terminal";

const { Client, LocalAuth } = pkg;

// Load .env.local (untuk ANTHROPIC_API_KEY, DATABASE_URL, PINECONE_API_KEY, dll
// — tapi itu dipakai oleh server `npm run dev`, bukan langsung oleh script ini).
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: resolve(__dirname, "../.env.local"), override: true });

// Endpoint chat LOKAL. Sengaja TIDAK pakai NEXT_PUBLIC_BASE_URL (yang menunjuk
// ke Vercel) supaya script ini bicara ke server dev di laptop kamu.
const CHAT_API =
  (process.env.CHAT_BASE_URL || "http://localhost:3000") + "/api/chat";

const MODEL = "claude-haiku-4-5-20251001"; // Haiku = balasan cepat

// ── PENGAMAN ANTI-SALAH-KIRIM ──────────────────────────────────────────────
// PENTING: bot ini membalas SETIAP pesan masuk ke nomor yang di-scan. Kalau
// nomor itu punya chat asli (mis. nomor yang kamu pakai menghubungi klinik),
// bot bisa otomatis membalas mereka. Dua pengaman di bawah mencegah itu.

// 1) Hanya balas pesan yang masuk SETELAH bot menyala — jangan sentuh backlog
//    inbox lama (penyebab "tiba-tiba kirim WA ke banyak klinik").
let botStartedAt = Math.floor(Date.now() / 1000); // detik epoch, di-set ulang saat "ready"

// 2) Allowlist (SANGAT disarankan): kalau di-isi, bot HANYA membalas nomor ini.
//    Set di .env.local, mis: WA_ALLOWLIST="6281234567890,6285161220535"
//    Kosong = balas semua (hanya aman kalau nomor bot benar-benar nomor baru).
const ALLOWLIST = (process.env.WA_ALLOWLIST || "")
  .split(",")
  .map((s) => s.replace(/\D/g, ""))
  .filter(Boolean);

// ── MULTI-KLINIK DI SATU NOMOR ─────────────────────────────────────────────
// Satu nomor WhatsApp melayani banyak klinik. Karena di WhatsApp tidak ada
// `?clinicId=` seperti di web, klinik dipilih lewat KATA KUNCI pada pesan
// pertama (lihat link wa.me di scripts/generate-wa-links). Setelah terdeteksi,
// pilihan dikunci per-pengirim sampai dia mengetik "ganti klinik".
interface ClinicRoute {
  id: string;
  name: string;
  patterns: RegExp[];
}

const CLINICS: ClinicRoute[] = [
  { id: "ira-skincare", name: "dr. Ira Skin Care & Slimming", patterns: [/\bira\b/] },
  { id: "beauty-palace", name: "Beauty Palace Aesthetic & Hair Transplant", patterns: [/beauty\s*palace/, /\bpalace\b/] },
  { id: "drkhe-co", name: "dr. Khé & Co", patterns: [/\bkh[eé]\b/, /khe\s*&?\s*co/, /khenco/] },
  { id: "estetika-dental", name: "Estetika Dental Clinic", patterns: [/estetika/, /\bdental\b/] },
  { id: "eva-mulia", name: "Eva Mulia Clinic", patterns: [/eva\s*mulia/, /\beva\b/] },
];

// Kalau di-set (mis. DEMO_CLINIC_ID=ira-skincare), semua pengirim baru yang tak
// menyebut kata kunci langsung dipaksa ke klinik ini. Kosongkan (default) supaya
// bot menanyakan klinik mana saat kata kunci tak ditemukan.
const FORCE_CLINIC_ID = process.env.DEMO_CLINIC_ID || "";

// Perintah untuk keluar / pindah dari klinik yang sedang aktif.
const RESET_PATTERN =
  /\b(ganti|pindah|ubah|reset)\s+(klinik|demo|bot)\b|^(menu|mulai ulang)$/i;

type ChatMessage = { role: "user" | "assistant"; content: string };

// State per-pengirim (cukup untuk demo, di memori — hilang saat script restart).
const histories = new Map<string, ChatMessage[]>();
const senderClinic = new Map<string, ClinicRoute>();

/** Cari klinik dari kata kunci di teks. null kalau tak ada yang cocok. */
function detectClinic(text: string): ClinicRoute | null {
  const t = text.toLowerCase();
  for (const c of CLINICS) {
    if (c.patterns.some((re) => re.test(t))) return c;
  }
  return null;
}

/** Daftar nama klinik untuk ditampilkan saat bot menanyakan pilihan. */
function clinicMenuText(): string {
  return CLINICS.map((c) => `• ${c.name}`).join("\n");
}

/**
 * Beberapa response dari /api/chat dibungkus JSON / code-block. Fungsi ini
 * mengekstrak teks balasan yang sebenarnya (logika sama dengan webhook Twilio).
 */
function extractActualResponse(responseStr: string): string {
  if (!responseStr) return "";
  let result = responseStr.trim();

  const codeBlockMatch = result.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?```$/);
  if (codeBlockMatch) result = codeBlockMatch[1].trim();

  if (result.startsWith("{")) {
    try {
      const inner = JSON.parse(result);
      if (inner.response && typeof inner.response === "string") {
        return extractActualResponse(inner.response);
      }
    } catch {
      // bukan JSON valid — kembalikan apa adanya
    }
  }
  return result;
}

const client = new Client({
  authStrategy: new LocalAuth({
    dataPath: resolve(__dirname, "../.wwebjs_auth"),
  }),
  puppeteer: {
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  },
});

client.on("qr", (qr: string) => {
  console.log(
    "\n📱 Scan QR ini dengan WhatsApp di HP kamu:\n" +
      "   WhatsApp → Settings → Linked Devices → Link a Device\n"
  );
  qrcode.generate(qr, { small: true });
});

client.on("ready", () => {
  botStartedAt = Math.floor(Date.now() / 1000); // abaikan semua pesan sebelum ini
  console.log(
    `\n✅ WhatsApp terhubung! Bot siap melayani ${CLINICS.length} klinik:\n` +
      CLINICS.map((c) => `   • ${c.name}  (${c.id})`).join("\n") +
      `\n   Pengirim diarahkan ke klinik via kata kunci (link wa.me).\n` +
      (ALLOWLIST.length
        ? `   🔒 Allowlist AKTIF — hanya membalas: ${ALLOWLIST.join(", ")}\n`
        : `   ⚠️  Allowlist KOSONG — bot akan membalas SIAPA PUN yang chat ke nomor ini.\n` +
          `      Kalau nomor ini punya kontak asli, set WA_ALLOWLIST di .env.local!\n`) +
      `   (pesan yang masuk sebelum bot menyala diabaikan otomatis)\n` +
      `   Pastikan \`npm run dev\` jalan di ${CHAT_API.replace("/api/chat", "")}.\n`
  );
});

client.on("auth_failure", (m: string) =>
  console.error("❌ Auth gagal:", m)
);
client.on("disconnected", (reason: string) =>
  console.error("⚠️  WhatsApp terputus:", reason)
);

/**
 * Kirim pesan dengan RETRY. whatsapp-web.js sering melempar
 * "Execution context was destroyed" kalau halaman WhatsApp Web sedang sync/
 * navigasi (umum terjadi pada pesan pertama setelah login). Retry beberapa kali
 * dengan jeda biasanya berhasil. Pakai client.sendMessage (bukan msg.reply)
 * agar tidak bergantung pada konteks pesan yang bisa basi setelah navigasi.
 */
async function safeSend(
  to: string,
  text: string,
  attempts = 4
): Promise<boolean> {
  for (let i = 1; i <= attempts; i++) {
    try {
      await client.sendMessage(to, text);
      return true;
    } catch (err) {
      console.warn(
        `⚠️  Gagal kirim (percobaan ${i}/${attempts}): ${(err as Error).message}`
      );
      if (i < attempts) await new Promise((r) => setTimeout(r, 2000));
    }
  }
  console.error(`❌ Menyerah mengirim ke ${to} setelah ${attempts} percobaan.`);
  return false;
}

client.on("message", async (msg: any) => {
  // Abaikan pesan grup, status, dan non-teks.
  if (msg.from.endsWith("@g.us") || msg.from === "status@broadcast") return;
  if (msg.type !== "chat") return;

  // PENGAMAN 1: jangan balas backlog inbox — hanya pesan setelah bot menyala.
  if (typeof msg.timestamp === "number" && msg.timestamp < botStartedAt) {
    console.log(`⏭️  Lewati pesan lama (sebelum bot start) dari ${msg.from}`);
    return;
  }

  // PENGAMAN 2: kalau allowlist di-set, hanya layani nomor yang SAMA PERSIS.
  if (ALLOWLIST.length) {
    const fromDigits = String(msg.from).replace(/\D/g, "");
    if (!ALLOWLIST.includes(fromDigits)) {
      console.log(`🚫 Abaikan (di luar allowlist): ${msg.from}`);
      return;
    }
  }

  const body = (msg.body || "").trim();
  if (!body) return;

  console.log(`\n📩 [${msg.from}] ${body}`);

  // 1) Perintah "ganti klinik" → lupakan pilihan + riwayat, lalu tanya ulang.
  if (RESET_PATTERN.test(body)) {
    senderClinic.delete(msg.from);
    histories.delete(msg.from);
    await safeSend(
      msg.from,
      `Oke, kita mulai ulang 🙌\nMau coba demo klinik yang mana? Balas nama kliniknya:\n${clinicMenuText()}`
    );
    return;
  }

  // 2) Tentukan klinik aktif untuk pengirim ini.
  let clinic = senderClinic.get(msg.from);

  if (!clinic) {
    // Belum terkunci → deteksi dari kata kunci pesan ini (atau paksa via env).
    const detected =
      detectClinic(body) ||
      (FORCE_CLINIC_ID
        ? CLINICS.find((c) => c.id === FORCE_CLINIC_ID) ?? null
        : null);

    if (!detected) {
      // Tak ada kata kunci → tanyakan klinik mana (fallback Opsi A).
      await safeSend(
        msg.from,
        `Halo! 👋 Ini demo chatbot klinik buatan Adit.\nKamu mau coba klinik yang mana? Balas nama kliniknya ya:\n${clinicMenuText()}`
      );
      return;
    }

    clinic = detected;
    senderClinic.set(msg.from, clinic);
    histories.delete(msg.from); // mulai sesi bersih untuk klinik ini
    await safeSend(
      msg.from,
      `Halo! 👋 Kamu terhubung ke demo *${clinic.name}* ✨\n` +
        `Tanya apa aja: jam buka, harga, layanan, booking — dijawab 24 jam oleh AI.\n` +
        `_(ketik "ganti klinik" kalau mau coba klinik lain)_`
    );
    return; // pesan pemicu (mis. "coba demo Klinik Ira") tak perlu masuk RAG
  }

  // 3) Klinik sudah terkunci → teruskan pertanyaan ke /api/chat.
  const history = histories.get(msg.from) ?? [];
  history.push({ role: "user", content: body });

  try {
    const res = await fetch(CHAT_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: history.slice(-10), // 10 pesan terakhir saja
        model: MODEL,
        clinicId: clinic.id, // ← klinik per-pengirim, bukan lagi hardcoded
        sessionId: msg.from,
      }),
    });

    if (!res.ok) {
      throw new Error(`Chat API ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    const reply =
      extractActualResponse(data.response) || "Maaf, terjadi kesalahan.";

    history.push({ role: "assistant", content: reply });
    histories.set(msg.from, history.slice(-10));

    const sent = await safeSend(msg.from, reply);
    if (sent) {
      console.log(
        `📤 [bot→${clinic.id}] ${reply.slice(0, 120)}${reply.length > 120 ? "…" : ""}`
      );
    }
  } catch (err) {
    console.error("❌ Gagal memproses pesan:", err);
    // safeSend menelan error pengiriman, jadi ini tidak akan meng-crash proses.
    await safeSend(
      msg.from,
      "Maaf, sistem sedang bermasalah. Coba kirim lagi sebentar ya 🙏"
    );
  }
});

// Jaring pengaman: jangan biarkan error puppeteer yang lolos meng-crash proses.
// Bot tetap hidup dan siap memproses pesan berikutnya.
process.on("unhandledRejection", (reason) => {
  console.error(
    "⚠️  Unhandled rejection (diabaikan, bot tetap jalan):",
    reason instanceof Error ? reason.message : reason
  );
});

console.log("🚀 Memulai koneksi WhatsApp… (tunggu QR muncul)");
client.initialize();
