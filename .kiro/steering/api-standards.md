# API Client Standards

All API client functions in `src/api/` must adhere to these standards to ensure reliability, consistency, and maintainability.

## 1. Timeout Configuration

- All API requests MUST include a timeout configuration
- Default timeout: 30 seconds (30000ms)
- Timeout should be configurable via function parameter with default value
- Example: `async function fetchData(url, timeout = 30000)`

## 2. Retry Logic

- All API requests MUST implement exponential backoff retry logic
- Maximum retry attempts: 3
- Backoff delays: 1 second, 2 seconds, 4 seconds
- Retry on: Network errors, 5xx server errors, timeout errors
- Do NOT retry on: 4xx client errors (except 429 rate limit)
- Log each retry attempt with context (attempt number, error message)

## 3. Response Schema Validation

- All API responses MUST be validated before processing
- Check for expected fields and data types
- Throw descriptive error if validation fails (e.g., "Invalid npm API response: missing 'dependencies' field")
- Use optional chaining (`?.`) when accessing nested properties

## 4. Error Handling

- All API functions MUST use try-catch blocks
- Catch blocks should distinguish between error types:
  - Network errors (no internet connection)
  - Timeout errors (request took too long)
  - API errors (4xx, 5xx responses)
  - Validation errors (unexpected response format)
- Throw custom error objects with:
  - `message`: User-friendly error description
  - `type`: Error category (e.g., 'NETWORK_ERROR', 'API_ERROR')
  - `originalError`: Original error object for debugging

## 5. Logging

- Log all API requests with: URL, method, timestamp
- Log all API responses with: status code, response time
- Log all errors with: error type, error message, request context
- Use console.log for development (replace with proper logging service in production)

## 6. Rate Limiting

- Respect API rate limits (check response headers for rate limit info)
- When 429 (Too Many Requests) is received:
  - Extract `Retry-After` header if available
  - Wait for specified duration before retrying
  - If no `Retry-After` header, use exponential backoff

## 7. Request Headers

- Always include `Content-Type: application/json` for POST requests
- For authenticated APIs (serverless proxy), include `Authorization: Bearer {token}` header if needed
- Note: `User-Agent` header cannot be set in browser contexts (forbidden header); use custom headers like `X-Client-Name` if API identification is needed

## 8. Response Handling

- Always check response status code before processing body
- Parse JSON responses with error handling (catch JSON.parse errors)
- Return consistent data structures across all API clients
- Normalize data formats (e.g., always return arrays, even for single items)

## 9. Environment Variables

- API keys and secrets MUST be loaded from environment variables
- Use `import.meta.env.VARIABLE_NAME` syntax (Vite convention)
- Validate that required environment variables are set at module load time
- Throw descriptive error if required variable is missing

## 10. Documentation

Every API client function MUST have JSDoc comments including:
- Function description
- @param tags for all parameters (with types and descriptions)
- @returns tag describing return value (with type)
- @throws tag listing possible error types
- @example tag with usage example

## Example API Client Function

```javascript
/**
 * Fetches package metadata from npm registry
 * @param {string} packageName - The npm package name to fetch
 * @param {number} timeout - Request timeout in milliseconds (default: 30000)
 * @returns {Promise<Object>} Package metadata object
 * @throws {Error} If package not found or network error occurs
 * @example
 * const data = await fetchPackageData('react');
 */
async function fetchPackageData(packageName, timeout = 30000) {
  // Validate input
  if (!packageName || typeof packageName !== 'string') {
    throw new Error('Package name must be a non-empty string');
  }

  // Log request
  console.log(`[npm] Fetching package: ${packageName}`);

  try {
    // Make request with timeout
    const response = await axios.get(
      `https://registry.npmjs.org/${packageName}`,
      { timeout }
    );

    // Validate response
    if (!response.data?.name || !response.data?.version) {
      throw new Error('Invalid npm API response: missing required fields');
    }

    // Log success
    console.log(`[npm] Successfully fetched: ${packageName}`);

    return response.data;
  } catch (error) {
    // Handle specific error types
    if (error.response?.status === 404) {
      throw {
        type: 'PACKAGE_NOT_FOUND',
        message: `Package '${packageName}' not found`,
        originalError: error
      };
    }

    if (error.code === 'ECONNABORTED') {
      throw {
        type: 'TIMEOUT_ERROR',
        message: 'Request timed out',
        originalError: error
      };
    }

    // Generic error
    throw {
      type: 'API_ERROR',
      message: 'Failed to fetch package data',
      originalError: error
    };
  }
}
```
