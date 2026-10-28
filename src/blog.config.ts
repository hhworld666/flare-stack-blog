import type { SiteConfig } from "@/features/config/site-config.schema";

export const blogConfig = {
  title: "hh's Blog",
  author: "hh",
  description:
    "喜欢研究技术，也喜欢把路上遇到的小事认真记下来。这里放文章、项目，以及关于我的更多介绍。",
  announcement: "",
  social: [
    { platform: "github", url: "https://github.com/hhworld666" },
    { platform: "rss", url: "/rss.xml" },
  ],
  navLinks: [
    { label: "关于", href: "/post/about" },
    { label: "友链", href: "/friend-links" },
    { label: "GitHub", href: "https://github.com/hhworld666" },
  ],
  icons: {
    faviconSvg: "/favicon.svg",
    faviconIco: "/favicon.ico",
    favicon96: "/favicon-96x96.png",
    appleTouchIcon: "/apple-touch-icon.png",
    webApp192: "/web-app-manifest-192x192.png",
    webApp512: "/web-app-manifest-512x512.png",
  },
  theme: {
    fuwari: {
      homeBg: "/images/hh-home-bg.jpg",
      avatar: "/images/hh-avatar.png",
      primaryHue: 250,
    },
  },
} as const satisfies SiteConfig;
