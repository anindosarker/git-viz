import DOMPurify from "dompurify";
import { marked } from "marked";
import React from "react";

interface CommitBodyProps {
  body?: string;
  loading?: boolean;
}

const ALLOWED_TAGS = [
  "p",
  "br",
  "pre",
  "code",
  "blockquote",
  "ul",
  "ol",
  "li",
  "strong",
  "em",
  "b",
  "i",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "a",
  "hr",
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
];

function renderMarkdown(src: string): string {
  marked.setOptions({ breaks: true, gfm: true });
  const html = marked.parse(src, { async: false }) as string;
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR: ["href", "title", "class"],
    ALLOWED_URI_REGEXP: /^(https?:|mailto:|#)/i,
  });
}

export const CommitBody: React.FC<CommitBodyProps> = ({ body, loading }) => {
  if (loading) {
    return (
      <div className="px-3 py-3 border-b">
        <div className="h-3 w-3/4 bg-muted/50 rounded animate-pulse mb-2" />
        <div className="h-3 w-1/2 bg-muted/50 rounded animate-pulse" />
      </div>
    );
  }
  if (!body || !body.trim()) {
    return null;
  }
  const html = renderMarkdown(body);
  return (
    <div className="px-3 py-3 border-b">
      <div
        className="prose prose-sm max-w-none dark:prose-invert text-sm font-mono whitespace-pre-wrap select-text"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
};
