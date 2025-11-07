# The Inspector - Demo Video Script

3-Minute Hackathon Demo (Kiroween 2024)

## Section 1: Introduction (0:00 - 0:30)

**Visual:** Show The Inspector homepage with logo and tagline

**Script:**
```
Hi! I'm [Your Name], and this is The Inspector—an X-ray tool for npm packages.

Before installing any package, wouldn't you want to know:
- What dependencies it brings in?
- Does it have security vulnerabilities?
- Is it safe for production?

The Inspector answers these questions in seconds, generating a comprehensive "Nutrition Label" report for any npm package.

Let me show you how it works.
```

**On-Screen Text:**
- "The Inspector: X-ray for npm packages"
- "Built with Kiro IDE in 10 days"

## Section 2: Live Demo (0:30 - 2:00)

### 2.1: Basic Analysis (30 seconds)

**Visual:** Show the InspectorForm with input field

**Script:**
```
Let's analyze a popular package: lodash.

[Type "lodash" in the input field and click "Inspect"]

The Inspector fetches data from three sources:
1. npm Registry - for package metadata
2. OSV Database - for security vulnerabilities
3. OpenAI GPT-4 - for AI-powered risk assessment

[Show loading spinner for 5-10 seconds]
```

**On-Screen Text:**
- "Analyzing lodash..."
- "Fetching from npm, OSV, and OpenAI"

### 2.2: Report Walkthrough (60 seconds)

**Visual:** Scroll through the NutritionLabel component

**Script:**
```
Here's the Nutrition Label report.

[Scroll to Package Info section]
First, we see package metadata: version, description, license, and maintainers.

[Scroll to Dependencies section]
Next, the dependency tree. Lodash has zero dependencies—it's a standalone package. This is great for minimizing supply chain risk.

[Scroll to Vulnerabilities section]
Security vulnerabilities are color-coded:
- Red for Critical
- Orange for High
- Yellow for Medium
- Blue for Low

Lodash version 4.17.21 has no known vulnerabilities. But let's see what happens with an older version...

[Type "lodash@4.17.15" and click "Inspect"]

[Show vulnerability section with Critical/High vulnerabilities]
Now we see multiple Critical and High severity vulnerabilities with CVE IDs and descriptions.

[Scroll to AI Summary section]
Finally, the AI-powered analysis provides:
- Risk level assessment (High in this case)
- Key security concerns in plain English
- Actionable recommendations
- Complexity assessment

This makes security data accessible to developers of all skill levels.

[Scroll to Export button]
You can export the report as Markdown or PDF for team sharing.
```

**On-Screen Text:**
- "Package Info: Metadata & License"
- "Dependencies: 0 (Standalone)"
- "Vulnerabilities: Color-coded by severity"
- "AI Summary: Plain-English risk assessment"
- "Export: Markdown or PDF"

## Section 3: Kiro IDE Showcase (2:00 - 3:00)

### 3.1: Spec-Driven Development (15 seconds)

**Visual:** Show `.kiro/specs/package-analysis-engine/` directory structure

**Script:**
```
The Inspector was built entirely with Kiro IDE using four key features.

First, Spec-Driven Development. I started by creating a master specification with:
- Requirements in EARS notation (Event-Action-Response-State)
- Three-layer architecture design
- 47 discrete implementation tasks

This provided a clear roadmap from day one.
```

**On-Screen Text:**
- "Spec-Driven Development"
- "requirements.md, design.md, tasks.md"

### 3.2: Vibe Coding (15 seconds)

**Visual:** Show a code file (e.g., `src/api/osv.js`) with line count

**Script:**
```
Second, Vibe Coding—Kiro's conversational code generation.

With a single prompt, Kiro generated this 600-line OSV API client with:
- Batching logic for 1000+ packages
- CVSS score parsing
- Exponential backoff retry
- Comprehensive error handling

All from natural language instructions.
```

**On-Screen Text:**
- "Vibe Coding: 600 lines from one prompt"
- "~3,500 total lines generated"

### 3.3: Agent Hooks (15 seconds)

**Visual:** Show `.kiro/hooks/dependency-auditor.json` and `dependency_audit.md`

**Script:**
```
Third, Agent Hooks for automation.

The Dependency Auditor hook automatically analyzes new dependencies when package.json changes.

[Show terminal: npm install lodash]
[Show dependency_audit.md being updated]

It generates a security report and alerts me if Critical or High vulnerabilities are found.

Zero manual effort—it just works.
```

**On-Screen Text:**
- "Agent Hooks: Automated dependency auditing"
- "Triggers on package.json save"

### 3.4: Steering Docs (15 seconds)

**Visual:** Show `.kiro/steering/` directory with six files

**Script:**
```
Finally, Steering Docs ensure consistency.

I defined standards for API clients, code conventions, and security policies.

Kiro applied these conventions to every generated file, creating a consistent codebase as if written by a single experienced developer.

The result? Production-ready code in 10 days instead of 30.
```

**On-Screen Text:**
- "Steering Docs: Consistent code generation"
- "6 steering files define project standards"

## Closing (5 seconds)

**Visual:** Show The Inspector homepage again

**Script:**
```
The Inspector: X-ray vision for npm packages, built with Kiro IDE.

Thank you!
```

**On-Screen Text:**
- "The Inspector"
- "Built with Kiro IDE"
- "GitHub: [repository-url]"
- "Live Demo: [deployment-url]"

---

## Production Notes

### Recording Setup
- Screen resolution: 1920x1080 (Full HD)
- Recording software: OBS Studio, Loom, or similar
- Audio: Clear microphone (avoid background noise)
- Browser: Chrome or Firefox (latest version)
- Zoom level: 100% (ensure text is readable)

### Editing Tips
- Add smooth transitions between sections (fade, slide)
- Use on-screen text to reinforce key points
- Speed up loading/waiting times (2x speed)
- Add background music (low volume, non-distracting)
- Include captions for accessibility

### Timing Breakdown
- Introduction: 30 seconds (10%)
- Live Demo: 90 seconds (50%)
- Kiro Showcase: 60 seconds (33%)
- Closing: 5 seconds (3%)
- Buffer: 5 seconds (for transitions)

### Key Messages
1. The Inspector solves a real problem (dependency security)
2. It's fast and easy to use (5-15 second analysis)
3. AI-powered summaries make security accessible
4. Built with Kiro IDE using advanced features
5. Production-ready in 10 days (67% time reduction)

### Call to Action
- Visit the live demo at [deployment-url]
- View source code on GitHub at [repository-url]
- Try analyzing your own packages

### Upload Platforms
- YouTube (unlisted or public)
- Vimeo (public)
- Facebook Video (public)
- Include link in hackathon submission form
