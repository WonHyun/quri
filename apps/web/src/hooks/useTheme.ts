import { useEffect, useState } from "react";

/** 라이트/다크 테마 상태와 토글을 제공한다. 선택값은 localStorage 에 보관. */
export function useTheme() {
  const [theme, setTheme] = useState<"light" | "dark" | null>(() => {
    const saved = localStorage.getItem("quri-theme");
    return saved === "light" || saved === "dark" ? saved : null;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme) {
      root.setAttribute("data-theme", theme);
      localStorage.setItem("quri-theme", theme);
    } else {
      root.removeAttribute("data-theme");
    }
  }, [theme]);

  const isDark =
    theme === "dark" ||
    (theme === null &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  return { isDark, toggle: () => setTheme(isDark ? "light" : "dark") };
}
