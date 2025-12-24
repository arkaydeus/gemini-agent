# Gemini Agent Project

## Project Overview

This project is a CLI-based multi-agent research tool powered by Google's Gemini API. It is built with **TypeScript** and runs on the **Bun** runtime.

The application orchestrates a team of AI agents to perform comprehensive research on a user-provided topic:

1. **Coordinator Agent:** Analyzes the topic and formulates a research plan with focused questions.
2. **Researcher Agent:** Investigates each question using Gemini with **Google Search Grounding** to find up-to-date information.
3. **Writer Agent:** Synthesizes the findings into a well-structured Markdown report.

## Architecture

- **Entry Point (`index.ts`):** Handles CLI arguments, user input, and orchestrates the agent pipeline (Planning -> Research -> Writing). Saves the final report to a markdown file.
- **Agents (`src/agents/index.ts`):** Contains the implementation of the specific agents. See [AGENTS.md](AGENTS.md) for details.
- **AI Configuration (`src/ai.ts`):** Manages Gemini client initialization and authentication using `@google/gemini-cli-core`.

## Key Features

- **Google Search Grounding:** The Researcher agent uses Gemini's native Google Search tool for real-time, accurate information retrieval.
- **Structured Output:** Uses Zod schemas with Zod v4's native `z.toJSONSchema()` for type-safe structured output.
- **OAuth Authentication:** Leverages existing `gemini auth login` credentials - no API key required.
- **Streaming Output:** Research and writing phases stream output to the terminal in real-time.
- **File Output:** Reports are automatically saved to markdown files.

## Building and Running

### Prerequisites

1. **Bun:** Ensure [Bun](https://bun.sh) is installed (`v1.3.3` or later).
2. **Authentication:** You must be authenticated with the Gemini CLI:
   ```bash
   gemini auth login
   ```

### Installation

```bash
bun install
```

### Running the Agent

```bash
# Default output to output.md
bun start

# Custom output file
bun start -o my-report.md
bun start --output research.md
```

## Dependencies

| Package | Purpose |
|---------|---------|
| `@google/genai` | Gemini API types and interfaces |
| `@google/gemini-cli-core` | OAuth authentication, ContentGenerator |
| `zod` | Schema validation and JSON schema generation |

## Development Conventions

- **Runtime:** STRICTLY use **Bun** for all operations. Do not use Node.js, npm, or pnpm.
- **Model:** Default model is `gemini-3-flash-preview`.
- **Schemas:** Use Zod for all structured data with `z.toJSONSchema()` for Gemini API compatibility.
