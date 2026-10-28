import { and, asc, desc, eq, ne } from "drizzle-orm";
import { SitePagesTable } from "@/lib/db/schema";

export async function listPublicSitePageNavigation(db: DB) {
  return db
    .select({
      id: SitePagesTable.id,
      title: SitePagesTable.title,
      slug: SitePagesTable.slug,
    })
    .from(SitePagesTable)
    .orderBy(asc(SitePagesTable.id));
}

export async function listSitePagesForSitemap(db: DB) {
  return db
    .select({
      slug: SitePagesTable.slug,
      updatedAt: SitePagesTable.updatedAt,
    })
    .from(SitePagesTable)
    .orderBy(asc(SitePagesTable.id));
}

export async function findPublicSitePageBySlug(db: DB, slug: string) {
  const [page] = await db
    .select({
      id: SitePagesTable.id,
      title: SitePagesTable.title,
      slug: SitePagesTable.slug,
      contentMarkdown: SitePagesTable.contentMarkdown,
    })
    .from(SitePagesTable)
    .where(eq(SitePagesTable.slug, slug))
    .limit(1);

  return page ?? null;
}

export async function listAdminSitePages(db: DB) {
  return db
    .select({
      id: SitePagesTable.id,
      title: SitePagesTable.title,
      slug: SitePagesTable.slug,
      updatedAt: SitePagesTable.updatedAt,
    })
    .from(SitePagesTable)
    .orderBy(desc(SitePagesTable.updatedAt), desc(SitePagesTable.id));
}

export async function findAdminSitePageById(db: DB, id: number) {
  const [page] = await db
    .select()
    .from(SitePagesTable)
    .where(eq(SitePagesTable.id, id))
    .limit(1);

  return page ?? null;
}

export async function sitePageSlugExists(
  db: DB,
  slug: string,
  excludeId?: number,
) {
  const row = await db.query.SitePagesTable.findFirst({
    where: excludeId
      ? and(eq(SitePagesTable.slug, slug), ne(SitePagesTable.id, excludeId))
      : eq(SitePagesTable.slug, slug),
    columns: { id: true },
  });

  return Boolean(row);
}

export async function insertSitePage(
  db: DB,
  data: { title: string; slug: string; contentMarkdown: string },
) {
  const [page] = await db.insert(SitePagesTable).values(data).returning();
  return page;
}

export async function updateSitePage(
  db: DB,
  id: number,
  data: { title: string; slug: string; contentMarkdown: string },
) {
  const [page] = await db
    .update(SitePagesTable)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(SitePagesTable.id, id))
    .returning();

  return page ?? null;
}

export async function deleteSitePage(db: DB, id: number) {
  const [page] = await db
    .delete(SitePagesTable)
    .where(eq(SitePagesTable.id, id))
    .returning({ id: SitePagesTable.id });

  return page ?? null;
}
