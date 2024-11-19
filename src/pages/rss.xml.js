import rss from "@astrojs/rss";
import { getCollection } from "astro:content";
import { SITE_TITLE, SITE_DESCRIPTION } from "../consts";

export async function GET(context) {
  let items = [];

  const posts = await getCollection("articles");
  items = posts.map((post) => ({
    ...post.data,
    link: `/articles/${post.slug}/`,
  }));

  const pages = await getCollection("other");
  items = items.concat(
    pages.map((post) => ({
      ...post.data,
      link: `/${post.slug}/`,
    })),
  );

  return rss({
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    site: context.site,
    items: items,
  });
}
