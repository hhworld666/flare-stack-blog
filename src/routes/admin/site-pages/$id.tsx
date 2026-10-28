import { createFileRoute, notFound } from "@tanstack/react-router";
import { SitePageEditor } from "@/features/site-pages/components/site-pages-admin";
import { adminSitePageQuery } from "@/features/site-pages/queries";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/admin/site-pages/$id")({
  loader: async ({ context, params }) => {
    const id = Number(params.id);
    if (!Number.isSafeInteger(id) || id < 1) throw notFound();
    const page = await context.queryClient.ensureQueryData(
      adminSitePageQuery(id),
    );
    if (!page) throw notFound();
    return { page, title: page.title || m.site_pages_edit() };
  },
  head: ({ loaderData }) => ({
    meta: [{ title: loaderData?.title }],
  }),
  component: SitePageEditRoute,
});

function SitePageEditRoute() {
  const { page } = Route.useLoaderData();
  return <SitePageEditor page={page} />;
}
