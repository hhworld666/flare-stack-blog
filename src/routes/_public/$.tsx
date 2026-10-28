import { createFileRoute, notFound } from "@tanstack/react-router";
import { NotFound } from "@/components/common/not-found";
import { PublicSitePageView } from "@/features/site-pages/components/public-site-page";
import { publicSitePageQuery } from "@/features/site-pages/queries";
import { sitePageSlugFromPathname } from "@/features/site-pages/site-page-path";
import { siteDomainQuery } from "@/features/config/queries";
import { CACHE_CONTROL } from "@/lib/constants";
import { buildCanonicalUrl, canonicalLink } from "@/lib/seo";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/_public/$")({
  loader: async ({ context, location }) => {
    const slug = sitePageSlugFromPathname(location.pathname);
    if (!slug) throw notFound();

    const [page, domain] = await Promise.all([
      context.queryClient.ensureQueryData(publicSitePageQuery(slug)),
      context.queryClient.ensureQueryData(siteDomainQuery),
    ]);
    if (!page) throw notFound();

    return {
      page,
      canonicalHref: buildCanonicalUrl(
        domain,
        `/${encodeURIComponent(page.slug)}`,
      ),
    };
  },
  component: SitePageRoute,
  notFoundComponent: NotFound,
  headers: ({ loaderData }) =>
    loaderData?.page ? CACHE_CONTROL.public : CACHE_CONTROL.notFound,
  head: ({ loaderData }) => ({
    meta: [{ title: loaderData?.page.title ?? m.not_found_title() }],
    links: loaderData?.canonicalHref
      ? [canonicalLink(loaderData.canonicalHref)]
      : [],
  }),
});

function SitePageRoute() {
  const { page } = Route.useLoaderData();
  return <PublicSitePageView page={page} />;
}
