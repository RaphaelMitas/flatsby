import {
  homeMarkdown,
  markdownResponse,
} from "~/app/_components/landing/markdown";

export const dynamic = "force-static";

export function GET() {
  return markdownResponse(homeMarkdown());
}
