import { defineCollection, z } from "astro:content";

const articles = defineCollection({
  type: "content",
  // Type-check frontmatter using a schema
  schema: z.object({
    title: z.string(),
    description: z.string(),
    // Transform string to Date object
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    emoji: z.string(),
    hiddenWishlist: z.boolean().optional(),
    tags: z.array(z.string()).optional(),
    hidePubDate: z.boolean().optional(),
  }),
});

const other = articles;

export const collections = { articles, other };
