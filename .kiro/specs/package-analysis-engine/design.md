# Design Document

## Overview

The Inspector follows a three-layer architecture pattern that separates concerns between API communication, data processing, and user interface. This design ensures maintainability, testability, and clear separation of responsibilities.

The application is a client-side React application that orchestrates calls to three external APIs (npm Registry, OSV, OpenAI) to generate comprehensive package analysis reports.

## Architecture

### Three-Layer Architecture

```
┌─────────────────────────────────────────┐
│     Presentation Layer (React UI)       │
│  - InspectorForm                        │
│  - NutritionLabel                       │
│  - DependencyTree                       │
│  - ExportButton                         │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│   Data Processing Layer (Orchestration) │
│  - inspector.js (main orchestrator)     │
│  - cache.js (in-memory caching)         │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│      API Client Layer (External APIs)   │
│  - npm.js (npm Registry)                │
│  - osv.js (OSV vulnerability DB)        │
│  - openai.js (GPT-4 analysis)           │
└─────────────────────────────────────────┘
```

## Components and Interfaces

### Layer 1: API Client Layer (`src/api/`)

#### npm.js
**Purpose:** Handles communication with npm Registry API

**Key Function:**
```javascript
async function fetchPackageData(packageName, timeout = 30000)
```

**Responsibilities:**
- Query npm Registry API at `https://registry.npmjs.org/{packageName}`
- Return package metadata including:
  - name, version, description
  - dependencies object (direct dependencies)
  - license information
  - repository URL
  - maintainer information
- Implement timeout configuration (30s default)
- Implement exponential backoff retry logic (3 attempts: 1s, 2s, 4s delays)
- Validate response schema before returning

**Error Handling:**
- 404: Package not found
- 5xx: npm Registry server error (retry)
- Timeout: Request exceeded 30 seconds (retry)
- Network error: No internet connection

#### osv.js
**Purpose:** Handles communication with OSV vulnerability database

**Key Function:**
```javascript
async function checkVulnerabilities(dependencies)
```

**Responsibilities:**
- Query OSV API at `https://api.osv.dev/v1/querybatch` via POST for batch queries
- Accept dependencies as object: `{ "package-name": "version", ... }`
- Transform to OSV querybatch format: `{ queries: [{ package: { name, ecosystem: "npm" }, version }, ...] }`
- Implement batching (max 1000 packages per request)
- Return vulnerability array with:
  - package name
  - vulnerability ID (CVE or GHSA)
  - severity level (Critical, High, Medium, Low)
  - description
  - affected versions
- Classify severity based on CVSS score:
  - Critical: CVSS >= 9.0
  - High: CVSS >= 7.0
  - Medium: CVSS >= 4.0
  - Low: CVSS < 4.0

**Error Handling:**
- 429: Rate limit exceeded (wait and retry with Retry-After header)
- 5xx: OSV server error (retry)
- Timeout: Request exceeded 30 seconds (retry)

#### openai.js
**Purpose:** Handles communication with serverless proxy for OpenAI API calls

**Key Function:**
```javascript
async function generateSummary(packageData, vulnerabilities)
```

**Responsibilities:**
- Call serverless function endpoint (e.g., `/api/analyze`) with package data and vulnerabilities
- Serverless function securely calls OpenAI GPT-4 API with system prompt
- System prompt instructs AI to act as security analyst
- Request plain-English risk assessment including:
  - Overall risk level (Low, Medium, High, Critical)
  - Key concerns and recommendations
  - Dependency complexity assessment
  - License compatibility notes
- Return structured summary object

**System Prompt Template (used in serverless function):**
```
You are a security analyst reviewing an npm package. Analyze the following package data and vulnerabilities, then provide a plain-English risk assessment suitable for developers of all skill levels.

Package: {packageName}
Dependencies: {dependencyCount}
Vulnerabilities: {vulnerabilityCount}

Provide:
1. Overall risk level (Low/Medium/High/Critical)
2. Key security concerns
3. Recommendations for developers
4. Dependency complexity assessment
```

**Error Handling:**
- 401: Invalid API key (serverless function configuration issue)
- 429: Rate limit exceeded (wait and retry)
- 5xx: Server error (retry)
- Network error: Proxy endpoint unreachable

### Layer 2: Data Processing Layer (`src/utils/`)

#### inspector.js
**Purpose:** Main orchestration logic that coordinates API calls and data flow

**Key Function:**
```javascript
async function inspectPackage(packageName)
```

**Data Flow Sequence:**
1. Validate package name format
2. Check cache for existing results
3. Call `fetchPackageData(packageName)` from npm.js
4. Extract dependencies from npm response
5. Call `checkVulnerabilities(dependencies)` from osv.js
6. Call `generateSummary(packageData, vulnerabilities)` from openai.js
7. Construct unified report object
8. Cache results for 1 hour
9. Return report to UI

**Unified Report Object Structure:**
```javascript
{
  packageInfo: {
    name: string,
    version: string,
    description: string,
    license: string,
    repository: string,
    maintainers: array
  },
  dependencyTree: {
    direct: array,
    total: number
  },
  vulnerabilities: [
    {
      package: string,
      id: string,
      severity: string,
      description: string,
      affectedVersions: string
    }
  ],
  aiSummary: {
    riskLevel: string,
    concerns: array,
    recommendations: array,
    complexityAssessment: string
  },
  metadata: {
    analyzedAt: timestamp,
    analysisTime: number (ms)
  }
}
```

**Error Handling:**
- Catch errors from each API call separately
- Log errors with context (which API failed, why)
- Throw user-friendly error messages
- Partial results: If OpenAI fails, still return package data and vulnerabilities

#### cache.js
**Purpose:** In-memory caching to reduce API costs and improve response times

**Implementation:**
- Use JavaScript Map for storage
- Cache key: package name
- Cache value: { data, timestamp }
- TTL: 1 hour (3600000ms)

**Key Functions:**
```javascript
function set(key, value)
function get(key)
function has(key)
function clear()
function isExpired(timestamp)
```

**Caching Strategy:**
- Cache npm Registry responses (1 hour TTL)
- Cache OSV vulnerability responses (1 hour TTL)
- Do NOT cache OpenAI responses (context-dependent)
- Implement automatic cache cleanup on get() calls
- Provide manual cache invalidation for refresh functionality

### Layer 3: Presentation Layer (`src/components/`)

#### InspectorForm.js
**Purpose:** User input form for package name entry

**State:**
- `packageName` (string): Controlled input value
- `isLoading` (boolean): Loading state during analysis
- `error` (string|null): Error message if analysis fails

**Props:** None (top-level component)

**Behavior:**
- Validate package name on input (real-time feedback)
- Disable submit button while loading
- Call `inspectPackage()` on form submit
- Display error message if analysis fails
- Clear error on new input

#### NutritionLabel.js
**Purpose:** Display comprehensive package analysis report

**Props:**
- `report` (object): Unified report object from inspector.js

**Sections:**
1. **Package Info**: Name, version, description, license
2. **Dependencies**: Total count, direct dependencies list
3. **Vulnerabilities**: Color-coded list by severity
4. **AI Summary**: Risk level, concerns, recommendations

**Styling:**
- Mimic food nutrition label design
- Use CSS Grid for layout
- Color coding:
  - Critical: #DC2626 (red)
  - High: #EA580C (orange)
  - Medium: #CA8A04 (yellow)
  - Low: #2563EB (blue)

#### DependencyTree.js
**Purpose:** Visualize dependency hierarchy

**Props:**
- `dependencies` (array): List of direct dependencies

**Implementation:**
- Use nested unordered lists for tree structure
- Expandable/collapsible nodes (future enhancement)
- Show dependency count badges

#### ExportButton.js
**Purpose:** Export report to Markdown or PDF

**Props:**
- `report` (object): Unified report object
- `format` (string): 'markdown' or 'pdf'

**Markdown Export:**
- Use template literals to generate Markdown
- Include all report sections
- Trigger download via blob URL

**PDF Export:**
- Use jspdf library
- Format report with proper styling
- Trigger download

#### LoadingSpinner.js
**Purpose:** Visual loading indicator

**Implementation:**
- CSS animation (rotating spinner)
- Accessible (aria-label)

#### ErrorMessage.js
**Purpose:** User-friendly error display

**Props:**
- `message` (string): Error message to display
- `onDismiss` (function): Callback to clear error

**Styling:**
- Red background with white text
- Dismissible with X button

## Data Models

### Package Metadata (from npm API)
```javascript
{
  name: string,
  version: string,
  description: string,
  dependencies: { [key: string]: string },
  license: string,
  repository: { type: string, url: string },
  maintainers: [{ name: string, email: string }]
}
```

### Vulnerability (from OSV API)
```javascript
{
  id: string,              // CVE-2021-12345
  package: string,         // package-name
  severity: string,        // Critical|High|Medium|Low
  summary: string,         // Brief description
  details: string,         // Full description
  affected: [             // Affected version ranges
    {
      package: { name: string, ecosystem: string },
      ranges: [{ type: string, events: array }]
    }
  ]
}
```

### AI Summary (from OpenAI API)
```javascript
{
  riskLevel: string,           // Low|Medium|High|Critical
  concerns: string[],          // Array of concern descriptions
  recommendations: string[],   // Array of recommendations
  complexityAssessment: string // Overall complexity description
}
```

## Error Handling

### Error Types and User Messages

| Error Type | Technical Cause | User Message |
|------------|----------------|--------------|
| PACKAGE_NOT_FOUND | npm API returns 404 | "Package '{name}' not found. Please check the package name." |
| NETWORK_ERROR | No internet connection | "Network error. Please check your internet connection." |
| TIMEOUT_ERROR | Request exceeded 30s | "Request timed out. The package may be too large. Please try again." |
| API_ERROR | External API returns 5xx | "Service temporarily unavailable. Please try again in a few moments." |
| RATE_LIMIT | API returns 429 | "Too many requests. Please wait a moment and try again." |
| INVALID_API_KEY | OpenAI returns 401 | "Invalid API key. Please check your .env configuration." |
| VALIDATION_ERROR | Invalid package name | "Invalid package name. Use lowercase letters, numbers, hyphens, underscores, dots, and optionally a @scope/ prefix." |

### Retry Strategy

```javascript
async function retryWithBackoff(fn, maxAttempts = 3) {
  const delays = [1000, 2000, 4000]; // 1s, 2s, 4s
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxAttempts - 1) throw error;
      if (!shouldRetry(error)) throw error;
      
      await sleep(delays[attempt]);
      console.log(`Retry attempt ${attempt + 1}/${maxAttempts}`);
    }
  }
}

function shouldRetry(error) {
  // Retry on: network errors, 5xx, timeouts, 429
  // Don't retry on: 4xx (except 429), validation errors
  return error.type === 'NETWORK_ERROR' 
    || error.type === 'TIMEOUT_ERROR'
    || error.type === 'API_ERROR'
    || error.type === 'RATE_LIMIT';
}
```

## Testing Strategy

### Unit Tests
- API client functions (mock axios responses)
- Data transformation functions in inspector.js
- Cache logic (set, get, expiration)
- Validation functions (package name format)

### Integration Tests
- Full analysis flow (mock all external APIs)
- Error handling paths
- Cache hit/miss scenarios

### Manual Testing
- Test with real packages of varying sizes
- Test error scenarios (invalid names, network failures)
- Test UI responsiveness and loading states
- Test export functionality (Markdown and PDF)

### Test Data
- Small package: `lodash.debounce` (~5 dependencies)
- Medium package: `express` (~30 dependencies)
- Large package: `@aws-sdk/client-s3` (~100+ dependencies)
- Scoped package: `@babel/core` (common scoped package)
- Package with vulnerabilities: Use known vulnerable versions
- Invalid package names: `Invalid Name`, ``, `@/`, `UPPERCASE`

## Security Considerations

1. **API Key Protection**: OpenAI API key stored in `.env`, never committed
2. **Input Sanitization**: Package names validated against npm naming rules
3. **Response Validation**: All external API responses validated before processing
4. **HTTPS Enforcement**: All API calls use HTTPS only
5. **XSS Prevention**: React's built-in escaping, no `dangerouslySetInnerHTML`
6. **Data Storage**: In-memory cache only (no localStorage for sensitive data)
7. **Error Messages**: No sensitive information exposed in user-facing errors

## Performance Considerations

1. **Caching**: 1-hour TTL reduces redundant API calls
2. **Batching**: OSV API calls batched (max 1000 packages)
3. **Lazy Loading**: Components loaded on demand
4. **Debouncing**: Input validation debounced to reduce re-renders
5. **Timeout Configuration**: 30s timeout prevents hanging requests

## Future Enhancements

1. Support for other package managers (PyPI, RubyGems)
2. Historical vulnerability tracking
3. CI/CD integration
4. Team collaboration features (sharing reports)
5. Dependency graph visualization with D3.js
6. Comparison mode (compare multiple packages)
7. Browser extension for inline npm website analysis
