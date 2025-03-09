import { getCollection } from "astro:content";
import { SITE_TITLE, SITE_DESCRIPTION } from "../consts";

export async function GET(context) {
  const posts = await getCollection("articles");
  const items = posts.map((post) => ({
    ...post.data,
    link: new URL(`/articles/${post.slug}/`, context.site).toString(),
  }));

  const pages = await getCollection("other");
  const otherItems = pages.map((post) => ({
    ...post.data,
    link: new URL(`/${post.slug}/`, context.site).toString(),
  }));

  context = `# ${SITE_TITLE}\n\n> ${SITE_DESCRIPTION}\n\n## Articles\n\n${items
    .map((item) => `- [${item.title}](${item.link}): ${item.description}`)
    .join("\n")}`;

  context += `\n\n## Other\n\n${otherItems
    .map((item) => `- [${item.title}](${item.link}): ${item.description}`)
    .join("\n")}`;

  return new Response(context, {
    headers: {
      "Content-Type": "text/plain",
    },
  });
}
