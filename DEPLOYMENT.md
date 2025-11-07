# Deployment Guide

Deploy The Inspector to Vercel or Netlify

## Prerequisites

- Node.js 18+ installed
- npm or yarn package manager
- Git installed and configured
- GitHub account (for GitHub integration)
- Vercel or Netlify account (free tier is sufficient)
- OpenAI API key (get from https://platform.openai.com/api-keys)

## Deployment to Vercel (Recommended)

**Why Vercel:**
- Native support for serverless functions
- Automatic detection of Vite projects
- Simple environment variable configuration
- Free tier includes 100GB bandwidth and serverless function execution
- Excellent performance and reliability

### Option 1: Deploy via Vercel CLI

**Step 1: Install Vercel CLI**
```bash
npm install -g vercel
```

**Step 2: Login to Vercel**
```bash
vercel login
```

Follow the prompts to authenticate with your Vercel account.

**Step 3: Deploy from Project Directory**
```bash
cd /path/to/the-inspector
vercel
```

**Step 4: Configure Deployment**

Vercel CLI will ask several questions:
- "Set up and deploy?" → Yes
- "Which scope?" → Select your account
- "Link to existing project?" → No (first deployment)
- "What's your project's name?" → the-inspector (or custom name)
- "In which directory is your code located?" → ./ (current directory)
- "Want to override the settings?" → No (Vercel auto-detects Vite)

**Step 5: Set Environment Variables**

After deployment, set the required environment variables:
```bash
vercel env add OPENAI_API_KEY
```

Paste your OpenAI API key when prompted.
Select "Production" environment.

```bash
vercel env add VITE_DEPLOY_PLATFORM
```

Enter `vercel` when prompted.
Select "Production" environment.

**Step 6: Redeploy with Environment Variable**
```bash
vercel --prod
```

**Step 7: Access Your Deployment**

Vercel will provide a URL like: `https://the-inspector-xyz.vercel.app`

Open the URL in your browser to test the application.

### Option 2: Deploy via GitHub Integration (Easier)

**Step 1: Push to GitHub**
```bash
git add .
git commit -m "Prepare for deployment"
git push origin main
```

**Step 2: Import Project to Vercel**
- Go to https://vercel.com/new
- Click "Import Git Repository"
- Select your GitHub repository
- Click "Import"

**Step 3: Configure Project**
- **Project Name:** the-inspector (or custom name)
- **Framework Preset:** Vite (auto-detected)
- **Root Directory:** ./ (leave default)
- **Build Command:** `npm run build` (auto-detected)
- **Output Directory:** `dist` (auto-detected)
- **Install Command:** `npm install` (auto-detected)

**Step 4: Add Environment Variables**
- Click "Environment Variables"
- Add first variable:
  - **Name:** `OPENAI_API_KEY`
  - **Value:** [Your OpenAI API key]
  - **Environment:** Production, Preview, Development (select all)
- Click "Add"
- Add second variable:
  - **Name:** `VITE_DEPLOY_PLATFORM`
  - **Value:** `vercel`
  - **Environment:** Production, Preview, Development (select all)
- Click "Add"

**Step 5: Deploy**
- Click "Deploy"
- Wait 2-3 minutes for build and deployment
- Vercel will provide a URL like: `https://the-inspector-xyz.vercel.app`

**Step 6: Test Deployment**
- Open the deployment URL
- Enter a package name (e.g., "lodash")
- Click "Inspect"
- Verify that all features work:
  - Package metadata loads
  - Vulnerabilities are displayed
  - AI summary is generated (this confirms serverless function works)
  - Export buttons work

### Automatic Deployments

With GitHub integration, Vercel automatically deploys:
- **Production:** Every push to `main` branch
- **Preview:** Every pull request (unique URL for testing)

No manual deployment needed after initial setup.

## Deployment to Netlify (Alternative)

**Why Netlify:**
- Similar to Vercel with serverless function support
- Generous free tier
- Good performance and reliability
- Alternative if Vercel is unavailable

### Option 1: Deploy via Netlify CLI

**Step 1: Install Netlify CLI**
```bash
npm install -g netlify-cli
```

**Step 2: Login to Netlify**
```bash
netlify login
```

**Step 3: Initialize Netlify Project**
```bash
cd /path/to/the-inspector
netlify init
```

**Step 4: Configure Deployment**
- "Create & configure a new site" → Yes
- "Team" → Select your team
- "Site name" → the-inspector (or custom name)
- "Build command" → `npm run build`
- "Directory to deploy" → `dist`
- "Netlify functions folder" → `netlify/functions`

**Step 5: Set Environment Variables**
```bash
netlify env:set OPENAI_API_KEY your_openai_api_key_here
netlify env:set VITE_DEPLOY_PLATFORM netlify
```

**Step 6: Deploy**
```bash
netlify deploy --prod
```

**Step 7: Access Your Deployment**

Netlify will provide a URL like: `https://the-inspector-xyz.netlify.app`

### Option 2: Deploy via Netlify Dashboard

**Step 1: Push to GitHub**
```bash
git add .
git commit -m "Prepare for deployment"
git push origin main
```

**Step 2: Import Project to Netlify**
- Go to https://app.netlify.com/start
- Click "Import from Git"
- Select "GitHub"
- Authorize Netlify to access your repositories
- Select your repository

**Step 3: Configure Build Settings**
- **Branch to deploy:** main
- **Build command:** `npm run build`
- **Publish directory:** `dist`
- **Functions directory:** `netlify/functions`

**Step 4: Add Environment Variables**
- Click "Show advanced"
- Click "New variable"
- **Key:** `OPENAI_API_KEY`
- **Value:** [Your OpenAI API key]
- Click "New variable" again
- **Key:** `VITE_DEPLOY_PLATFORM`
- **Value:** `netlify`

**Step 5: Deploy**
- Click "Deploy site"
- Wait 2-3 minutes for build and deployment

**Step 6: Test Deployment**
- Open the deployment URL
- Test all features (package analysis, AI summary, export)

## Platform-Specific Configuration

### Serverless Function Endpoints

The Inspector uses platform-specific endpoints for OpenAI API calls:

- **Vercel**: `/api/analyze` (function in `api/analyze.js`)
- **Netlify**: `/.netlify/functions/analyze` (function in `netlify/functions/analyze.js`)

### Platform Detection

The frontend (`src/api/openai.js`) determines which endpoint to use via the `VITE_DEPLOY_PLATFORM` environment variable:

**Recommended Configuration:**

1. **Vercel Deployments:**
   - Set `VITE_DEPLOY_PLATFORM=vercel` in Vercel dashboard (or omit—defaults to Vercel)
   - Uses `/api/analyze` endpoint

2. **Netlify Deployments:**
   - Set `VITE_DEPLOY_PLATFORM=netlify` in Netlify dashboard
   - Uses `/.netlify/functions/analyze` endpoint

3. **Local Development with Netlify CLI:**
   - Add `VITE_DEPLOY_PLATFORM=netlify` to your `.env` file
   - Run `netlify dev` to test locally

**Auto-Detection Limitations:**

The application includes automatic fallback logic that tries the primary endpoint first and falls back to the alternative on 404/network errors. However, this auto-detection only works reliably on default Netlify subdomains (e.g., `*.netlify.app`).

**For custom domains or production deployments, always set `VITE_DEPLOY_PLATFORM` explicitly to avoid unnecessary fallback attempts and ensure deterministic routing.**

### Vercel Configuration (vercel.json)

The project includes a `vercel.json` file with optimized settings:

```json
{
  "functions": {
    "api/analyze.js": {
      "maxDuration": 30
    }
  }
}
```

**Configuration Explanation:**
- `maxDuration: 30`: Serverless function timeout (30 seconds)
  - OpenAI API calls can take 10-20 seconds
  - 30 seconds provides adequate buffer

**No changes needed** to this file for deployment.

### Netlify Configuration

The project includes a `netlify.toml` file with optimized settings:

```toml
[build]
  command = "npm run build"
  publish = "dist"
  functions = "netlify/functions"

[build.environment]
  NODE_VERSION = "18"

[functions]
  node_bundler = "esbuild"
```

**Configuration Explanation:**
- `functions = "netlify/functions"`: Specifies the serverless functions directory
- `NODE_VERSION = "18"`: Ensures Node.js 18+ is used for builds
- `node_bundler = "esbuild"`: Uses esbuild for faster function bundling

The project includes a Netlify-compatible function at `netlify/functions/analyze.js` that mirrors the Vercel function logic but uses Netlify's `handler(event, context)` signature.

**Netlify Function Timeout Limits:**
- Free tier: 10 seconds maximum execution time
- Pro tier: 26 seconds maximum execution time

**Important:** The default client timeout in `src/api/openai.js` is 30 seconds, which exceeds Netlify's free tier limit. If you experience timeout issues on Netlify:

1. **Option 1: Reduce OpenAI Response Time**
   - Lower `MAX_TOKENS` in `netlify/functions/analyze.js` (default: 1000, try: 500-750)
   - Lower `TEMPERATURE` for more deterministic responses (default: 0.7, try: 0.3-0.5)
   - These changes will make AI responses faster but potentially less detailed

2. **Option 2: Add Custom Timeout Override**
   - Add `VITE_OPENAI_TIMEOUT` environment variable in Netlify dashboard
   - Set value to `25000` (25 seconds) to stay within Pro tier limits
   - The client will use this value instead of the default 30 seconds

3. **Option 3: Upgrade to Netlify Pro**
   - Increases function timeout to 26 seconds
   - Provides more headroom for complex package analysis

**No changes needed** to these files for basic deployment, but consider timeout adjustments for production use.

## Environment Variables

**Required Variables:**

1. **`OPENAI_API_KEY`** (Server-Side Only)
   - Your OpenAI API key for AI-powered analysis
   - Do NOT prefix with `VITE_` (would expose to browser)
   - Used server-side only in `api/analyze.js` and `netlify/functions/analyze.js`
   - Never commit to repository (in .gitignore)

2. **`VITE_DEPLOY_PLATFORM`** (Client-Side)
   - Specifies which serverless function endpoint to use
   - Values: `vercel` or `netlify`
   - Default: `vercel` (if unset)
   - Prefixed with `VITE_` because it's used in browser code

**Setting in Vercel:**
- Dashboard: Project Settings → Environment Variables
  - Add `OPENAI_API_KEY`:
    - Name: `OPENAI_API_KEY`
    - Value: [Your OpenAI API key]
    - Environments: Production, Preview, Development (select all)
  - Add `VITE_DEPLOY_PLATFORM`:
    - Name: `VITE_DEPLOY_PLATFORM`
    - Value: `vercel`
    - Environments: Production, Preview, Development (select all)
- CLI:
  ```bash
  vercel env add OPENAI_API_KEY
  vercel env add VITE_DEPLOY_PLATFORM
  ```

**Setting in Netlify:**
- Dashboard: Site Settings → Environment Variables
  - Add `OPENAI_API_KEY`:
    - Key: `OPENAI_API_KEY`
    - Value: [Your OpenAI API key]
  - Add `VITE_DEPLOY_PLATFORM`:
    - Key: `VITE_DEPLOY_PLATFORM`
    - Value: `netlify`
- CLI:
  ```bash
  netlify env:set OPENAI_API_KEY your_key
  netlify env:set VITE_DEPLOY_PLATFORM netlify
  ```

**Local Development:**
- For Vercel: Use `vercel dev` (automatically loads `.env` file)
- For Netlify: Add `VITE_DEPLOY_PLATFORM=netlify` to `.env` file and run `netlify dev`

## Troubleshooting

### Issue 1: AI Summary Not Working

**Symptoms:**
- Package metadata and vulnerabilities load
- AI summary shows "AI analysis unavailable"
- Console shows 500 error from `/api/analyze`

**Solution:**
- Verify `OPENAI_API_KEY` is set in deployment platform
- Check environment variable name (no `VITE_` prefix)
- Verify API key is valid (test at https://platform.openai.com)
- Check serverless function logs for errors

### Issue 2: Serverless Function Timeout

**Symptoms:**
- Analysis takes >30 seconds
- 504 Gateway Timeout error

**Solution:**
- Increase `maxDuration` in `vercel.json` (max 60s on free tier)
- Optimize OpenAI prompt (reduce max_tokens)
- Check OpenAI API status (https://status.openai.com)

### Issue 3: Build Fails

**Symptoms:**
- Deployment fails during build step
- Error: "Command failed: npm run build"

**Solution:**
- Check build logs for specific error
- Verify all dependencies are in `package.json`
- Test build locally: `npm run build`
- Ensure Node.js version is 18+ (set in Vercel/Netlify settings)

### Issue 4: 404 on Serverless Function

**Symptoms:**
- Frontend loads correctly
- `/api/analyze` (Vercel) or `/.netlify/functions/analyze` (Netlify) returns 404

**Solution:**
- **Vercel**: Verify `api/` directory is committed to repository
- **Netlify**: Verify `netlify/functions/` directory is committed to repository
- Check `vercel.json` configuration (Vercel only)
- Ensure serverless function is detected in build logs
- Verify the correct endpoint is being called (check browser Network tab)
- The frontend automatically detects the platform based on hostname
- Redeploy with `vercel --prod` or `netlify deploy --prod`

## Post-Deployment Checklist

**Update Documentation with URLs:**
- [ ] Add deployment URL to README.md (top section)
- [ ] Add GitHub repository URL to README.md (top section)
- [ ] Update DEMO_SCRIPT.md with deployment and repository URLs
- [ ] Update HACKATHON_WRITEUP.md with deployment and repository URLs
- [ ] Commit and push documentation updates

**Functionality Tests:**
- [ ] Homepage loads correctly
- [ ] Can enter package name in form
- [ ] Package metadata loads (test with "lodash")
- [ ] Vulnerabilities are displayed (test with "lodash@4.17.15")
- [ ] AI summary is generated (confirms serverless function works)
- [ ] Dependency tree is displayed
- [ ] Export to Markdown works
- [ ] Export to PDF works
- [ ] Error handling works (test with invalid package name)
- [ ] Loading states are displayed
- [ ] Responsive design works on mobile

**Performance Tests:**
- [ ] First analysis completes in <30 seconds
- [ ] Cached analysis completes in <1 second
- [ ] No console errors
- [ ] No network errors in DevTools

**Security Tests:**
- [ ] OpenAI API key is NOT exposed in browser (check Network tab)
- [ ] HTTPS is enforced (check URL)
- [ ] No sensitive data in console logs

**Hackathon Submission:**
- [ ] Deployment URL is public and accessible
- [ ] GitHub repository is public
- [ ] `.kiro/` directory is committed (not in .gitignore)
- [ ] README.md includes deployment URL
- [ ] Demo video is uploaded and linked

## Custom Domain (Optional)

**Vercel:**
- Go to Project Settings → Domains
- Add your custom domain
- Configure DNS records as instructed
- Vercel automatically provisions SSL certificate

**Netlify:**
- Go to Site Settings → Domain Management
- Add custom domain
- Configure DNS records as instructed
- Netlify automatically provisions SSL certificate

## Monitoring and Logs

**Vercel:**
- View deployment logs: Project → Deployments → Select deployment → View Logs
- View serverless function logs: Project → Functions → Select function → View Logs
- Monitor usage: Project → Analytics

**Netlify:**
- View deployment logs: Site → Deploys → Select deploy → Deploy log
- View serverless function logs: Site → Functions → Select function → Logs
- Monitor usage: Site → Analytics

## Updating Deployment

**With GitHub Integration (Automatic):**
```bash
git add .
git commit -m "Update feature"
git push origin main
```

Vercel/Netlify automatically deploys the update.

**With CLI (Manual):**
```bash
vercel --prod
# or
netlify deploy --prod
```

**Rollback to Previous Version:**
- Vercel: Project → Deployments → Select previous deployment → Promote to Production
- Netlify: Site → Deploys → Select previous deploy → Publish deploy

---

**Deployment Complete!**

Your application is now live and accessible to the world. Share the URL with hackathon judges and users.

**Need Help?**
- Vercel Documentation: https://vercel.com/docs
- Netlify Documentation: https://docs.netlify.com
- Kiro IDE Support: https://kiro.ai/support
