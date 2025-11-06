# Technology Steering File

## Technology Stack

### Frontend
- **React 18+**: Functional components with hooks for UI development
- **Vite**: Build tool and dev server for fast development experience
- **Standard CSS**: CSS Grid and Flexbox for layouts (no CSS frameworks to keep bundle size small)

### HTTP Client
- **axios**: HTTP client for API requests with built-in timeout configuration
- **Custom retry logic**: Exponential backoff retry implemented per api-standards.md (axios does not include built-in retry)

### External APIs
- **npm Registry API** (`https://registry.npmjs.org/`): Package metadata and dependency information
- **OSV API** (`https://api.osv.dev/v1/query`): Security vulnerability data from Open Source Vulnerabilities database
- **OpenAI API** (GPT-4): AI-powered analysis and plain-English summarization

### Development Tools
- **Kiro IDE**: Primary development environment with Spec-Driven Development workflow
- **ESLint**: Code quality and linting (Airbnb config)
- **Prettier**: Code formatting for consistency

### Deployment
- **Vercel or Netlify**: Static site hosting with environment variable support and automatic deployments

## Architectural Decisions

### Why React?
React provides a component-based architecture that naturally maps to our UI needs (form, report, tree visualization). The ecosystem is mature, and functional components with hooks offer a clean, modern development experience without the complexity of class components.

### Why Vite over Create React App?
Vite offers significantly faster build times and a better developer experience with instant hot module replacement. It's the modern standard for React projects and has become the recommended tool by the React team.

### Why axios over fetch?
axios provides built-in timeout configuration, automatic JSON parsing, and better error handling out of the box. While axios does not include built-in retry logic, its interceptor architecture makes it easier to implement custom exponential backoff retry patterns as specified in api-standards.md.

### Why in-memory caching instead of localStorage?
API responses contain potentially sensitive vulnerability data. In-memory caching ensures data doesn't persist across sessions, reducing security risks. The 1-hour TTL is sufficient for typical development workflows where developers analyze packages multiple times in a session.

### Why GPT-4 over GPT-3.5?
GPT-4 provides more accurate security analysis and better understanding of technical context. The cost difference is negligible for a hackathon project, and the quality improvement in risk assessment and recommendations is significant.

### Why serverless functions for OpenAI?
While npm and OSV APIs support CORS and can be called directly from the browser, OpenAI API keys must never be exposed in client-side code. We use serverless functions (Vercel/Netlify Functions) as a secure proxy for OpenAI API calls. This keeps API keys server-side while maintaining the simplicity of a static frontend deployment.

## Technical Constraints

- **Minimal backend**: Serverless function proxy for OpenAI API calls only (npm and OSV called directly from browser)
- **Direct API calls**: npm and OSV APIs called directly from browser (both support CORS)
- **Secure API key storage**: OpenAI API key stored as environment variable in serverless function deployment
- **Browser compatibility**: Modern browsers only (Chrome, Firefox, Safari, Edge - last 2 versions)
- **No authentication**: No user accounts or authentication system (stateless application)

## Performance Targets

- **Initial load time**: <2 seconds on broadband connection
- **Package analysis time**: <30 seconds for packages with <100 dependencies
- **Cache hit response**: <1 second for cached results
- **Bundle size**: <500KB (gzipped)

## Security Considerations

- API keys stored in environment variables (never committed to repository)
- All external API calls use HTTPS
- User input sanitized before API calls
- External API responses validated before processing
- No sensitive data stored in localStorage or sessionStorage
- In-memory cache cleared on page refresh

## Development Workflow

1. **Spec-Driven Development**: Requirements → Design → Tasks → Implementation
2. **Steering Files**: Project-wide conventions and standards for consistent code generation
3. **Agent Hooks**: Automated workflows triggered by file changes
4. **Incremental Development**: Build features in small, testable increments
