import {
  createContentGenerator,
  createContentGeneratorConfig,
  AuthType,
  makeFakeConfig,
  type ContentGenerator,
  type ContentGeneratorConfig,
} from "@google/gemini-cli-core";

export const DEFAULT_MODEL = "gemini-3-flash-preview";

let contentGenerator: ContentGenerator | null = null;
let generatorConfig: ContentGeneratorConfig | null = null;

/**
 * Initialize the Gemini client using gemini-cli OAuth authentication.
 * This uses the same auth as `gemini auth login`.
 */
export async function initializeClient(): Promise<{
  client: ContentGenerator;
  config: ContentGeneratorConfig;
}> {
  if (contentGenerator && generatorConfig) {
    return { client: contentGenerator, config: generatorConfig };
  }

  // Create a minimal config for the gemini-cli-core
  const gcConfig = makeFakeConfig();

  // Create the content generator config with OAuth authentication
  generatorConfig = await createContentGeneratorConfig(
    gcConfig,
    AuthType.LOGIN_WITH_GOOGLE
  );

  // Create the content generator
  contentGenerator = await createContentGenerator(
    generatorConfig,
    gcConfig
  );

  return { client: contentGenerator, config: generatorConfig };
}

export { type ContentGenerator, type ContentGeneratorConfig };
