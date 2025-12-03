# Vercel Deployment Instructions

## ✅ Pre-Deployment Checklist

- [x] Git repository initialized
- [x] All files committed
- [x] Project structure verified
- [x] Vercel configuration ready (vercel.json with 300s timeout)

## Step 1: Push to GitHub

1. **Create a new repository on GitHub:**
   - Go to https://github.com/new
   - Name it (e.g., `esg-automation` or `aiib-esg-system`)
   - Choose public or private
   - **DO NOT** initialize with README, .gitignore, or license (we already have these)

2. **Push your code to GitHub:**
   ```bash
   cd /Users/jeffreypaine/Projects/AIIB
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
   git branch -M main
   git push -u origin main
   ```

   Replace `YOUR_USERNAME` and `YOUR_REPO_NAME` with your actual GitHub username and repository name.

## Step 2: Deploy to Vercel

1. **Go to Vercel:**
   - Visit https://vercel.com
   - Sign in with your GitHub account (or create an account)

2. **Import Project:**
   - Click "Add New Project"
   - Select your GitHub repository
   - Click "Import"

3. **Configure Project Settings:**
   - **Framework Preset:** Next.js (should auto-detect)
   - **Root Directory:** `esg-automation` ⚠️ **IMPORTANT:** Set this to `esg-automation` since your Next.js app is in a subdirectory
   - **Build Command:** `npm run build` (default)
   - **Output Directory:** `.next` (default)
   - **Install Command:** `npm install` (default)

4. **Add Environment Variables:**
   Click "Environment Variables" and add:
   
   **Required:**
   - `OPENAI_API_KEY` = `your_openai_api_key_here`
   - `GEMINI_API_KEY` = `your_gemini_api_key_here`
   
   **Optional:**
   - `ANTHROPIC_API_KEY` = `your_anthropic_api_key_here` (if you want to use Claude)

5. **Deploy:**
   - Click "Deploy"
   - Wait for the build to complete (may take 2-5 minutes)
   - Your app will be live at `https://your-project.vercel.app`

## Step 3: Verify Deployment

After deployment, test the following:

1. ✅ Homepage loads correctly
2. ✅ File upload accepts PDF/Word/TXT files
3. ✅ Company info extraction works
4. ✅ DDQ generation completes (may take 30-60s)
5. ✅ IM generation completes (may take 30-60s)
6. ✅ Document downloads work (Word format)

## Troubleshooting

### Build Fails
- **Check Root Directory:** Make sure it's set to `esg-automation` in Vercel project settings
- **Check Node Version:** Vercel should auto-detect Node 20+ (required for Next.js 16)
- **Check Logs:** View build logs in Vercel dashboard for specific errors

### API Routes Timeout
- **Current Timeout:** 300 seconds (5 minutes) - configured in `vercel.json`
- **If still timing out:** Consider upgrading to Vercel Pro for longer timeouts
- **Check Function Logs:** Monitor which API route is slow

### Environment Variables Not Working
- **Verify in Dashboard:** Go to Project Settings → Environment Variables
- **Redeploy:** After adding/changing env vars, redeploy the project
- **Check API Route Logs:** Look for "API key not found" errors

### RMF File Not Found
- **Verify File Exists:** Check that `esg-automation/public/ESG_RMF.txt` is in the repository
- **Check File Size:** Should be ~112KB
- **Check Git:** Ensure the file is committed (not in .gitignore)

### File Upload Fails
- **File Size Limit:** Maximum 4.5MB (Vercel's request body limit)
- **Check Error Messages:** Should indicate if file is too large

## Post-Deployment

Once deployed, you can:
- Share the Vercel URL with your team
- Set up a custom domain (optional)
- Enable automatic deployments on every push to main branch
- Monitor function logs and performance in Vercel dashboard

## Quick Reference

- **Vercel Dashboard:** https://vercel.com/dashboard
- **Project Settings:** Project → Settings → General
- **Environment Variables:** Project → Settings → Environment Variables
- **Deployment Logs:** Project → Deployments → [Select Deployment] → Logs
- **Function Logs:** Project → Functions → [Select Function] → Logs

