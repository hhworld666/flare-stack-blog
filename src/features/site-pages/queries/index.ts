import { orpc } from "@/lib/orpc";

export const sitePageNavigationQuery = orpc.pages.navigation.queryOptions();

export function publicSitePageQuery(slug: string) {
  return orpc.pages.bySlug.queryOptions({ input: { slug } });
}

export const adminSitePagesQuery = orpc.pages.admin.list.queryOptions();

export function adminSitePageQuery(id: number) {
  return orpc.pages.admin.get.queryOptions({ input: { id } });
}
