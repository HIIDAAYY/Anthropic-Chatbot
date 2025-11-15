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

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **UI Components**: shadcn/ui, Radix UI
- **AI/ML**:
  - Claude AI (Anthropic) - Chat completion
  - Voyage AI - Text embeddings
  - Pinecone - Vector database
  - AWS Bedrock - Alternative knowledge base
- **Deployment**: AWS Amplify

## Prerequisites

Sebelum memulai, pastikan Anda memiliki:

- Node.js >= 18.17.0
- npm atau yarn
- API Keys:
  - [Anthropic API Key](https://console.anthropic.com/)
  - [Voyage AI API Key](https://www.voyageai.com/)
  - [Pinecone API Key](https://www.pinecone.io/)
  - (Optional) AWS Bedrock access

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

Buat file `.env.local` di root directory:

```bash
# Anthropic API
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Voyage AI (for embeddings)
VOYAGE_API_KEY=your_voyage_api_key_here

# Pinecone (vector database)
PINECONE_API_KEY=your_pinecone_api_key_here
PINECONE_INDEX_NAME=your_pinecone_index_name
PINECONE_ENVIRONMENT=us-east-1

# AWS Bedrock (optional - for alternative RAG)
BAWS_ACCESS_KEY_ID=your_aws_access_key
BAWS_SECRET_ACCESS_KEY=your_aws_secret_key

# OpenAI (optional)
OPENAI_API_KEY=your_openai_api_key
```

### 4. Setup Pinecone Index

Buat Pinecone index dengan konfigurasi:
- **Dimension**: 1024 (untuk Voyage AI `voyage-3` model)
- **Metric**: cosine
- **Cloud**: AWS
- **Region**: us-east-1

### 5. Upload FAQ Data ke Pinecone

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
│   │   └── chat/
│   │       └── route.ts          # Main API endpoint untuk chat
│   ├── lib/
│   │   ├── utils.ts              # RAG retrieval logic (Pinecone & Bedrock)
│   │   ├── cn.ts                 # Utility functions
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
└── amplify.yml                   # AWS Amplify deployment config
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

## Deployment

### AWS Amplify

Proyek ini sudah dikonfigurasi untuk deployment di AWS Amplify.

1. Connect repository ke AWS Amplify
2. Set environment variables di Amplify Console
3. Deploy akan otomatis menggunakan `amplify.yml`

### Environment Variables di Amplify

Tambahkan di **Amplify Console → App Settings → Environment Variables**:
- `ANTHROPIC_API_KEY`
- `VOYAGE_API_KEY`
- `PINECONE_API_KEY`
- `PINECONE_INDEX_NAME`
- `PINECONE_ENVIRONMENT`
- `BAWS_ACCESS_KEY_ID` (optional)
- `BAWS_SECRET_ACCESS_KEY` (optional)

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
