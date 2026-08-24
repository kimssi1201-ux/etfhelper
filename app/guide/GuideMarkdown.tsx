import Link from "next/link";
import { Fragment, type ReactNode } from "react";
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
  const nodes: ReactNode[] = [];
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
  const middleSlotIndex = blocks.length > 2 ? Math.ceil(blocks.length / 2) - 1 : 0;

  return (
    <div className="guide-body">
      {blocks.map((block, index) => {
        let content: ReactNode;
        if (block.type === "heading") content = <Heading block={block} />;
        else if (block.type === "paragraph") content = <p>{renderInline(block.text)}</p>;
        else if (block.type === "blockquote") content = <blockquote>{renderInline(block.text)}</blockquote>;
        else if (block.type === "code") {
          content = (
            <pre>
              <code>{block.code}</code>
            </pre>
          );
        } else {
          const ListTag = block.ordered ? "ol" : "ul";
          content = (
            <ListTag>
              {block.items.map((item, itemIndex) => (
                <li key={`${item}-${itemIndex}`}>{renderInline(item)}</li>
              ))}
            </ListTag>
          );
        }

        return (
          <Fragment key={block.type === "heading" ? `${block.id}-${index}` : index}>
            {content}
            {index === middleSlotIndex && (
              <div className="ad-slot guide-body-ad" data-slot="guide-body-middle" aria-hidden="true" />
            )}
          </Fragment>
        );
      })}
      <div className="ad-slot guide-body-ad guide-body-ad-bottom" data-slot="guide-body-bottom" aria-hidden="true" />
    </div>
  );
}
