# Notes

A modern blog built with [Astro](https://astro.build), featuring MDX support, Tailwind CSS styling, and RSS feed capabilities.

## Features

- **Fast Performance**: Built with Astro for optimal speed and performance
- **MDX Support**: Write posts in MDX format with React components
- **Tailwind CSS**: Fully customizable styling with Tailwind CSS
- **Responsive Design**: Mobile-first responsive layout
- **RSS Feed**: Built-in RSS feed support
- **Sitemap**: Automatic sitemap generation
- **TypeScript**: Written in TypeScript for better type safety
- **SEO Friendly**: Built-in SEO optimizations

## Project Structure

```
├── public/              # Static assets
├── src/
│   ├── components/      # Reusable UI components
│   ├── content/         # Blog content
│   │   ├── articles/    # Blog articles (MDX/MD)
│   │   └── other/       # Other content pages
│   ├── layouts/         # Page layouts
│   ├── pages/           # Route components
│   └── styles/          # Global styles
└── package.json         # Project dependencies
```

## Tech Stack

- [Astro](https://astro.build)
- [React](https://reactjs.org)
- [Tailwind CSS](https://tailwindcss.com)
- [MDX](https://mdxjs.com)
- [TypeScript](https://www.typescriptlang.org)

## Getting Started

1. **Clone the repository**

```bash
git clone https://github.com/minagishl/notes.git
cd notes
```

2. **Install dependencies**

```bash
pnpm install
```

3. **Start development server**

```bash
pnpm dev
```

4. **Build for production**

```bash
pnpm build
```

5. **Preview production build**

```bash
pnpm preview
```

## Writing Content

### Blog Posts

Place your blog posts in `src/content/articles/` using `.md` or `.mdx` format. Each post should include frontmatter with metadata:

```markdown
---
title: Your Post Title
description: A brief description of your post
pubDate: 2024-03-07
---

Your content here...
```

### Other Pages

Additional pages can be added in `src/content/other/` following the same format.

## Configuration

- `astro.config.mjs`: Astro configuration
- `tsconfig.json`: TypeScript configuration

## RSS Feed

The RSS feed is automatically generated at `/rss.xml`. Configure the feed settings in `src/pages/rss.xml.js`.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
