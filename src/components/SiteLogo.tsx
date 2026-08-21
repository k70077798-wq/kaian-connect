import { useSiteSettings } from "@/lib/site-settings";

export function SiteLogo({ compact = false, className = "" }: { compact?: boolean; className?: string }) {
  const { settings } = useSiteSettings();
  const size = compact ? Math.min(settings.identity.logoSize, 36) : settings.identity.logoSize;
  return (
    <img
      src={settings.identity.logoUrl}
      alt={`شعار ${settings.identity.siteName}`}
      className={`shrink-0 object-contain ${settings.identity.logoBackground ? "bg-card" : ""} ${settings.identity.logoBorder ? "ring-1 ring-border" : ""} ${className}`}
      style={{ width: size, height: size, borderRadius: settings.identity.logoRadius }}
    />
  );
}