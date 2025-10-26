import { getCollection, getEntry } from "astro:content";

type MarkdownFrontmatter = Record<string, unknown>;

export async function getStaticPaths() {
  const articles = await getCollection("articles");

  return articles.map((article) => ({
    params: { slug: article.slug },
  }));
}

export async function GET({
  params,
}: {
  params: { slug?: string | string[] };
}) {
  const slugParam = params.slug;
  const slug = Array.isArray(slugParam) ? slugParam.join("/") : slugParam;

  if (!slug || slug.includes("..")) {
    return new Response("Not found", { status: 404 });
  }

  const entry = await getEntry("articles", slug);

  if (!entry) {
    return new Response("Not found", { status: 404 });
  }

  const frontmatterBlock = formatFrontmatter(entry.data as MarkdownFrontmatter);
  const body = entry.body ?? "";
  const content = frontmatterBlock ? `${frontmatterBlock}\n\n${body}` : body;

  return new Response(content, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
    },
  });
}

function formatFrontmatter(data: MarkdownFrontmatter) {
  const entries = Object.entries(data).filter(
    ([, value]) => value !== undefined
  );

  if (entries.length === 0) {
    return "";
  }

  const lines: string[] = ["---"];

  for (const [key, value] of entries) {
    lines.push(...formatFrontmatterEntry(key, value));
  }

  lines.push("---");

  return lines.join("\n");
}

function formatFrontmatterEntry(key: string, value: unknown): string[] {
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return [`${key}: []`];
    }

    const items = value.map((item) => `  - ${formatScalar(item)}`);
    return [`${key}:`, ...items];
  }

  return [`${key}: ${formatScalar(value)}`];
}

function formatScalar(value: unknown) {
  if (value instanceof Date) {
    return JSON.stringify(value.toISOString());
  }

  switch (typeof value) {
    case "string":
      return JSON.stringify(value);
    case "number":
    case "boolean":
      return String(value);
    case "object":
      if (value === null) {
        return "null";
      }
      return JSON.stringify(value);
    default:
      return JSON.stringify(String(value));
  }
}
