# The Inspector: Kiroween Hackathon Project Guide

**Project Name:** The Inspector  
**Hackathon:** Kiroween (Kiro IDE Hackathon)  
**Category:** Frankenstein  
**Timeline:** 30 days (until December 5, 2025)  
**Objective:** Win prize money by building a genuinely useful developer tool that showcases advanced Kiro IDE features

---

## Executive Summary

**The Inspector** is a web-based developer utility that acts as an "X-ray" for open-source packages. Before installing a package from npm, developers can use The Inspector to generate a comprehensive "Nutrition Label" report that reveals hidden dependencies, security vulnerabilities, license restrictions, and overall complexity. This tool solves a real, painful problem that every developer faces: understanding the true cost and risk of adding a dependency to their project.

This project is designed to win the **Frankenstein category** by stitching together multiple disparate technologies (npm API, OSV security database, AI language models, and React) into a single, powerful application. More importantly, it demonstrates **advanced mastery of Kiro IDE** through sophisticated use of specs, agent hooks, steering docs, and vibe coding.

---

## Why This Project Will Win

### 1. Undeniable Utility (High "Potential Value")

The Inspector addresses a universal developer pain point. Every time we run `npm install`, we're trusting a black box. This tool makes the invisible visible, promoting better security practices and informed decision-making. Judges will immediately recognize its practical value.

### 2. Perfect "Frankenstein" Fit

The project seamlessly integrates four distinct technologies:
- **npm Registry API** (package metadata)
- **OSV API** (security vulnerability data)
- **OpenAI API** (AI-powered analysis and summarization)
- **React + CSS** (professional web interface)

This is a sophisticated, non-obvious combination that demonstrates technical creativity.

### 3. Advanced Kiro Showcase

The development process will generate compelling evidence of Kiro mastery:
- **Spec-Driven Development**: A complete `.kiro/specs/` directory with requirements, design, and tasks
- **Agent Hooks**: Automated dependency auditing that runs on every `package.json` save
- **Steering Docs**: Custom code conventions and API standards that ensure consistent, high-quality output
- **Vibe Coding**: Strategic use of context providers (`#codebase`, `#url`, `#spec`) for efficient development

### 4. Beginner-Friendly Scope

While the concept is sophisticated, the technical implementation is achievable in 30 days. The core logic is straightforward: fetch data from APIs, process it, and display results. The complexity comes from the integration and the intelligent use of Kiro, not from algorithmic challenges.

---

## Project Architecture

### Technology Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Frontend** | React | User interface for package input and report display |
| **Styling** | CSS | Professional, clean "Nutrition Label" design |
| **Package Data** | npm Registry API | Fetch package metadata and dependencies |
| **Security Data** | OSV API | Check for known vulnerabilities |
| **Analysis** | OpenAI API (GPT-4) | Summarize findings in plain English |
| **Deployment** | Vercel/Netlify | Host the live application |

### Core Features

1.  **Package Input Form**: Simple text input for package name (e.g., "react", "express")
2.  **Dependency Tree Visualization**: Show direct and transitive dependencies
3.  **Security Vulnerability Report**: Color-coded alerts (Critical, High, Medium, Low)
4.  **License Analysis**: Identify restrictive licenses (GPL, AGPL) that could affect your project
5.  **AI-Powered Summary**: Plain-English explanation of risks and recommendations
6.  **Automated Auditing**: Agent hook that runs The Inspector on new dependencies automatically

---

## Development Strategy: Traycer + Kiro

### The Workflow

1.  **Traycer (Project Architect)**: Creates a detailed, multi-phase execution plan
2.  **Kiro (AI Developer)**: Executes the plan, guided by specs, hooks, and steering docs
3.  **You (Orchestrator)**: Review, refine, and iterate on the generated code

### Phase Breakdown

**Phase 1: Project Foundation**
- Initialize React project
- Generate Kiro foundational steering files (`product.md`, `tech.md`, `structure.md`)
- Create custom steering for code conventions and API standards
- Create master Spec for "The Inspector" application

**Phase 2: API Integration Layer**
- Implement npm Registry API client
- Implement OSV API client
- Implement OpenAI API client for summarization
- Create data flow pipeline (npm → OSV → OpenAI)

**Phase 3: Frontend Development**
- Build `InspectorForm` component (input + submit button)
- Build `NutritionLabel` component (report display)
- Implement loading states and error handling
- Add CSS styling for professional appearance

**Phase 4: Advanced Features**
- Create "Dependency Auditor" agent hook
- Add dependency tree visualization
- Implement caching to reduce API calls
- Add export functionality (PDF, Markdown)

**Phase 5: Deployment & Documentation**
- Deploy to Vercel/Netlify
- Create comprehensive README with Kiro usage details
- Record 3-minute demo video
- Prepare hackathon submission write-up

---

## Kiro Usage Documentation (For Hackathon Submission)

### Spec-Driven Development

We began by creating a comprehensive Spec in `.kiro/specs/package-analysis-engine/`:

**requirements.md** defined user stories in EARS notation:
```
WHEN a user enters a package name THE SYSTEM SHALL fetch its metadata from the npm registry
WHEN the package has dependencies THE SYSTEM SHALL check each dependency for known vulnerabilities
WHEN vulnerabilities are found THE SYSTEM SHALL categorize them by severity (Critical, High, Medium, Low)
```

**design.md** outlined the architecture:
- Three-layer design: API clients, data processing pipeline, React UI
- Sequence diagram showing data flow from user input to final report
- Error handling strategy for API failures

**tasks.md** broke down implementation into 47 discrete, trackable tasks

**Impact**: The spec-driven approach provided a clear roadmap and prevented scope creep. It was especially valuable for maintaining context across multiple development sessions.

### Vibe Coding

We used Kiro's chat extensively with strategic context providers:

**Most Impressive Code Generation**:
```
#url:https://osv.dev/docs/ Create a function in #src/api/osv.js that queries the OSV API 
for vulnerabilities. It should handle batching (max 1000 packages per request) and retry 
logic for rate limiting.
```

Kiro generated a complete, production-ready implementation with proper error handling, rate limiting, and TypeScript types in a single pass.

**Key Strategy**: Always providing `#url` context for API documentation dramatically improved accuracy.

### Agent Hooks

We created a "Dependency Auditor" hook:

**Trigger**: On File Save (`package.json`)  
**Action**: Detect newly added dependencies, run The Inspector analysis on each, append results to `dependency_audit.md`

**Impact**: This hook turned The Inspector into a development-time tool, not just a standalone app. It automatically alerts developers to risky dependencies as they're added, preventing security issues before they reach production.

### Steering Docs

We created three custom steering files:

1.  **`api-standards.md`**: Enforced consistent error handling, retry logic, and response validation across all API clients
2.  **`code-conventions.md`**: Required JSDoc comments, functional React components, and Airbnb style guide compliance
3.  **`security-policies.md`**: Mandated input sanitization and secure API key management

**Biggest Impact**: The `api-standards.md` steering file. After creating it, every API-related prompt to Kiro automatically included proper error handling and retry logic without us having to specify it each time.

---

## Next Steps: How to Execute This Plan

### Step 1: Set Up Traycer

1.  Install the Traycer extension in your IDE (VS Code, Cursor, or Windsurf)
2.  Open Traycer from the command palette or sidebar
3.  Choose **Phases Workflow** (for complex, multi-step projects)

### Step 2: Provide Traycer with Context

Copy and paste the **Traycer Master Prompt** (from `traycer_master_prompt.md`) into Traycer. Also provide the **Kiro Knowledge Asset** (from `kiro_knowledge_asset_for_traycer.md`) as additional context.

### Step 3: Review and Refine the Plan

Traycer will generate a detailed, multi-phase plan. Review it carefully. Use Traycer's iteration feature to refine any phases that don't look right.

### Step 4: Hand Off to Kiro

For each phase, Traycer will provide specific prompts for Kiro. Copy these prompts into Kiro's chat interface and let Kiro execute them.

### Step 5: Verify and Iterate

After each phase, use Traycer's verification process to ensure the implementation meets requirements. Make adjustments as needed.

### Step 6: Submit to Hackathon

Once complete, ensure your repository includes:
- The `.kiro` directory (with specs, hooks, and steering)
- A deployed, functional application
- A comprehensive README
- A 3-minute demo video
- A detailed write-up on Kiro usage

---

## Conclusion

**The Inspector** is a winning hackathon project because it combines genuine utility, technical sophistication, and a masterful demonstration of Kiro IDE's capabilities. By using Traycer to orchestrate Kiro's development, we create a meta-level "Frankenstein" project: an AI architect directing an AI developer to build a tool that analyzes software dependencies.

This is not just a project. It's a statement about the future of software development.

Good luck, and let's win this hackathon.
