import type { MarkedStyles } from "react-native-marked";
import type { ColorSchemeName } from "react-native";
import { Fragment, useMemo } from "react";
import { View } from "react-native";
import { useMarkdown } from "react-native-marked";

import { useThemeColors } from "~/lib/utils";

interface MarkdownTextProps {
  children: string;
}

export function MarkdownText({ children }: MarkdownTextProps) {
  const { getColor, colorScheme } = useThemeColors();

  const theme = useMemo(
    () => ({
      colors: {
        text: getColor("foreground"),
        link: getColor("primary"),
        code: getColor("muted"),
        border: getColor("border"),
      },
    }),
    [getColor],
  );

  const styles: MarkedStyles = useMemo(
    () => ({
      text: {
        color: getColor("foreground"),
        fontSize: 16,
        lineHeight: 24,
      },
      paragraph: {
        marginBottom: 8,
      },
      strong: {
        fontWeight: "700",
      },
      em: {
        fontStyle: "italic",
      },
      strikethrough: {
        textDecorationLine: "line-through",
      },
      link: {
        color: getColor("primary"),
        textDecorationLine: "underline",
      },
      h1: {
        fontSize: 24,
        fontWeight: "700",
        marginBottom: 12,
        marginTop: 16,
        color: getColor("foreground"),
      },
      h2: {
        fontSize: 20,
        fontWeight: "700",
        marginBottom: 10,
        marginTop: 14,
        color: getColor("foreground"),
      },
      h3: {
        fontSize: 18,
        fontWeight: "600",
        marginBottom: 8,
        marginTop: 12,
        color: getColor("foreground"),
      },
      h4: {
        fontSize: 16,
        fontWeight: "600",
        marginBottom: 6,
        marginTop: 10,
        color: getColor("foreground"),
      },
      h5: {
        fontSize: 14,
        fontWeight: "600",
        marginBottom: 4,
        marginTop: 8,
        color: getColor("foreground"),
      },
      h6: {
        fontSize: 12,
        fontWeight: "600",
        marginBottom: 4,
        marginTop: 6,
        color: getColor("foreground"),
      },
      codespan: {
        fontFamily: "monospace",
        backgroundColor: getColor("muted"),
        paddingHorizontal: 4,
        paddingVertical: 2,
        borderRadius: 4,
        fontSize: 14,
        color: getColor("foreground"),
      },
      code: {
        backgroundColor: getColor("muted"),
        padding: 12,
        borderRadius: 8,
        marginVertical: 8,
      },
      blockquote: {
        borderLeftWidth: 4,
        borderLeftColor: getColor("border"),
        paddingLeft: 12,
        marginVertical: 8,
        opacity: 0.8,
      },
      list: {
        marginVertical: 4,
      },
      li: {
        color: getColor("foreground"),
        fontSize: 16,
        lineHeight: 24,
      },
      hr: {
        backgroundColor: getColor("border"),
        height: 1,
        marginVertical: 16,
      },
      table: {
        borderWidth: 1,
        borderColor: getColor("border"),
        borderRadius: 8,
        marginVertical: 8,
      },
      tableRow: {
        borderBottomWidth: 1,
        borderBottomColor: getColor("border"),
      },
      tableCell: {
        padding: 8,
        borderRightWidth: 1,
        borderRightColor: getColor("border"),
      },
    }),
    [getColor],
  );

  const elements = useMarkdown(children, {
    colorScheme: colorScheme as ColorSchemeName,
    theme,
    styles,
  });

  return (
    <View>
      {elements.map((element, index) => (
        <Fragment key={`md_${index}`}>{element}</Fragment>
      ))}
    </View>
  );
}
