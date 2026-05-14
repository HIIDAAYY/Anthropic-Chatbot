'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Settings as SettingsIcon,
    Bell,
    Shield,
    Database,
    Bot,
    MessageSquare,
    Save,
    RefreshCw,
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { useSidebar } from '../components/SidebarContext';

function Pill({ tone, label }: { tone: 'success' | 'muted' | 'warning'; label: string }) {
    const map: Record<string, string> = {
        success: 'bg-emerald-100 text-emerald-700',
        muted: 'bg-gray-100 text-gray-600',
        warning: 'bg-amber-100 text-amber-700',
    };
    return <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${map[tone]}`}>{label}</span>;
}

function SectionCard({
    icon: Icon,
    title,
    description,
    children,
}: {
    icon: any;
    title: string;
    description: string;
    children: React.ReactNode;
}) {
    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-start gap-3 mb-5">
                <div className="h-10 w-10 rounded-xl bg-violet-100 text-violet-600 flex items-center justify-center">
                    <Icon className="h-5 w-5" />
                </div>
                <div>
                    <h3 className="font-bold text-gray-900">{title}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">{description}</p>
                </div>
            </div>
            <div className="space-y-4">{children}</div>
        </div>
    );
}

function ToggleRow({ title, desc, badge }: { title: string; desc: string; badge: React.ReactNode }) {
    return (
        <div className="flex items-center justify-between gap-3">
            <div>
                <p className="font-medium text-sm text-gray-900">{title}</p>
                <p className="text-xs text-gray-500">{desc}</p>
            </div>
            {badge}
        </div>
    );
}

export default function SettingsPage() {
    const { toggle } = useSidebar();
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        setSaving(true);
        await new Promise((resolve) => setTimeout(resolve, 1000));
        setSaving(false);
    };

    return (
        <div>
            <PageHeader
                title="Pengaturan"
                subtitle="Konfigurasi dashboard dan integrasi"
                toggleSidebar={toggle}
                actions={
                    <Button onClick={handleSave} disabled={saving} className="bg-violet-600 hover:bg-violet-700 text-white rounded-lg">
                        {saving ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                        Simpan Perubahan
                    </Button>
                }
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <SectionCard
                    icon={SettingsIcon}
                    title="Pengaturan Umum"
                    description="Konfigurasi dasar dashboard admin"
                >
                    <div className="space-y-2">
                        <Label htmlFor="clinicName" className="text-xs text-gray-600">Nama Klinik</Label>
                        <Input id="clinicName" defaultValue="Glow Aesthetics" className="bg-gray-50 border-gray-200 rounded-lg" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="timezone" className="text-xs text-gray-600">Zona Waktu</Label>
                        <Input id="timezone" defaultValue="Asia/Jakarta (WIB)" disabled className="bg-gray-50 border-gray-200 rounded-lg" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="language" className="text-xs text-gray-600">Bahasa</Label>
                        <Input id="language" defaultValue="Indonesian" disabled className="bg-gray-50 border-gray-200 rounded-lg" />
                    </div>
                </SectionCard>

                <SectionCard
                    icon={Bell}
                    title="Notifikasi"
                    description="Atur preferensi notifikasi"
                >
                    <ToggleRow title="Alert Handoff Baru" desc="Notifikasi saat handoff diminta" badge={<Pill tone="success" label="Aktif" />} />
                    <ToggleRow title="Alert Eskalasi" desc="Notifikasi untuk percakapan eskalasi" badge={<Pill tone="success" label="Aktif" />} />
                    <ToggleRow title="Ringkasan Harian" desc="Terima ringkasan analytics harian" badge={<Pill tone="muted" label="Nonaktif" />} />
                </SectionCard>

                <SectionCard
                    icon={Bot}
                    title="Konfigurasi AI"
                    description="Atur perilaku chatbot AI"
                >
                    <div className="space-y-2">
                        <Label className="text-xs text-gray-600">AI Model</Label>
                        <div className="flex items-center gap-2">
                            <Input defaultValue="Claude 3.5 Sonnet" disabled className="bg-gray-50 border-gray-200 rounded-lg" />
                            <Pill tone="success" label="Aktif" />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-xs text-gray-600">Ambang Auto-Handoff</Label>
                        <Input type="number" defaultValue="3" className="bg-gray-50 border-gray-200 rounded-lg" />
                        <p className="text-xs text-gray-500">Jumlah kegagalan sebelum menyarankan handoff</p>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-xs text-gray-600">Gaya Respons</Label>
                        <Input defaultValue="Professional & Friendly" disabled className="bg-gray-50 border-gray-200 rounded-lg" />
                    </div>
                </SectionCard>

                <SectionCard
                    icon={Shield}
                    title="Keamanan"
                    description="Pengaturan keamanan dan akses"
                >
                    <ToggleRow title="Durasi Sesi" desc="Auto logout setelah tidak aktif" badge={<Pill tone="muted" label="7 hari" />} />
                    <ToggleRow title="Two-Factor Auth" desc="Lapisan keamanan tambahan" badge={<Pill tone="warning" label="Belum diatur" />} />
                    <ToggleRow title="Audit Logging" desc="Catat semua aksi admin" badge={<Pill tone="success" label="Aktif" />} />
                </SectionCard>

                <SectionCard
                    icon={Database}
                    title="Database"
                    description="Informasi koneksi database"
                >
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Status</span>
                        <Pill tone="success" label="Terhubung" />
                    </div>
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Tipe</span>
                        <span className="text-gray-900">PostgreSQL 16</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Host</span>
                        <span className="font-mono text-xs text-gray-700">localhost:5433</span>
                    </div>
                </SectionCard>

                <SectionCard
                    icon={MessageSquare}
                    title="Integrasi"
                    description="Status layanan terhubung"
                >
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-900">WhatsApp Business</span>
                        <Pill tone="muted" label="Belum terhubung" />
                    </div>
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-900">Pinecone (Vector DB)</span>
                        <Pill tone="success" label="Terhubung" />
                    </div>
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-900">Anthropic API</span>
                        <Pill tone="success" label="Terhubung" />
                    </div>
                </SectionCard>
            </div>

            <div className="text-center text-xs text-gray-400 mt-6 space-y-0.5">
                <p>Beberapa pengaturan bersifat read-only di mode demo.</p>
                <p>Hubungi administrator untuk mengubah konfigurasi sistem.</p>
            </div>
        </div>
    );
}
