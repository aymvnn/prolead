"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import { createClient } from "@/lib/supabase/client";
import { setLanguage, t as translate } from "@/lib/i18n";

interface LanguageContextValue {
  lang: string;
  t: (key: string) => string;
  switchLanguage: (lang: string) => void;
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: "nl",
  t: translate,
  switchLanguage: () => {},
});

export function useTranslation() {
  return useContext(LanguageContext);
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState("nl");

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userData } = await supabase
        .from("users")
        .select("org_id")
        .eq("id", user.id)
        .single();

      if (!userData) return;

      const { data: org } = await supabase
        .from("organizations")
        .select("settings")
        .eq("id", userData.org_id)
        .single();

      if (org?.settings) {
        const s = org.settings as Record<string, string>;
        const uiLang = s.ui_language || "nl";
        setLanguage(uiLang);
        setLang(uiLang);
      }
    })();
  }, []);

  const switchLanguage = useCallback((newLang: string) => {
    setLanguage(newLang);
    setLang(newLang);
  }, []);

  // Create a new `t` function reference every time `lang` changes.
  // This forces all consumers of useTranslation() to re-render.
  const t = useMemo(
    () => (key: string) => translate(key),
    [lang],
  );

  const value = useMemo(
    () => ({ lang, t, switchLanguage }),
    [lang, t, switchLanguage],
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}
