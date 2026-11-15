import { ast, defineRule, registerDiagnostic } from "@biomejs/runtime/plugin";

const directive =
  /^(\/\/|\/\*)\s*(@ts-(expect-error|ignore|nocheck|check)\b|i18n-ignore\b|@vite-ignore\b)|^\/\/\/\s*<reference\b|^\/\*\*[\s*]*@(deprecated|type|typedef)\b/;

const singleRuleSuppression =
  /^\/\/\s*biome-ignore(-all|-start|-end)?(\s+lint\/(?!plugin\/)[a-zA-Z]+\/[a-zA-Z]+)+:/;

const trivia = /(?:[\s\u200B]|\/\/.*|\/\*[\s\S]*?\*\/)*/y;
const comments = /\/\/.*|\/\*[\s\S]*?\*\//g;

const unpaddedTokens = new Set(["TEMPLATE_CHUNK", "JSX_TEXT_LITERAL"]);

const message = (comment) => {
  const firstLine = comment
    .split("\n")
    .map((line) => line.replace(/^\s*(\/\/+|\/\*+|\*+)?|\*+\/\s*$/g, "").trim())
    .find(Boolean);
  return `Comments are not allowed: ${firstLine ?? comment}
Delete it and make the code say it instead: rename, extract a well named helper, or remove the code that needed explaining.
If it explains a workaround, the workaround is the problem. Fix the root cause now instead of documenting it. Do not reword the comment, move it into a string, or suppress this rule.`;
};

export default defineRule({
  query: ast("JS_MODULE", "JS_SCRIPT", "TS_DECLARATION_MODULE"),
  run(root) {
    const text = root.text;
    let cursor = 0;

    const reportCommentsBefore = (token) => {
      trivia.lastIndex = cursor;
      trivia.exec(text);
      const gap = text.slice(cursor, trivia.lastIndex);
      cursor = trivia.lastIndex;
      for (const [comment] of gap.matchAll(comments)) {
        if (singleRuleSuppression.test(comment)) continue;
        if (comment.includes("biome-ignore")) {
          registerDiagnostic(root, "error", message(comment));
        } else if (!directive.test(comment)) {
          registerDiagnostic(token.parent, "error", message(comment));
        }
      }
    };

    const pending = [root];
    while (pending.length > 0) {
      const element = pending.pop();
      if (typeof element.childrenWithTokens === "function") {
        pending.push(...element.childrenWithTokens().reverse());
        continue;
      }
      if (!unpaddedTokens.has(element.kind)) reportCommentsBefore(element);
      cursor += element.text.length;
    }
  },
});
