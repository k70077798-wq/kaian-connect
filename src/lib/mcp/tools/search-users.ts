import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { getPublicSupabase } from "../supabase";

export default defineTool({
  name: "search_users",
  title: "Search users",
  description: "Search KAIAN users by full name or username. Returns public profile fields.",
  inputSchema: {
    query: z.string().min(1).describe("Name or username fragment to search for."),
    limit: z.number().int().min(1).max(50).default(10).describe("Max results (1-50)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query, limit }) => {
    const supabase = getPublicSupabase();
    const { data, error } = await supabase
      .from("profiles")
      .select("id, username, full_name, avatar_url, bio, verified")
      .or(`full_name.ilike.%${query}%,username.ilike.%${query}%`)
      .limit(limit);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { users: data ?? [] },
    };
  },
});
