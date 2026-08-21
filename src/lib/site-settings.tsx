import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

export type NoticeStyle = "info" | "success" | "warning" | "danger";

export interface SiteSettings {
  identity: {
    siteName: string;
    logoUrl: string;
    logoSize: number;
    logoRadius: number;
    logoBorder: boolean;
    logoBackground: boolean;
  };
  appearance: {
    primary: string;
    secondary: string;
    button: string;
    surface: string;
    gradientAngle: number;
    shadowStrength: number;
  };
  text: {
    tagline: string;
    loginTitle: string;
    loginSubtitle: string;
    loginButton: string;
    registerTitle: string;
    registerSubtitle: string;
    registerButton: string;
    composerPlaceholder: string;
    footer: string;
  };
  features: {
    live: boolean;
    stories: boolean;
    reels: boolean;
    wallet: boolean;
    ads: boolean;
  };
  notice: {
    enabled: boolean;
    version: string;
    title: string;
    message: string;
    imageUrl: string;
    style: NoticeStyle;
    dismissible: boolean;
    routes: string;
    startsAt: string;
    endsAt: string;
  };
}

export const DEFAULT_LOGO_URL = "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEh8iH2aqvCzmEns7KC2YENagCnERIJOCzCHQk5ZkHIoGpf3pBNUwRj2LlMXr8r7NI2JFNWClKqPqtUoIu3kfxW-iYfogd0JPiZP9C5zm0gGkhUFRT-2fAmjmB3izc1mj2JzPQ0Jw0pK4aMGrMV-_J5vSbl3wh1IqshyaIDUDZ_TFNZVDajmZ6gCr9zSj10/s320/%D9%A2%D9%A0%D9%A2%D9%A6%D9%A0%D9%A7%D9%A0%D9%A3_%D9%A2%D9%A1%D9%A4%D9%A2%D9%A0%D9%A3.png";

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  identity: { siteName: "KAIAN", logoUrl: DEFAULT_LOGO_URL, logoSize: 40, logoRadius: 12, logoBorder: true, logoBackground: true },
  appearance: { primary: "#2446b8", secondary: "#db3045", button: "#2446b8", surface: "#f7f8fc", gradientAngle: 90, shadowStrength: 35 },
  text: {
    tagline: "منصة التواصل الإجتماعي",
    loginTitle: "مرحباً بعودتك!",
    loginSubtitle: "سعداء لرؤيتك مرة أخرى 💙",
    loginButton: "تسجيل الدخول",
    registerTitle: "إنشاء حساب جديد",
    registerSubtitle: "انضم إلينا وابدأ رحلتك الآن",
    registerButton: "إنشاء حساب",
    composerPlaceholder: "ماذا يدور في بالك؟",
    footer: "جميع الحقوق محفوظة © 2026 — صنع بكل ♥️ من عبدالحميد داوؤد",
  },
  features: { live: true, stories: true, reels: true, wallet: true, ads: true },
  notice: { enabled: false, version: "1", title: "", message: "", imageUrl: "", style: "info", dismissible: true, routes: "*", startsAt: "", endsAt: "" },
};

const SiteSettingsContext = createContext<{ settings: SiteSettings; loading: boolean; refresh: () => Promise<void> }>({
  settings: DEFAULT_SITE_SETTINGS,
  loading: true,
  refresh: async () => undefined,
});

function mergeSettings(value: unknown): SiteSettings {
  if (!value || typeof value !== "object") return DEFAULT_SITE_SETTINGS;
  const incoming = value as Partial<SiteSettings>;
  return {
    identity: { ...DEFAULT_SITE_SETTINGS.identity, ...incoming.identity },
    appearance: { ...DEFAULT_SITE_SETTINGS.appearance, ...incoming.appearance },
    text: { ...DEFAULT_SITE_SETTINGS.text, ...incoming.text },
    features: { ...DEFAULT_SITE_SETTINGS.features, ...incoming.features },
    notice: { ...DEFAULT_SITE_SETTINGS.notice, ...incoming.notice },
  };
}

export function SiteSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState(DEFAULT_SITE_SETTINGS);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    const { data } = await supabase.from("app_settings").select("value").eq("key", "site_customization").maybeSingle();
    setSettings(mergeSettings(data?.value));
    setLoading(false);
  };

  useEffect(() => {
    refresh();
    const channel = supabase.channel("site-customization")
      .on("postgres_changes", { event: "*", schema: "public", table: "app_settings", filter: "key=eq.site_customization" }, refresh)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--primary", settings.appearance.primary);
    root.style.setProperty("--ring", settings.appearance.primary);
    root.style.setProperty("--sidebar-primary", settings.appearance.primary);
    root.style.setProperty("--destructive", settings.appearance.secondary);
    root.style.setProperty("--brand-red", settings.appearance.secondary);
    root.style.setProperty("--app-button", settings.appearance.button);
    root.style.setProperty("--app-surface", settings.appearance.surface);
    root.style.setProperty("--gradient-brand", `linear-gradient(${settings.appearance.gradientAngle}deg, ${settings.appearance.primary}, ${settings.appearance.button} 48%, ${settings.appearance.secondary})`);
    root.style.setProperty("--shadow-elegant", `0 18px 50px -18px color-mix(in oklab, ${settings.appearance.primary} ${settings.appearance.shadowStrength}%, transparent)`);
  }, [settings.appearance]);

  const contextValue = useMemo(() => ({ settings, loading, refresh }), [settings, loading]);
  return <SiteSettingsContext.Provider value={contextValue}>{children}</SiteSettingsContext.Provider>;
}

export const useSiteSettings = () => useContext(SiteSettingsContext);