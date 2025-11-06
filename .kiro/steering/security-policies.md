# Security Policies

All code in this project must follow these security policies to protect user data and prevent vulnerabilities.

## 1. API Key Management

- NEVER commit API keys, tokens, or secrets to the repository
- NEVER expose API keys in client-side code (browser builds)
- Store all secrets in environment variables using `.env` file
- Include `.env` in `.gitignore` to prevent accidental commits
- Provide `.env.example` file with placeholder values for documentation
- For sensitive APIs (OpenAI), use serverless functions as secure proxies
- Validate that required environment variables are set at application startup
- Rotate API keys regularly (at least every 90 days)

## 2. Environment Variable Handling

**Frontend (Vite):**
- Access environment variables using `import.meta.env.VARIABLE_NAME` (Vite convention)
- Prefix all custom environment variables with `VITE_` for client-exposed variables
- Never store sensitive API keys (like OpenAI) in `VITE_` variables (they are exposed in browser builds)
- Frontend may store non-sensitive configuration like proxy URLs
- Never log environment variable values (even in development)

**Serverless Functions:**
- Access environment variables using `process.env.VARIABLE_NAME`
- Do NOT use `VITE_` prefix in serverless context (not a Vite environment)
- Store sensitive API keys (OpenAI) as serverless environment variables
- Validate that required environment variables are set at function initialization:

```javascript
// Serverless function (e.g., api/analyze.js)
export default async function handler(req, res) {
  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ 
      error: 'OPENAI_API_KEY environment variable is required in serverless function' 
    });
  }
  // ... make OpenAI API call
}
```

## 3. Input Sanitization

- Sanitize all user input before using it in API calls
- Validate package names against npm naming rules:
  - May include optional scope prefix: `@scope/`
  - Name segment must be lowercase
  - May contain letters, digits, hyphens, underscores, and dots
  - Total length must be between 1 and 214 characters
- Use allowlist validation (define what IS allowed, not what ISN'T)
- Example validation function:

```javascript
function isValidPackageName(name) {
  // Supports both scoped (@scope/name) and unscoped (name) packages
  // Allows lowercase letters, digits, hyphens, underscores, and dots
  const npmNameRegex = /^(@[a-z0-9-_.]+\/)?[a-z0-9-_.]+$/;
  return name.length > 0 && name.length <= 214 && npmNameRegex.test(name);
}
```

## 4. External Data Validation

- Validate all data received from external APIs before processing
- Never trust external data—always validate structure and types
- Use optional chaining (`?.`) when accessing nested properties
- Implement schema validation for API responses
- Sanitize HTML content before rendering (use DOMPurify if rendering user-generated HTML)

## 5. XSS Prevention

- Never use `dangerouslySetInnerHTML` in React unless absolutely necessary
- If HTML rendering is required, sanitize with DOMPurify library
- Escape user input before displaying in UI
- Use React's built-in XSS protection (JSX automatically escapes values)

## 6. HTTPS Enforcement

- All external API calls MUST use HTTPS (never HTTP)
- Validate that API URLs start with `https://` before making requests
- Reject any HTTP URLs with clear error message

## 7. Dependency Security

- Run `npm audit` regularly to check for known vulnerabilities
- Update dependencies to latest secure versions
- Review dependency licenses for compatibility with project license
- Minimize number of dependencies (fewer dependencies = smaller attack surface)
- Use The Inspector tool itself to audit new dependencies before installation

## 8. Error Messages

- Never expose sensitive information in error messages
- Don't reveal internal system details (file paths, database schemas, etc.)
- Provide user-friendly error messages without technical details
- Log detailed errors to console (in development) for debugging
- Example:
  - ❌ Bad: "Database connection failed: Connection refused at 192.168.1.100:5432"
  - ✅ Good: "Unable to process request. Please try again later."

## 9. Rate Limiting

- Implement client-side rate limiting to prevent abuse
- Respect API rate limits from external services
- Cache API responses to reduce number of requests
- Implement exponential backoff when rate limits are hit

## 10. Data Storage

- Do NOT store sensitive data in localStorage or sessionStorage
- Use in-memory storage for temporary data (cleared on page refresh)
- If persistent storage is required, encrypt data before storing
- Clear sensitive data from memory when no longer needed

## 11. CORS Handling

- Understand CORS limitations when making API calls from browser
- Document which APIs support CORS and which require proxy
- Never disable CORS in production (security risk)
- If CORS is an issue, use a backend proxy instead of disabling security

## 12. Code Review Checklist

Before committing code, verify:
- [ ] No hardcoded API keys or secrets
- [ ] All user input is validated and sanitized
- [ ] All external data is validated before processing
- [ ] Error messages don't expose sensitive information
- [ ] All API calls use HTTPS
- [ ] Environment variables are used for configuration
- [ ] No sensitive data logged to console
- [ ] Dependencies are up-to-date and audited

## 13. Incident Response

If a security vulnerability is discovered:
1. Immediately revoke compromised API keys
2. Assess the scope of the vulnerability
3. Patch the vulnerability in code
4. Update dependencies if vulnerability is in a dependency
5. Document the incident and lessons learned
6. Notify users if their data was potentially compromised
