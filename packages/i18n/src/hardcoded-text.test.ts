import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import type { Node } from "@babel/types";
import { parse } from "@babel/parser";
import { describe, expect, it } from "vitest";

const repoRoot = join(import.meta.dirname, "../../..");

const scannedRoots = [
  "apps/expo/src",
  "apps/nextjs/src",
  "packages/api/src",
  "packages/ui/src",
  "packages/validators/src",
];

// Text these files hold is read by a model or a developer, never by a user.
const ignoredFiles = [
  /\.test\.tsx?$/,
  /\.d\.ts$/,
  /\/e2e\//,
  /apps\/expo\/src\/app\/e2e-login\.tsx$/,
  /apps\/nextjs\/src\/app\/api\/e2e\//,
  /packages\/api\/src\/utils\/(classify|context-builder|chat-tools|model-provider)\.ts$/,
  /packages\/validators\/src\/chat\/tools\.ts$/,
  /apps\/expo\/src\/utils\/analytics\/screen-names\.ts$/,
];

const technicalAttributes = new Set([
  "accessibilityRole",
  "as",
  "autoComplete",
  "autoCapitalize",
  "className",
  "color",
  "contentContainerClassName",
  "data-testid",
  "dir",
  "href",
  "htmlFor",
  "icon",
  "iconName",
  "id",
  "inputMode",
  "key",
  "keyboardType",
  "lang",
  "mode",
  "name",
  "nativeID",
  "orientation",
  "rel",
  "returnKeyType",
  "role",
  "side",
  "align",
  "size",
  "src",
  "style",
  "target",
  "testID",
  "textContentType",
  "type",
  "value",
  "variant",
]);

const userFacingKeys = new Set([
  "accessibilityHint",
  "accessibilityLabel",
  "alt",
  "body",
  "cancelText",
  "confirmText",
  "description",
  "emptyText",
  "error",
  "headerBackTitle",
  "headerTitle",
  "helperText",
  "label",
  "message",
  "placeholder",
  "subtitle",
  "tabBarLabel",
  "text",
  "title",
  "tooltip",
]);

const userFacingCalls =
  /^(toast(\.\w+)?|Alert\.alert|Alert\.prompt|confirm|alert)$/;

const brandNames = new Set(["Flatsby", "Splitwise", "Apple", "Google"]);

const ignoreMarker = "i18n-ignore";

interface Finding {
  line: number;
  text: string;
}

function hasLetters(text: string) {
  return /\p{L}/u.test(text);
}

// Lowercase ids, class lists, routes and URLs: never shown as text.
function isTechnicalToken(text: string) {
  const trimmed = text.trim();
  return (
    !hasLetters(trimmed) ||
    brandNames.has(trimmed) ||
    /^(https?:|mailto:|tel:|\/|#|\.|@|~)/.test(trimmed) ||
    /^\S+@\S+\.\S+$/.test(trimmed) ||
    /^[a-z0-9_:./\-[\]%()=,]+(\s+[a-z0-9_:./\-[\]%()=,!]+)*$/.test(trimmed) ||
    /^[A-Z0-9_]+$/.test(trimmed)
  );
}

// Stricter test for strings in positions that are often technical.
function isSentence(text: string) {
  const trimmed = text.trim();
  if (isTechnicalToken(trimmed)) return false;
  if (/^\p{Lu}[\p{Ll}]+(\p{Lu}[\p{L}\d]*)+$/u.test(trimmed)) return false;
  return /^\p{Lu}\p{Ll}/u.test(trimmed) || /\p{L}[.!?…]$/u.test(trimmed);
}

function stringParts(node: Node | null | undefined): string[] {
  if (!node) return [];
  switch (node.type) {
    case "StringLiteral":
      return [node.value];
    case "TemplateLiteral":
      return [node.quasis.map((quasi) => quasi.value.cooked ?? "").join("{}")];
    case "ConditionalExpression":
      return [...stringParts(node.consequent), ...stringParts(node.alternate)];
    case "LogicalExpression":
      return [...stringParts(node.left), ...stringParts(node.right)];
    case "BinaryExpression":
      return node.operator === "+"
        ? [
            ...stringParts(node.left.type === "PrivateName" ? null : node.left),
            ...stringParts(node.right),
          ]
        : [];
    case "TSAsExpression":
    case "TSSatisfiesExpression":
    case "ParenthesizedExpression":
      return stringParts(node.expression);
    default:
      return [];
  }
}

function calleeName(node: Node): string | undefined {
  if (node.type === "Identifier") return node.name;
  if (
    node.type === "MemberExpression" &&
    node.property.type === "Identifier" &&
    !node.computed
  ) {
    const object = calleeName(node.object);
    return object ? `${object}.${node.property.name}` : undefined;
  }
  return undefined;
}

function propertyKey(node: Node): string | undefined {
  if (node.type === "Identifier") return node.name;
  if (node.type === "StringLiteral") return node.value;
  return undefined;
}

function scan(source: string): Finding[] {
  const ast = parse(source, {
    sourceType: "module",
    plugins: ["typescript", "jsx"],
    errorRecovery: true,
  });
  const lines = source.split("\n");
  const findings: Finding[] = [];

  const report = (node: Node, text: string) => {
    const line = node.loc?.start.line ?? 0;
    const nearby = `${lines[line - 2] ?? ""}${lines[line - 1] ?? ""}`;
    if (nearby.includes(ignoreMarker)) return;
    findings.push({ line, text: text.trim().replace(/\s+/g, " ") });
  };

  const reportParts = (
    node: Node | null | undefined,
    accept: (text: string) => boolean,
  ) => {
    if (!node) return;
    for (const text of stringParts(node)) {
      if (accept(text)) report(node, text);
    }
  };

  const isUserText = (text: string) => !isTechnicalToken(text);

  const visit = (node: Node | null | undefined, parent?: Node) => {
    if (!node || typeof node !== "object") return;

    switch (node.type) {
      case "JSXText":
        if (hasLetters(node.value) && !brandNames.has(node.value.trim())) {
          report(node, node.value);
        }
        break;
      case "JSXExpressionContainer":
        if (parent?.type === "JSXElement" || parent?.type === "JSXFragment") {
          reportParts(
            node.expression.type === "JSXEmptyExpression"
              ? null
              : node.expression,
            isUserText,
          );
        }
        break;
      case "JSXAttribute": {
        const name =
          node.name.type === "JSXIdentifier" ? node.name.name : undefined;
        if (name && !technicalAttributes.has(name)) {
          const value =
            node.value?.type === "JSXExpressionContainer"
              ? node.value.expression.type === "JSXEmptyExpression"
                ? null
                : node.value.expression
              : node.value;
          reportParts(
            value,
            userFacingKeys.has(name) || name.startsWith("aria-")
              ? isUserText
              : isSentence,
          );
        }
        break;
      }
      case "ObjectProperty": {
        const key = propertyKey(node.key);
        if (key && !node.computed) {
          reportParts(
            node.value,
            userFacingKeys.has(key) ? isUserText : isSentence,
          );
        }
        break;
      }
      case "CallExpression": {
        const name = calleeName(node.callee);
        if (name && userFacingCalls.test(name)) {
          for (const argument of node.arguments) {
            reportParts(argument, isUserText);
          }
        }
        break;
      }
      case "ReturnStatement":
        reportParts(node.argument, isSentence);
        break;
      case "ArrowFunctionExpression":
        if (node.body.type !== "BlockStatement") {
          reportParts(node.body, isSentence);
        }
        break;
      case "VariableDeclarator":
        reportParts(node.init, isSentence);
        break;
    }

    for (const [key, child] of Object.entries(node)) {
      if (
        key === "loc" ||
        key === "leadingComments" ||
        key === "trailingComments"
      ) {
        continue;
      }
      if (Array.isArray(child)) {
        for (const item of child) {
          if (item && typeof item.type === "string") visit(item, node);
        }
      } else if (child && typeof child.type === "string") {
        visit(child, node);
      }
    }
  };

  visit(ast.program);
  return findings;
}

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      return entry.name === "node_modules" ? [] : sourceFiles(path);
    }
    return /\.tsx?$/.test(entry.name) ? [path] : [];
  });
}

const files = scannedRoots
  .flatMap((root) => sourceFiles(join(repoRoot, root)))
  .map((path) => relative(repoRoot, path))
  .filter((path) => !ignoredFiles.some((pattern) => pattern.test(path)));

describe("scan", () => {
  it("flags user-facing text and skips technical strings", () => {
    const source = `
      const label = isOpen ? "Close menu" : "open";
      export const Row = () => (
        <View testID="row" className="flex gap-2">
          <Text accessibilityLabel="Edit item">Save</Text>
          {count > 1 && "Several"}
          {/* i18n-ignore */}
          <Text>Debug only</Text>
        </View>
      );`;
    expect(scan(source).map(({ text }) => text)).toEqual([
      "Close menu",
      "Edit item",
      "Save",
      "Several",
    ]);
  });
});

describe("user-facing text goes through the i18n catalog", () => {
  it.each(files)("%s", (file) => {
    const findings = scan(readFileSync(join(repoRoot, file), "utf8")).map(
      ({ line, text }) => `${file}:${line} ${JSON.stringify(text)}`,
    );
    expect(
      findings,
      `Move these strings into packages/i18n/src/messages, or mark a line that is not user-facing with "${ignoreMarker}":\n${findings.join("\n")}\n`,
    ).toHaveLength(0);
  });
});
