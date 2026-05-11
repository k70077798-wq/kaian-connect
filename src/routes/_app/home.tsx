import { createFileRoute } from "@tanstack/react-router";
import { Sidebar } from "@/components/Sidebar";
import { RightRail } from "@/components/RightRail";
import { Feed } from "@/components/Feed";

export const Route = createFileRoute("/_app/home")({ component: HomePage });

function HomePage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 flex gap-6">
      <Sidebar />
      <main className="flex-1 max-w-2xl mx-auto w-full">
        <Feed />
      </main>
      <RightRail />
    </div>
  );
}
