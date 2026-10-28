import type { JSONContent } from "@tiptap/react";
import { useMemo } from "react";
import { ContentRenderer } from "@/features/posts/components/content/content-renderer";
import { parsePastedMarkdown } from "@/features/posts/editor/extensions/markdown-paste/parse-markdown";

export function SitePageContent({
  markdown,
  className,
}: {
  markdown: string;
  className?: string;
}) {
  const content = useMemo<JSONContent>(
    () => ({ type: "doc", content: parsePastedMarkdown(markdown).content }),
    [markdown],
  );

  return <ContentRenderer content={content} className={className} />;
}
