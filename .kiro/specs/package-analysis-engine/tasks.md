# Implementation Plan

## Phase 1: Project Setup

- [ ] 1. Initialize React application using Vite with JavaScript template
  - Run `npm create vite@latest the-inspector -- --template react`
  - Navigate to project directory
  - Install initial dependencies
  - _Requirements: All (foundational setup)_

- [ ] 2. Create folder structure
  - Create `src/api/` directory for API clients
  - Create `src/components/` directory for React components
  - Create `src/utils/` directory for utility functions
  - Create `src/styles/` directory for CSS files
  - Create `api/` directory for serverless functions (Vercel) or `netlify/functions/` (Netlify)
  - _Requirements: All (foundational setup)_

- [ ] 2.1 Configure Vite path alias (optional)
  - Edit `vite.config.js` to add path alias: `resolve: { alias: { '@': '/src' } }`
  - This allows imports like `@/components/InspectorForm` instead of relative paths
  - _Requirements: All (code organization)_

- [ ] 3. Install core dependencies
  - Install axios: `npm install axios`
  - Note: Vite automatically loads `.env` files (no dotenv needed for frontend)
  - Note: jspdf will be installed later in Phase 7 when implementing export features
  - _Requirements: 1.1, 2.1_

- [ ] 4. Create environment configuration
  - Create `.env.example` file with placeholder for serverless function configuration
  - Add note that OpenAI API key is configured in serverless function deployment (not in frontend .env)
  - Document that Vite automatically loads `.env` files and requires `VITE_` prefix for client-exposed variables
  - _Requirements: Non-functional (Security)_

- [ ] 5. Configure .gitignore
  - Add `.env` to .gitignore to prevent committing secrets
  - Ensure `.kiro/` directory is NOT in .gitignore (required for hackathon)
  - Add `node_modules/`, `dist/`, `.DS_Store`
  - _Requirements: Non-functional (Security)_

- [ ] 6. Generate foundational steering files
  - Create `.kiro/steering/product.md` with product vision and target users
  - Create `.kiro/steering/tech.md` with technology stack documentation
  - Create `.kiro/steering/structure.md` with project structure conventions
  - _Requirements: All (establishes project context)_

- [ ] 7. Create custom steering file: api-standards.md
  - Document timeout configuration standards (30s default)
  - Document retry logic patterns (exponential backoff)
  - Document response validation requirements
  - Document error handling conventions
  - _Requirements: 1.4, 2.1, Non-functional (Reliability)_

- [ ] 8. Create custom steering file: code-conventions.md
  - Document JavaScript style guide (Airbnb-based)
  - Document React component conventions (functional components, hooks)
  - Document naming conventions (camelCase, PascalCase)
  - Document JSDoc requirements
  - _Requirements: All (code quality)_

- [ ] 9. Create custom steering file: security-policies.md
  - Document API key management policies
  - Document input sanitization requirements
  - Document external data validation requirements
  - Document HTTPS enforcement
  - _Requirements: Non-functional (Security)_

- [ ] 10. Create initial README.md
  - Add project description and purpose
  - Add setup instructions (npm install, .env configuration)
  - Add usage instructions
  - Add technology stack overview
  - _Requirements: All (documentation)_

## Phase 2: API Client Layer

- [ ] 11. Create npm.js API client structure
  - Create `src/api/npm.js` file
  - Add module imports (axios)
  - Define base URL constant: `https://registry.npmjs.org/`
  - _Requirements: 1.1_

- [ ] 12. Implement fetchPackageData function
  - Implement async function with packageName parameter
  - Make GET request to `${BASE_URL}/${packageName}`
  - Parse and return package metadata (name, version, description, dependencies, license)
  - Add JSDoc documentation
  - _Requirements: 1.1, 1.2, 3.1_

- [ ] 13. Add timeout configuration to npm API client
  - Add timeout parameter with 30000ms default
  - Configure axios timeout option
  - _Requirements: Non-functional (Performance)_

- [ ] 14. Implement exponential backoff retry logic in npm API client
  - Create retry wrapper function with 3 max attempts
  - Implement delays: 1s, 2s, 4s
  - Log each retry attempt with context
  - _Requirements: Non-functional (Reliability)_

- [ ] 15. Add response schema validation for npm API
  - Validate presence of required fields (name, version, dependencies)
  - Throw descriptive error if validation fails
  - Use optional chaining for nested properties
  - _Requirements: 1.1, 1.4_

- [ ] 16. Create osv.js API client structure
  - Create `src/api/osv.js` file
  - Add module imports (axios)
  - Define querybatch endpoint: `https://api.osv.dev/v1/querybatch`
  - _Requirements: 2.1_

- [ ] 17. Implement checkVulnerabilities function
  - Implement async function with dependencies parameter
  - Transform dependencies object to OSV querybatch format: `{ queries: [{ package: { name, ecosystem: "npm" }, version }, ...] }`
  - Make POST request to `/v1/querybatch` endpoint
  - Parse batch response and extract vulnerabilities from each query result
  - Return vulnerability array
  - Add JSDoc documentation
  - _Requirements: 2.1, 2.2_

- [ ] 18. Add batching logic to OSV API client
  - Implement batch splitting for large dependency lists (max 1000 packages per querybatch request)
  - Make multiple `/v1/querybatch` requests if dependency count exceeds 1000
  - Combine results from all batch requests
  - Handle partial failures gracefully (some batches succeed, others fail)
  - _Requirements: 2.1_

- [ ] 19. Implement rate limiting handling in OSV API client
  - Check for 429 status code in querybatch responses
  - Extract Retry-After header if available
  - Wait for specified duration before retrying
  - Fall back to exponential backoff if no header
  - Log rate limit events for monitoring
  - _Requirements: Non-functional (Reliability)_

- [ ] 20. Add severity classification logic
  - Map CVSS scores to severity levels (Critical >= 9.0, High >= 7.0, Medium >= 4.0, Low < 4.0)
  - Add severity field to each vulnerability object
  - Handle missing CVSS scores (default to Medium)
  - _Requirements: 2.2_

## Phase 3: AI Integration (Serverless Proxy)

- [ ] 21. Create serverless function for OpenAI proxy
  - Create `api/analyze.js` (Vercel) or `netlify/functions/analyze.js` (Netlify)
  - Load OPENAI_API_KEY from serverless environment variables (not VITE_ prefix)
  - Implement POST endpoint that accepts packageData and vulnerabilities
  - Add CORS headers to allow frontend origin
  - _Requirements: 2.3, 2.4, Non-functional (Security)_

- [ ] 22. Implement OpenAI call in serverless function
  - Make POST request to `https://api.openai.com/v1/chat/completions`
  - Use GPT-4 model with Authorization header
  - Construct messages array with system and user prompts
  - Return AI summary to client
  - Add error handling and logging
  - _Requirements: 2.3, 2.4_

- [ ] 23. Craft system prompt for security analyst persona
  - Write system prompt instructing AI to act as security analyst
  - Include instructions for risk level assessment (Low/Medium/High/Critical)
  - Include instructions for generating concerns and recommendations
  - Include instructions for complexity assessment
  - _Requirements: 2.4_

- [ ] 24. Create openai.js client for serverless proxy
  - Create `src/api/openai.js` file
  - Implement generateSummary function that calls `/api/analyze` endpoint
  - Pass packageData and vulnerabilities in request body
  - Parse and return AI summary from proxy response
  - Add JSDoc documentation
  - _Requirements: 2.3, 2.4_

- [ ] 25. Implement error handling for proxy calls
  - Handle 401 (serverless function configuration issue)
  - Handle 429 (rate limit) with retry logic
  - Handle 5xx (server error) with retry logic
  - Handle network errors (proxy unreachable)
  - _Requirements: Non-functional (Reliability)_

## Phase 4: Data Processing Layer

- [ ] 26. Create inspector.js orchestration module
  - Create `src/utils/inspector.js` file
  - Import all API client functions (fetchPackageData, checkVulnerabilities, generateSummary)
  - Import cache utilities
  - _Requirements: 1.1, 1.2, 1.3_

- [ ] 27. Implement inspectPackage function
  - Implement async function with packageName parameter
  - Validate package name format (lowercase, no spaces, 1-214 chars)
  - Check cache for existing results
  - Coordinate API calls in sequence: npm → OSV → OpenAI
  - Return unified report object
  - Add JSDoc documentation
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.3_

- [ ] 28. Add dependency extraction logic
  - Extract dependencies object from npm API response
  - Convert to array format for processing
  - Handle missing dependencies field (empty object)
  - Count total dependencies
  - _Requirements: 1.2, 4.2_

- [ ] 29. Implement unified report object structure
  - Define report object with packageInfo, dependencyTree, vulnerabilities, aiSummary, metadata sections
  - Populate each section with data from API responses
  - Add timestamp and analysis time to metadata
  - _Requirements: 1.3, 2.4_

- [ ] 30. Add comprehensive error handling
  - Wrap each API call in try-catch block
  - Log errors with context (which API, error type, package name)
  - Throw user-friendly error messages
  - Support partial results (continue if OpenAI fails)
  - _Requirements: 1.4, Non-functional (Reliability)_

## Phase 5: Caching Implementation

- [ ] 31. Create cache.js utility module
  - Create `src/utils/cache.js` file
  - Initialize Map for in-memory storage
  - Define TTL constant (3600000ms = 1 hour)
  - _Requirements: Non-functional (Performance)_

- [ ] 32. Implement cache functions
  - Implement set(key, value) function with timestamp
  - Implement get(key) function with expiration check
  - Implement has(key) function
  - Implement clear() function for manual invalidation
  - Implement isExpired(timestamp) helper function
  - Add JSDoc documentation for all functions
  - _Requirements: Non-functional (Performance)_

- [ ] 33. Integrate caching into API clients
  - Add cache check at start of fetchPackageData
  - Add cache set after successful npm API response
  - Add cache check at start of checkVulnerabilities
  - Add cache set after successful OSV API response
  - Do NOT cache OpenAI responses (context-dependent)
  - _Requirements: Non-functional (Performance)_

## Phase 6: React UI Components

- [ ] 34. Create InspectorForm component
  - Create `src/components/InspectorForm.js` file
  - Define functional component with useState hooks
  - Add state: packageName, isLoading, error
  - Export component as default
  - _Requirements: 1.1, 1.5_

- [ ] 35. Add controlled input for package name
  - Add input element with value bound to packageName state
  - Add onChange handler to update state
  - Add real-time validation (lowercase, no spaces, 1-214 chars)
  - Display validation error message below input
  - _Requirements: 1.1, 1.4, Non-functional (Usability)_

- [ ] 36. Implement submit button with loading state
  - Add submit button with onClick handler
  - Disable button while isLoading is true
  - Call inspectPackage function on submit
  - Update isLoading state during analysis
  - Display error message if analysis fails
  - Pass report data to parent component on success
  - _Requirements: 1.1, 1.3, 1.4, 1.5_

- [ ] 37. Create NutritionLabel component
  - Create `src/components/NutritionLabel.js` file
  - Define functional component with report prop
  - Structure component with sections: Package Info, Dependencies, Vulnerabilities, AI Summary
  - Export component as default
  - _Requirements: 1.3, 2.4_

- [ ] 38. Add color-coded vulnerability display
  - Map severity levels to colors (Critical=red, High=orange, Medium=yellow, Low=blue)
  - Display vulnerability count by severity with color badges
  - List vulnerabilities grouped by severity
  - Display "No vulnerabilities found" message if clean
  - _Requirements: 2.2, 2.5, Non-functional (Usability)_

- [ ] 39. Create LoadingSpinner component
  - Create `src/components/LoadingSpinner.js` file
  - Define functional component with CSS animation
  - Add aria-label for accessibility
  - Export component as default
  - _Requirements: 1.5_

- [ ] 40. Create ErrorMessage component
  - Create `src/components/ErrorMessage.js` file
  - Define functional component with message and onDismiss props
  - Add dismiss button (X icon)
  - Style with red background and white text
  - Export component as default
  - _Requirements: 1.4_

- [ ] 41. Compose components in App.js
  - Import InspectorForm, NutritionLabel, LoadingSpinner, ErrorMessage
  - Add state for report data
  - Pass report data from InspectorForm to NutritionLabel
  - Conditionally render NutritionLabel when report exists
  - _Requirements: 1.1, 1.3_

- [ ] 42. Create nutrition-label.css styling
  - Create `src/styles/nutrition-label.css` file
  - Style NutritionLabel to mimic food nutrition label design
  - Use CSS Grid for layout
  - Add color definitions for severity levels
  - Add responsive design for mobile devices
  - _Requirements: 1.3, Non-functional (Usability)_

## Phase 7: Advanced Features

- [ ] 43. Install jspdf for PDF export
  - Install jspdf: `npm install jspdf`
  - _Requirements: 5.3_

- [ ] 45. Create DependencyTree component
  - Create `src/components/DependencyTree.js` file
  - Define functional component with dependencies prop
  - Implement nested list visualization using <ul> and <li>
  - Display direct dependencies at first level
  - Add dependency count badges
  - Export component as default
  - _Requirements: 4.1, 4.2_

- [ ] 46. Create ExportButton component with Markdown export
  - Create `src/components/ExportButton.js` file
  - Define functional component with report and format props
  - Implement Markdown export using template literals
  - Generate Markdown with all report sections
  - Trigger file download using Blob and URL.createObjectURL
  - _Requirements: 5.1, 5.2_

- [ ] 47. Add PDF export functionality
  - Import jspdf in ExportButton component
  - Implement PDF export function using jspdf API
  - Format report with proper styling (headings, lists, colors)
  - Trigger file download
  - _Requirements: 5.1, 5.3, 5.4_

- [ ] 48. Create Kiro Agent Hook: Dependency Auditor
  - Create `.kiro/hooks/dependency-auditor.json` file
  - Configure trigger: file save event on package.json
  - Configure action: call inspectPackage for each new dependency
  - Configure notification: display warning if critical vulnerabilities found
  - _Requirements: 6.1, 6.2, 6.3_

- [ ] 49. Integrate DependencyTree and ExportButton into NutritionLabel
  - Import DependencyTree and ExportButton components
  - Add DependencyTree to Dependencies section
  - Add ExportButton to top-right corner of NutritionLabel
  - Pass appropriate props (dependencies, report)
  - _Requirements: 4.1, 5.1_

## Task Status Legend

- [ ] Not Started
- [~] In Progress
- [x] Completed

## Task Dependencies

**Phase 2 depends on Phase 1:**
- Tasks 11-20 require Task 7 (api-standards.md steering file)

**Phase 3 depends on Phase 1:**
- Tasks 21-25 require Task 9 (security-policies.md steering file)
- Serverless function setup required for secure OpenAI API access

**Phase 4 depends on Phases 2 and 3:**
- Tasks 26-30 require Tasks 11-25 (all API clients must be complete)

**Phase 6 depends on Phase 1:**
- Tasks 34-42 require Task 8 (code-conventions.md steering file)

**Phase 7 depends on Phases 4 and 6:**
- Tasks 43-49 require Tasks 26-42 (core functionality and UI must be complete)
