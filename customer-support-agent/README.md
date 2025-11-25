# UrbanStyle ID - AI Customer Support Chatbot

AI-powered customer support chatbot untuk platform e-commerce fashion Indonesia, menggunakan Claude AI dengan RAG (Retrieval-Augmented Generation) untuk memberikan respons yang akurat dan contextual.

## Features

- **Intelligent FAQ Response**: Menggunakan RAG dengan Pinecone vector database untuk mencari jawaban yang relevan
- **Multilingual Support**: Otomatis mendeteksi dan merespons dalam bahasa Indonesia atau English
- **Customer Mood Detection**: Mendeteksi mood customer (positive, neutral, negative, curious, frustrated, confused)
- **Category Classification**: Mengklasifikasikan pertanyaan ke kategori support yang tepat
- **Dual RAG Support**:
  - Pinecone (default)
  - AWS Bedrock Knowledge Base
- **Real-time Embeddings**: Menggunakan Voyage AI untuk semantic search
- **Human Agent Handoff**: Otomatis redirect ke human agent untuk kasus kompleks
- **WhatsApp Integration**: Terkoneksi dengan Twilio WhatsApp Business API untuk messaging real-time
- **Suggested Questions**: Bot memberikan pertanyaan yang relevan untuk memandu customer
- **Persistent Session Management**: PostgreSQL database untuk menyimpan conversation history
- **Conversation Analytics**: Dashboard analytics untuk monitoring performa bot
- **Error Handling & Fallback**: Graceful degradation dengan retry logic dan emergency responses
- **Admin Dashboard**: Web-based dashboard untuk managing pending conversations yang perlu agent attention
- **Email Notifications**: Automatic email alerts via Resend ketika bot redirect ke human agent
- **Native Tool Use API**: Bot tools menggunakan Anthropic's native Tool Use untuk real-time data:
  - Order tracking dengan real-time shipping status
  - Payment verification dengan akurat
  - Inventory checking untuk real-time stock
  - Order summary dan history

## Bot Tools (Real-time Operations)

Bot dilengkapi dengan native tool integration untuk real-time queries:

### Available Tools

1. **Track Order** (`track_order`)
   - Get real-time shipping status dan tracking information
   - Display estimated delivery date dan current location
   - Contoh: "Mana pesanan saya ORD-2025-001?"

2. **Verify Payment** (`verify_payment`)
   - Check payment status untuk specific order
   - Provide payment instructions jika belum dibayar
   - Contoh: "Sudah terbayar belum pesanan ORD-2025-001?"

3. **Check Inventory** (`check_inventory`)
   - Check real-time stock availability
   - Query multiple products at once
   - Contoh: "Apakah Kaos Basic Crewneck tersedia?"

4. **Get Order Summary** (`get_order_summary`)
   - Get customer order history
   - Display total spending dan order count
   - Contoh: "Berapa total pesanan saya?"

### Implementation Details

- Tools menggunakan Anthropic's native Tool Use API
- Real-time database queries via PostgreSQL
- Automatic retry logic dengan exponential backoff
- Comprehensive error handling dan fallbacks

### Recent Fix (Nov 25, 2025)

**Fixed Customer ID Mismatch Issue:**
- ✅ All tools now consistently work with proper customer ID validation
- ✅ Implemented secure customer data access pattern
- ✅ All tools return formatted responses (not raw JSON)
- See [`FIX_CUSTOMER_ID_MISMATCH.md`](FIX_CUSTOMER_ID_MISMATCH.md) untuk detail lengkap

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **UI Components**: shadcn/ui, Radix UI
- **AI/ML**:
  - Claude AI (Anthropic) - Chat completion
  - OpenAI - Text embeddings
  - Voyage AI - Alternative embeddings
  - Pinecone - Vector database
  - AWS Bedrock - Alternative knowledge base
- **Database**: PostgreSQL (via Prisma ORM)
- **Messaging**: Twilio WhatsApp Business API
- **Deployment**: Vercel (Serverless)

## Prerequisites

Sebelum memulai, pastikan Anda memiliki:

- Node.js >= 18.17.0
- npm atau yarn
- API Keys:
  - [Anthropic API Key](https://console.anthropic.com/)
  - [Voyage AI API Key](https://www.voyageai.com/)
  - [Pinecone API Key](https://www.pinecone.io/)
  - (Optional) AWS Bedrock access
- **For WhatsApp Integration**:
  - [Twilio Account](https://www.twilio.com/) dengan WhatsApp Business API
  - WhatsApp Business Account (via Meta/Facebook)

## Installation

### 1. Clone Repository

```bash
git clone https://github.com/HIIDAAYY/Anthropic-Chatbot.git
cd Anthropic-Chatbot/customer-support-agent
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Setup Environment Variables

Copy file `.env.example` ke `.env.local` dan isi dengan API keys Anda:

```bash
cp .env.example .env.local
```

Edit `.env.local` dengan API keys yang valid:

```bash
# AI & NLP APIs
ANTHROPIC_API_KEY=your_anthropic_api_key_here
OPENAI_API_KEY=your_openai_api_key_here

# Vector Database (Pinecone)
PINECONE_API_KEY=your_pinecone_api_key_here
PINECONE_INDEX_NAME=anthropicchatbot
PINECONE_ENVIRONMENT=us-east-1

# Relational Database (PostgreSQL)
DATABASE_URL=postgresql://dev:devpassword@localhost:5433/urbanstyle_cs

# WhatsApp Integration
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_WHATSAPP_NUMBER=whatsapp:+your_twilio_number

# Phase 4: Admin Dashboard & Notifications
ADMIN_KEY=your-secret-admin-key
AGENT_EMAIL=your-agent@email.com
RESEND_API_KEY=your_resend_api_key

# Application Settings
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

### 4. Setup PostgreSQL Database (NEW!)

**IMPORTANT:** Project ini sekarang menggunakan PostgreSQL untuk persistent session storage dan conversation history logging.

#### 4.1. Start PostgreSQL dengan Docker

```bash
# Start PostgreSQL container
docker-compose up -d

# Verify container is running
docker ps
```

PostgreSQL akan berjalan di **port 5433** (bukan 5432) untuk menghindari konflik dengan PostgreSQL lokal yang mungkin sudah running.

#### 4.2. Run Database Migrations

```bash
# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate dev

# View database in browser (optional)
npx prisma studio
```

#### 4.3. Test Database Connection

```bash
# Run test script
npx tsx scripts/test-db-connection.ts
```

Jika berhasil, Anda akan melihat output:
```
✅ All tests passed! Database is working correctly! 🎉
```

### 5. Setup Pinecone Index

Buat Pinecone index dengan konfigurasi:
- **Dimension**: 1024 (untuk Voyage AI `voyage-3` model)
- **Metric**: cosine
- **Cloud**: AWS
- **Region**: us-east-1

### 6. Upload FAQ Data ke Pinecone

```bash
# Upload data FAQ ke Pinecone
npx tsx scripts/upload-faq.ts
```

File FAQ ada di `urbanstyle_faq.md` - Anda bisa customize sesuai kebutuhan bisnis Anda.

## Running the Project

### Development Mode

```bash
# Full UI (dengan left & right sidebar)
npm run dev

# Chat only (tanpa sidebar)
npm run dev:chat

# Left sidebar only
npm run dev:left

# Right sidebar only
npm run dev:right
```

Buka browser di [http://localhost:3000](http://localhost:3000)

### Production Build

```bash
# Build production
npm run build

# Start production server
npm start
```

## Project Structure

```
customer-support-agent/
├── app/
│   ├── api/
│   │   ├── chat/
│   │   │   └── route.ts          # Main API endpoint untuk chat
│   │   └── whatsapp/
│   │       └── webhook/
│   │           └── route.ts      # Twilio WhatsApp webhook endpoint
│   ├── lib/
│   │   ├── utils.ts              # RAG retrieval logic (Pinecone & Bedrock)
│   │   ├── cn.ts                 # Utility functions
│   │   ├── twilio-client.ts      # Twilio WhatsApp client wrapper
│   │   ├── whatsapp-session.ts   # WhatsApp conversation session management
│   │   └── customer_support_categories.json
│   └── page.tsx                  # Main page
├── components/
│   ├── ChatArea.tsx              # Chat UI component
│   └── ui/                       # shadcn/ui components
├── lib/
│   ├── embeddings.ts             # Voyage AI embeddings
│   ├── pinecone.ts               # Pinecone operations
│   └── pinecone-examples.md      # Contoh usage
├── scripts/
│   ├── upload-faq.ts             # Upload FAQ ke Pinecone
│   ├── test-pinecone.ts          # Test Pinecone connection
│   ├── clear-pinecone.ts         # Clear Pinecone index
│   └── search-payment.ts         # Test search queries
├── urbanstyle_faq.md             # FAQ database
├── .env.local                    # Environment variables (not in git)
├── amplify.yml                   # AWS Amplify deployment config (legacy)
└── tsconfig.json                 # TypeScript configuration
```

## Available Scripts

### Data Management

```bash
# Upload FAQ data
npx tsx scripts/upload-faq.ts

# Test Pinecone connection
npx tsx scripts/test-pinecone.ts

# Search test query
npx tsx scripts/search-payment.ts

# Clear all data dari Pinecone
npx tsx scripts/clear-pinecone.ts

# List all data di Pinecone
npx tsx scripts/list-all-data.ts
```

### Development

```bash
# Lint code
npm run lint

# Build production
npm run build
```

## Usage Examples

### Basic Chat Query

User mengirim pesan dalam bahasa Indonesia:
```
"Bagaimana cara pembayaran?"
```

Response dari chatbot:
- Mencari context dari Pinecone menggunakan semantic search
- Memberikan jawaban berdasarkan FAQ yang relevan
- Mendeteksi mood customer
- Memberikan suggested questions

### Complex Query Requiring Human Agent

User bertanya tentang order tracking spesifik:
```
"Dimana pesanan saya dengan nomor ORD12345?"
```

Chatbot akan:
- Mendeteksi bahwa pertanyaan memerlukan akses ke account data
- Set `redirect_to_agent: true`
- Menyarankan untuk connect ke human customer service

## API Response Format

```typescript
{
  "id": "uuid",
  "thinking": "Reasoning for the response",
  "response": "Chatbot response text",
  "user_mood": "positive|neutral|negative|curious|frustrated|confused",
  "suggested_questions": ["Question 1?", "Question 2?", "Question 3?"],
  "debug": {
    "context_used": true|false
  },
  "matched_categories": ["category_id1", "category_id2"],
  "redirect_to_agent": {
    "should_redirect": boolean,
    "reason": "Reason if redirecting"
  }
}
```

## WhatsApp Integration Setup

Untuk mengintegrasikan WhatsApp Business API dengan chatbot:

### 1. Setup Twilio Account

1. Buat akun di [Twilio](https://www.twilio.com/)
2. Upgrade ke production account
3. Navigate ke **Messaging → Services**
4. Create new Messaging Service untuk WhatsApp
5. Request WhatsApp Business Account access via Meta

### 2. Configure Webhook

1. Di Twilio Messaging Service, buka **Integration** tab
2. Set Webhook URL ke: `https://your-deployment-url.vercel.app/api/whatsapp/webhook`
3. Save configuration

### 3. Add Environment Variables

Di **Vercel Dashboard → Settings → Environment Variables**, tambahkan:
```
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_WHATSAPP_NUMBER=whatsapp:+your_number
NEXT_PUBLIC_BASE_URL=https://your-deployment-url.vercel.app
```

### 4. Deploy

```bash
npm run build
vercel deploy --prod
```

### 5. Test

Kirim WhatsApp message ke Twilio WhatsApp number Anda. Bot akan merespon dengan jawaban yang relevan berdasarkan FAQ database.

## Admin Dashboard Usage

Dashboard admin memungkinkan human agents untuk melihat dan mengelola conversations yang perlu manual intervention.

### Accessing the Dashboard

Navigate ke: `https://your-deployment-url.vercel.app/admin/conversations?key=YOUR_ADMIN_KEY`

### Features

- **View Pending Conversations**: Lihat semua conversations yang di-redirect ke human agent
- **Conversation Details**: Customer name, phone, last message, redirect reason, user mood, timestamp
- **Resolve Conversations**: Mark conversations as resolved dengan notes
- **Real-time Updates**: Refresh button untuk melihat conversations terbaru

### Email Notifications

Ketika bot mendeteksi perlu redirect ke human agent:
1. Conversation status berubah ke `REDIRECTED`
2. Email notification otomatis terkirim ke `AGENT_EMAIL`
3. Email berisi:
   - Customer information
   - Conversation ID
   - Redirect reason
   - Last customer message
   - Link ke admin dashboard

### Resolving Conversations

1. Click "✅ Resolve" button pada conversation
2. Input resolution notes
3. Input agent name
4. Conversation status berubah ke `ENDED` dan hilang dari pending list

## Deployment

### Vercel (Recommended)

Proyek ini dioptimalkan untuk deployment di Vercel.

1. Push repository ke GitHub
2. Import ke [Vercel](https://vercel.com)
3. Configure environment variables di Vercel Dashboard
4. Deploy otomatis setiap push ke main branch

### Environment Variables di Vercel

Tambahkan di **Vercel Dashboard → Settings → Environment Variables**:
- `ANTHROPIC_API_KEY`
- `VOYAGE_API_KEY`
- `PINECONE_API_KEY`
- `PINECONE_INDEX_NAME`
- `PINECONE_ENVIRONMENT`
- `DATABASE_URL` (auto-generated by Vercel Postgres)
- `BAWS_ACCESS_KEY_ID` (optional)
- `BAWS_SECRET_ACCESS_KEY` (optional)
- `TWILIO_ACCOUNT_SID` (untuk WhatsApp)
- `TWILIO_AUTH_TOKEN` (untuk WhatsApp)
- `TWILIO_WHATSAPP_NUMBER` (untuk WhatsApp)
- `ADMIN_KEY` (untuk admin dashboard access)
- `AGENT_EMAIL` (untuk email notifications)
- `RESEND_API_KEY` (untuk Resend email service)
- `NEXT_PUBLIC_BASE_URL` (deployment URL)

### AWS Amplify (Legacy)

Proyek ini juga support deployment ke AWS Amplify dengan `amplify.yml` config.

## Customization

### Mengubah FAQ Content

Edit file `urbanstyle_faq.md` kemudian re-upload:
```bash
npx tsx scripts/upload-faq.ts
```

### Mengganti Company/Brand

Edit `app/api/chat/route.ts` line 138-225 untuk mengubah system prompt sesuai brand Anda.

### Menambah Categories

Edit `app/lib/customer_support_categories.json` untuk menambah kategori support.

### Mengganti Embedding Model

Edit `lib/embeddings.ts` untuk menggunakan model Voyage AI lain:
- `voyage-3` (default) - 1024 dimensions
- `voyage-3-lite` - 512 dimensions
- `voyage-code-3` - untuk code search
- `voyage-finance-2` - untuk financial docs
- `voyage-law-2` - untuk legal docs

## Monitoring & Logs

Logs otomatis tersimpan di **AWS CloudWatch** jika deploy via Amplify:

- Build logs: Amplify Console → Build tab
- Runtime logs: CloudWatch → Log groups

View logs di local development:
```bash
# Console logs akan muncul di terminal
npm run dev
```

## Troubleshooting

### RAG tidak mengembalikan hasil

1. Cek Pinecone index sudah terisi data
   ```bash
   npx tsx scripts/list-all-data.ts
   ```

2. Verify API keys di `.env.local`

3. Cek dimensi embedding match dengan Pinecone index (1024 for voyage-3)

### Build error

1. Clear cache:
   ```bash
   rm -rf .next node_modules
   npm install
   npm run build
   ```

2. Verify Node.js version >= 18.17.0

### Pinecone connection error

1. Verify `PINECONE_API_KEY` dan `PINECONE_INDEX_NAME`
2. Cek region di `.env.local` match dengan Pinecone dashboard

## How to Get Your API Keys

### Anthropic API Key

1. Visit [console.anthropic.com](https://console.anthropic.com/dashboard)
2. Sign up or log in to your account
3. Click on "Get API keys"
4. Copy the key and paste it into your `.env.local` file

### Voyage AI API Key

1. Visit [www.voyageai.com](https://www.voyageai.com/)
2. Sign up for an account
3. Navigate to API keys section
4. Generate a new API key
5. Copy and paste into `.env.local`

### Pinecone API Key

1. Visit [www.pinecone.io](https://www.pinecone.io/)
2. Sign up and log in
3. Create a new project
4. Go to "API Keys" section
5. Copy your API key and paste into `.env.local`

### AWS Bedrock (Optional)

Follow the IAM user creation process:

1. Log in to AWS Management Console
2. Navigate to IAM dashboard
3. Create new user with "AmazonBedrockFullAccess" policy
4. Generate access keys
5. Copy to `.env.local`

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

## License

This project is part of [Anthropic Claude Quickstarts](https://github.com/anthropics/claude-quickstarts).

## Resources

- [Anthropic Documentation](https://docs.anthropic.com/)
- [Voyage AI Documentation](https://docs.voyageai.com/)
- [Pinecone Documentation](https://docs.pinecone.io/)
- [Next.js Documentation](https://nextjs.org/docs)
- [shadcn/ui Components](https://ui.shadcn.com/)

## Support

Untuk pertanyaan atau issues, silakan buat [GitHub Issue](https://github.com/HIIDAAYY/Anthropic-Chatbot/issues).

---

**Built with Claude AI** 🤖
