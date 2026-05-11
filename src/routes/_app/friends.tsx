import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/_app/friends")({
  component: () => (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <Card className="p-12 text-center shadow-card">
        <h1 className="text-3xl font-black mb-2">الأصدقاء</h1>
        <p className="text-muted-foreground">اكتشف الأصدقاء وأرسل طلبات الصداقة — قريباً.</p>
      </Card>
    </div>
  ),
});
