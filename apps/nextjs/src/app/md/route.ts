import { homeMarkdown } from "~/app/_components/landing/markdown";

export const dynamic = "force-static";

export function GET() {
  return new Response(homeMarkdown(), {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });
}
