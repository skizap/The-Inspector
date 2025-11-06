# Project Structure Steering File

## Project Structure

```
the-inspector/
├── .kiro/
│   ├── specs/
│   │   └── package-analysis-engine/
│   │       ├── requirements.md
│   │       ├── design.md
│   │       └── tasks.md
│   ├── steering/
│   │   ├── product.md
│   │   ├── tech.md
│   │   ├── structure.md
│   │   ├── api-standards.md
│   │   ├── code-conventions.md
│   │   └── security-policies.md
│   └── hooks/
│       └── dependency-auditor.json
├── src/
│   ├── api/
│   │   ├── npm.js
│   │   ├── osv.js
│   │   └── openai.js
│   ├── components/
│   │   ├── InspectorForm.js
│   │   ├── NutritionLabel.js
│   │   ├── DependencyTree.js
│   │   ├── ExportButton.js
│   │   ├── LoadingSpinner.js
│   │   └── ErrorMessage.js
│   ├── utils/
│   │   ├── inspector.js
│   │   └── cache.js
│   ├── styles/
│   │   ├── App.css
│   │   └── nutrition-label.css
│   ├── App.js
│   └── main.js
├── public/
│   └── index.html
├── .env.example
├── .gitignore
├── package.json
├── vite.config.js
├── README.md
├── DEMO_SCRIPT.md
└── HACKATHON_WRITEUP.md
```

## Directory Purposes

### `.kiro/`
Kiro IDE configuration and project specifications. **MUST NOT be in .gitignore for hackathon submission.**

- **`specs/`**: Feature specifications following Spec-Driven Development workflow
  - Requirements documents with EARS notation
  - Design documents with architecture and component details
  - Task lists with implementation breakdown
  
- **`steering/`**: Project-wide guidance documents for consistent code generation
  - Foundational files: product.md, tech.md, structure.md
  - Custom files: api-standards.md, code-conventions.md, security-policies.md
  
- **`hooks/`**: Agent Hook definitions for automated workflows
  - JSON configuration files defining triggers and actions

### `src/api/`
API client modules that handle external service communications.

- Each file exports functions for a specific external API
- All functions are async and return Promises
- Error handling and retry logic implemented per api-standards.md
- Timeout configuration and response validation required

### `src/components/`
React UI components.

- Each file exports a single functional component
- Component names match file names (PascalCase)
- Stateful logic managed with React hooks (useState, useEffect)
- Props validated with PropTypes or JSDoc

### `src/utils/`
Utility functions and business logic.

- Pure functions that don't depend on React
- Orchestration logic that coordinates multiple API calls
- Caching and data transformation utilities
- No side effects (except for cache operations)

### `src/styles/`
CSS stylesheets.

- Component-specific styles in separate files
- Global styles in App.css
- Use CSS Grid and Flexbox for layouts (no CSS frameworks)
- Responsive design for mobile devices

## File Naming Conventions

- **React components**: PascalCase (e.g., `InspectorForm.js`, `NutritionLabel.js`)
- **Utility modules**: camelCase (e.g., `inspector.js`, `cache.js`)
- **API clients**: lowercase (e.g., `npm.js`, `osv.js`, `openai.js`)
- **Steering files**: lowercase with hyphens (e.g., `api-standards.md`, `code-conventions.md`)
- **Configuration files**: lowercase with dots (e.g., `.env.example`, `vite.config.js`)

## Import Conventions

- Use relative imports within src/ directory (e.g., `./components/InspectorForm`)
- Optionally configure Vite path alias `@/` to reference `src/` for cleaner imports
- Group imports in order:
  1. React imports
  2. Third-party library imports
  3. Local component imports
  4. Local utility imports
  5. Style imports
- Use named exports for utility functions
- Use default exports for React components

Example with relative imports:
```javascript
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import InspectorForm from './components/InspectorForm';
import { inspectPackage } from './utils/inspector';
import './styles/App.css';
```

Example with alias (if configured):
```javascript
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import InspectorForm from '@/components/InspectorForm';
import { inspectPackage } from '@/utils/inspector';
import '@/styles/App.css';
```

## Code Organization Principles

### Separation of Concerns
- **API logic**: Isolated in `src/api/` directory
- **Business logic**: Isolated in `src/utils/` directory
- **UI logic**: Isolated in `src/components/` directory

### Single Responsibility
Each file has one clear purpose:
- API clients handle communication with one external service
- Components render one UI element or feature
- Utilities perform one type of operation (caching, orchestration, validation)

### Dependency Direction
- UI depends on utils
- Utils depend on API clients
- Never reverse (API clients should not import from utils or components)

This ensures a clean, unidirectional data flow and prevents circular dependencies.

## Module Exports

### API Clients
Export named functions:
```javascript
export async function fetchPackageData(packageName) { ... }
export async function checkVulnerabilities(dependencies) { ... }
```

### React Components
Export default component:
```javascript
export default function InspectorForm({ onSubmit }) { ... }
```

### Utilities
Export named functions:
```javascript
export async function inspectPackage(packageName) { ... }
export function set(key, value) { ... }
export function get(key) { ... }
```

## Configuration Files

### `.env.example`
Template for environment variables with placeholder values. Never contains real secrets.

### `.gitignore`
Excludes:
- `.env` (contains secrets)
- `node_modules/` (dependencies)
- `dist/` (build output)
- `.DS_Store` (macOS system files)

**Does NOT exclude:**
- `.kiro/` directory (required for hackathon submission)

### `vite.config.js`
Vite configuration for build and dev server settings.

### `package.json`
Project metadata, dependencies, and scripts.
