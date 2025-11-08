# The Inspector

**X-ray vision for npm packages** - Analyze dependencies, detect vulnerabilities, and make informed decisions before `npm install`.

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
- 🤖 **AI-Powered Insights** - Plain-English summaries and recommendations
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
- **APIs**: npm Registry, OSV, OpenAI (via serverless proxy)
- **Deployment**: Vercel/Netlify with serverless functions

## Environment Setup

Copy `.env.example` to `.env` and add your OpenAI API key:

```bash
cp .env.example .env
# Edit .env and add: OPENAI_API_KEY=your_key_here
```

## License

MIT

---

Built with [Kiro IDE](https://kiro.ai) for the Kiroween Hackathon 2024
