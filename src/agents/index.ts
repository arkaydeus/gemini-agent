import { Output, stepCountIs, ToolLoopAgent, type LanguageModel } from "ai";
import { z } from "zod";
import { gemini } from "../ai";
import { searchTool } from "../tools/search";

// Using gemini-3-flash-preview as requested.
// We explicitly disable thoughts to try and avoid the 'thought_signature' error
// that seems to be a provider/API compatibility issue with function calling.
// Note: Cast to LanguageModel since ai-sdk-provider-gemini-cli returns LanguageModelV2
// which is compatible at runtime but TypeScript needs the cast for ai@6.x
const model = (id: string) =>
  gemini(id, {
    maxOutputTokens: 8192,
    includeThoughts: false,
  }) as LanguageModel;

const defaultModel = model("gemini-3-flash-preview");

export const coordinatorAgent = new ToolLoopAgent({
  model: defaultModel,
  instructions: `You are a Research Coordinator.
  Plan research with 3 focused, searchable questions.`,
  output: Output.object({
    schema: z.object({
      questions: z.array(z.string()).describe("List of research questions."),
      rationale: z.string().describe("Research strategy."),
    }),
  }),
});

export const researcherAgent = new ToolLoopAgent({
  model: defaultModel,
  instructions: `You are an expert Research Agent.
  Use 'search' ONCE per question to find info. 
  Summarize findings with citations.`,
  tools: {
    search: searchTool,
  },
  stopWhen: stepCountIs(3), // Limit steps to avoid rate limits and loop errors
});

export const writerAgent = new ToolLoopAgent({
  model: defaultModel,
  instructions: `You are a Senior Technical Writer.
  Write a Markdown report based on findings.`,
});

export async function runAgentStream(agent: any, prompt: string) {
  const result = await agent.stream({ prompt });
  let fullText = "";

  for await (const part of result.fullStream) {
    if (part.type === "text-delta" && part.textDelta) {
      process.stdout.write(part.textDelta);
      fullText += part.textDelta;
    } else if (part.type === "tool-call") {
      console.log(`\n\x1b[33m[Agent Action: ${part.toolName}]\x1b[0m`);
    } else if (part.type === "tool-result") {
      console.log(`\x1b[32m[Action Result: ${part.toolName}]\x1b[0m`);
    } else if (part.type === "error") {
      console.error(`\n\x1b[31m[Agent Error]\x1b[0m ${part.error}`);
    }
  }
  process.stdout.write("\n");
  return fullText;
}
