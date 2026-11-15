import { ast, defineRule, registerDiagnostic } from "@biomejs/runtime/plugin";

const directive =
  /^(\/\/|\/\*)\s*(@ts-(expect-error|ignore|nocheck|check)\b|biome-ignore(-all|-start|-end)?\s+(?!lint\/plugin\b)|i18n-ignore\b|@vite-ignore\b)|^\/\/\/\s*<reference\b|^\/\*\*\s*@(deprecated|type|typedef)\b/;

const unpaddedTokens = new Set(["TEMPLATE_CHUNK", "JSX_TEXT_LITERAL"]);

const message = (comment) =>
  `Comments are not allowed: ${comment.split("\n")[0]}
Delete it and make the code say it instead: rename, extract a well named helper, or remove the code that needed explaining.
If it explains a workaround, the workaround is the problem. Fix the root cause now instead of documenting it. Do not reword the comment, move it into a string, or suppress this rule.`;

export default defineRule({
  query: ast("JS_MODULE"),
  run(root) {
    const text = root.text;
    let cursor = 0;
    let previousKind = "";

    const reportCommentsBefore = (token) => {
      for (;;) {
        while (/\s/.test(text[cursor] ?? "")) cursor++;
        const opener = text.slice(cursor, cursor + 2);
        if (opener !== "//" && opener !== "/*") return;
        const close =
          opener === "//"
            ? text.indexOf("\n", cursor)
            : text.indexOf("*/", cursor) + 2;
        const end = close <= cursor ? text.length : close;
        const comment = text.slice(cursor, end);
        cursor = end;
        if (directive.test(comment)) continue;
        const suppressesThisRule = /biome-ignore\S*\s+lint\/plugin\b/.test(
          comment,
        );
        registerDiagnostic(
          suppressesThisRule ? root : (token.parent ?? root),
          "error",
          message(comment),
        );
      }
    };

    const visit = (element) => {
      if (typeof element.childrenWithTokens === "function") {
        element.childrenWithTokens().forEach(visit);
        return;
      }
      if (
        !unpaddedTokens.has(element.kind) &&
        !unpaddedTokens.has(previousKind)
      ) {
        reportCommentsBefore(element);
      }
      cursor += element.text.length;
      previousKind = element.kind;
    };

    visit(root);
  },
});
