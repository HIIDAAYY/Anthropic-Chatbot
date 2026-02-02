# Vercel Deployment Guide

This guide explains how to deploy the Customer Support Agent to Vercel with automatic CI/CD from GitHub.

## Quick Start

### 1. Connect GitHub to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "Add New" → "Project"
3. Select "Continue with GitHub"
4. Authorize Vercel to access your GitHub account
5. Find and import the `Anthropic-Chatbot` repository

### 2. Configure Environment Variables

After importing the project, go to **Project Settings → Environment Variables** and add:

#### Critical Variables (Required for basic operation)

```
ANTHROPIC_API_KEY=sk-ant-[your-key]
MIDTRANS_SERVER_KEY=SB-Mid-server-[your-key]
MIDTRANS_CLIENT_KEY=SB-Mid-client-[your-key]
MIDTRANS_IS_PRODUCTION=false
```

#### Database Configuration

**Option A: Prisma Accelerate (Recommended for Vercel)**
```
PRISMA_DATABASE_URL=prisma+postgres://[your-prisma-accelerate-url]
```

**Option B: Direct PostgreSQL Connection**
```
DATABASE_URL=postgresql://[user]:[password]@[host]:[port]/[database]
```

#### Vector Database (Optional - RAG Features)

```
PINECONE_API_KEY=pcsk_[your-key]
PINECONE_INDEX_NAME=anthropicchatbot
PINECONE_ENVIRONMENT=us-east-1

OPENAI_API_KEY=sk-proj-[your-key]
(or use VOYAGE_API_KEY instead)
```

#### Additional Services (Optional)

```
# WhatsApp Integration
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_WHATSAPP_NUMBER=whatsapp:+...

# Email Notifications
RESEND_API_KEY=re_...

# Admin Dashboard
ADMIN_KEY=[generate-with: openssl rand -base64 32]
LEARNING_ADMIN_KEY=[generate-with: openssl rand -base64 32]
CRON_SECRET=[generate-with: openssl rand -base64 32]

# Contact Information
AGENT_EMAIL=your-email@example.com
AGENT_WHATSAPP_NUMBER=+6285161220535
```

#### Application Settings

```
NODE_ENV=production
NEXT_PUBLIC_BASE_URL=https://[your-vercel-domain].vercel.app
NEXT_PUBLIC_INCLUDE_LEFT_SIDEBAR=true
NEXT_PUBLIC_INCLUDE_RIGHT_SIDEBAR=true
```

### 3. Deploy

After setting environment variables, Vercel will automatically:
1. Build the project
2. Run npm install
3. Run npm run build
4. Deploy to production

**First deployment may take 3-5 minutes.**

### 4. Test the Deployment

1. Visit your Vercel domain (e.g., `https://your-project.vercel.app`)
2. Test chat functionality
3. Test booking creation
4. Test payment link generation (demo or real based on Midtrans config)

---

## Detailed Setup Steps

### Step 1: Database Setup (Critical)

#### Option A: Prisma Accelerate (Recommended)
1. Go to [Prisma Data Platform](https://www.prisma.io/data-platform)
2. Create a project
3. Connect your PostgreSQL database
4. Copy the `Prisma Accelerate` connection string
5. Add to Vercel environment variables as `PRISMA_DATABASE_URL`
6. Run migrations:
   ```bash
   npx prisma migrate deploy
   ```

#### Option B: Self-Hosted PostgreSQL
1. Set `DATABASE_URL` or `POSTGRES_URL` environment variable in Vercel
2. Ensure database is accessible from Vercel servers
3. Run migrations on first deployment

### Step 2: API Keys

#### Anthropic Claude API
1. Go to [Anthropic Console](https://console.anthropic.com/)
2. Create API key
3. Copy to `ANTHROPIC_API_KEY` in Vercel

#### Midtrans (Payment Processing)
1. Go to [Midtrans Dashboard](https://dashboard.midtrans.com/)
2. Get your Server Key and Client Key from Settings → Access Keys
3. Use **Sandbox keys** for testing (`MIDTRANS_IS_PRODUCTION=false`)
4. Use **Production keys** for live payments (`MIDTRANS_IS_PRODUCTION=true`)

#### Optional: Pinecone (Vector Database for RAG)
1. Sign up at [Pinecone](https://www.pinecone.io/)
2. Create index named `anthropicchatbot`
3. Get API key and environment
4. Add to Vercel environment variables

#### Optional: OpenAI (Embeddings)
1. Get key from [OpenAI Platform](https://platform.openai.com/api-keys)
2. Add as `OPENAI_API_KEY`

### Step 3: Admin Dashboard Setup

1. Generate a secure admin key:
   ```bash
   openssl rand -base64 32
   ```
2. Set `ADMIN_KEY` in Vercel environment variables
3. Dashboard will be available at `/admin`
4. Login with your generated key

### Step 4: Deployment Verification

After deployment, check:
1. Health check: `GET /api/health`
2. Chat endpoint: `POST /api/chat`
3. Admin login: Visit `/admin`
4. Booking creation works end-to-end

---

## Automatic Deployments

Vercel automatically deploys when:
- You push to `main` branch
- GitHub detects new commits

You can also:
- Manually deploy from Vercel dashboard
- Set up preview deployments for pull requests
- Configure production vs preview environment variables

---

## Environment-Specific Variables

### Development (Local)
- `NODE_ENV=development`
- `NEXT_PUBLIC_BASE_URL=http://localhost:3000`
- Use Sandbox Midtrans keys
- Can use local PostgreSQL

### Production (Vercel)
- `NODE_ENV=production`
- `NEXT_PUBLIC_BASE_URL=https://[your-domain].vercel.app`
- Can use Production Midtrans keys (when ready)
- Must use cloud PostgreSQL (Prisma Accelerate or cloud provider)

---

## Troubleshooting

### Build Fails
- Check build logs in Vercel dashboard
- Verify all required environment variables are set
- Ensure `npm run build` passes locally

### 500 Errors on API Calls
- Check function logs in Vercel dashboard
- Verify API keys are correct
- Check database connection string

### Database Connection Issues
- Verify `PRISMA_DATABASE_URL` is correct
- Ensure database is accessible from Vercel servers
- Run migrations: `npx prisma migrate deploy`

### Payment Links Not Working
- Verify Midtrans keys are correct
- Check `MIDTRANS_IS_PRODUCTION` matches your keys
- System will use demo fallback if Midtrans unavailable

---

## Security Best Practices

1. **Never commit `.env` files to git**
   - Already in `.gitignore`

2. **Use strong admin keys**
   ```bash
   openssl rand -base64 32
   ```

3. **Rotate keys regularly**
   - Update in Vercel when keys expire
   - Redeploy after key rotation

4. **Different keys for different environments**
   - Sandbox Midtrans for testing
   - Production Midtrans for live payments

5. **Monitor API usage**
   - Anthropic console for token usage
   - Midtrans dashboard for payment attempts

---

## Next Steps

1. ✅ Push to GitHub (Done)
2. ✅ Configure Vercel environment variables
3. ✅ Deploy to production
4. ✅ Test all features
5. ✅ Monitor logs and errors
6. ✅ Set up error monitoring (see ERROR_MONITORING_SETUP.md)

---

## Support

For issues:
- Check Vercel dashboard logs
- Review deployment settings
- Verify all environment variables
- Test locally first with `npm run dev`
