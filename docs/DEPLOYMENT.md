# Deployment Guide

Deploy The Inspector to Vercel or Netlify

## Prerequisites

- Node.js 18+ installed
- npm or yarn package manager
- Git installed and configured
- GitHub account (for GitHub integration)
- Vercel or Netlify account (free tier is sufficient)
- OpenAI API key (for OpenAI provider) OR OpenRouter API key (for OpenRouter provider - recommended)
- Get OpenAI key from: https://platform.openai.com/api-keys
- Get OpenRouter key from: https://openrouter.ai/keys (recommended for access to multiple models)

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

Choose one provider path (OpenRouter recommended or OpenAI):

**Option A: OpenRouter (Recommended)**
```bash
vercel env add VITE_AI_PROVIDER
# Enter: openrouter

vercel env add OPENROUTER_API_KEY
# Paste your OpenRouter API key

vercel env add VITE_DEFAULT_MODEL
# Enter: moonshotai/kimi-k2-thinking

vercel env add VITE_DEPLOY_PLATFORM
# Enter: vercel
```

**Option B: OpenAI**
```bash
vercel env add VITE_AI_PROVIDER
# Enter: openai

vercel env add OPENAI_API_KEY
# Paste your OpenAI API key

vercel env add VITE_DEFAULT_MODEL
# Enter: gpt-4o

vercel env add VITE_DEPLOY_PLATFORM
# Enter: vercel
```

Select "Production" environment for all variables.

**Step 6: Redeploy with Environment Variable**
```bash
vercel --prod
```

**Step 7: Access Your Deployment**

Vercel will provide a URL like: `https://the-inspector.vercel.app` (your actual deployment URL)

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

Choose one provider path (OpenRouter recommended or OpenAI). Do not configure both.

**Option A: OpenRouter (Recommended)**
- Click "Environment Variables"
- Add variables:
  - **Name:** `VITE_AI_PROVIDER` | **Value:** `openrouter` | **Environment:** All
  - **Name:** `OPENROUTER_API_KEY` | **Value:** [Your OpenRouter API key] | **Environment:** All
  - **Name:** `VITE_DEFAULT_MODEL` | **Value:** `moonshotai/kimi-k2-thinking` | **Environment:** All
  - **Name:** `VITE_DEPLOY_PLATFORM` | **Value:** `vercel` | **Environment:** All
- Click "Add" after each variable

**Option B: OpenAI**
- Click "Environment Variables"
- Add variables:
  - **Name:** `VITE_AI_PROVIDER` | **Value:** `openai` | **Environment:** All
  - **Name:** `OPENAI_API_KEY` | **Value:** [Your OpenAI API key] | **Environment:** All
  - **Name:** `VITE_DEFAULT_MODEL` | **Value:** `gpt-4o` | **Environment:** All
  - **Name:** `VITE_DEPLOY_PLATFORM` | **Value:** `vercel` | **Environment:** All
- Click "Add" after each variable

**Step 5: Deploy**
- Click "Deploy"
- Wait 2-3 minutes for build and deployment
- Vercel will provide a URL like: `https://the-inspector.vercel.app` (your actual deployment URL)

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

Choose one provider path (OpenRouter recommended or OpenAI):

**Option A: OpenRouter (Recommended)**
```bash
netlify env:set VITE_AI_PROVIDER openrouter
netlify env:set OPENROUTER_API_KEY your_openrouter_api_key_here
netlify env:set VITE_DEFAULT_MODEL moonshotai/kimi-k2-thinking
netlify env:set VITE_DEPLOY_PLATFORM netlify
```

**Option B: OpenAI**
```bash
netlify env:set VITE_AI_PROVIDER openai
netlify env:set OPENAI_API_KEY your_openai_api_key_here
netlify env:set VITE_DEFAULT_MODEL gpt-4o
netlify env:set VITE_DEPLOY_PLATFORM netlify
```

**Step 6: Deploy**
```bash
netlify deploy --prod
```

**Step 7: Access Your Deployment**

Netlify will provide a URL like: `https://the-inspector-xyz.netlify.app` (example Netlify URL - yours will differ)

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

Choose one provider path (OpenRouter recommended or OpenAI). Do not configure both.

**Option A: OpenRouter (Recommended)**
- Click "Show advanced"
- Add variables:
  - **Key:** `VITE_AI_PROVIDER` | **Value:** `openrouter`
  - **Key:** `OPENROUTER_API_KEY` | **Value:** [Your OpenRouter API key]
  - **Key:** `VITE_DEFAULT_MODEL` | **Value:** `moonshotai/kimi-k2-thinking`
  - **Key:** `VITE_DEPLOY_PLATFORM` | **Value:** `netlify`

**Option B: OpenAI**
- Click "Show advanced"
- Add variables:
  - **Key:** `VITE_AI_PROVIDER` | **Value:** `openai`
  - **Key:** `OPENAI_API_KEY` | **Value:** [Your OpenAI API key]
  - **Key:** `VITE_DEFAULT_MODEL` | **Value:** `gpt-4o`
  - **Key:** `VITE_DEPLOY_PLATFORM` | **Value:** `netlify`

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

The frontend (`src/api/ai.js`) determines which endpoint to use via the `VITE_DEPLOY_PLATFORM` environment variable:

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

**Endpoint Fallback Behavior:**

The application includes automatic fallback logic that tries the primary endpoint first and falls back to the alternative on 404/network errors. This fallback attempts the alternate endpoint regardless of hostname.

**For production deployments and custom domains, always set `VITE_DEPLOY_PLATFORM` explicitly to avoid unnecessary fallback attempts and ensure deterministic routing.**

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

**Important:** The default client timeout in `src/api/ai.js` is 30 seconds, which exceeds Netlify's free tier limit. If you experience timeout issues on Netlify:

1. **Option 1: Reduce AI Response Time**
   - Lower `MAX_TOKENS` in `netlify/functions/analyze.js` (default: 1000, try: 500-750)
   - Lower `TEMPERATURE` for more deterministic responses (default: 0.7, try: 0.3-0.5)
   - These changes will make AI responses faster but potentially less detailed

2. **Option 2: Add Custom Timeout Override**
   - Add `VITE_AI_TIMEOUT` environment variable in Netlify dashboard
   - Set value to `25000` (25 seconds) to stay within Pro tier limits
   - The client will use this value instead of the default 30 seconds

3. **Option 3: Upgrade to Netlify Pro**
   - Increases function timeout to 26 seconds
   - Provides more headroom for complex package analysis

**No changes needed** to these files for basic deployment, but consider timeout adjustments for production use.

## Environment Variables

The Inspector supports multiple AI providers (OpenAI and OpenRouter). This section provides comprehensive deployment-focused documentation for configuring your chosen provider.

### Required Variables

#### 1. AI Provider Selection

**`VITE_AI_PROVIDER`** (Client-Side)
- Determines which AI service to use for package analysis
- Values: `"openai"` or `"openrouter"`
- Prefixed with `VITE_` because it's used in browser code
- **Backward Compatibility Logic:**
  - If `VITE_AI_PROVIDER` is set, use that value
  - If `VITE_AI_PROVIDER` is unset but `OPENAI_API_KEY` exists, default to `"openai"`
  - If neither is set, the application will fail with a configuration error
- **Recommendation:** Set explicitly for production deployments to avoid ambiguity

**Provider Determination:**
- The `VITE_AI_PROVIDER` environment variable determines which AI service is used
- If `VITE_AI_PROVIDER` is unset but `OPENAI_API_KEY` exists, defaults to `"openai"` (backward compatibility)
- If both `OPENAI_API_KEY` and `OPENROUTER_API_KEY` exist but `VITE_AI_PROVIDER` is unset, defaults to `"openai"` (backward compatibility)
- **Model Compatibility:**
  - When `VITE_AI_PROVIDER='openrouter'`: All six curated models are valid (validated against `VALID_OPENROUTER_MODELS`)
  - When `VITE_AI_PROVIDER='openai'`: Only native OpenAI model IDs are valid (e.g., `gpt-4o`, `gpt-4-turbo`)
  - Selecting an incompatible model for the configured provider will result in an error

#### 2. OpenAI Configuration (Conditional)

**`OPENAI_API_KEY`** (Server-Side Only)
- Required when `VITE_AI_PROVIDER='openai'` or when using backward compatibility mode
- Your OpenAI API key for AI-powered analysis
- Do NOT prefix with `VITE_` (would expose to browser - security risk)
- Used server-side only in `api/analyze.js` and `netlify/functions/analyze.js`
- Never commit to repository (in .gitignore)
- Get your API key from: https://platform.openai.com/api-keys

**Setting in Vercel:**
- Dashboard: Project Settings → Environment Variables
  - Name: `OPENAI_API_KEY`
  - Value: [Your OpenAI API key]
  - Environments: Production, Preview, Development (select all)
- CLI:
  ```bash
  vercel env add OPENAI_API_KEY
  ```

**Setting in Netlify:**
- Dashboard: Site Settings → Environment Variables
  - Key: `OPENAI_API_KEY`
  - Value: [Your OpenAI API key]
- CLI:
  ```bash
  netlify env:set OPENAI_API_KEY your_key
  ```

#### 3. OpenRouter Configuration (Conditional)

**`OPENROUTER_API_KEY`** (Server-Side Only)
- Required when `VITE_AI_PROVIDER='openrouter'`
- Your OpenRouter API key for AI-powered analysis
- Do NOT prefix with `VITE_` (would expose to browser - security risk)
- Used server-side only in `api/analyze.js` and `netlify/functions/analyze.js`
- Never commit to repository (in .gitignore)
- Get your API key from: https://openrouter.ai/keys

**Setting in Vercel:**
- Dashboard: Project Settings → Environment Variables
  - Name: `OPENROUTER_API_KEY`
  - Value: [Your OpenRouter API key]
  - Environments: Production, Preview, Development (select all)
- CLI:
  ```bash
  vercel env add OPENROUTER_API_KEY
  ```

**Setting in Netlify:**
- Dashboard: Site Settings → Environment Variables
  - Key: `OPENROUTER_API_KEY`
  - Value: [Your OpenRouter API key]
- CLI:
  ```bash
  netlify env:set OPENROUTER_API_KEY your_key
  ```

#### 4. Model Configuration

**`VITE_DEFAULT_MODEL`** (Client-Side)
- Sets the initial model selection in the UI dropdown
- Users can change models via the UI dropdown after initial load
- Prefixed with `VITE_` because it's used in browser code
- **IMPORTANT:** Model must be compatible with your configured `VITE_AI_PROVIDER`
- **Provider-Specific Examples:**
  - OpenRouter (`VITE_AI_PROVIDER='openrouter'`): `"moonshotai/kimi-k2-thinking"`, `"anthropic/claude-3.5-sonnet"`, `"openai/gpt-4o"`, `"google/gemini-flash-1.5"`, `"meta-llama/llama-3.1-70b-instruct"`, `"mistralai/mistral-large"`
  - OpenAI (`VITE_AI_PROVIDER='openai'`): `"gpt-4o"`, `"gpt-4-turbo"` (native OpenAI IDs only)

**Setting in Vercel:**
- Dashboard: Project Settings → Environment Variables
  - Name: `VITE_DEFAULT_MODEL`
  - Value: `moonshotai/kimi-k2-thinking` (for OpenRouter) or `gpt-4o` (for OpenAI)
  - Environments: Production, Preview, Development (select all)
- CLI:
  ```bash
  vercel env add VITE_DEFAULT_MODEL
  ```

**Setting in Netlify:**
- Dashboard: Site Settings → Environment Variables
  - Key: `VITE_DEFAULT_MODEL`
  - Value: `moonshotai/kimi-k2-thinking` (for OpenRouter) or `gpt-4o` (for OpenAI)
- CLI:
  ```bash
  netlify env:set VITE_DEFAULT_MODEL moonshotai/kimi-k2-thinking
  ```

### Optional Variables

#### 5. OpenRouter Attribution (OpenRouter Only)

**`VITE_SITE_URL`** and **`VITE_SITE_NAME`** (Client-Side)
- Optional headers for OpenRouter app attribution
- Enables app listing at: https://openrouter.ai/apps
- Provides benefits like increased rate limits and visibility
- **Example Values:**
  - `VITE_SITE_URL`: Your deployment URL (e.g., `"https://the-inspector.vercel.app"` for the actual deployment)
  - `VITE_SITE_NAME`: `"The Inspector"` (or custom name)

**Setting in Vercel:**
- Dashboard: Project Settings → Environment Variables
  - Name: `VITE_SITE_URL`
  - Value: `https://the-inspector.vercel.app` (your actual deployment URL)
  - Environments: Production, Preview, Development (select all)
  - Name: `VITE_SITE_NAME`
  - Value: `The Inspector`
  - Environments: Production, Preview, Development (select all)
- CLI:
  ```bash
  vercel env add VITE_SITE_URL
  vercel env add VITE_SITE_NAME
  ```

**Setting in Netlify:**
- Dashboard: Site Settings → Environment Variables
  - Key: `VITE_SITE_URL`
  - Value: [Your Netlify deployment URL]
  - Key: `VITE_SITE_NAME`
  - Value: `The Inspector`
- CLI:
  ```bash
  netlify env:set VITE_SITE_URL https://your-app.netlify.app
  netlify env:set VITE_SITE_NAME "The Inspector"
  ```

### Configuration Examples

#### Example 1: OpenRouter Setup (Recommended)

```bash
VITE_AI_PROVIDER=openrouter
OPENROUTER_API_KEY=sk-or-v1-...
VITE_DEFAULT_MODEL=moonshotai/kimi-k2-thinking
VITE_SITE_URL=https://the-inspector.vercel.app
VITE_SITE_NAME=The Inspector
```

#### Example 2: OpenAI Setup

```bash
VITE_AI_PROVIDER=openai
OPENAI_API_KEY=sk-...
VITE_DEFAULT_MODEL=gpt-4o
```

#### Example 3: Backward Compatible (OpenAI)

```bash
OPENAI_API_KEY=sk-...
# VITE_AI_PROVIDER not set, defaults to openai
```

### Local Development

**Testing with OpenRouter:**
1. Create `.env` file at project root
2. Add the following variables:
   ```bash
   VITE_AI_PROVIDER=openrouter
   OPENROUTER_API_KEY=sk-or-v1-...
   VITE_DEFAULT_MODEL=moonshotai/kimi-k2-thinking
   VITE_SITE_URL=http://localhost:5173
   VITE_SITE_NAME=The Inspector
   ```
3. Run development server:
   - Vercel: `vercel dev` (automatically loads `.env`)
   - Netlify: `netlify dev` (automatically loads `.env`)

**Testing with OpenAI:**
1. Create `.env` file at project root
2. Add the following variables:
   ```bash
   VITE_AI_PROVIDER=openai
   OPENAI_API_KEY=sk-...
   VITE_DEFAULT_MODEL=gpt-4o
   ```
3. Run development server:
   - Vercel: `vercel dev` (automatically loads `.env`)
   - Netlify: `netlify dev` (automatically loads `.env`)

## Model Selection Feature

The Inspector includes a model selection dropdown with 6 curated AI models:

**Available Models:**
1. **Moonshot Kimi K2 Thinking** (Recommended) - Advanced reasoning model
2. **Claude 3.5 Sonnet** - Strong analytical capabilities
3. **OpenAI GPT-4o** - Flagship model with multimodal support
4. **Google Gemini Flash (Free)** - Fast, cost-effective analysis
5. **Meta Llama 3.1 70B** - Open-source alternative
6. **Mistral Large** - European AI model

**How It Works:**
- Users select their preferred model from the dropdown before analysis
- The selected model is passed to the backend via the request body
- Backend uses the provider configured via `VITE_AI_PROVIDER` environment variable
- If no model is selected, the system uses `VITE_DEFAULT_MODEL` or provider-specific defaults

**Provider Determination:**
- The `VITE_AI_PROVIDER` environment variable determines which AI service is used
- If `VITE_AI_PROVIDER` is unset but `OPENAI_API_KEY` exists, defaults to OpenAI (backward compatibility)
- **Model Compatibility:**
  - When `VITE_AI_PROVIDER='openrouter'`: All six curated models are valid
  - When `VITE_AI_PROVIDER='openai'`: Only native OpenAI model IDs (e.g., `gpt-4o`) are valid
  - Selecting an incompatible model for the configured provider will result in an error

**Testing Model Selection:**
1. Deploy with OpenRouter configuration (recommended)
2. Open the application and verify the dropdown displays all 6 models
3. Select different models and analyze packages
4. Check browser console logs to confirm model selection is passed correctly
5. Verify analysis completes successfully with each model

## Troubleshooting

### Issue 1: AI Summary Not Working (Multi-Provider)

**Symptoms:**
- Package metadata and vulnerabilities load
- AI summary shows "AI analysis unavailable"
- Console shows 500 error from `/api/analyze`

**Solution:**
- Verify the correct API key is set based on your provider (`OPENAI_API_KEY` for OpenAI or `OPENROUTER_API_KEY` for OpenRouter)
- Check that `VITE_AI_PROVIDER` matches your API key configuration
- Verify `VITE_AI_PROVIDER` is set correctly: `"openai"` or `"openrouter"`
- If `VITE_AI_PROVIDER` is unset, the system defaults to OpenAI if `OPENAI_API_KEY` exists
- Ensure selected model is compatible with your configured provider (OpenAI provider requires native OpenAI model IDs like `gpt-4o`)
- For OpenRouter, verify your API key has sufficient credits at https://openrouter.ai/credits
- Check environment variable name (no `VITE_` prefix for API keys)
- Verify API key is valid (test at https://platform.openai.com or https://openrouter.ai)
- Check serverless function logs for errors

### Issue 2: Model Selection Not Working

**Symptoms:**
- Model dropdown is empty or shows incorrect options
- Selected model is not used for analysis
- Console shows model-related errors

**Solution:**
- Verify `VITE_DEFAULT_MODEL` is set correctly in environment variables
- Ensure `VITE_DEFAULT_MODEL` is compatible with your `VITE_AI_PROVIDER`:
  - OpenRouter: Use any of the six curated models (e.g., `moonshotai/kimi-k2-thinking`)
  - OpenAI: Use native OpenAI model IDs only (e.g., `gpt-4o`, not `openai/gpt-4o`)
- Ensure the frontend was rebuilt after changing environment variables (`npm run build`)
- Check browser console for JavaScript errors related to model selection
- Verify the model is supported by your configured provider (check OpenRouter model list at https://openrouter.ai/models)

### Issue 3: Serverless Function Timeout

**Symptoms:**
- Analysis takes >30 seconds
- 504 Gateway Timeout error

**Solution:**
- Increase `maxDuration` in `vercel.json` (max 60s on free tier)
- Optimize OpenAI prompt (reduce max_tokens)
- Check OpenAI API status (https://status.openai.com)

### Issue 4: Build Fails

**Symptoms:**
- Deployment fails during build step
- Error: "Command failed: npm run build"

**Solution:**
- Check build logs for specific error
- Verify all dependencies are in `package.json`
- Test build locally: `npm run build`
- Ensure Node.js version is 18+ (set in Vercel/Netlify settings)

### Issue 5: 404 on Serverless Function

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
- [ ] AI summary is generated with default model (confirms serverless function works)
- [ ] Model selection dropdown displays all 6 models
- [ ] Can select different models and analysis completes successfully
- [ ] Default model is pre-selected based on `VITE_DEFAULT_MODEL`
- [ ] OpenRouter attribution headers are sent (if configured)
- [ ] Dependency tree is displayed
- [ ] Export to Markdown works
- [ ] Export to PDF works
- [ ] Error handling works (test with invalid package name)
- [ ] Loading states are displayed
- [ ] Responsive design works on mobile
- [ ] User preferences: Selected model persists across page reloads (check localStorage key `inspector-selected-model`)
- [ ] Settings modal: Click ⚙ icon in header to open Settings modal
- [ ] Settings modal: Can save OpenRouter/OpenAI API key (stored in localStorage with Base64 encoding)
- [ ] Settings modal (Vercel only): Saved API key is used for analysis instead of server-side key
- [ ] Settings modal (Netlify): User-provided API key override not supported; server-side key always used
- [ ] Settings modal: Can clear saved API key
- [ ] Example package buttons: Six quick example buttons are displayed (react, lodash, express, axios, typescript, webpack)
- [ ] Example package buttons: Clicking an example button auto-fills package name and starts analysis
- [ ] Example package buttons: All six example packages analyze successfully

**Performance Tests:**
- [ ] First analysis completes in <30 seconds
- [ ] Cached analysis completes in <1 second
- [ ] No console errors
- [ ] No network errors in DevTools

**Security Tests:**
- [ ] API keys (OpenAI/OpenRouter) are NOT exposed in browser (check Network tab)
- [ ] User-provided API keys in Settings are Base64 encoded in localStorage (not plaintext)
- [ ] User-provided API key override works on Vercel deployments (Authorization header sent)
- [ ] User-provided API key override not supported on Netlify (server-side key always used)
- [ ] HTTPS is enforced (check URL)
- [ ] No sensitive data in console logs

**Hackathon Submission:**
- [ ] Deployment URL is public and accessible
- [ ] GitHub repository is public
- [ ] `.kiro/` directory is committed (not in .gitignore)
- [ ] README.md includes deployment URL
- [ ] Demo video is uploaded and linked

## Multi-Provider Testing Checklist

After deployment, perform these tests to verify the OpenRouter integration:

### Provider Configuration Tests

**Test 1: OpenAI Provider (Backward Compatibility)**
- [ ] Set only `OPENAI_API_KEY` (no `VITE_AI_PROVIDER`)
- [ ] Application defaults to OpenAI provider
- [ ] Analysis completes successfully
- [ ] Console logs show:
  - Vercel: `[serverless] Using AI provider: openai`
  - Netlify: `[netlify] Using AI provider: openai`

**Test 2: OpenRouter Provider**
- [ ] Set `VITE_AI_PROVIDER=openrouter` and `OPENROUTER_API_KEY`
- [ ] Application uses OpenRouter provider
- [ ] Analysis completes successfully
- [ ] Console logs show:
  - Vercel: `[serverless] Using AI provider: openrouter`
  - Netlify: `[netlify] Using AI provider: openrouter`

**Test 3: Provider Validation**
- [ ] Set `VITE_AI_PROVIDER=openrouter` without `OPENROUTER_API_KEY`
- [ ] Application returns 500 error: "OPENROUTER_API_KEY is not set"
- [ ] Error is displayed in UI

### Model Selection Tests

**Test 4: Default Model**
- [ ] Verify dropdown shows model from `VITE_DEFAULT_MODEL`
- [ ] Analysis uses the default model
- [ ] Console logs show:
  - Vercel: `[serverless] Using model: [default model]`
  - Netlify: `[netlify] Using model: [default model]`

**Test 5: Model Selection from Dropdown**
- [ ] Select "Moonshot Kimi K2 Thinking" and analyze
- [ ] Select "Claude 3.5 Sonnet" and analyze
- [ ] Select "OpenAI GPT-4o" and analyze
- [ ] Select "Google Gemini Flash" and analyze
- [ ] Select "Meta Llama 3.1 70B" and analyze
- [ ] Select "Mistral Large" and analyze
- [ ] All 6 models complete analysis successfully (when `VITE_AI_PROVIDER='openrouter'`)
- [ ] **Note:** When `VITE_AI_PROVIDER='openai'`, only native OpenAI model IDs work; selecting non-OpenAI models will fail

**Test 6: Model Fallback**
- [ ] Remove `VITE_DEFAULT_MODEL` from environment
- [ ] Application uses provider-specific default
- [ ] OpenRouter: defaults to `moonshotai/kimi-k2-thinking`
- [ ] OpenAI: defaults to `gpt-4o`

### Attribution Tests (OpenRouter Only)

**Test 7: App Attribution Headers**
- [ ] Set `VITE_SITE_URL` and `VITE_SITE_NAME`
- [ ] Analyze a package
- [ ] Check server logs for HTTP-Referer and X-Title headers
- [ ] Verify headers are sent to OpenRouter API

### Integration Tests

**Test 8: Complete Feature Integration**
- [ ] Package metadata loads correctly
- [ ] Vulnerabilities are displayed
- [ ] AI summary is generated with selected model
- [ ] Dependency tree is displayed
- [ ] Export to Markdown works
- [ ] Export to PDF works
- [ ] Caching works (second analysis is instant)
- [ ] All features work together seamlessly

### Performance Tests

**Test 9: Model Performance Comparison**
- [ ] Analyze same package with different models
- [ ] Compare response times (Gemini Flash should be fastest)
- [ ] Compare analysis quality (Kimi K2 should be most detailed)
- [ ] Verify all models complete within timeout (30 seconds)

### Error Handling Tests

**Test 10: Provider-Agnostic Error Messages**
- [ ] Trigger authentication error (invalid API key)
- [ ] Verify error mentions specific provider (e.g., "openrouter API authentication failed")
- [ ] Trigger rate limit error
- [ ] Verify error message is provider-agnostic ("AI API rate limit exceeded")
- [ ] Trigger timeout error
- [ ] Verify error message is provider-agnostic ("AI request timed out")

### Success Criteria

✅ All provider configuration tests pass  
✅ All model selection tests pass  
✅ Attribution headers are sent (when configured)  
✅ All integration tests pass  
✅ Performance is acceptable for all models  
✅ Error handling is robust and user-friendly  
✅ Backward compatibility is maintained

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
- Monitor model usage: Check which models are being used most frequently
- Monitor provider distribution: Track OpenAI vs OpenRouter usage

**Netlify:**
- View deployment logs: Site → Deploys → Select deploy → Deploy log
- View serverless function logs: Site → Functions → Select function → Logs
- Monitor usage: Site → Analytics
- Monitor model usage: Check which models are being used most frequently
- Monitor provider distribution: Track OpenAI vs OpenRouter usage
- Monitor model performance: Compare response times across different models

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

## Best Practices for Multi-Provider Deployment

**Provider Selection:**
- **Recommended**: Use OpenRouter for access to multiple models and better cost control
- **Alternative**: Use OpenAI for direct API access and potentially lower latency
- **Hybrid**: Deploy multiple instances with different providers for redundancy

**Model Configuration:**
- Set `VITE_DEFAULT_MODEL` to a reliable, cost-effective model (e.g., `moonshotai/kimi-k2-thinking`)
- Test all 6 models in staging before production deployment
- Monitor model performance and adjust defaults based on usage patterns
- Consider model costs when selecting defaults (Gemini Flash is free, others vary)

**Environment Variables:**
- Always set `VITE_AI_PROVIDER` explicitly in production (avoid relying on backward compatibility)
- Use separate environment variables for staging and production
- Rotate API keys regularly for security
- Set `VITE_SITE_URL` and `VITE_SITE_NAME` for OpenRouter attribution benefits

**Monitoring:**
- Track model usage to understand user preferences
- Monitor API costs across providers
- Set up alerts for API errors or rate limits
- Log model selection for debugging and analytics

**Cost Optimization:**
- Use Gemini Flash for simple packages (free tier)
- Use Kimi K2 or Claude for complex packages requiring detailed analysis
- Set appropriate `MAX_TOKENS` limits in serverless functions
- Implement caching for repeated analyses (already implemented for npm/OSV data)

**Security:**
- Never commit API keys to repository
- Use environment variables for all sensitive configuration
- Rotate API keys if exposed
- Monitor API usage for suspicious activity
- Verify HTTPS is enforced on all deployments

---

**Deployment Complete!**

Your application is now live and accessible to the world. Share the URL with hackathon judges and users.

**Need Help?**
- Vercel Documentation: https://vercel.com/docs
- Netlify Documentation: https://docs.netlify.com
- Kiro IDE Support: https://kiro.ai/support
