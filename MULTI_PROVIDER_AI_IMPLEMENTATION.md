# Multi-Provider AI Support Implementation

## Overview
Successfully refactored both serverless functions (`api/analyze.js` and `netlify/functions/analyze.js`) to support dynamic AI provider selection between OpenAI and OpenRouter while maintaining full backward compatibility.

## Changes Implemented

### 1. Dynamic Provider Configuration
- **Provider Determination**: Added logic to determine AI provider from `VITE_AI_PROVIDER` environment variable
- **Backward Compatibility**: Defaults to 'openai' when `VITE_AI_PROVIDER` is unset but `OPENAI_API_KEY` exists
- **Provider-Specific Settings**: Conditional configuration for baseURL, API keys, and headers based on selected provider

### 2. OpenRouter Support
- **Base URL**: `https://openrouter.ai/api/v1/chat/completions`
- **API Key**: Validates `OPENROUTER_API_KEY` environment variable
- **Custom Headers**: 
  - `HTTP-Referer`: Uses `VITE_SITE_URL` (optional)
  - `X-Title`: Uses `VITE_SITE_NAME` or defaults to 'The Inspector'
- **Default Model**: `moonshotai/kimi-k2-thinking`

### 3. OpenAI Support (Enhanced)
- **Base URL**: `https://api.openai.com/v1/chat/completions`
- **API Key**: Validates `OPENAI_API_KEY` environment variable
- **Standard Headers**: Authorization Bearer token
- **Default Model**: `gpt-4o`

### 4. Dynamic Model Selection
- **Priority Order**: 
  1. Request body `model` parameter (client-specified)
  2. `VITE_DEFAULT_MODEL` environment variable
  3. Provider-specific default (OpenRouter: `moonshotai/kimi-k2-thinking`, OpenAI: `gpt-4o`)
- **Logging**: Added console logging for selected provider and model

### 5. Enhanced System Prompt (Netlify Only)
Updated Netlify function to match Vercel version with additional fields:
- `maintenanceStatus`: Active|Stale|Abandoned|Unknown
- `licenseCompatibility`: Permissive|Copyleft|Proprietary|Unknown
- `maintenanceNotes`: Brief assessment of maintenance and license

### 6. Enhanced User Prompt (Netlify Only)
Added maintenance information to Netlify function:
- Last publish date with staleness warnings
- GitHub open issues count
- Consistent with Vercel implementation

### 7. Enhanced Response Validation (Netlify Only)
Added validation for new maintenance fields:
- `maintenanceStatus` validation
- `licenseCompatibility` validation
- `maintenanceNotes` validation

### 8. Provider-Agnostic Error Messages
Updated error messages to be provider-neutral:
- "AI API error" instead of "OpenAI error"
- "AI API rate limit exceeded" instead of "OpenAI rate limit exceeded"
- "AI request timed out" instead of "OpenAI request timed out"
- "Failed to connect to AI API" instead of "Failed to connect to OpenAI API"
- Authentication errors now include dynamic provider name

## Environment Variables

### Required (Provider-Specific)
- **For OpenAI**: `OPENAI_API_KEY`
- **For OpenRouter**: `OPENROUTER_API_KEY`

### Optional Configuration
- `VITE_AI_PROVIDER`: Explicitly set provider ('openai' or 'openrouter')
- `VITE_DEFAULT_MODEL`: Override default model for selected provider
- `VITE_SITE_URL`: Site URL for OpenRouter HTTP-Referer header
- `VITE_SITE_NAME`: Site name for OpenRouter X-Title header (defaults to 'The Inspector')

## Backward Compatibility

The implementation maintains full backward compatibility:
- Existing deployments with only `OPENAI_API_KEY` will continue to work
- No breaking changes to API request/response format
- Model parameter is optional in request body
- All existing error handling patterns preserved

## Testing Recommendations

1. **OpenAI Mode**: Set `OPENAI_API_KEY` only (no `VITE_AI_PROVIDER`)
2. **OpenRouter Mode**: Set `OPENROUTER_API_KEY` and `VITE_AI_PROVIDER=openrouter`
3. **Custom Model**: Include `model` parameter in request body
4. **Default Model Override**: Set `VITE_DEFAULT_MODEL` environment variable

## Files Modified

1. **api/analyze.js** (Vercel serverless function)
   - Updated header comment
   - Removed hardcoded constants
   - Added provider determination logic
   - Added conditional provider configuration
   - Added model selection logic
   - Updated API request to use dynamic values
   - Updated error messages

2. **netlify/functions/analyze.js** (Netlify serverless function)
   - All changes from api/analyze.js
   - Updated system prompt to match Vercel version
   - Enhanced user prompt with maintenance information
   - Enhanced response validation for new fields

## Code Quality

- ✅ No syntax errors
- ✅ No linting errors
- ✅ Follows existing code conventions
- ✅ Maintains all security policies
- ✅ Preserves all error handling patterns
- ✅ Consistent logging conventions
- ✅ Full JSDoc documentation maintained
