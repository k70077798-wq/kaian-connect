import { createContext, useContext, useEffect, useState, ReactNode } from "react";

type Theme = "light" | "dark";
type ColorScheme = "brand" | "blue";

interface ThemeCtx {
  theme: Theme;
  toggle: () => void;
  setTheme: (t: Theme) => void;
  color: ColorScheme;
  setColor: (c: ColorScheme) => void;
}

const Ctx = createContext<ThemeCtx>({ theme: "light", toggle: () => {}, setTheme: () => {}, color: "brand", setColor: () => {} });

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");
  const [color, setColor] = useState<ColorScheme>("brand");

  useEffect(() => {
    try {
      const t = localStorage.getItem("kaian-theme") as Theme | null;
      const c = localStorage.getItem("kaian-color") as ColorScheme | null;
      if (t) setTheme(t);
      if (c) setColor(c);
    } catch {}
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    root.setAttribute("data-color", color);
    root.setAttribute("dir", "rtl");
    root.setAttribute("lang", "ar");
    try {
      localStorage.setItem("kaian-theme", theme);
      localStorage.setItem("kaian-color", color);
    } catch {}
  }, [theme, color]);

  return (
    <Ctx.Provider value={{ theme, toggle: () => setTheme(t => t === "light" ? "dark" : "light"), setTheme, color, setColor }}>
      {children}
    </Ctx.Provider>
  );
}

export const useTheme = () => useContext(Ctx);
