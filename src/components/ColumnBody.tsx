import Link from "next/link";
import type { ReactNode } from "react";

type Block =
  | { type: "heading"; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[] };

function parseBlocks(markdown: string): Block[] {
  const lines = markdown.trim().split("\n");
  const blocks: Block[] = [];
  let paragraphLines: string[] = [];
  let listItems: string[] = [];

  function flushParagraph() {
    if (paragraphLines.length === 0) return;
    blocks.push({
      type: "paragraph",
      text: paragraphLines.join(" ").trim(),
    });
    paragraphLines = [];
  }

  function flushList() {
    if (listItems.length === 0) return;
    blocks.push({ type: "list", items: listItems });
    listItems = [];
  }

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    const trimmed = line.trim();

    if (trimmed === "") {
      flushParagraph();
      flushList();
      continue;
    }

    if (trimmed.startsWith("## ")) {
      flushParagraph();
      flushList();
      blocks.push({ type: "heading", text: trimmed.slice(3).trim() });
      continue;
    }

    if (trimmed.startsWith("- ")) {
      flushParagraph();
      listItems.push(trimmed.slice(2).trim());
      continue;
    }

    flushList();
    paragraphLines.push(trimmed);
  }

  flushParagraph();
  flushList();
  return blocks;
}

function renderInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const regex = /\*\*([^*]+)\*\*|\[([^\]]+)\]\(([^)]+)\)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(
        <span key={key++}>{text.slice(lastIndex, match.index)}</span>,
      );
    }

    if (match[1] != null) {
      nodes.push(
        <strong key={key++} className="font-medium text-gray-800">
          {match[1]}
        </strong>,
      );
    } else {
      const label = match[2] ?? "";
      const href = match[3] ?? "";
      if (href.startsWith("/")) {
        nodes.push(
          <Link
            key={key++}
            href={href}
            className="font-medium text-teal-700 underline decoration-teal-700/30 underline-offset-2 transition-colors hover:text-teal-800 hover:decoration-teal-800/50"
          >
            {label}
          </Link>,
        );
      } else {
        nodes.push(<span key={key++}>{label}</span>);
      }
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    nodes.push(<span key={key++}>{text.slice(lastIndex)}</span>);
  }

  return nodes;
}

type ColumnBodyProps = {
  body: string;
};

export function ColumnBody({ body }: ColumnBodyProps) {
  const blocks = parseBlocks(body);

  return (
    <div className="space-y-6 text-sm leading-relaxed text-gray-600">
      {blocks.map((block, index) => {
        if (block.type === "heading") {
          return (
            <h2
              key={index}
              className="pt-2 text-lg font-medium text-gray-900"
            >
              {block.text}
            </h2>
          );
        }

        if (block.type === "list") {
          return (
            <ul key={index} className="list-disc space-y-2 pl-5">
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex}>{renderInline(item)}</li>
              ))}
            </ul>
          );
        }

        return <p key={index}>{renderInline(block.text)}</p>;
      })}
    </div>
  );
}
