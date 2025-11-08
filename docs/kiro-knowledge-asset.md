_This is a knowledge asset for Traycer, an AI project architect. It details the capabilities of Kiro, an AI developer tool, so that Traycer can create a detailed execution plan for Kiro to follow._

# KNOWLEDGE ASSET: Kiro AI IDE

## 1. Core Philosophy: Agentic Development

Kiro is an **agentic IDE**. Unlike simple code completion, Kiro can understand high-level goals, investigate the entire codebase, and execute multi-step plans across multiple files. When creating prompts for Kiro, think in terms of delegating tasks to a junior developer who has full project context.

## 2. Key Feature: Spec-Driven Development

This is Kiro's primary workflow for complex features. It formalizes the development process by creating a structured plan.

- **Trigger**: A user starts a "Spec" session from the Kiro panel or chat.
- **Process**: Kiro guides the user through a three-phase workflow, generating three key files in a `.kiro/specs/` directory:
    1.  `requirements.md`: Captures user stories and acceptance criteria. Uses **EARS notation** (`WHEN [condition] THE SYSTEM SHALL [behavior]`).
    2.  `design.md`: Documents the technical architecture, data models, and sequence diagrams.
    3.  `tasks.md`: A detailed, trackable list of discrete coding tasks to implement the design.
- **Instruction for Traycer**: The first step in your plan for any major feature should be a prompt for Kiro to **create a new Spec**. This prompt should contain the high-level feature description.

**Sample Spec-Creation Prompt for Kiro:**
```
Create a new Spec for the core feature: "Package Analysis Engine".

**Description:** This feature will take a package name from npm, fetch its data from the npm registry API, analyze its dependencies, check for vulnerabilities using the OSV API, and then use an LLM to summarize the findings. The final result will be a "Nutrition Label" report.
```

## 3. Key Feature: Vibe Coding (Conversational Chat)

This is the interactive, chat-based workflow for executing smaller tasks, refining code, or asking questions. Kiro's chat has "Smart Intent Detection," meaning it knows whether you're asking a question or giving a command.

- **Context is King**: Kiro is aware of the entire codebase. Use **Context Providers** (`#` symbol) to focus its attention. This is the most critical part of crafting effective vibe coding prompts.

- **Essential Context Providers for "The Inspector":**

| Provider | Usage for Our Project |
| :--- | :--- |
| `#codebase` | "Use the `#codebase` context to find the most relevant files for implementing the API logic." |
| `#file` | "In the file `#src/api/npm.js`, create a function to fetch package data." |
| `#folder` | "In the `#src/components/` folder, create a new React component for the report." |
| `#terminal` | "The `npm install` command failed. `#terminal` can you see what went wrong?" |
| `#url` | "Please read the OSV API documentation at `#url:https://osv.dev/docs/` and create a function to query it." |
| `#spec` | "Based on the `#spec:package-analysis-engine`, implement the first task in `tasks.md`." |

- **Instruction for Traycer**: Your plan should break down the high-level Spec into a series of specific, sequential vibe coding prompts. Each prompt should clearly state the file to be modified and the action to be taken, leveraging context providers.

## 4. Key Feature: Agent Hooks

Hooks are automated triggers for background tasks. They are perfect for ensuring consistency and automating repetitive actions.

- **Trigger Events**: `On File Create`, `On File Save`, `On File Delete`, `Manual Trigger`.
- **How to Create**: Define a hook using natural language in the "Agent Hooks" section of the Kiro panel.
- **Instruction for Traycer**: Your plan should include a step to create a clever, project-specific Agent Hook. This demonstrates advanced usage of Kiro.

**Sample Hook-Creation Prompt for Kiro:**
```
Create a new Agent Hook with the following workflow:

**Name:** "Dependency Auditor"
**Trigger:** On File Save
**File Pattern:** `package.json`
**Action:** "When `package.json` is saved, identify any newly added dependencies. For each new dependency, run 'The Inspector' analysis on it and append the 'Nutrition Label' summary to a file named `dependency_audit.md`."
```

## 5. Key Feature: Steering

Steering provides Kiro with persistent knowledge and conventions through markdown files in the `.kiro/steering/` directory. This is how we make Kiro's output consistent and aligned with our project's standards.

- **Foundational Files**: Kiro can generate `product.md`, `tech.md`, and `structure.md` to establish core context.
- **Custom Files**: We can create our own steering files for things like `api-standards.md` or `code-conventions.md`.
- **Inclusion Modes**: Steering files can be loaded `always` (default), `conditional` (based on file patterns), or `manual` (via `#steering` in chat).
- **Instruction for Traycer**: Your plan should include steps to create foundational and custom steering files to ensure the generated code is high-quality.

**Sample Steering-File-Creation Prompt for Kiro:**
```
Generate the foundational steering files (`product.md`, `tech.md`, `structure.md`).

After that, create a new workspace steering file named `code-conventions.md` with the following rules:
- All JavaScript code must follow the Airbnb style guide.
- All functions must include JSDoc comments explaining their purpose, parameters, and return value.
- Use functional components with React Hooks; avoid class components.
```

## 6. Key Feature: Model Context Protocol (MCP)

MCP allows Kiro to connect to external servers that provide specialized tools and information. This extends Kiro's capabilities beyond the local codebase.

- **What MCP Does**: Provides access to specialized knowledge bases, external APIs, and domain-specific tools
- **How to Use**: Reference MCP tools in chat using the `#mcp` context provider
- **Example**: `#mcp:aws-docs how do I configure S3 buckets?`
- **Instruction for Traycer**: If the project requires integration with external services or specialized knowledge (like AWS, databases, etc.), include a step to configure and use relevant MCP servers.

**Sample MCP Usage Prompt for Kiro:**
```
Use #mcp:github to search for examples of npm registry API integration in popular open-source projects. Analyze the patterns they use for error handling and rate limiting.
```

## 7. Best Practices for Crafting Kiro Prompts

Based on the documentation, here are the key principles for creating effective prompts:

### Be Specific About Files and Locations
**Bad**: "Create a function to fetch package data"
**Good**: "In the file `#src/api/npm.js`, create an async function named `fetchPackageData` that takes a `packageName` parameter"

### Always Use Context Providers
**Bad**: "Look at the API documentation and implement the function"
**Good**: "Read the API documentation at `#url:https://registry.npmjs.org/` and implement the function in `#file:src/api/npm.js`"

### Reference the Spec When Implementing
**Bad**: "Build the vulnerability checking feature"
**Good**: "Based on `#spec:package-analysis-engine`, implement Task 3 from `tasks.md`: 'Create OSV API integration for vulnerability checking'"

### Leverage Kiro's Codebase Awareness
**Bad**: "Find where we handle API errors and do the same thing here"
**Good**: "Use `#codebase` to find our existing error handling patterns and apply the same approach to the new OSV API client"

### Provide External Documentation
**Bad**: "Integrate with the OSV API"
**Good**: "Read the OSV API documentation at `#url:https://osv.dev/docs/` and create a client that follows their recommended batching strategy (max 1000 packages per request)"

## 8. Project-Specific Guidance for "The Inspector"

### Recommended Steering Files

1. **`api-standards.md`**: 
   - All API calls must include timeout configuration (30 seconds default)
   - All API calls must implement exponential backoff retry logic (3 attempts)
   - All API responses must be validated against expected schema
   - All API errors must be logged with request context

2. **`code-conventions.md`**:
   - Use ES6+ syntax (async/await, arrow functions, destructuring)
   - All functions must have JSDoc comments
   - Use functional React components with hooks
   - Follow Airbnb JavaScript style guide
   - Use meaningful variable names (no single-letter variables except loop counters)

3. **`security-policies.md`**:
   - Never commit API keys to repository
   - Use environment variables for all secrets
   - Sanitize all user input before API calls
   - Validate all external data before processing

### Recommended Spec Structure

The main spec should be named `package-analysis-engine` and should include:

**requirements.md** should capture:
- User story: "As a developer, I want to analyze an npm package before installing it"
- Acceptance criteria using EARS notation for each feature (package lookup, dependency analysis, vulnerability checking, AI summary)

**design.md** should document:
- Architecture: Three-layer design (API clients, data processing, React UI)
- Data flow: User input → npm API → dependency extraction → OSV API → OpenAI API → UI display
- Error handling strategy
- Caching strategy to reduce API costs

**tasks.md** should break down into approximately 40-50 discrete tasks:
- Tasks 1-10: Project setup, steering files, folder structure
- Tasks 11-20: API client implementations
- Tasks 21-30: Data processing pipeline
- Tasks 31-40: React UI components
- Tasks 41-50: Testing, deployment, documentation

### Recommended Agent Hook

The "Dependency Auditor" hook should:
- Trigger on `package.json` save
- Parse the file to identify new dependencies
- Run The Inspector analysis on each new dependency
- Append results to `dependency_audit.md` with timestamp
- Alert the user if any Critical or High vulnerabilities are found

This demonstrates advanced Kiro usage and creates a practical development-time tool.

## 9. Integration with Traycer

When Traycer creates the execution plan, it should structure prompts in this order:

1. **Initialization Phase**: Create spec, generate steering files
2. **Foundation Phase**: Set up project structure, install dependencies
3. **API Implementation Phase**: Build npm, OSV, and OpenAI clients (sequential, with testing)
4. **Data Pipeline Phase**: Connect the APIs and implement data flow
5. **UI Phase**: Build React components for input and display
6. **Advanced Features Phase**: Create agent hook, add caching, implement export
7. **Deployment Phase**: Deploy to hosting, create documentation, record video

Each phase should have 5-10 specific prompts for Kiro, with clear dependencies between prompts (e.g., "After completing the npm API client, test it with the package 'react' before moving to the OSV integration").

---

**End of Knowledge Asset**
