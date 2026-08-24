import Link from "next/link";
import { keywordPath, normalizeKeyword } from "@/lib/keyword-shared";
import type { GuideBlock } from "@/lib/guide";

type GuideMarkdownProps = {
  blocks: GuideBlock[];
};

function isInternalHref(value: string) {
  return value.startsWith("/") && !value.startsWith("//");
}

function renderInline(text: string) {
  const pattern = /(\[\[([^\]]+)\]\]|\[([^\]]+)\]\((https?:\/\/[^)\s]+|\/[^)\s]+)\)|\*\*([^*]+)\*\*|`([^`]+)`)/g;
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) nodes.push(text.slice(lastIndex, match.index));

    if (match[2]) {
      const keyword = normalizeKeyword(match[2]);
      nodes.push(
        <Link className="guide-keyword-link" href={keywordPath(keyword)} key={`${match.index}-keyword`}>
          {keyword}
        </Link>,
      );
    } else if (match[3] && match[4]) {
      const label = match[3];
      const href = match[4];
      nodes.push(isInternalHref(href)
        ? <Link href={href} key={`${match.index}-link`}>{label}</Link>
        : <a href={href} key={`${match.index}-link`} rel="noopener noreferrer" target="_blank">{label}</a>);
    } else if (match[5]) {
      nodes.push(<strong key={`${match.index}-strong`}>{match[5]}</strong>);
    } else if (match[6]) {
      nodes.push(<code key={`${match.index}-code`}>{match[6]}</code>);
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes.length ? nodes : text;
}

function Heading({ block }: { block: Extract<GuideBlock, { type: "heading" }> }) {
  if (block.depth === 2) return <h2 id={block.id}>{renderInline(block.text)}</h2>;
  if (block.depth === 3) return <h3 id={block.id}>{renderInline(block.text)}</h3>;
  if (block.depth === 4) return <h4 id={block.id}>{renderInline(block.text)}</h4>;
  return <h2 id={block.id}>{renderInline(block.text)}</h2>;
}

export default function GuideMarkdown({ blocks }: GuideMarkdownProps) {
  return (
    <div className="guide-body">
      {blocks.map((block, index) => {
        if (block.type === "heading") return <Heading block={block} key={`${block.id}-${index}`} />;
        if (block.type === "paragraph") return <p key={index}>{renderInline(block.text)}</p>;
        if (block.type === "blockquote") return <blockquote key={index}>{renderInline(block.text)}</blockquote>;
        if (block.type === "code") {
          return (
            <pre key={index}>
              <code>{block.code}</code>
            </pre>
          );
        }

        const ListTag = block.ordered ? "ol" : "ul";
        return (
          <ListTag key={index}>
            {block.items.map((item, itemIndex) => (
              <li key={`${item}-${itemIndex}`}>{renderInline(item)}</li>
            ))}
          </ListTag>
        );
      })}
    </div>
  );
}
