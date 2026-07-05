import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { getUserSupabase, requireAuth } from "../supabase";

export default defineTool({
  name: "like_post",
  title: "Like or unlike a post",
  description: "Toggle a like on a KAIAN post as the signed-in user. If the user already liked the post, the like is removed.",
  inputSchema: {
    post_id: z.string().uuid().describe("The UUID of the post to like."),
  },
  annotations: { readOnlyHint: false, idempotentHint: true, openWorldHint: false },
  handler: async ({ post_id }, ctx) => {
    const err = requireAuth(ctx);
    if (err) return err;
    const supabase = getUserSupabase(ctx);
    const userId = ctx.getUserId();
    const { data: existing } = await supabase
      .from("post_likes")
      .select("id")
      .eq("post_id", post_id)
      .eq("user_id", userId)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase.from("post_likes").delete().eq("id", existing.id);
      if (error) return { content: [{ type: "text", text: error.message }], isError: true };
      return { content: [{ type: "text", text: "Unliked." }], structuredContent: { liked: false } };
    }
    const { error } = await supabase.from("post_likes").insert({ post_id, user_id: userId });
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return { content: [{ type: "text", text: "Liked." }], structuredContent: { liked: true } };
  },
});
