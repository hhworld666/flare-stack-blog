import { invalidate } from "@/features/cache/public-cache";
import * as SitePagesRepo from "@/features/site-pages/data/site-pages.data";
import type {
  CreateSitePageInput,
  UpdateSitePageInput,
} from "@/features/site-pages/site-pages.schema";
import {
  publicSitePageBySlug,
  publicSitePageNavigation,
} from "@/features/site-pages/site-pages.cache";
import { err, ok } from "@/lib/errors";

const SLUG_CONFLICT = /UNIQUE constraint failed:\s*site_pages\.slug/i;

function isSlugConflict(error: unknown) {
  for (let current = error; current instanceof Error; current = current.cause) {
    if (SLUG_CONFLICT.test(current.message)) return true;
  }
  return false;
}

export async function getPublicSitePageNavigation(
  context: DbContext & { executionCtx: ExecutionContext },
) {
  return publicSitePageNavigation.get(context, {});
}

export async function getPublicSitePageBySlug(
  context: DbContext & { executionCtx: ExecutionContext },
  slug: string,
) {
  return publicSitePageBySlug.get(context, { slug });
}

export function getAdminSitePages(context: DbContext) {
  return SitePagesRepo.listAdminSitePages(context.db);
}

export function getAdminSitePage(context: DbContext, id: number) {
  return SitePagesRepo.findAdminSitePageById(context.db, id);
}

export async function createSitePage(
  context: DbContext & { executionCtx: ExecutionContext },
  input: CreateSitePageInput,
) {
  if (await SitePagesRepo.sitePageSlugExists(context.db, input.slug)) {
    return err({ reason: "SLUG_TAKEN" });
  }

  try {
    const page = await SitePagesRepo.insertSitePage(context.db, input);
    await invalidate.sitePagesChanged(context);
    return ok(page);
  } catch (error) {
    if (isSlugConflict(error)) return err({ reason: "SLUG_TAKEN" });
    throw error;
  }
}

export async function updateSitePage(
  context: DbContext & { executionCtx: ExecutionContext },
  input: UpdateSitePageInput,
) {
  const current = await SitePagesRepo.findAdminSitePageById(
    context.db,
    input.id,
  );
  if (!current) return err({ reason: "NOT_FOUND" });

  if (
    current.slug !== input.slug &&
    (await SitePagesRepo.sitePageSlugExists(context.db, input.slug, input.id))
  ) {
    return err({ reason: "SLUG_TAKEN" });
  }

  try {
    const page = await SitePagesRepo.updateSitePage(context.db, input.id, {
      title: input.title,
      slug: input.slug,
      contentMarkdown: input.contentMarkdown,
    });
    if (!page) return err({ reason: "NOT_FOUND" });
    await invalidate.sitePagesChanged(context);
    return ok(page);
  } catch (error) {
    if (isSlugConflict(error)) return err({ reason: "SLUG_TAKEN" });
    throw error;
  }
}

export async function deleteSitePage(
  context: DbContext & { executionCtx: ExecutionContext },
  id: number,
) {
  const deleted = await SitePagesRepo.deleteSitePage(context.db, id);
  if (!deleted) return err({ reason: "NOT_FOUND" });

  await invalidate.sitePagesChanged(context);
  return ok({ success: true });
}
