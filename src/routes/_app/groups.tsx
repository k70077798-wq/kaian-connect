import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/_app/groups")({
  component: () => (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <Card className="p-12 text-center shadow-card">
        <h1 className="text-3xl font-black mb-2">المجموعات</h1>
        <p className="text-muted-foreground">انضم وأنشئ مجموعات بمحاور تهمك — قريباً.</p>
      </Card>
    </div>
  ),
});
