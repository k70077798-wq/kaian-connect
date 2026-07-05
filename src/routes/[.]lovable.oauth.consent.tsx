import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

// Typed wrapper: supabase.auth.oauth is beta and not in the public types yet.
type OAuthApi = {
  getAuthorizationDetails: (id: string) => Promise<{
    data: { client?: { name?: string }; redirect_url?: string; redirect_to?: string } | null;
    error: { message: string } | null;
  }>;
  approveAuthorization: (id: string) => Promise<{
    data: { redirect_url?: string; redirect_to?: string } | null;
    error: { message: string } | null;
  }>;
  denyAuthorization: (id: string) => Promise<{
    data: { redirect_url?: string; redirect_to?: string } | null;
    error: { message: string } | null;
  }>;
};

function oauth(): OAuthApi {
  return (supabase.auth as unknown as { oauth: OAuthApi }).oauth;
}

export const Route = createFileRoute("/.lovable/oauth/consent")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    authorization_id: typeof s.authorization_id === "string" ? s.authorization_id : "",
  }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error("Missing authorization_id");
    const { data } = await supabase.auth.getSession();
    const next = location.pathname + location.searchStr;
    if (!data.session) throw redirect({ to: "/", search: { next } as never });
  },
  loader: async ({ location }) => {
    const authorizationId = new URLSearchParams(location.search).get("authorization_id")!;
    const { data, error } = await oauth().getAuthorizationDetails(authorizationId);
    if (error) throw new Error(error.message);
    const immediate = data?.redirect_url ?? data?.redirect_to;
    if (immediate && !data?.client) throw redirect({ href: immediate });
    return data;
  },
  component: Consent,
  errorComponent: ({ error }) => (
    <main className="min-h-screen grid place-items-center p-6" dir="rtl">
      <Card className="p-6 max-w-md text-center">
        <p className="font-bold text-lg mb-2">تعذّر تحميل طلب التفويض</p>
        <p className="text-sm text-muted-foreground">{String((error as Error)?.message ?? error)}</p>
      </Card>
    </main>
  ),
});

function Consent() {
  const details = Route.useLoaderData();
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function decide(approve: boolean) {
    setBusy(true);
    setError(null);
    const { data, error } = approve
      ? await oauth().approveAuthorization(authorization_id)
      : await oauth().denyAuthorization(authorization_id);
    if (error) { setBusy(false); setError(error.message); return; }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) { setBusy(false); setError("لم يُرجَع رابط توجيه من خادم التفويض."); return; }
    window.location.href = target;
  }

  const clientName = details?.client?.name ?? "تطبيق خارجي";

  return (
    <main className="min-h-screen grid place-items-center p-6 bg-soft-gradient" dir="rtl">
      <Card className="p-8 max-w-md w-full shadow-elegant">
        <h1 className="text-2xl font-black mb-2">ربط {clientName} بحسابك</h1>
        <p className="text-sm text-muted-foreground mb-6">
          سيتمكّن <span className="font-bold text-foreground">{clientName}</span> من استخدام كيان نيابةً عنك:
          قراءة ملفك الشخصي، نشر المنشورات، الإعجاب والتعليق، ورفع الوسائط.
        </p>
        {error && <p role="alert" className="text-sm text-destructive mb-4">{error}</p>}
        <div className="flex gap-3">
          <Button disabled={busy} onClick={() => decide(true)} className="flex-1 h-11 bg-brand-gradient font-bold">
            الموافقة
          </Button>
          <Button disabled={busy} onClick={() => decide(false)} variant="secondary" className="flex-1 h-11 font-bold">
            رفض
          </Button>
        </div>
      </Card>
    </main>
  );
}
