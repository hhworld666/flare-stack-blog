import { defineEntry } from "@/features/cache/public-cache";
import * as SitePagesRepo from "@/features/site-pages/data/site-pages.data";
import {
  PublicSitePageNavigationItemSchema,
  PublicSitePageSchema,
} from "@/features/site-pages/site-pages.schema";

export const publicSitePageNavigation = defineEntry({
  name: "site-pages.navigation",
  namespace: "site-pages:navigation",
  key: () => ["site-pages", "navigation"],
  schema: PublicSitePageNavigationItemSchema.array(),
  ttl: "7d",
  invalidatedBy: ["site-pages.changed"],
  load: (context) => SitePagesRepo.listPublicSitePageNavigation(context.db),
});

export const publicSitePageBySlug = defineEntry({
  name: "site-pages.detail",
  namespace: "site-pages:detail",
  address: ["slug"],
  key: ({ slug }: { slug: string }) => ["site-page", slug],
  schema: PublicSitePageSchema.nullable(),
  ttl: "7d",
  invalidatedBy: ["site-pages.changed"],
  load: (context, { slug }: { slug: string }) =>
    SitePagesRepo.findPublicSitePageBySlug(context.db, slug),
});
