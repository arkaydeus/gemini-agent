import type { Content, GenerateContentParameters, Part } from "@google/genai";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { DEFAULT_MODEL, initializeClient } from "../ai";

// Retry configuration
const MAX_RETRIES = 5;
const INITIAL_DELAY_MS = 1000;

/**
 * Sleep for a given number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Check if an error is a rate limit error (429)
 */
function isRateLimitError(error: unknown): boolean {
  if (error && typeof error === "object") {
    const err = error as { status?: number; code?: number };
    return err.status === 429 || err.code === 429;
  }
  return false;
}

/**
 * Execute a function with exponential backoff retry on rate limit errors
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  context: string
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (!isRateLimitError(error)) {
        throw error;
      }

      if (attempt < MAX_RETRIES - 1) {
        const delay = INITIAL_DELAY_MS * Math.pow(2, attempt);
        console.log(
          `\x1b[33m[Retry]\x1b[0m Rate limited on ${context}, waiting ${delay}ms (attempt ${attempt + 1}/${MAX_RETRIES})...`
        );
        await sleep(delay);
      }
    }
  }

  throw lastError;
}

// Schema for the coordinator's structured output
const researchPlanSchema = z.object({
  questions: z.array(z.string()).describe("List of research questions."),
  rationale: z.string().describe("Research strategy."),
});

export type ResearchPlan = z.infer<typeof researchPlanSchema>;

/**
 * Generate content with the Gemini API using OAuth auth from gemini-cli
 */
async function generateContent(
  systemInstruction: string,
  userPrompt: string,
  options: {
    useGoogleSearch?: boolean;
    jsonSchema?: object;
  } = {}
): Promise<{ text: string; groundingMetadata?: unknown }> {
  const { client } = await initializeClient();

  const contents: Content[] = [
    {
      role: "user",
      parts: [{ text: userPrompt }],
    },
  ];

  const config: GenerateContentParameters["config"] = {
    systemInstruction,
    maxOutputTokens: 8192,
  };

  // Enable Google Search grounding if requested
  if (options.useGoogleSearch) {
    config.tools = [{ googleSearch: {} }];
  }

  // Enable JSON schema output if requested
  if (options.jsonSchema) {
    config.responseMimeType = "application/json";
    config.responseJsonSchema = options.jsonSchema;
  }

  const request: GenerateContentParameters = {
    model: DEFAULT_MODEL,
    contents,
    config,
  };

  const response = await withRetry(
    () => client.generateContent(request, randomUUID()),
    "generateContent"
  );

  const candidate = response.candidates?.[0];
  const text =
    candidate?.content?.parts?.map((p: Part) => p.text || "").join("") || "";

  return {
    text,
    groundingMetadata: candidate?.groundingMetadata,
  };
}

/**
 * Stream content with the Gemini API
 */
async function streamContent(
  systemInstruction: string,
  userPrompt: string,
  options: {
    useGoogleSearch?: boolean;
    onText?: (text: string) => void;
    onGrounding?: (metadata: unknown) => void;
  } = {}
): Promise<string> {
  const { client } = await initializeClient();

  const contents: Content[] = [
    {
      role: "user",
      parts: [{ text: userPrompt }],
    },
  ];

  const config: GenerateContentParameters["config"] = {
    systemInstruction,
    maxOutputTokens: 8192,
  };

  // Enable Google Search grounding if requested
  if (options.useGoogleSearch) {
    config.tools = [{ googleSearch: {} }];
  }

  const request: GenerateContentParameters = {
    model: DEFAULT_MODEL,
    contents,
    config,
  };

  const stream = await withRetry(
    () => client.generateContentStream(request, randomUUID()),
    "streamContent"
  );

  let fullText = "";

  for await (const chunk of stream) {
    const candidate = chunk.candidates?.[0];
    const parts = candidate?.content?.parts;

    if (parts) {
      for (const part of parts) {
        if (part.text) {
          fullText += part.text;
          options.onText?.(part.text);
        }
      }
    }

    // Capture grounding metadata when available
    if (candidate?.groundingMetadata) {
      options.onGrounding?.(candidate.groundingMetadata);
    }
  }

  return fullText;
}

/**
 * Coordinator Agent - Plans research with focused questions
 */
export async function runCoordinator(topic: string): Promise<ResearchPlan> {
  console.log(
    `\n\x1b[36m[Coordinator]\x1b[0m Planning research for "${topic}"...`
  );

  const systemInstruction = `You are a Research Coordinator.
Plan research with 5 focused, searchable questions.
Return your response as JSON matching the schema provided.`;

  const { text } = await generateContent(systemInstruction, `Topic: ${topic}`, {
    jsonSchema: z.toJSONSchema(researchPlanSchema),
  });

  const plan = researchPlanSchema.parse(JSON.parse(text));
  return plan;
}

export interface ResearchResult {
  question: string;
  findings: string;
  sources: Array<{ title?: string; uri?: string }>;
}

/**
 * Researcher Agent - Uses Google Search grounding to find information
 * Non-streaming for parallel execution
 */
export async function runResearcher(question: string): Promise<ResearchResult> {
  const systemInstruction = `You are an expert Research Agent.
Use the Google Search tool to find current, accurate information.
Summarize your findings with citations from the search results.
Be thorough but concise.`;

  const { text, groundingMetadata } = await generateContent(
    systemInstruction,
    `Research this question: ${question}`,
    { useGoogleSearch: true }
  );

  // Extract sources from grounding metadata
  const sources: Array<{ title?: string; uri?: string }> = [];
  if (groundingMetadata && typeof groundingMetadata === "object") {
    const meta = groundingMetadata as {
      groundingChunks?: Array<{ web?: { uri?: string; title?: string } }>;
    };

    if (meta.groundingChunks?.length) {
      for (const chunk of meta.groundingChunks) {
        if (chunk.web) {
          sources.push({ title: chunk.web.title, uri: chunk.web.uri });
        }
      }
    }
  }

  return { question, findings: text, sources };
}

/**
 * Writer Agent - Creates a markdown report from findings
 */
export async function runWriter(
  topic: string,
  findings: Array<{ question: string; findings: string }>
): Promise<string> {
  console.log(`\n\x1b[36m[Writer]\x1b[0m Creating report...`);

  const systemInstruction = `You are a Senior Technical Writer.
Write a well-structured Markdown report based on the research findings provided.
Include an executive summary, main sections for each finding, and a conclusion.
Use proper markdown formatting with headers, lists, and emphasis where appropriate.`;

  const context = findings
    .map((d) => `### Question: ${d.question}\n\nFindings:\n${d.findings}`)
    .join("\n\n---\n\n");

  const result = await streamContent(
    systemInstruction,
    `Topic: ${topic}\n\nResearch Findings:\n${context}`,
    {
      onText: (text) => process.stdout.write(text),
    }
  );

  console.log("\n");
  return result;
}
