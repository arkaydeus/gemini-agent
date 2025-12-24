# Development Guidelines

## Runtime & Tools

- **Runtime:** Use Bun exclusively. Do not use Node.js, npm, or pnpm.
- **Package Manager:** `bun install`, `bun start`
- **Model:** Default model is `gemini-3-flash-preview`
- **Authentication:** Uses `gemini auth login` OAuth credentials - no API key required

## Key Commands

```bash
bun install          # Install dependencies
bun start            # Run with default output (output.md)
bun start -o file.md # Run with custom output file
```

## Code Conventions

- **Schemas:** Use Zod for all structured data with `z.toJSONSchema()` for Gemini API compatibility
- **Error Handling:** API calls use exponential backoff retry on 429 rate limit errors (5 retries, 1s-16s delays)
- **Streaming:** Writer agent streams output; Researcher runs in parallel without streaming

## Project Structure

```
index.ts              # CLI entry point, orchestrates agent pipeline
src/
  ai.ts               # Gemini client initialization with OAuth
  agents/index.ts     # Agent implementations
```

## Agent Architecture

Three agents work in sequence:

```
User Input → Coordinator → Researcher (×N parallel) → Writer → Report
```

### Coordinator Agent
- **Function:** `runCoordinator(topic: string): Promise<ResearchPlan>`
- Plans research with 5 focused questions
- Uses structured JSON output with Zod schema

### Researcher Agent
- **Function:** `runResearcher(question: string): Promise<ResearchResult>`
- Uses Google Search grounding: `config.tools = [{ googleSearch: {} }]`
- Runs in parallel, returns findings with source metadata

### Writer Agent
- **Function:** `runWriter(topic: string, findings: Array): Promise<string>`
- Streams markdown report to terminal
- Creates executive summary, sections, and conclusion

## Dependencies

| Package | Purpose |
|---------|---------|
| `@google/genai` | Gemini API types and interfaces |
| `@google/gemini-cli-core` | OAuth authentication, ContentGenerator |
| `zod` | Schema validation and JSON schema generation |
