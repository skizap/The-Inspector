# The Inspector

**X-ray vision for npm packages** - Analyze dependencies, detect vulnerabilities, and make informed decisions before `npm install`.

## 🚀 Live Demo

**[https://the-inspector.netlify.app/](https://the-inspector.netlify.app/)**

## 📦 Repository

**[https://github.com/skizap/The-Inspector](https://github.com/skizap/The-Inspector)**

## Quick Start

```bash
npm install
npm start
```

The application will automatically open in your browser. Enter any npm package name to generate a comprehensive "Nutrition Label" report.

*Alternatively, use `npm run dev` if you prefer to manually open your browser.*

## Features

- 📦 **Package Analysis** - Deep dive into package metadata and dependencies
- 🔒 **Vulnerability Detection** - Identify security risks using OSV database
- 🤖 **AI-Powered Insights** - Plain-English summaries with 6 AI model options (Kimi K2 Thinking, Claude 3.5 Sonnet, GPT-4o, and more)
- 💾 **User Preferences** - Persistent model selection and optional API key storage
- ⚡ **Long-Running Analysis Support** - Background functions architecture handles slow AI models (50-60+ seconds) without timeouts
- 🌳 **Dependency Tree** - Visual representation of the dependency graph
- 📄 **Export Reports** - Share findings as Markdown or PDF

## Architecture Highlights

### Background Functions for Long-Running AI Analysis

The Inspector uses Netlify Background Functions to handle AI analysis requests that can take up to 60+ seconds to complete. This architecture ensures that slow AI models like Moonshot Kimi K2 Thinking work reliably without timeout errors.

**How it works:**
1. User clicks "Inspect" → Frontend receives a job ID immediately
2. Background function processes the AI request asynchronously (up to 15 minutes)
3. Frontend polls for completion every 3 seconds with real-time progress updates
4. Results are displayed when analysis completes

See `docs/BACKGROUND_FUNCTIONS.md` for technical details.

## Documentation

All project documentation is located in the [`docs/`](./docs) directory:

- [**Full README**](./docs/README.md) - Complete project overview, setup, and usage
- [**Deployment Guide**](./docs/DEPLOYMENT.md) - Vercel and Netlify deployment instructions
- [**Background Functions Architecture**](./docs/BACKGROUND_FUNCTIONS.md) - Long-running AI analysis implementation
- [**Testing Guide**](./docs/TESTING_GUIDE.md) - Comprehensive testing procedures
- [**Hackathon Writeup**](./docs/HACKATHON_WRITEUP.md) - Kiroween submission details
- [**Demo Script**](./docs/DEMO_SCRIPT.md) - 3-minute presentation guide
- [**Project Guide**](./docs/project-guide.md) - Architecture and development strategy
- [**Kiro Knowledge Asset**](./docs/kiro-knowledge-asset.md) - Kiro IDE best practices
- [**OpenRouter Reference**](./docs/openrouter-reference.md) - AI API integration guide

## Tech Stack

- **Frontend**: React 18 + Vite
- **APIs**: npm Registry, OSV, OpenAI and OpenRouter (via serverless proxy)
- **Deployment**: Vercel/Netlify with serverless functions

## Environment Setup

Copy `.env.example` to `.env` and configure your AI provider:

```bash
cp .env.example .env
```

The Inspector supports both OpenAI and OpenRouter (recommended). For OpenRouter:
```
VITE_AI_PROVIDER=openrouter
OPENROUTER_API_KEY=your_key_here
```

For OpenAI:
```
VITE_AI_PROVIDER=openai
OPENAI_API_KEY=your_key_here
```

See [docs/README.md](./docs/README.md) for complete multi-provider setup instructions.

## License

MIT

---

Built with [Kiro IDE](https://kiro.ai) for the Kiroween Hackathon 2024

**🚀 Live Demo:** [https://the-inspector.vercel.app](https://the-inspector.vercel.app)

**📦 Repository:** [https://github.com/skizap/The-Inspector](https://github.com/skizap/The-Inspector)
