// @ts-check
import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";

import sitemap from "@astrojs/sitemap";
import tailwind from "@astrojs/tailwind";
import icon from "astro-icon";
import react from "@astrojs/react";
import compress from "astro-compress";

// https://astro.build/config
export default defineConfig({
  site: "https://notes.minagishl.com",
  integrations: [
    mdx(),
    sitemap({
      changefreq: "weekly",
      priority: 0.7,
      lastmod: new Date(),
      i18n: {
        defaultLocale: "ja",
        locales: {
          ja: "ja-JP",
        },
      },
    }),
    tailwind(),
    icon(),
    react(),
    compress({
      HTML: {
        "html-minifier-terser": {
          minifyCSS: false,
        },
      },
    }),
  ],
  markdown: {
    shikiConfig: {
      theme: "github-dark-dimmed",
    },
  },
});
