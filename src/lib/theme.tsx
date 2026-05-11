import { createContext, useContext, useEffect, useState, ReactNode } from "react";

type Theme = "light" | "dark";
const Ctx = createContext<{ theme: Theme; toggle: () => void }>({ theme: "light", toggle: () => {} });

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const stored = (typeof localStorage !== "undefined" && localStorage.getItem("kaian-theme")) as Theme | null;
    if (stored) setTheme(stored);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    root.setAttribute("dir", "rtl");
    root.setAttribute("lang", "ar");
    try { localStorage.setItem("kaian-theme", theme); } catch {}
  }, [theme]);

  return <Ctx.Provider value={{ theme, toggle: () => setTheme(t => t === "light" ? "dark" : "light") }}>{children}</Ctx.Provider>;
}

export const useTheme = () => useContext(Ctx);
