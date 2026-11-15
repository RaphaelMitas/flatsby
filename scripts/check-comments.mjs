import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "@babel/parser";

const repoRoot = join(import.meta.dirname, "..");

const directives =
  /^\s*(@ts-(expect-error|ignore|nocheck|check)|biome-ignore|i18n-ignore|@vite-ignore|\/\s*<reference)|^\*\s*@deprecated\s|^\*\s*@(type|typedef)\s*\{/;

const generated = new Set(["apps/expo/nativewind-env.d.ts"]);

const files = execFileSync(
  "git",
  ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
  { cwd: repoRoot, encoding: "utf8" },
)
  .split("\0")
  .filter((file) => /\.(c|m)?(j|t)sx?$/.test(file) && !generated.has(file));

const findings = [];
for (const file of files) {
  let source;
  try {
    source = readFileSync(join(repoRoot, file), "utf8");
  } catch {
    continue;
  }
  const ast = parse(source, {
    sourceType: "unambiguous",
    plugins: file.endsWith(".ts") ? ["typescript"] : ["typescript", "jsx"],
    errorRecovery: true,
  });
  for (const comment of ast.comments ?? []) {
    if (directives.test(comment.value)) continue;
    const text = comment.value.trim().split("\n")[0];
    findings.push(`${file}:${comment.loc.start.line}  ${text}`);
  }
}

if (findings.length > 0) {
  console.error(`${findings.join("\n")}

${findings.length} code comment${findings.length === 1 ? "" : "s"} found. Comments are not allowed in this repo.

Delete the comment and make the code say it instead: rename the variable or
function, extract a well named helper, or remove the code that needed explaining.

If the comment explains a workaround, the workaround is the problem. Fix the
root cause now, in this change, instead of documenting it for later. Do not
reword the comment, move it into a string, or add an exception to this check.
`);
  process.exit(1);
}
