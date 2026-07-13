import { createServerFn } from "@tanstack/react-start";
import { AccessToken } from "livekit-server-sdk";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getLivekitToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { room: string; identity?: string; name?: string; canPublish?: boolean }) => input)
  .handler(async ({ data, context }) => {
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const url = process.env.LIVEKIT_URL;
    if (!apiKey || !apiSecret || !url) throw new Error("LiveKit not configured");

    const room = String(data.room || "").slice(0, 128);
    if (!room) throw new Error("room required");

    const identity = data.identity || context.userId;
    const at = new AccessToken(apiKey, apiSecret, {
      identity,
      name: data.name || identity,
      ttl: 60 * 60 * 6, // 6 hours
    });
    at.addGrant({
      room,
      roomJoin: true,
      canPublish: data.canPublish !== false,
      canSubscribe: true,
      canPublishData: true,
    });

    const token = await at.toJwt();
    return { token, url, room, identity };
  });
