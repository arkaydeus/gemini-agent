import { createGeminiProvider } from "ai-sdk-provider-gemini-cli";

// Initialize the provider.
// We assume the environment is set up with 'gemini auth login' or similar if using CLI auth,
// or GEMINI_API_KEY env var.
// The provider attempts to use available auth methods.
export const gemini = createGeminiProvider({
  authType: "oauth-personal",
});
