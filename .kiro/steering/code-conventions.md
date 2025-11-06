# Code Conventions

All code in this project must follow these conventions to ensure consistency, readability, and maintainability.

## 1. JavaScript Version and Syntax

- Use ES6+ syntax throughout the project
- Prefer `const` over `let`; never use `var`
- Use arrow functions for callbacks and short functions
- Use async/await instead of Promise chains
- Use template literals instead of string concatenation
- Use destructuring for objects and arrays where appropriate
- Use spread operator for object/array copying

## 2. Style Guide

- Follow the Airbnb JavaScript Style Guide
- Use 2 spaces for indentation (no tabs)
- Use single quotes for strings (except in JSX where double quotes are preferred)
- Always use semicolons
- Maximum line length: 100 characters
- Use trailing commas in multi-line objects and arrays

## 3. Naming Conventions

- **Variables and functions**: camelCase (e.g., `fetchPackageData`, `packageName`)
- **React components**: PascalCase (e.g., `InspectorForm`, `NutritionLabel`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `MAX_RETRY_ATTEMPTS`, `DEFAULT_TIMEOUT`)
- **Private functions**: prefix with underscore (e.g., `_validateResponse`)
- **Boolean variables**: prefix with `is`, `has`, `should` (e.g., `isLoading`, `hasError`)

## 4. Function Documentation

All functions MUST have JSDoc comments including:
- Brief description of function purpose
- @param tags for all parameters (with types)
- @returns tag describing return value (with type)
- @throws tag if function can throw errors
- @example tag with at least one usage example

Example:
```javascript
/**
 * Calculates the total number of vulnerabilities by severity
 * @param {Array<Object>} vulnerabilities - Array of vulnerability objects
 * @returns {Object} Object with counts by severity level
 * @example
 * const counts = calculateVulnerabilityCounts(vulns);
 * // Returns: { critical: 2, high: 5, medium: 10, low: 3 }
 */
function calculateVulnerabilityCounts(vulnerabilities) {
  // Implementation
}
```

## 5. React Component Conventions

- Use functional components exclusively (no class components)
- Use React Hooks for state and side effects
- Component structure order:
  1. Imports
  2. Component function definition
  3. State declarations (useState)
  4. Effect hooks (useEffect)
  5. Event handlers
  6. Helper functions
  7. Return statement (JSX)
  8. Export statement
- Destructure props in function parameters
- Use PropTypes or JSDoc for prop validation

## 6. React Hooks Best Practices

- Always declare hooks at the top level (never inside conditions or loops)
- Use meaningful names for custom hooks (prefix with `use`)
- Include all dependencies in useEffect dependency arrays
- Use useCallback for event handlers passed to child components
- Use useMemo for expensive computations

## 7. JSX Conventions

- Use double quotes for JSX attributes
- Use self-closing tags when component has no children
- Break JSX into multiple lines when it exceeds 100 characters
- Use parentheses around multi-line JSX
- Use fragments (`<>...</>`) instead of unnecessary div wrappers
- Use semantic HTML elements (e.g., `<button>` not `<div onClick>`)

## 8. Variable Naming

- Use meaningful, descriptive names (no single-letter variables except loop counters)
- Avoid abbreviations unless universally understood (e.g., `url`, `api`, `id` are OK)
- Use plural names for arrays (e.g., `vulnerabilities`, `dependencies`)
- Use singular names for objects (e.g., `packageData`, `report`)

## 9. Error Handling

- Always use try-catch blocks for async operations
- Provide user-friendly error messages (not technical stack traces)
- Log errors to console with context for debugging
- Never silently swallow errors (always log or handle them)

## 10. Code Organization

- Keep functions small and focused (max 50 lines)
- Extract complex logic into separate helper functions
- Group related functions together in the same file
- Use early returns to reduce nesting
- Avoid deep nesting (max 3 levels)

## 11. Comments

- Use comments to explain WHY, not WHAT (code should be self-explanatory)
- Use JSDoc for function documentation
- Use inline comments sparingly (only for complex logic)
- Keep comments up-to-date with code changes
- Remove commented-out code before committing

## 12. Imports

Group imports in this order:
1. React imports
2. Third-party library imports
3. Local component imports
4. Local utility imports
5. Style imports

Use named imports when possible. Sort imports alphabetically within each group.

Use relative imports (e.g., `./components/InspectorForm`) or configure a Vite path alias `@/` for cleaner absolute-style imports.

Example with relative imports:
```javascript
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import InspectorForm from './components/InspectorForm';
import NutritionLabel from './components/NutritionLabel';
import { inspectPackage } from './utils/inspector';
import { get, set } from './utils/cache';
import './styles/App.css';
```

Example with alias (if configured in vite.config.js):
```javascript
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import InspectorForm from '@/components/InspectorForm';
import NutritionLabel from '@/components/NutritionLabel';
import { inspectPackage } from '@/utils/inspector';
import { get, set } from '@/utils/cache';
import '@/styles/App.css';
```
