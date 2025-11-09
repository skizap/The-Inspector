# OpenRouter API and SDK Reference for Traycer

**Author:** Manus AI
**Date:** Nov 08, 2025

## 1. Core Integration Concept: OpenAI-Compatible API

OpenRouter provides a unified API that is compatible with the OpenAI SDK and API structure. This is the simplest and most effective way to integrate OpenRouter into an existing application that uses `axios` or a similar HTTP client to call the OpenAI API directly. The native `@openrouter/sdk` is available but not necessary for this integration, as it would require a larger refactoring effort.

### 1.1. Key API Endpoint

The primary endpoint for all chat completion requests is:

```
https://openrouter.ai/api/v1/chat/completions
```

This endpoint replaces the standard OpenAI URL (`https://api.openai.com/v1/chat/completions`).

### 1.2. Authentication

Authentication is handled via an API key passed in the `Authorization` header as a Bearer token. [1]

-   **API Key**: The key is obtained from the [OpenRouter Keys page](https://openrouter.ai/keys).
-   **Environment Variable**: The key should be stored in a server-side environment variable named `OPENROUTER_API_KEY`.
-   **Header Format**: `Authorization: Bearer <YOUR_OPENROUTER_API_KEY>`

### 1.3. App Attribution (Optional but Recommended)

To have an application appear on the [OpenRouter Apps leaderboard](https://openrouter.ai/apps), two optional HTTP headers should be included in every request. [2]

| Header | Description | Example Value |
| :--- | :--- | :--- |
| `HTTP-Referer` | The URL of the application making the request. | `https://the-inspector.vercel.app` |
| `X-Title` | The human-readable name of the application. | `The Inspector` |

These should be configurable via client-side environment variables (`VITE_SITE_URL` and `VITE_SITE_NAME`).

## 2. Model Selection and Naming

OpenRouter provides access to hundreds of models from various providers. Models are identified by a string that includes the provider and model name. [3]

### 2.1. Model Naming Convention

The format is typically `<provider>/<model_name>`. For free or experimental models, a suffix like `:free` may be included.

### 2.2. Curated List of Popular Models

A good starting list of models to offer in the UI includes:

| Model ID | Label for UI |
| :--- | :--- |
| `moonshotai/kimi-k2-thinking` | Moonshot Kimi K2 Thinking (Recommended) |
| `anthropic/claude-3.5-sonnet` | Claude 3.5 Sonnet |
| `openai/gpt-4o` | OpenAI GPT-4o |
| `google/gemini-2.0-flash-exp:free` | Google Gemini Flash (Free) |
| `meta-llama/llama-3.1-70b-instruct` | Meta Llama 3.1 70B |
| `mistralai/mistral-large` | Mistral Large |

### 2.3. Implementation Status

All six models listed above have been implemented and validated in The Inspector application. The model list is maintained in two locations for consistency:
- `src/config/models.js` - Frontend model options (MODEL_OPTIONS array)
- `src/constants/openrouterModels.js` - Backend validation whitelist (VALID_OPENROUTER_MODELS array)

The default model is automatically set to the first model in the list (Moonshot Kimi K2 Thinking), which can be overridden via the `VITE_DEFAULT_MODEL` environment variable.

### 2.4. Listing Models Programmatically

The OpenRouter API provides an endpoint to list all available models, which could be used to dynamically populate the model selection dropdown in the future. [4]

-   **Endpoint**: `https://openrouter.ai/api/v1/models`
-   **Method**: `GET`
-   **Authentication**: Requires the `Authorization` header.

## 3. Example Implementation (using `axios`)

This example demonstrates how to structure a request to the OpenRouter API using `axios`, which aligns with The-Inspector's current architecture.

```javascript
import axios from 'axios';

async function getOpenRouterCompletion(prompt, model) {
  const baseURL = 'https://openrouter.ai/api/v1/chat/completions';
  const apiKey = process.env.OPENROUTER_API_KEY;

  const headers = {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': process.env.VITE_SITE_URL || '', // Optional
    'X-Title': process.env.VITE_SITE_NAME || '',     // Optional
  };

  const requestBody = {
    model: model, // e.g., 'moonshotai/kimi-k2-thinking'
    messages: [{ role: 'user', content: prompt }],
    // Other parameters like temperature, max_tokens, etc.
  };

  try {
    const response = await axios.post(baseURL, requestBody, { headers });
    return response.data;
  } catch (error) {
    console.error('Error calling OpenRouter API:', error);
    throw error;
  }
}
```

## 4. Summary of Key Integration Points

| Feature | Implementation Detail |
| :--- | :--- |
| **API Endpoint** | `https://openrouter.ai/api/v1/chat/completions` |
| **API Key Env Var** | `OPENROUTER_API_KEY` (server-side) |
| **Model Parameter** | Pass the full model string, e.g., `openai/gpt-4o`. |
| **Attribution** | Use `HTTP-Referer` and `X-Title` headers. |
| **Backward Compatibility** | Check for `VITE_AI_PROVIDER` env var; if unset, check for `OPENAI_API_KEY` and default to direct OpenAI integration. |

## References

[1] OpenRouter Quickstart. [https://openrouter.ai/docs/quickstart](https://openrouter.ai/docs/quickstart)
[2] OpenRouter App Attribution. [https://openrouter.ai/docs/app-attribution](https://openrouter.ai/docs/app-attribution)
[3] OpenRouter Models. [https://openrouter.ai/models](https://openrouter.ai/models)
[4] OpenRouter API Reference - Models. [https://openrouter.ai/docs/api-reference/models/list](https://openrouter.ai/docs/api-reference/models/list)
