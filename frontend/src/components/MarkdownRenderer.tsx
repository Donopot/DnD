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
 * Replaces <pre> in handouts with rendered markdown.
 */
export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  const html = useMemo(() => {
    if (!content) return "";
    try {
      return marked.parse(content) as string;
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
