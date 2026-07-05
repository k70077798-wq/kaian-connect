import { defineMcp } from "@lovable.dev/mcp-js";
import searchUsers from "./tools/search-users";
import getUserProfile from "./tools/get-user-profile";
import searchPosts from "./tools/search-posts";
import latestPosts from "./tools/latest-posts";
import getPost from "./tools/get-post";
import listPages from "./tools/list-pages";

export default defineMcp({
  name: "kaian-mcp",
  title: "KAIAN",
  version: "0.1.0",
  instructions:
    "Tools to explore the KAIAN social platform: search users and posts, fetch profiles and post threads, and browse pages. All data is public (read-only).",
  tools: [searchUsers, getUserProfile, searchPosts, latestPosts, getPost, listPages],
});
