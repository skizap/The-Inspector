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

## Technology Stack

- **Frontend**: React 18+ with functional components and hooks
- **Build Tool**: Vite for fast development and optimized production builds
- **HTTP Client**: axios for API requests with timeout and retry logic
- **External APIs**:
  - npm Registry API (package metadata)
  - OSV API (security vulnerability data)
  - OpenAI API (AI-powered analysis)

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

3. Set up environment variables:
```bash
cp .env.example .env
```

4. Edit `.env` and add your OpenAI API key:
```
VITE_OPENAI_API_KEY=your_actual_openai_api_key
```

Get your OpenAI API key from: https://platform.openai.com/api-keys

## Usage

### Development

Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5173`

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
├── src/
│   ├── api/               # API client modules (npm, OSV, OpenAI)
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
└── README.md             # This file
```

## Environment Variables

- `VITE_OPENAI_API_KEY`: Your OpenAI API key for AI-powered analysis (required)

**Note:** Vite exposes environment variables to your client-side code via `import.meta.env`. All variables must be prefixed with `VITE_` to be accessible in the browser. Access the API key in your code using:

```javascript
const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
```

See `.env.example` for the complete list of required environment variables. Never commit your `.env` file with real API keys.

## License

MIT License (to be added)

---

*Built with Kiro IDE using Spec-Driven Development*
