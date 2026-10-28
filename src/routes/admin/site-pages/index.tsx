import { createFileRoute } from "@tanstack/react-router";
import { SitePagesAdminList } from "@/features/site-pages/components/site-pages-admin";
import { adminSitePagesQuery } from "@/features/site-pages/queries";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/admin/site-pages/")({
  ssr: "data-only",
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(adminSitePagesQuery);
    return { title: m.site_pages_title() };
  },
  head: ({ loaderData }) => ({
    meta: [{ title: loaderData?.title }],
  }),
  component: SitePagesAdminList,
});
