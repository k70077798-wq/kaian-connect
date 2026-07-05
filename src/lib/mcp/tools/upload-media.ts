import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { getUserSupabase, requireAuth } from "../supabase";

const MAX_BYTES = 15 * 1024 * 1024; // 15 MB

const ALLOWED_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
};

export default defineTool({
  name: "upload_media",
  title: "Upload media",
  description: "Upload an image or short video to KAIAN storage as the signed-in user. Returns a public URL that can be attached to a post via create_post's image_url or video_url. Max 15 MB.",
  inputSchema: {
    filename: z.string().min(1).max(128).describe("Original filename (used only for extension hint)."),
    mime_type: z.string().min(1).describe("MIME type. Supported: image/jpeg, image/png, image/webp, image/gif, video/mp4, video/webm, video/quicktime."),
    data_base64: z.string().min(1).describe("Base64-encoded file bytes (no data: prefix)."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ filename, mime_type, data_base64 }, ctx) => {
    const err = requireAuth(ctx);
    if (err) return err;

    const ext = ALLOWED_MIME[mime_type];
    if (!ext) {
      return { content: [{ type: "text", text: `Unsupported mime_type: ${mime_type}` }], isError: true };
    }

    let bytes: Uint8Array;
    try {
      const bin = atob(data_base64.replace(/^data:[^;]+;base64,/, ""));
      bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    } catch {
      return { content: [{ type: "text", text: "Invalid base64 data." }], isError: true };
    }
    if (bytes.byteLength > MAX_BYTES) {
      return { content: [{ type: "text", text: `File too large (${bytes.byteLength} bytes; max ${MAX_BYTES}).` }], isError: true };
    }

    const supabase = getUserSupabase(ctx);
    const userId = ctx.getUserId();
    const safeName = filename.replace(/[^A-Za-z0-9._-]/g, "_").slice(0, 60);
    const path = `${userId}/mcp/${Date.now()}-${crypto.randomUUID().slice(0, 8)}-${safeName}`;

    const { error: upErr } = await supabase.storage.from("media").upload(path, bytes, {
      contentType: mime_type,
      upsert: false,
    });
    if (upErr) return { content: [{ type: "text", text: upErr.message }], isError: true };

    const { data: pub } = supabase.storage.from("media").getPublicUrl(path);
    return {
      content: [{ type: "text", text: pub.publicUrl }],
      structuredContent: { url: pub.publicUrl, path, mime_type, bytes: bytes.byteLength },
    };
  },
});
