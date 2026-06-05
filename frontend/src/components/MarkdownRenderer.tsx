import DOMPurify from "dompurify";
import { marked } from "marked";
import { useMemo } from "react";

// Configure marked for safe rendering
marked.setOptions({
  breaks: true,
  gfm: true,
});

type MarkdownRendererProps = {
  content: string;
  className?: string;
};

/**
 * Renders markdown content as safe HTML.
 * Content is sanitized with DOMPurify to prevent XSS (e.g. <script> injection
 * in GM-authored handouts rendered on player browsers).
 */
export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  const html = useMemo(() => {
    if (!content) return "";
    try {
      const raw = marked.parse(content) as string;
      return DOMPurify.sanitize(raw, {
        ALLOWED_TAGS: [
          "h1",
          "h2",
          "h3",
          "h4",
          "h5",
          "h6",
          "p",
          "br",
          "hr",
          "ul",
          "ol",
          "li",
          "blockquote",
          "pre",
          "code",
          "strong",
          "em",
          "del",
          "a",
          "img",
          "table",
          "thead",
          "tbody",
          "tr",
          "th",
          "td",
          "span",
          "div",
        ],
      });
    } catch {
      return content;
    }
  }, [content]);

  if (!html) return null;

  return (
    <div
      className={`markdown-rendered${className ? ` ${className}` : ""}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
