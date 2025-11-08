# Kiro IDE: Comprehensive Knowledge Base

## Overview
Kiro is an **agentic IDE** that helps developers do their best work through AI-powered features including specs, steering, hooks, and conversational chat. It's currently in public preview.

## Installation & Setup

### Getting Started
1. Download from kiro.dev
2. Install on Windows, macOS, or Linux
3. First run: Login with social or AWS authentication
4. Optional: Import VS Code settings and extensions
5. Select theme and enable shell integration (allows agent to execute commands)
6. Open a project to begin

### Language Support
- TypeScript and JavaScript
- Java
- Python
- Most popular programming languages

## Core Workflow: Your First Project

### 1. Open Your Project
**Three ways to open:**
- `File > Open Folder` to select directory
- Drag and drop project folder into Kiro
- Command line: `kiro .` from project directory

**Access Kiro Panel:**
- Click Kiro Ghost icon in activity bar (left sidebar)
- Provides access to all AI-powered features
- Chat pane opens by default for conversational interface

### 2. Set Up Steering Files

**Purpose**: Provide context about your project to help Kiro understand your codebase, conventions, and requirements.

**Quick Setup:**
- Choose `Generate Steering Docs` from Kiro pane
- Kiro generates project steering documents stored in `.kiro/steering/`

**Generated Files:**
- `product.md` - Product purpose and goals
- `tech.md` - Technical stack and frameworks
- `structure.md` - Project structure and conventions

**Custom Steering:**
- Click `+` button in steering section
- Add coding standards, workflows, team best practices
- Files can be workspace-specific or global

**Inclusion Modes:**
- **Always Included** (default): Loaded in every interaction
- **Conditional Inclusion**: Auto-loaded based on file patterns (e.g., `components/**/*.tsx`)
- **Manual Inclusion**: Referenced with `#steering:filename` in chat

**Key Features:**
- Consistent code generation following team patterns
- Reduced repetition - no need to explain standards each time
- Team alignment across all developers
- Scalable project knowledge that grows with codebase

### 3. Build Features with Specs

**What are Specs?**
Structured artifacts that formalize the development process for complex features. Transform high-level ideas into detailed implementation plans.

**Three-Phase Workflow:**

1. **Requirements Phase**
   - User stories with acceptance criteria
   - Uses EARS notation: `WHEN [condition] THE SYSTEM SHALL [behavior]`
   - Captures what needs to be built

2. **Design Phase**
   - Technical architecture and component design
   - Data models and sequence diagrams
   - Implementation approach

3. **Tasks Phase** (Implementation)
   - Discrete, trackable implementation steps
   - Approximately 40-50 tasks for complex features
   - Tasks automatically update status (In Progress, Done)

**Creating a Spec:**
1. Click **Spec** button in chat session OR `+` in Specs section of Kiro panel
2. Describe feature in natural language
   - Example: "Add user authentication system with login, logout, and password reset"
3. Follow guided workflow through Requirements → Design → Tasks
4. Kiro generates three files in `.kiro/specs/[spec-name]/`:
   - `requirements.md`
   - `design.md`
   - `tasks.md`

**Executing Spec Tasks:**
1. Review generated tasks in `tasks.md`
2. Click on individual task items to execute
3. Track progress as tasks update automatically

**Benefits:**
- Clear roadmap prevents scope creep
- Maintains context across multiple development sessions
- Structured approach for complex features
- Collaboration between product and engineering teams

### 4. Vibe Coding (Conversational Chat)

**What is Vibe Coding?**
Interactive, chat-based workflow for executing smaller tasks, refining code, or asking questions.

**Smart Intent Detection:**
- Kiro automatically understands if you're asking a question or giving a command
- Information requests: "How does this work?" → Explanations without code changes
- Action requests: "Create a component" → Proposes/implements code changes

**Context is King - Use Context Providers:**

| Provider | Description | Example |
|----------|-------------|---------|
| `#codebase` | Find relevant files across project | `#codebase explain the authentication flow` |
| `#file` | Reference specific files | `#auth.ts explain this implementation` |
| `#folder` | Reference folder and contents | `#components/ what components do we have?` |
| `#git diff` | Reference current Git changes | `#git diff explain what changed in this PR` |
| `#terminal` | Include terminal output and history | `#terminal help me fix this build error` |
| `#problems` | Include all problems in current file | `#problems help me resolve these issues` |
| `#url` | Include web documentation | `#url:https://docs.example.com/api explain this API` |
| `#code` | Include specific code snippets | `#code:const sum = (a, b) => a + b; explain this` |
| `#repository` | Include repository structure map | `#repository how is this project organized?` |
| `#current` | Reference currently active file | `#current explain this component` |
| `#steering` | Include specific steering files | `#steering:coding-standards.md review my code` |
| `#docs` | Reference documentation files | `#docs:api-reference.md explain this endpoint` |
| `#spec` | Reference all files from specific spec | `#spec:user-auth update design file` |
| `#mcp` | Access MCP tools and services | `#mcp:aws-docs how do I configure S3?` |

**Best Practices:**
- Always use context providers for better accuracy
- Combine multiple providers: `#codebase #auth.ts explain authentication`
- Be specific about files and locations
- Provide external documentation with `#url`

**Sessions and History:**
- Create new sessions for different topics
- Switch between ongoing conversations via tab switcher
- View history of previous interactions
- Track progress through Task list button
- Search, restore, or delete sessions

### 5. Automate Workflows with Hooks

**What are Agent Hooks?**
Automated triggers that execute predefined agent actions when specific events occur in the IDE.

**Trigger Events:**
- **On File Save**: When files are saved
- **On File Create**: When new files are created
- **On File Delete**: When files are deleted
- **Manual Trigger**: Activated manually

**Creating a Hook:**
1. Navigate to **Agent Hooks** section in Kiro panel
2. Click `+` button to create new hook
3. Describe automation in natural language
   - Example: "When I save a React component file, automatically create or update its corresponding test file"
4. Configure settings:
   - **Event Type**: Choose trigger event
   - **File Pattern**: Specify which files trigger hook (e.g., `src/**/*.tsx`)
   - **Instructions**: Define specific actions to perform

**Benefits:**
- Maintain consistent code quality
- Prevent security vulnerabilities
- Reduce manual overhead
- Standardize team processes
- Create faster development cycles

**Example Use Cases:**
- Auto-generate test files for components
- Run linting/formatting on save
- Update documentation when code changes
- Audit dependencies when package.json changes
- Validate code against security policies

### 6. Extend Capabilities with MCP (Model Context Protocol)

**What is MCP?**
Allows Kiro to connect to external servers that provide specialized tools, knowledge bases, and services.

**Capabilities:**
- Access specialized knowledge bases and documentation
- Integrate with external APIs and services
- Use domain-specific tools and utilities
- Connect to databases and cloud services

**Setting Up MCP:**
1. Open Kiro panel (Ghost icon in activity bar)
2. Enable MCPs
3. Click edit button (pencil icon) next to MCP
4. Default: Ships with fetch MCP server - set `disabled=false` to connect
5. Add custom MCP servers by editing JSON or asking Kiro

**Example MCP Configuration:**
```json
{
  "mcpServers": {
    "web-search": {
      "command": "uvx",
      "args": ["mcp-server-brave-search"],
      "env": {
        "BRAVE_API_KEY": "your-api-key-here"
      },
      "disabled": false,
      "autoApprove": ["search"]
    }
  }
}
```

**Using MCP Tools:**

1. **Direct Questions**
   - Ask questions leveraging MCP capabilities
   - Example: `Search for the latest React 18 best practices`

2. **Explicit Tool Usage**
   - Reference specific MCP tools with `#mcp` context provider
   - Example: `#mcp:fetch Use web search to find TypeScript generic constraints examples`

3. **Integration with Other Features**
   - Combine MCP with hooks and specs
   - Example: `Create a hook that uses web search MCP to find documentation when I create new component files`

## Key Concepts

### Agentic Development
Kiro can understand high-level goals, investigate entire codebase, and execute multi-step plans across multiple files. Think of it as delegating tasks to a junior developer with full project context.

### Spec-Driven Development
Primary workflow for complex features. Formalizes development process by creating structured plans with requirements, design, and tasks.

### Vibe Coding
Interactive chat-based workflow for smaller tasks, code refinement, and questions. Uses context providers for precise, targeted assistance.

### Steering
Persistent knowledge about workspace through markdown files. Ensures consistent code generation following established patterns and conventions.

### Agent Hooks
Automation tools that execute predefined actions on specific events. Eliminates manual work and ensures consistency.

### MCP Integration
Extends Kiro's capabilities beyond local codebase by connecting to external tools, services, and knowledge bases.

## Workflow Summary

**Typical Development Flow:**
1. **Setup**: Open project, generate steering files
2. **Planning**: Create spec for complex features (Requirements → Design → Tasks)
3. **Development**: Execute tasks using vibe coding with context providers
4. **Automation**: Create hooks for repetitive workflows
5. **Extension**: Configure MCP for external integrations
6. **Iteration**: Refine and iterate based on feedback

**When to Use What:**
- **Specs**: Complex features requiring structured planning
- **Vibe Coding**: Quick tasks, code refinement, questions
- **Steering**: Establishing project conventions and standards
- **Hooks**: Automating repetitive tasks
- **MCP**: Accessing external knowledge or services

## Best Practices

### For Specs
- Use EARS notation for clear requirements
- Break down into 40-50 discrete tasks
- Include sequence diagrams in design phase
- Reference specs in vibe coding: `#spec:feature-name`

### For Vibe Coding
- Always use context providers
- Be specific about files and locations
- Provide external documentation with `#url`
- Combine multiple providers for comprehensive context

### For Steering
- Create foundational files first (product, tech, structure)
- Use conditional inclusion for domain-specific guidance
- Keep files focused on one domain
- Include examples and code snippets
- Never include sensitive data (API keys, passwords)

### For Hooks
- Start with simple, focused automations
- Use clear file patterns for triggers
- Test hooks with small changes first
- Document hook behavior in natural language

### For MCP
- Configure only needed servers to reduce overhead
- Use autoApprove for trusted, non-destructive operations
- Combine MCP with other features for powerful workflows
- Keep API keys secure in environment variables

## Keyboard Shortcuts
- `Cmd+L` (Mac) or `Ctrl+L` (Windows/Linux): Open chat panel
- `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows/Linux): Command palette
- `Cmd+Opt+B` (Mac) or `Ctrl+Alt+B` (Windows/Linux): Toggle secondary sidebar

## File Structure
```
project-root/
├── .kiro/
│   ├── specs/
│   │   └── feature-name/
│   │       ├── requirements.md
│   │       ├── design.md
│   │       └── tasks.md
│   ├── steering/
│   │   ├── product.md
│   │   ├── tech.md
│   │   ├── structure.md
│   │   └── custom-steering.md
│   └── hooks/
│       └── hook-definitions
```

## Integration with Development Tools
- Import VS Code settings and extensions
- Shell integration for command execution
- Git integration for diff viewing
- Terminal integration for debugging
- Support for most popular programming languages
