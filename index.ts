import { createInterface } from "node:readline/promises";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { parseArgs } from "node:util";
import { runCoordinator, runResearcher, runWriter } from "./src/agents";

// Parse command line arguments
const { values } = parseArgs({
  args: process.argv.slice(2),
  options: {
    output: {
      type: "string",
      short: "o",
      default: "output/output.md",
    },
    topic: {
      type: "string",
      short: "t",
    },
  },
});

const outputFile = values.output!;

const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function main() {
  console.clear();
  console.log("🤖 \x1b[1mGemini Agentic Research Framework (v3)\x1b[0m");
  console.log("Using gemini-cli OAuth + Google Search Grounding");
  console.log("-----------------------------------------------");
  console.log(`📄 Output will be saved to: ${outputFile}`);

  // Use topic from args or prompt for it
  let topic = values.topic;
  if (!topic) {
    topic = await rl.question("\n🎯 Enter a research topic: ");
  } else {
    console.log(`\n🎯 Research topic: ${topic}`);
  }

  if (!topic.trim()) {
    console.error("❌ Topic is required.");
    process.exit(1);
  }

  try {
    // Phase 1: Planning
    console.log("\n\x1b[36m[Phase 1: Planning]\x1b[0m");
    const plan = await runCoordinator(topic);

    console.log(`\n📋 \x1b[1mStrategy:\x1b[0m ${plan.rationale}`);
    console.log(`❓ \x1b[1mResearch Questions:\x1b[0m`);
    plan.questions.forEach((q: string, i: number) =>
      console.log(`   ${i + 1}. ${q}`)
    );

    // Phase 2: Research with Google Search Grounding (parallel)
    console.log("\n\x1b[36m[Phase 2: Researching (with Google Search)]\x1b[0m");
    console.log(`Researching ${plan.questions.length} questions in parallel...\n`);

    const researchPromises = plan.questions.map(async (question, index) => {
      const result = await runResearcher(question);
      console.log(`  ✓ Q${index + 1}: ${question}`);
      return result;
    });
    const results = await Promise.all(researchPromises);

    // Display results after all research completes
    for (const result of results) {
      console.log(`\n\x1b[36m[Research]\x1b[0m ${result.question}`);
      console.log(result.findings);
      if (result.sources.length > 0) {
        console.log("\n\x1b[32m[Sources]\x1b[0m");
        for (const source of result.sources) {
          console.log(`  - ${source.title || source.uri}`);
        }
      }
      console.log("-----------------------------------------------");
    }

    const findings = results.map((r) => ({
      question: r.question,
      findings: r.findings,
    }));

    // Phase 3: Write Report
    console.log("\n\x1b[36m[Phase 3: Writing Report]\x1b[0m");
    const report = await runWriter(topic, findings);

    // Save report to file
    await mkdir(dirname(outputFile), { recursive: true });
    await writeFile(outputFile, report, "utf-8");
    console.log(`\n📁 Report saved to: ${outputFile}`);

    console.log("\n✅ \x1b[1mProcess Complete!\x1b[0m");
  } catch (error) {
    console.error("\n❌ An error occurred:", error);
  } finally {
    rl.close();
    process.exit(0);
  }
}

main();
