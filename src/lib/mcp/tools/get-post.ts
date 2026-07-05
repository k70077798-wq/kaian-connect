import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { getPublicSupabase } from "../supabase";

export default defineTool({
  name: "get_post",
  title: "Get post",
  description: "Fetch a single KAIAN post by ID, including its top-level comments.",
  inputSchema: {
    post_id: z.string().uuid().describe("The UUID of the post."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ post_id }) => {
    const supabase = getPublicSupabase();
    const [{ data: post, error: pe }, { data: comments, error: ce }] = await Promise.all([
      supabase.from("posts").select("*").eq("id", post_id).maybeSingle(),
      supabase
        .from("post_comments")
        .select("id, user_id, content, created_at")
        .eq("post_id", post_id)
        .order("created_at", { ascending: true })
        .limit(50),
    ]);
    if (pe) return { content: [{ type: "text", text: pe.message }], isError: true };
    if (!post) return { content: [{ type: "text", text: "Post not found" }], isError: true };
    if (ce) return { content: [{ type: "text", text: ce.message }], isError: true };
    const payload = { post, comments: comments ?? [] };
    return {
      content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
      structuredContent: payload,
    };
  },
});
