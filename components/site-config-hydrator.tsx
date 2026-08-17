"use client";

import { useEffect } from "react";

interface SiteConfig {
  title?: string;
  description?: string;
  keywords?: string;
  logoUrl?: string;
  faviconUrl?: string;
  siteUrl?: string;
}

function setMetaContent(attribute: "name" | "property", key: string, content: string) {
  let element = document.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.content = content;
}

function setLinkHref(rel: string, href: string) {
  let link = document.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!link) {
    link = document.createElement("link");
    link.rel = rel;
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
          setMetaContent("property", "og:title", config.title);
          setMetaContent("property", "og:site_name", config.title);
          setMetaContent("name", "twitter:title", config.title);
          setMetaContent("name", "application-name", config.title);
        }
        if (config.description) {
          setMetaContent("name", "description", config.description);
          setMetaContent("property", "og:description", config.description);
          setMetaContent("name", "twitter:description", config.description);
        }
        if (config.keywords) {
          setMetaContent("name", "keywords", config.keywords);
        }
        if (config.logoUrl) {
          setMetaContent("property", "og:image", config.logoUrl);
          setMetaContent("name", "twitter:image", config.logoUrl);
          setMetaContent("name", "twitter:card", "summary");
        }
        if (config.siteUrl) {
          setMetaContent("property", "og:url", config.siteUrl);
          setLinkHref("canonical", config.siteUrl);
        }
        if (config.faviconUrl) {
          setLinkHref("icon", config.faviconUrl);
          setLinkHref("shortcut icon", config.faviconUrl);
          setLinkHref("apple-touch-icon", config.faviconUrl);
        }
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
