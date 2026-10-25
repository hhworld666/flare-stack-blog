import { createFileRoute, redirect } from "@tanstack/react-router";

/** Keep the old Astro `/posts/{slug}` permalinks working after the migration. */
export const Route = createFileRoute("/_public/posts/$slug")({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/post/$slug",
      params: { slug: params.slug },
    });
  },
});
