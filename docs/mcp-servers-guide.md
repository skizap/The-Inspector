# Kiro MCP Servers Guide

Complete reference guide for all Model Context Protocol (MCP) servers available in Kiro IDE.

**Last Updated:** November 8, 2025

---

## Table of Contents

1. [Search & Web Tools](#search--web-tools)
   - [Brave Search](#brave-search)
   - [Tavily](#tavily)
2. [Development Tools](#development-tools)
   - [GitHub](#github)
   - [Memory](#memory)
   - [Context7](#context7)
   - [Filesystem](#filesystem)
   - [Sequential Thinking](#sequential-thinking)
3. [Configuration](#configuration)
4. [Troubleshooting](#troubleshooting)

---

## Search & Web Tools

### Brave Search

**Purpose:** Fast, privacy-focused web and local search engine integration.

**Status:** ✅ Active

**Available Tools:**
- `brave_web_search` - General web search
- `brave_local_search` - Local business and place search

**Use Cases:**
- Finding current information and news
- Researching technical topics
- Looking up documentation
- Finding local businesses and services

**Example Usage:**
```
Search for "React hooks tutorial"
Find coffee shops near Central Park
```

**Configuration:**
```json
{
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-brave-search"],
  "env": {
    "BRAVE_API_KEY": "your-api-key"
  }
}
```

**API Key:** Get from [brave.com/search/api](https://brave.com/search/api)

---

### Tavily

**Purpose:** Advanced AI-powered search with web scraping, crawling, and content extraction capabilities.

**Status:** ✅ Active

**Available Tools:**
- `tavily-search` - AI-enhanced web search with summarization
- `tavily-extract` - Extract and parse content from specific URLs
- `tavily-crawl` - Crawl websites following links (graph-based)
- `tavily-map` - Map website structure and discover URLs

**Use Cases:**
- Deep research with AI summarization
- Extracting structured data from websites
- Discovering site architecture
- Competitive analysis
- Content aggregation

**Example Usage:**
```
Search for "machine learning best practices" with AI summary
Extract content from https://example.com/article
Crawl documentation site starting from homepage
Map the structure of react.dev
```

**Configuration:**
```json
{
  "command": "npx",
  "args": ["-y", "tavily-mcp@latest"],
  "env": {
    "TAVILY_API_KEY": "tvly-dev-your-key"
  }
}
```

**API Key:** Get from [tavily.com](https://tavily.com)

**Advanced Features:**
- Time-based filtering (day, week, month, year)
- Domain inclusion/exclusion
- Country-specific results
- News vs general search modes
- Depth control (basic vs advanced)

---

## Development Tools

### GitHub

**Purpose:** Complete GitHub API integration for repository management, issues, PRs, and more.

**Status:** ✅ Active

**Available Tools:**
- Repository operations (create, fork, search)
- Issue management (create, update, comment, search)
- Pull request workflows (create, review, merge)
- Branch operations
- File operations (read, write, delete)
- Workflow management (Actions)
- Notifications
- Gists
- Security alerts

**Use Cases:**
- Managing repositories without leaving Kiro
- Creating and reviewing pull requests
- Tracking issues and project progress
- Automating GitHub workflows
- Code review and collaboration
- Security vulnerability tracking

**Example Usage:**
```
List my GitHub notifications
Create an issue in owner/repo
Get pull request #123 from owner/repo
Search for repositories about "machine learning"
List workflow runs for my-repo
```

**Configuration:**
```json
{
  "command": "docker",
  "args": [
    "run", "-i", "--rm",
    "-e", "GITHUB_PERSONAL_ACCESS_TOKEN",
    "ghcr.io/github/github-mcp-server"
  ],
  "env": {
    "GITHUB_PERSONAL_ACCESS_TOKEN": "ghp_your-token"
  }
}
```

**Requirements:**
- Docker installed and running
- GitHub Personal Access Token with appropriate scopes

**Token Scopes Needed:**
- `repo` - Full repository access
- `workflow` - GitHub Actions workflows
- `read:org` - Organization data
- `notifications` - Notifications access

---

### Memory

**Purpose:** Persistent knowledge graph for storing and retrieving information across sessions.

**Status:** ✅ Active

**Available Tools:**
- `create_entities` - Create nodes in knowledge graph
- `create_relations` - Create relationships between entities
- `add_observations` - Add facts/observations to entities
- `delete_entities` - Remove entities
- `delete_observations` - Remove specific observations
- `delete_relations` - Remove relationships
- `read_graph` - Read entire knowledge graph
- `search_nodes` - Search for specific entities
- `open_nodes` - Retrieve specific entities by name

**Use Cases:**
- Remembering project context across sessions
- Building knowledge bases
- Tracking relationships between concepts
- Storing user preferences
- Maintaining conversation history
- Project documentation

**Example Usage:**
```
Remember that user prefers TypeScript over JavaScript
Store relationship: React uses Hooks
Add observation: Project uses Vite for bundling
Search for entities related to "authentication"
```

**Data Structure:**
```
Entity:
  - name: string
  - entityType: string
  - observations: string[]

Relation:
  - from: entity name
  - to: entity name
  - relationType: string
```

**Configuration:**
```json
{
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-memory"]
}
```

**Storage:** In-memory (persists across Kiro sessions)

---

### Context7

**Purpose:** Access up-to-date documentation for thousands of libraries and frameworks.

**Status:** ✅ Active

**Available Tools:**
- `resolve-library-id` - Find library by name
- `get-library-docs` - Fetch documentation for specific library

**Use Cases:**
- Looking up API documentation
- Finding code examples
- Learning new libraries
- Checking latest syntax
- Version-specific documentation

**Example Usage:**
```
Find documentation for React
Get docs for Next.js routing
Look up Tailwind CSS utilities
Find examples for axios HTTP client
```

**Supported Libraries:**
- JavaScript/TypeScript frameworks (React, Vue, Angular, Next.js, etc.)
- Backend frameworks (Express, NestJS, Django, Flask, etc.)
- Databases (MongoDB, PostgreSQL, Redis, etc.)
- Cloud services (AWS, Vercel, Supabase, etc.)
- And thousands more...

**Configuration:**
```json
{
  "command": "npx",
  "args": ["-y", "@upstash/context7-mcp"]
}
```

**Features:**
- Version-specific documentation
- Code snippets with examples
- Trust scores for quality assessment
- Multiple documentation sources per library

---

### Filesystem

**Purpose:** Read, write, and manage files in allowed directories.

**Status:** ✅ Active

**Available Tools:**
- `read_text_file` - Read file contents
- `read_media_file` - Read images/audio (base64)
- `read_multiple_files` - Batch read files
- `write_file` - Create or overwrite files
- `edit_file` - Line-based file editing
- `create_directory` - Create folders
- `list_directory` - List directory contents
- `list_directory_with_sizes` - List with file sizes
- `directory_tree` - Recursive tree view (JSON)
- `move_file` - Move or rename files
- `search_files` - Search by filename pattern
- `get_file_info` - File metadata
- `list_allowed_directories` - Show accessible paths

**Use Cases:**
- Reading project files
- Creating new files and directories
- Editing code
- File organization
- Project structure analysis
- Batch file operations

**Example Usage:**
```
Read src/App.jsx
Create new file at src/components/Button.jsx
List all files in src/
Search for "*.test.js" files
Get file info for package.json
```

**Configuration:**
```json
{
  "command": "npx",
  "args": [
    "-y",
    "@modelcontextprotocol/server-filesystem",
    "/home/user/Documents"
  ]
}
```

**Security:**
- Only accesses specified directories
- Cannot access system files outside allowed paths
- Validates all file operations

**Current Allowed Directory:**
- `/home/robotcowboy808/Documents`

---

### Sequential Thinking

**Purpose:** Advanced reasoning and problem-solving through structured thought processes.

**Status:** ✅ Active

**Available Tools:**
- `sequentialthinking` - Multi-step reasoning with branching and revision

**Use Cases:**
- Complex problem decomposition
- Planning and design
- Debugging difficult issues
- Analyzing trade-offs
- Hypothesis generation and testing
- Course correction during problem-solving

**Example Usage:**
```
Break down architecture design for new feature
Analyze performance bottleneck
Plan migration strategy
Debug complex race condition
```

**Features:**
- Dynamic thought adjustment (can increase/decrease total thoughts)
- Thought revision (can question previous decisions)
- Branching (explore alternative approaches)
- Hypothesis generation and verification
- Uncertainty expression
- Non-linear reasoning

**Configuration:**
```json
{
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-sequential-thinking"]
}
```

**Parameters:**
- `thought` - Current thinking step
- `thoughtNumber` - Current step number
- `totalThoughts` - Estimated total (adjustable)
- `nextThoughtNeeded` - Whether more thinking is needed
- `isRevision` - If revising previous thought
- `revisesThought` - Which thought to revise
- `branchFromThought` - Branching point
- `branchId` - Branch identifier

---

## Configuration

### Location

MCP servers are configured in:
- **User-level:** `~/.kiro/settings/mcp.json` (global)
- **Workspace-level:** `.kiro/settings/mcp.json` (project-specific)

Workspace settings take precedence over user settings.

### Basic Structure

```json
{
  "mcpServers": {
    "server-name": {
      "command": "npx",
      "args": ["-y", "package-name"],
      "env": {
        "API_KEY": "your-key"
      },
      "disabled": false,
      "autoApprove": ["tool-name"]
    }
  }
}
```

### Auto-Approve

Tools listed in `autoApprove` array will execute without user confirmation:

```json
"autoApprove": [
  "brave_web_search",
  "tavily-search",
  "github_get_me"
]
```

### Disabling Servers

Set `"disabled": true` to temporarily disable a server without removing it:

```json
{
  "server-name": {
    "disabled": true
  }
}
```

### Environment Variables

API keys and secrets should be stored in the `env` object:

```json
"env": {
  "API_KEY": "your-secret-key",
  "CUSTOM_SETTING": "value"
}
```

**Security Note:** Never commit API keys to version control!

---

## Troubleshooting

### Server Won't Connect

1. Check if the server is disabled in config
2. Verify API keys are correct
3. Check MCP logs in Kiro
4. Restart the server from MCP Server view
5. Clear npx cache: `npx clear-npx-cache`

### Invalid API Key Errors

1. Verify the key is correct in config
2. Check if the key has expired
3. Ensure the key has proper permissions/scopes
4. Get a new key from the provider

### Docker-based Servers (GitHub)

1. Ensure Docker is installed and running
2. Check Docker daemon status: `docker ps`
3. Verify Docker image is available
4. Check Docker logs for errors

### Tool Not Found

1. Verify the server is connected (check MCP Server view)
2. Ensure the tool name is spelled correctly
3. Check if the server version supports that tool
4. Update to latest server version

### Performance Issues

1. Reduce number of active servers
2. Disable unused servers
3. Clear npx cache
4. Check network connectivity for API-based servers

### SSL/Certificate Errors

1. Update server to latest version
2. Clear npx cache
3. Check system time is correct
4. Verify network proxy settings

---

## Additional Resources

### Official MCP Documentation
- [Model Context Protocol Spec](https://modelcontextprotocol.io)
- [MCP Server Registry](https://github.com/modelcontextprotocol/servers)

### API Key Providers
- [Brave Search API](https://brave.com/search/api)
- [Tavily API](https://tavily.com)
- [GitHub Personal Access Tokens](https://github.com/settings/tokens)

### Kiro Documentation
- Open Command Palette → Search "MCP"
- View MCP Server panel in Kiro feature panel
- Check MCP logs for debugging

---

## Current Active Configuration

```json
{
  "mcpServers": {
    "brave-search": "✅ Active",
    "tavily": "✅ Active",
    "github": "✅ Active",
    "memory": "✅ Active",
    "context7": "✅ Active",
    "filesystem": "✅ Active",
    "sequentialthinking": "✅ Active"
  }
}
```

**Total Active Servers:** 7
**Last Tested:** November 8, 2025
**All Servers Status:** ✅ Working

---

*This guide is maintained as part of The Inspector project documentation.*
