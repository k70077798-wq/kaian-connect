import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { getUserSupabase, requireAuth } from "../supabase";

export default defineTool({
  name: "create_post",
  title: "Create post",
  description: "Publish a new post to KAIAN as the signed-in user. Optionally attach an image or video URL previously uploaded via upload_media, or a live m3u8 stream URL.",
  inputSchema: {
    content: z.string().min(1).max(5000).describe("Post text. Supports #hashtags and @mentions."),
    privacy: z.enum(["public", "friends", "private"]).default("public").describe("Who can see the post."),
    image_url: z.string().url().optional().describe("URL of an image attachment."),
    video_url: z.string().url().optional().describe("URL of a video attachment."),
    media_type: z.enum(["video", "reel"]).optional().describe("If video_url is set, whether it is a normal video or a Reel."),
    live_stream_url: z.string().url().optional().describe("Optional .m3u8 live stream URL. When provided, the post is marked as live."),
    feeling: z.string().max(64).optional(),
    location: z.string().max(128).optional(),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    const err = requireAuth(ctx);
    if (err) return err;
    const supabase = getUserSupabase(ctx);
    const { data, error } = await supabase
      .from("posts")
      .insert({
        user_id: ctx.getUserId(),
        content: input.content,
        privacy: input.privacy,
        image_url: input.image_url ?? null,
        video_url: input.video_url ?? null,
        media_type: input.media_type ?? null,
        live_stream_url: input.live_stream_url ?? null,
        is_live: Boolean(input.live_stream_url),
        feeling: input.feeling ?? null,
        location: input.location ?? null,
      })
      .select("id, created_at")
      .single();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: `Post ${data.id} created.` }],
      structuredContent: { post: data },
    };
  },
});
