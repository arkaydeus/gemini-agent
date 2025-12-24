import { tool } from 'ai';
import { z } from 'zod';
import { search } from 'duck-duck-scrape';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const searchTool = tool({
  description: 'Search the web for information about a specific topic.',
  inputSchema: z.object({
    query: z.string(),
  }),
  execute: async ({ query }) => {
    try {
      console.log(`\n[Tool] Searching for: "${query}"...`);
      
      // Add a small delay to avoid rate limits
      await sleep(3000);

      const results = await search(query, {
        safeSearch: 'STRICT',
      });

      if (!results.results || results.results.length === 0) {
        return 'No results found.';
      }

      // Return top 3 results to keep context smaller
      return results.results.slice(0, 3).map(r => ({
        title: r.title,
        description: r.description,
        url: r.url,
      }));
    } catch (error: any) {
      if (error.message?.includes('anomaly')) {
        console.error('[Tool] Rate limited by DuckDuckGo. Try again later.');
        return 'Search failed due to rate limits. Please summarize what you already know or try a very different query later.';
      }
      console.error('Search failed:', error);
      return 'An error occurred while searching.';
    }
  },
});