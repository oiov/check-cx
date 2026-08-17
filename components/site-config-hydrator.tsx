"use client";

import { useEffect } from "react";

interface SiteConfig {
  title?: string;
  description?: string;
  faviconUrl?: string;
}

function setMetaContent(name: string, content: string) {
  let element = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if (!element) {
    element = document.createElement("meta");
    element.name = name;
    document.head.appendChild(element);
  }
  element.content = content;
}

function setFavicon(href: string) {
  let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    document.head.appendChild(link);
  }
  link.href = href;
}

export function SiteConfigHydrator() {
  useEffect(() => {
    let cancelled = false;

    void fetch("/api/site-config", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() as Promise<SiteConfig> : null))
      .then((config) => {
        if (cancelled || !config) return;
        if (config.title) {
          document.title = config.title;
          setMetaContent("og:title", config.title);
        }
        if (config.description) {
          setMetaContent("description", config.description);
          setMetaContent("og:description", config.description);
        }
        if (config.faviconUrl) setFavicon(config.faviconUrl);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
