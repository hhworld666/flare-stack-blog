import type { PublicSitePage } from "@/features/site-pages/site-pages.schema";
import { SitePageContent } from "./site-page-content";

export function PublicSitePageView({ page }: { page: PublicSitePage }) {
  return (
    <article className="fuwari-card-base relative px-6 py-7 md:px-9 md:py-9">
      <h1 className="mb-6 text-3xl font-bold fuwari-text-90 md:text-4xl">
        {page.title}
      </h1>
      <div className="mb-7 border-b border-dashed border-(--fuwari-meta-divider)" />
      <SitePageContent
        markdown={page.contentMarkdown}
        className="prose dark:prose-invert prose-base max-w-none! fuwari-custom-md"
      />
    </article>
  );
}
