import { createFileRoute } from "@tanstack/react-router";
import { Sidebar } from "@/components/Sidebar";
import { RightRail } from "@/components/RightRail";
import { Feed } from "@/components/Feed";
import { HomeTips } from "@/components/HomeTips";

export const Route = createFileRoute("/_app/home")({
  head: () => ({
    meta: [
      { title: "الرئيسية — KAIAN" },
      { name: "description", content: "موجز KAIAN: منشورات أصدقائك، القصص، الريلز والبث المباشر في مكان واحد." },
      { property: "og:title", content: "الرئيسية — KAIAN" },
      { property: "og:description", content: "موجز KAIAN: منشورات أصدقائك، القصص، الريلز والبث المباشر في مكان واحد." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 flex gap-6">
      <Sidebar />
      <main className="flex-1 max-w-2xl mx-auto w-full">
        <Feed />
      </main>
      <RightRail />
      <HomeTips />
    </div>
  );
}
