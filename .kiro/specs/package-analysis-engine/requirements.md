# Requirements Document

## Introduction

The Inspector is a developer utility that analyzes npm packages before installation, providing comprehensive security, dependency, and complexity insights through a "Nutrition Label" report. This tool combines data from npm registry, OSV vulnerability database, and AI-powered analysis to help developers make informed decisions about package dependencies.

## Glossary

- **System**: The Inspector application
- **npm Registry**: The official npm package registry API at https://registry.npmjs.org/
- **OSV API**: Open Source Vulnerabilities database API at https://api.osv.dev/
- **LLM**: Large Language Model (OpenAI GPT-4) used for generating plain-English summaries
- **Nutrition Label**: The comprehensive report format displaying package analysis results
- **Agent Hook**: Kiro IDE automation that triggers on specific events (e.g., file save)
- **Dependency Tree**: Hierarchical visualization of package dependencies

## Requirements

### Requirement 1

**User Story:** As a developer, I want to analyze an npm package before installing it, so that I can understand its security risks and complexity

#### Acceptance Criteria

1. WHEN a user enters a valid npm package name, THE System SHALL fetch its metadata from the npm Registry
2. WHEN the package metadata is retrieved, THE System SHALL extract the list of direct dependencies
3. WHEN the analysis is complete, THE System SHALL display a comprehensive Nutrition Label report
4. WHEN the user enters an invalid package name format, THE System SHALL display a clear error message with validation guidance
5. WHILE the analysis is in progress, THE System SHALL display a loading indicator to inform the user

### Requirement 2

**User Story:** As a security-conscious developer, I want to see vulnerability reports for all dependencies, so that I can make informed decisions about package safety

#### Acceptance Criteria

1. WHEN dependencies are identified, THE System SHALL query the OSV API for known vulnerabilities
2. WHEN vulnerabilities are found, THE System SHALL categorize them by severity level (Critical, High, Medium, Low)
3. WHEN vulnerability data is collected, THE System SHALL send it to an LLM for plain-English summarization
4. WHEN the LLM returns a summary, THE System SHALL display the summary in the Nutrition Label report
5. WHEN no vulnerabilities are found, THE System SHALL display a message confirming the package is clean

### Requirement 3

**User Story:** As a project maintainer, I want to understand license implications, so that I can avoid legal issues

#### Acceptance Criteria

1. WHEN package metadata is retrieved, THE System SHALL extract license information
2. WHEN license information is available, THE System SHALL display it prominently in the Nutrition Label
3. WHEN license information is missing, THE System SHALL display a warning message
4. WHEN multiple licenses are present, THE System SHALL display all licenses with clear separation

### Requirement 4

**User Story:** As a developer, I want to visualize the dependency tree, so that I can understand the package's complexity

#### Acceptance Criteria

1. WHEN the analysis is complete, THE System SHALL generate a hierarchical dependency tree visualization
2. WHEN the dependency tree is displayed, THE System SHALL show direct dependencies at the first level
3. WHEN a package has more than 100 dependencies, THE System SHALL display a complexity warning

### Requirement 5

**User Story:** As a developer, I want to export analysis reports, so that I can share findings with my team

#### Acceptance Criteria

1. WHEN the Nutrition Label is displayed, THE System SHALL provide an export button
2. WHEN the user clicks export to Markdown, THE System SHALL generate a Markdown file with the complete report
3. WHEN the user clicks export to PDF, THE System SHALL generate a PDF file with the complete report
4. WHEN the export is complete, THE System SHALL trigger a file download

### Requirement 6

**User Story:** As a developer, I want automatic dependency auditing, so that risky packages are caught before they enter my codebase

#### Acceptance Criteria

1. WHEN package.json is modified, THE System SHALL automatically trigger dependency analysis via Agent Hook
2. WHEN new dependencies are detected, THE System SHALL audit each new package
3. WHEN critical vulnerabilities are found, THE System SHALL display a prominent warning notification

## Non-Functional Requirements

### Performance

1. WHEN a package with fewer than 100 dependencies is analyzed, THE System SHALL complete the analysis within 30 seconds
2. WHEN API responses are cached, THE System SHALL serve cached results within 1 second

### Security

1. THE System SHALL store all API keys in environment variables
2. THE System SHALL never commit API keys to the repository
3. THE System SHALL validate package names against npm naming rules (supporting scoped packages like @babel/core) before passing to API calls
4. THE System SHALL validate all external API responses before processing
5. THE System SHALL enforce HTTPS for all API communications

### Usability

1. THE System SHALL provide an intuitive interface that junior developers can use without documentation
2. THE System SHALL display error messages in plain English without technical jargon
3. THE System SHALL use color coding for vulnerability severity (red=Critical, orange=High, yellow=Medium, blue=Low)

### Reliability

1. WHEN API calls fail, THE System SHALL retry with exponential backoff (3 attempts maximum)
2. WHEN API rate limits are hit, THE System SHALL handle them gracefully with appropriate retry logic
3. WHEN network errors occur, THE System SHALL display a user-friendly error message
