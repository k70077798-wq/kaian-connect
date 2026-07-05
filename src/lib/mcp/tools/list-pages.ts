import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { getPublicSupabase } from "../supabase";

export default defineTool({
  name: "list_pages",
  title: "List pages",
  description: "Browse public KAIAN pages, optionally filtered by name or category.",
  inputSchema: {
    query: z.string().optional().describe("Optional name/category fragment."),
    limit: z.number().int().min(1).max(50).default(10),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query, limit }) => {
    const supabase = getPublicSupabase();
    let q = supabase.from("pages").select("id, name, username, category, description, avatar_url, cover_url, created_at");
    if (query) q = q.or(`name.ilike.%${query}%,category.ilike.%${query}%`);
    const { data, error } = await q.order("created_at", { ascending: false }).limit(limit);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { pages: data ?? [] },
    };
  },
});
