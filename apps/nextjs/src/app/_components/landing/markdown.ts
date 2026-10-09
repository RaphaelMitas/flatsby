import type { ContentPageData, PageSection } from "./pages";
import {
  APP_STORE_URL,
  DESCRIPTION,
  FACTS,
  FEATURES,
  GITHUB_URL,
  HOME_FAQ,
  PLAY_STORE_URL,
  SECTIONS,
  SITE_URL,
  STEPS,
  UPDATED,
} from "./content";
import { CONTENT_PAGES } from "./pages";

const facts = FACTS.map((f) => `- ${f.label}: ${f.value}`).join("\n");

const legalLinks = `- [Terms of service](${SITE_URL}/legal/terms)
- [Privacy policy](${SITE_URL}/legal/privacy)
- [Legal notice](${SITE_URL}/legal/legal-notice)`;

const pageLinks = CONTENT_PAGES.map(
  (page) =>
    `- [${page.headline}](${SITE_URL}/${page.slug}.md): ${page.description}`,
).join("\n");

function faqMarkdown(items: readonly { question: string; answer: string }[]) {
  return items.map((q) => `### ${q.question}\n\n${q.answer}`).join("\n\n");
}

function sectionMarkdown(section: PageSection) {
  return [
    `## ${section.heading}`,
    ...(section.paragraphs ?? []),
    section.bullets?.map((b) => `- ${b}`).join("\n"),
    section.image && `![${section.image.alt}](${section.image.src})`,
  ]
    .filter(Boolean)
    .join("\n\n");
}

export function llmsTxt() {
  return `# Flatsby

> ${DESCRIPTION}

Key facts:
${facts}

## Pages

- [Home page](${SITE_URL}/index.md): features, getting started, top questions
${pageLinks}

## Apps

- [Web app](${SITE_URL}/): sign in with Google or Apple
- [iPhone app](${APP_STORE_URL})
- [Android app](${PLAY_STORE_URL})

## Legal

${legalLinks}

## Optional

- [Source code](${GITHUB_URL}): MIT licensed monorepo, Next.js web app and server, Expo mobile apps
`;
}

export function homeMarkdown() {
  return `# Flatsby

> ${DESCRIPTION}

Updated: ${UPDATED}

Web app: ${SITE_URL}/
iPhone app: ${APP_STORE_URL}
Android app: ${PLAY_STORE_URL}

## At a glance

${facts}

## Features

${FEATURES.map((f) => `### ${f.title}\n\n${f.body}`).join("\n\n")}

## Get started

${STEPS.map((s, i) => `${i + 1}. ${s.title}. ${s.body}`).join("\n")}

${SECTIONS.map((s) => `## ${s.title}\n\n${s.body}`).join("\n\n")}

## Questions

${faqMarkdown(HOME_FAQ)}

All questions: ${SITE_URL}/faq.md

## More pages

${pageLinks}

## Links

${legalLinks}
- [Source code](${GITHUB_URL})
`;
}

export function contentPageMarkdown(page: ContentPageData) {
  const table = page.table && [
    `| ${page.table.head.join(" | ")} |`,
    `| ${page.table.head.map(() => "---").join(" | ")} |`,
    ...page.table.rows.map((row) => `| ${row.join(" | ")} |`),
    "",
    page.table.caption,
  ];
  return [
    `# ${page.headline}`,
    `> ${page.description}`,
    `Updated: ${UPDATED}`,
    page.intro,
    table?.join("\n"),
    ...page.sections.map(sectionMarkdown),
    page.faq && `## Questions\n\n${faqMarkdown(page.faq)}`,
    `## More about Flatsby\n\n- [Home page](${SITE_URL}/index.md)\n${pageLinks}`,
  ]
    .filter(Boolean)
    .join("\n\n")
    .concat("\n");
}
