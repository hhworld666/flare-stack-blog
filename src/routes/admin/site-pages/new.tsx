import { createFileRoute } from "@tanstack/react-router";
import { SitePageEditor } from "@/features/site-pages/components/site-pages-admin";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/admin/site-pages/new")({
  loader: () => ({ title: m.site_pages_new() }),
  head: ({ loaderData }) => ({
    meta: [{ title: loaderData?.title }],
  }),
  component: () => <SitePageEditor />,
});
