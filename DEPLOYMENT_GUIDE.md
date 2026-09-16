# 🚀 Deployment Guide: Skillstat AI on Supabase & Vercel

This guide walks you through deploying **Skillstat AI** using **Supabase** (for the PostgreSQL database) and **Vercel** (for hosting the React/Vite frontend and serverless API functions).

---

## Step 1: Set up Supabase Database

1. Go to [supabase.com](https://supabase.com) and sign in or create a free account.
2. Click **"New Project"**.
   - **Name**: `skillstatai` (or any name you prefer)
   - **Database Password**: Choose a strong password and save it securely.
   - **Region**: Select the region closest to you or your users.
3. Once your project is created, navigate to the **SQL Editor** in the left sidebar (icon with `>_`).
4. Click **"New Query"**, open [`supabase/schema.sql`](supabase/schema.sql) from this repository, copy all its contents, paste it into the editor, and click **Run**.
   - This creates the `public.users` table with all indexes and timestamps.
5. In the left sidebar, click **Project Settings** (gear icon) -> **API**.
6. Copy the following keys:
   - **Project URL** (`SUPABASE_URL`)
   - **service_role secret** (`SUPABASE_SERVICE_ROLE_KEY`) *(Recommended for serverless backend)*
   - **anon / public key** (`SUPABASE_ANON_KEY`)

---

## Step 2 (Optional): Migrate Existing Local Data

If you have existing users or assessment records in `data/skillstat-users.json` that you want in Supabase:

1. In your local `.env` file, add:
   ```env
   SUPABASE_URL=https://your-project-id.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```
2. Run the migration command in your terminal:
   ```bash
   npm run migrate:supabase
   ```
3. All local users and their assessment histories will be uploaded to Supabase.

---

## Step 3: Deploy on Vercel

### Method A: Deploy via GitHub (Recommended)

1. Ensure your latest changes are pushed to GitHub:
   ```bash
   git add .
   git commit -m "Configure Supabase and Vercel deployment"
   git push origin main
   ```
2. Go to [vercel.com](https://vercel.com) and log in.
3. Click **"Add New..."** -> **"Project"**.
4. Import your repository (`vamshi-48/skillstatai`).
5. **Project Settings**:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `./` (or select the folder if your repo is nested)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
6. **Environment Variables**:
   Under **Environment Variables**, add the following:
   | Key | Value | Description |
   | --- | --- | --- |
   | `SUPABASE_URL` | `https://xyz.supabase.co` | Your Supabase Project URL |
   | `SUPABASE_SERVICE_ROLE_KEY` | `ey...` | Your Supabase service_role secret |
   | `OPENAI_API_KEY` | `sk-...` | Your OpenAI API key for question generation |
   | `GEMINI_API_KEY` | `...` | Your Gemini API key for Copilot chat |
   | `EMAILJS_SERVICE_ID` | `service_ulsssyg` | (Optional) Email service ID |
   | `EMAILJS_TEMPLATE_ID` | `template_vwrujof` | (Optional) Email template ID |
   | `EMAILJS_PUBLIC_KEY` | `64bi_aUhJjCY07_VY` | (Optional) Email public key |
   | `RESEND_API_KEY` | *(optional)* | Resend API key if using Resend |
7. Click **"Deploy"**.

---

### Method B: Deploy via Vercel CLI

1. Install Vercel CLI if not already installed:
   ```bash
   npm install -g vercel
   ```
2. In the project directory, run:
   ```bash
   vercel
   ```
3. Follow the CLI prompts to link the project and deploy.
4. Set environment variables using:
   ```bash
   vercel env add SUPABASE_URL
   vercel env add SUPABASE_SERVICE_ROLE_KEY
   vercel env add OPENAI_API_KEY
   vercel env add GEMINI_API_KEY
   ```
5. Redeploy for production:
   ```bash
   vercel --prod
   ```

---

## Step 4: Verification

Once deployed, visit your Vercel URL (e.g. `https://your-project.vercel.app`):
1. **User Sign Up & Login**: Test registering a user. Verification OTP will be sent or verified.
2. **Parichay Portal Auth**: Test government authentication flow.
3. **Assessment Generation**: Verify that OpenAI generates customized competency questions.
4. **AI Copilot Chat**: Open the chat assistant in the bottom right corner and confirm Gemini replies.
5. **Supabase Dashboard**: Check Table Editor -> `users` in Supabase to see real-time persistent records.
