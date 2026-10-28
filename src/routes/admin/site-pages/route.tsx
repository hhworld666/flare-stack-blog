import { createFileRoute, Outlet } from "@tanstack/react-router";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/admin/site-pages")({
  component: Outlet,
  loader: () => ({ title: m.site_pages_title() }),
  head: ({ loaderData }) => ({
    meta: [{ title: loaderData?.title }],
  }),
});
