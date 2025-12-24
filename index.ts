import { createInterface } from 'node:readline/promises';
import { coordinatorAgent, researcherAgent, writerAgent, runAgentStream } from './src/agents';

const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function main() {
  console.clear();
  console.log('🤖 \x1b[1mGemini Agentic Research Framework (v2)\x1b[0m');
  console.log('---------------------------------------');
  
  const topic = await rl.question('\n🎯 Enter a research topic: ');
  
  if (!topic.trim()) {
    console.error('❌ Topic is required.');
    process.exit(1);
  }

  try {
    console.log('\n\x1b[36m[Phase 1: Planning]\x1b[0m');
    console.log(`🤖 Coordinator: Planning research for "${topic}"...`);
    
    const { output: plan } = await coordinatorAgent.generate({
      prompt: `Topic: ${topic}`,
    });
    
    if (!plan) {
      throw new Error('Failed to generate a research plan.');
    }

    console.log(`\n📋 \x1b[1mStrategy:\x1b[0m ${plan.rationale}`);
    console.log(`❓ \x1b[1mResearch Questions:\x1b[0m`);
    plan.questions.forEach((q: string, i: number) => console.log(`   ${i + 1}. ${q}`));

    const findings: { question: string; findings: string }[] = [];

    console.log('\n\x1b[36m[Phase 2: Researching]\x1b[0m');
    for (const question of plan.questions) {
      console.log(`\n🔎 Investigating: "${question}"`);
      const result = await runAgentStream(researcherAgent, `Research this question: ${question}`);
      findings.push({ question, findings: result });
      console.log('\n---------------------------------------');
    }

    console.log('\n\x1b[36m[Phase 3: Writing Report]\x1b[0m');
    const context = findings.map(d => `### Question: ${d.question}\n\nFindings:\n${d.findings}`).join('\n\n---\n\n');
    await runAgentStream(writerAgent, `Topic: ${topic}\n\nResearch Findings:\n${context}`);
    
    console.log('\n✅ \x1b[1mProcess Complete!\x1b[0m');

  } catch (error) {
    console.error('\n❌ An error occurred:', error);
  } finally {
    rl.close();
    process.exit(0);
  }
}

main();