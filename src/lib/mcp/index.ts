import { auth, defineMcp } from "@lovable.dev/mcp-js";
import searchUsers from "./tools/search-users";
import getUserProfile from "./tools/get-user-profile";
import searchPosts from "./tools/search-posts";
import latestPosts from "./tools/latest-posts";
import getPost from "./tools/get-post";
import listPages from "./tools/list-pages";
import createPost from "./tools/create-post";
import likePost from "./tools/like-post";
import commentPost from "./tools/comment-post";
import uploadMedia from "./tools/upload-media";

// The OAuth issuer MUST be the direct Supabase host (not the .lovable.cloud
// proxy) — mcp-js rejects issuer mismatches per RFC 8414. VITE_SUPABASE_PROJECT_ID
// is inlined at build time by Vite.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "kaian-mcp",
  title: "KAIAN",
  version: "0.2.0",
  instructions:
    "Tools for the KAIAN social platform. Read-only tools (search_users, get_user_profile, search_posts, latest_posts, get_post, list_pages) work anonymously. Mutation tools (create_post, like_post, comment_post, upload_media) require the signed-in user's OAuth authorization and act as that user under RLS.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    searchUsers,
    getUserProfile,
    searchPosts,
    latestPosts,
    getPost,
    listPages,
    createPost,
    likePost,
    commentPost,
    uploadMedia,
  ],
});
