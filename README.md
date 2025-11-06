# The Inspector - Package Analysis Tool

## Description

The Inspector is a developer utility that acts as an "X-ray" for open-source npm packages. Before installing any package, developers can use The Inspector to generate a comprehensive "Nutrition Label" report that reveals hidden dependencies, security vulnerabilities, license restrictions, and overall complexity. This tool promotes informed decision-making and better security practices in the JavaScript ecosystem.

## Features

- **Package Metadata Analysis**: Fetch comprehensive package information from npm Registry
- **Vulnerability Scanning**: Identify known security vulnerabilities using the OSV database
- **AI-Powered Risk Assessment**: Plain-English summaries of security concerns and recommendations powered by OpenAI GPT-4
- **Dependency Visualization**: Interactive tree view of package dependencies
- **Export Functionality**: Download reports as Markdown or PDF for team sharing
- **Automated Auditing**: Agent Hook integration for automatic analysis when package.json changes

## Architecture

The Inspector uses a secure three-layer architecture:

1. **Presentation Layer**: React components for user interface
2. **Data Processing Layer**: Utility functions that orchestrate API calls
3. **API Client Layer**: Modules for external service communication

### Serverless Proxy for OpenAI

For security, OpenAI API calls use a serverless function proxy:

```
Browser → Serverless Function (api/analyze.js) → OpenAI API
```

This architecture ensures the OpenAI API key is never exposed to the browser, following security best practices. The serverless function runs server-side where environment variables are safely accessed.

## Technology Stack

- **Frontend**: React 18+ with functional components and hooks
- **Build Tool**: Vite for fast development and optimized production builds
- **HTTP Client**: axios for API requests with timeout and retry logic
- **Serverless Functions**: Vercel/Netlify Functions for secure API proxying
- **External APIs**:
  - npm Registry API (package metadata) - called directly from browser
  - OSV API (security vulnerability data) - called directly from browser
  - OpenAI API (AI-powered analysis) - called via serverless proxy

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd the-inspector
```

2. Install dependencies:
```bash
npm install
```

3. Install Vercel CLI for local serverless function development:
```bash
npm install -g vercel
```

4. Set up environment variables:
```bash
cp .env.example .env
```

5. Edit `.env` and add your OpenAI API key:
```
OPENAI_API_KEY=your_actual_openai_api_key
```

**Important:** Do NOT prefix with `VITE_` as this would expose the key to the browser (security risk).

Get your OpenAI API key from: https://platform.openai.com/api-keys

## Usage

### Development

**With AI Features (Recommended):**

Start the development server with serverless functions:
```bash
vercel dev
```

This runs both the frontend and serverless functions locally, enabling the AI summary feature.

**Frontend Only (Without AI Features):**

If you only want to test the frontend without AI features:
```bash
npm run dev
```

The application will be available at `http://localhost:5173` (or the port shown by Vercel CLI)

### Production Build

Build the application for production:
```bash
npm run build
```

Preview the production build:
```bash
npm run preview
```

## Project Structure

```
the-inspector/
├── .kiro/                  # Kiro IDE specifications and steering files
│   ├── specs/             # Feature specifications
│   └── steering/          # Project-wide guidance documents
├── api/                   # Serverless functions (server-side)
│   └── analyze.js         # OpenAI API proxy endpoint
├── src/
│   ├── api/               # API client modules (client-side)
│   │   ├── npm.js         # npm Registry API client
│   │   ├── osv.js         # OSV vulnerability API client
│   │   └── openai.js      # OpenAI serverless proxy client
│   ├── components/        # React UI components
│   ├── utils/             # Utility functions and business logic
│   ├── styles/            # CSS stylesheets
│   ├── App.jsx            # Root application component
│   └── main.jsx           # Application entry point
├── public/                # Static assets
├── .env.example           # Environment variable template
├── .gitignore            # Git ignore rules
├── package.json          # Project dependencies and scripts
├── vite.config.js        # Vite configuration
├── vercel.json           # Vercel deployment configuration
└── README.md             # This file
```

## Environment Variables

- `OPENAI_API_KEY`: Your OpenAI API key for AI-powered analysis (required, server-side only)

**Important Security Notes:**

- The OpenAI API key is used **server-side only** in the serverless function (`api/analyze.js`)
- Do NOT prefix with `VITE_` as that would expose it to the browser (security risk)
- For local development, the key is read from `.env` file at project root
- For production deployment, set this in your Vercel/Netlify dashboard under Environment Variables

**Setting Environment Variables for Deployment:**

1. **Vercel**: Go to Project Settings → Environment Variables → Add `OPENAI_API_KEY`
2. **Netlify**: Go to Site Settings → Environment Variables → Add `OPENAI_API_KEY`

See `.env.example` for the complete list of required environment variables. Never commit your `.env` file with real API keys.

## API Endpoints

### POST /api/analyze

Internal serverless endpoint for AI-powered package analysis. Called by the frontend, not intended as a public API.

**Request Format:**
```json
{
  "packageData": {
    "name": "package-name",
    "version": "1.0.0",
    "dependencies": {},
    "license": "MIT"
  },
  "vulnerabilities": [
    {
      "package": "package-name",
      "id": "CVE-2021-12345",
      "severity": "High",
      "summary": "Vulnerability description"
    }
  ]
}
```

**Response Format:**
```json
{
  "summary": {
    "riskLevel": "High",
    "concerns": ["concern1", "concern2"],
    "recommendations": ["recommendation1", "recommendation2"],
    "complexityAssessment": "Assessment paragraph"
  }
}
```

## Troubleshooting

### AI Summary Feature Not Working

- **Check API Key**: Ensure `OPENAI_API_KEY` is set correctly in `.env` file (no `VITE_` prefix)
- **Verify Vercel CLI**: Make sure you're running `vercel dev` (not `npm run dev`) to enable serverless functions
- **Check Console**: Look for error messages in browser console and terminal

### Serverless Function Errors Locally

- **Install Vercel CLI**: Run `npm install -g vercel` if not already installed
- **Run with Vercel**: Use `vercel dev` instead of `npm run dev`
- **Check Environment Variables**: Verify `.env` file exists at project root with `OPENAI_API_KEY`

### Deployment Issues

- **Environment Variables**: Verify `OPENAI_API_KEY` is set in Vercel/Netlify dashboard
- **Build Logs**: Check deployment logs for errors related to serverless functions
- **API Endpoint**: Ensure `/api/analyze` endpoint is accessible after deployment

## License

MIT License (to be added)

---

*Built with Kiro IDE using Spec-Driven Development*
