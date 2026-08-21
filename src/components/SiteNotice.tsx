import { useEffect, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { AlertTriangle, CheckCircle2, Info, XCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSiteSettings } from "@/lib/site-settings";

const noticeStyles = {
  info: "border-primary/30 bg-accent text-accent-foreground",
  success: "border-emerald-500/30 bg-emerald-500/10 text-foreground",
  warning: "border-amber-500/30 bg-amber-500/10 text-foreground",
  danger: "border-destructive/30 bg-destructive/10 text-foreground",
};

const noticeIcons = { info: Info, success: CheckCircle2, warning: AlertTriangle, danger: XCircle };

export function SiteNotice() {
  const { settings } = useSiteSettings();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const [dismissed, setDismissed] = useState(false);
  const notice = settings.notice;
  const storageKey = `kaian-notice-${notice.version}`;

  useEffect(() => {
    try { setDismissed(localStorage.getItem(storageKey) === "dismissed"); } catch { setDismissed(false); }
  }, [storageKey]);

  const now = Date.now();
  const routeMatches = notice.routes.trim() === "*" || notice.routes.split(",").map((item) => item.trim()).filter(Boolean).some((route) => pathname.startsWith(route));
  const inWindow = (!notice.startsAt || new Date(notice.startsAt).getTime() <= now) && (!notice.endsAt || new Date(notice.endsAt).getTime() >= now);
  if (!notice.enabled || dismissed || !routeMatches || !inWindow || (!notice.title && !notice.message)) return null;
  const Icon = noticeIcons[notice.style];

  return (
    <div className={`border-b px-4 py-3 ${noticeStyles[notice.style]}`} dir="rtl">
      <div className="mx-auto grid max-w-7xl grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
        {notice.imageUrl ? <img src={notice.imageUrl} alt="" className="h-11 w-11 rounded-lg object-cover" /> : <Icon className="h-5 w-5" />}
        <div className="min-w-0"><p className="font-bold">{notice.title}</p>{notice.message && <p className="text-sm opacity-80">{notice.message}</p>}</div>
        {notice.dismissible && <Button variant="ghost" size="icon" onClick={() => { try { localStorage.setItem(storageKey, "dismissed"); } catch {} setDismissed(true); }} aria-label="إغلاق التنبيه"><X className="h-4 w-4" /></Button>}
      </div>
    </div>
  );
}