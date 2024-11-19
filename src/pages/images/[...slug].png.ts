import type { APIContext } from "astro";
import { getCollection } from "astro:content";
import { getImage } from "./_image";
import { codePoint } from "../../utils";

export async function getStaticPaths() {
  const posts = await getCollection("articles");
  const pages = [posts[0], ...(await getCollection("other"))];
  const uniqueSlugs = new Set(
    pages.map((page: any) => codePoint(page.data.emoji)),
  );

  return Array.from(uniqueSlugs).map((slug) => ({
    params: { slug },
  }));
}

export async function GET({ params }: APIContext) {
  const body = await getImage(String(params.slug));

  return new Response(body, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=31536000",
    },
    status: 200,
  });
}
