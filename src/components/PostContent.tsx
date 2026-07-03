import { useState, useMemo } from "react";
import { Link } from "@tanstack/react-router";

interface Props {
  text: string;
  className?: string;
  maxChars?: number;
  postId?: string;
  showMore?: boolean;
}

const MENTION_RE = /(@[A-Za-z0-9_\u0600-\u06FF]{2,32})/g;
const HASHTAG_RE = /(#[\w\u0600-\u06FF][\w\u0600-\u06FF-]{0,50})/g;
const TOKEN_RE = new RegExp(`${MENTION_RE.source}|${HASHTAG_RE.source}|(https?:\\/\\/[^\\s]+)`, "g");

/**
 * Renders post text with clickable #hashtags, @mentions, and URLs.
 * Truncates long content with a "عرض المزيد" link to the full post page.
 */
export function PostContent({ text, className = "", maxChars = 350, postId, showMore = true }: Props) {
  const [expanded, setExpanded] = useState(false);
  const isTruncated = text.length > maxChars;
  const shown = !isTruncated || expanded ? text : text.slice(0, maxChars).trimEnd() + "…";

  const parts = useMemo(() => {
    const out: Array<{ type: "text" | "mention" | "hashtag" | "url"; value: string }> = [];
    let last = 0;
    shown.replace(TOKEN_RE, (match, m1: string | undefined, m2: string | undefined, m3: string | undefined, offset: number) => {
      if (offset > last) out.push({ type: "text", value: shown.slice(last, offset) });
      if (m1) out.push({ type: "mention", value: m1 });
      else if (m2) out.push({ type: "hashtag", value: m2 });
      else if (m3) out.push({ type: "url", value: m3 });
      last = offset + match.length;
      return match;
    });
    if (last < shown.length) out.push({ type: "text", value: shown.slice(last) });
    return out;
  }, [shown]);

  return (
    <div className={`whitespace-pre-wrap break-words ${className}`}>
      {parts.map((p, i) => {
        if (p.type === "mention") {
          const uname = p.value.slice(1);
          if (uname === "followers" || uname === "متابعين") {
            return <span key={i} className="text-primary font-semibold">{p.value}</span>;
          }
          return (
            <Link
              key={i}
              to="/search"
              search={{ q: p.value } as any}
              className="text-primary font-semibold hover:underline"
            >
              {p.value}
            </Link>
          );
        }
        if (p.type === "hashtag") {
          return (
            <Link
              key={i}
              to="/hashtag/$tag"
              params={{ tag: p.value.slice(1) }}
              className="text-primary font-semibold hover:underline"
            >
              {p.value}
            </Link>
          );
        }
        if (p.type === "url") {
          return (
            <a key={i} href={p.value} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline break-all">
              {p.value}
            </a>
          );
        }
        return <span key={i}>{p.value}</span>;
      })}
      {isTruncated && !expanded && showMore && (
        <>
          {" "}
          {postId ? (
            <Link to="/post/$postId" params={{ postId }} className="text-primary font-semibold hover:underline">
              عرض المزيد
            </Link>
          ) : (
            <button onClick={() => setExpanded(true)} className="text-primary font-semibold hover:underline">
              عرض المزيد
            </button>
          )}
        </>
      )}
    </div>
  );
}
