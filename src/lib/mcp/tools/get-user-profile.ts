import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { getPublicSupabase } from "../supabase";

export default defineTool({
  name: "get_user_profile",
  title: "Get user profile",
  description: "Fetch a KAIAN user's public profile by username or user ID.",
  inputSchema: {
    identifier: z.string().min(1).describe("Username or UUID of the user."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ identifier }) => {
    const supabase = getPublicSupabase();
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);
    const q = supabase
      .from("profiles")
      .select("id, username, full_name, avatar_url, cover_url, bio, verified, created_at");
    const { data, error } = await (isUuid ? q.eq("id", identifier) : q.eq("username", identifier)).maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!data) return { content: [{ type: "text", text: "User not found" }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { profile: data },
    };
  },
});
