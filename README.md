# Gemini Agent

A CLI-based multi-agent research tool powered by Google's Gemini API with native Google Search grounding.

## Features

- **Multi-Agent Pipeline:** Coordinator plans research, Researcher investigates with live search, Writer creates reports
- **Google Search Grounding:** Real-time web search using Gemini's native capabilities
- **Parallel Research:** All research questions are investigated concurrently
- **OAuth Authentication:** Uses `gemini auth login` credentials - no API key required
- **Streaming Output:** Writing phase streams to terminal in real-time
- **Automatic Retry:** Exponential backoff on rate limit errors

## Prerequisites

### 1. Bun Runtime

[Bun](https://bun.sh) v1.3.3 or later is required.

```bash
# macOS/Linux
curl -fsSL https://bun.sh/install | bash

# Windows (via PowerShell)
powershell -c "irm bun.sh/install.ps1 | iex"
```

### 2. Gemini CLI

The [Gemini CLI](https://github.com/anthropics/gemini-cli) is required for OAuth authentication.

```bash
# Install via npm
npm install -g @anthropic-ai/gemini-cli

# Or via bun
bun install -g @anthropic-ai/gemini-cli
```

### 3. Authentication

After installing Gemini CLI, authenticate with your Google account:

```bash
gemini auth login
```

This opens a browser for OAuth authentication. Your credentials are stored locally and used automatically by the agent.

## Installation

```bash
bun install
```

## Usage

```bash
# Interactive mode (prompts for topic)
bun start

# Pass topic directly
bun start -t "quantum computing advances"
bun start --topic "climate change solutions"

# Custom output file
bun start -o output/my-report.md
bun start --output output/research.md

# Combine options
bun start -t "AI in healthcare" -o output/ai-healthcare.md
```

### Options

| Flag | Short | Description | Default |
|------|-------|-------------|---------|
| `--topic` | `-t` | Research topic (skips interactive prompt) | - |
| `--output` | `-o` | Output file path | `output/output.md` |

## How It Works

1. **Planning Phase:** Coordinator analyzes your topic and generates 5 focused research questions
2. **Research Phase:** Researcher investigates all questions in parallel using Google Search grounding
3. **Writing Phase:** Writer synthesizes findings into a structured Markdown report
4. **Output:** Report is saved to the specified file (default: `output.md`)

## Documentation

- [GEMINI.md](GEMINI.md) - Project overview and architecture
- [AGENTS.md](AGENTS.md) - Development guidelines and agent details
