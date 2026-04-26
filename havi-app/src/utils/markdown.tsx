import React from "react";
import { Text, Platform } from "react-native";

/**
 * Renders markdown inline formatting: **bold**, *italic*, `code`, newlines.
 * Uses a FLAT array — no nested Text wrapping per-line, avoids RN render bugs.
 */
export function MarkdownText({ text, style }: { text: string; style?: any }) {
  return <Text style={style}>{buildNodes(text)}</Text>;
}

function buildNodes(text: string): React.ReactNode[] {
  const result: React.ReactNode[] = [];
  // Match bold, italic, code, or newline
  const regex = /\*\*([^*]+)\*\*|\*([^*]+)\*|`([^`]+)`|\n/g;
  let last = 0;
  let key = 0;
  let m: RegExpExecArray | null;

  while ((m = regex.exec(text)) !== null) {
    // Push any plain text before this match
    if (m.index > last) result.push(text.slice(last, m.index));

    const [full, bold, italic, code] = m;

    if (full === "\n") {
      result.push("\n");
    } else if (bold !== undefined) {
      result.push(
        <Text key={key++} style={{ fontWeight: "700" }}>
          {bold}
        </Text>
      );
    } else if (italic !== undefined) {
      result.push(
        <Text key={key++} style={{ fontStyle: "italic" }}>
          {italic}
        </Text>
      );
    } else if (code !== undefined) {
      result.push(
        <Text
          key={key++}
          style={{ fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace", fontSize: 12 }}
        >
          {code}
        </Text>
      );
    }
    last = m.index + full.length;
  }

  if (last < text.length) result.push(text.slice(last));
  return result;
}
