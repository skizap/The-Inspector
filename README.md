# The Inspector

**X-ray vision for npm packages** - Analyze dependencies, detect vulnerabilities, and make informed decisions before `npm install`.

## 🚀 Live Demo

**[https://the-inspector.vercel.app](https://the-inspector.vercel.app)**

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
- 🌳 **Dependency Tree** - Visual representation of the dependency graph
- 📄 **Export Reports** - Share findings as Markdown or PDF

## Documentation

All project documentation is located in the [`docs/`](./docs) directory:

- [**Full README**](./docs/README.md) - Complete project overview, setup, and usage
- [**Deployment Guide**](./docs/DEPLOYMENT.md) - Vercel and Netlify deployment instructions
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
