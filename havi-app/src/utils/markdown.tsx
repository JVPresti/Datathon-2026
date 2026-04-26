import React from "react";
import { Text, Platform } from "react-native";

/**
 * Renders a subset of markdown inline formatting:
 *   **bold**, *italic*, `code`, and lines starting with "- " as bullets.
 */
export function MarkdownText({ text, style }: { text: string; style?: object }) {
  const lines = text.split("\n");
  return (
    <Text style={style}>
      {lines.map((line, li) => {
        const isBullet = line.startsWith("- ") || line.startsWith("• ");
        const content = isBullet ? line.slice(2) : line;
        return (
          <Text key={li}>
            {li > 0 && "\n"}
            {isBullet && "• "}
            {parseInline(content)}
          </Text>
        );
      })}
    </Text>
  );
}

function parseInline(str: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  let last = 0;
  let m;
  while ((m = regex.exec(str)) !== null) {
    if (m.index > last) parts.push(str.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith("**")) {
      parts.push(
        <Text key={m.index} style={{ fontWeight: "700", color: "#FFFFFF" }}>
          {tok.slice(2, -2)}
        </Text>
      );
    } else if (tok.startsWith("*")) {
      parts.push(
        <Text key={m.index} style={{ fontStyle: "italic" }}>
          {tok.slice(1, -1)}
        </Text>
      );
    } else if (tok.startsWith("`")) {
      parts.push(
        <Text
          key={m.index}
          style={{
            fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
            fontSize: 12,
            color: "#FFFFFF",
          }}
        >
          {tok.slice(1, -1)}
        </Text>
      );
    }
    last = m.index + tok.length;
  }
  if (last < str.length) parts.push(str.slice(last));
  return parts;
}
