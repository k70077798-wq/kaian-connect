import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";

function makeStub(title: string, desc: string) {
  return function Page() {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12">
        <Card className="p-12 text-center shadow-card">
          <h1 className="text-3xl font-black mb-2">{title}</h1>
          <p className="text-muted-foreground">{desc}</p>
        </Card>
      </div>
    );
  };
}

export const friendsRoute = createFileRoute("/_app/friends")({ component: makeStub("الأصدقاء", "اكتشف الأصدقاء وأرسل طلبات الصداقة — قريباً.") });
