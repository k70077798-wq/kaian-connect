import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { getUserSupabase, requireAuth } from "../supabase";

export default defineTool({
  name: "comment_post",
  title: "Comment on a post",
  description: "Add a comment to a KAIAN post as the signed-in user. Supports @mentions and #hashtags.",
  inputSchema: {
    post_id: z.string().uuid().describe("The UUID of the post."),
    content: z.string().min(1).max(2000).describe("Comment text."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ post_id, content }, ctx) => {
    const err = requireAuth(ctx);
    if (err) return err;
    const supabase = getUserSupabase(ctx);
    const { data, error } = await supabase
      .from("post_comments")
      .insert({ post_id, user_id: ctx.getUserId(), content })
      .select("id, created_at")
      .single();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: `Comment ${data.id} added.` }],
      structuredContent: { comment: data },
    };
  },
});
