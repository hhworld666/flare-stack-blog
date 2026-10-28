import { z } from "zod";
import { isValidSitePageSlug } from "@/features/site-pages/site-page-path";

const dateSchema = z.union([z.date(), z.string().pipe(z.coerce.date())]);

export const SitePageSlugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1)
  .max(100)
  .regex(/^[\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)*$/u)
  .refine(isValidSitePageSlug);

const SitePageFieldsSchema = z.object({
  title: z.string().trim().min(1).max(120),
  slug: SitePageSlugSchema,
  contentMarkdown: z.string().max(200_000),
});

export const PublicSitePageNavigationItemSchema = z.object({
  id: z.number().int().positive(),
  title: z.string(),
  slug: SitePageSlugSchema,
});

export const PublicSitePageSchema = PublicSitePageNavigationItemSchema.extend({
  contentMarkdown: z.string(),
});

export const AdminSitePageListItemSchema = z.object({
  id: z.number().int().positive(),
  title: z.string(),
  slug: SitePageSlugSchema,
  updatedAt: dateSchema,
});

export const AdminSitePageSchema = AdminSitePageListItemSchema.extend({
  contentMarkdown: z.string(),
  createdAt: dateSchema,
});

export const SitePageSlugInputSchema = z.object({ slug: SitePageSlugSchema });
export const GetAdminSitePageInputSchema = z.object({
  id: z.number().int().positive(),
});

export const CreateSitePageInputSchema = SitePageFieldsSchema;
export const UpdateSitePageInputSchema = SitePageFieldsSchema.extend({
  id: z.number().int().positive(),
});
export const DeleteSitePageInputSchema = GetAdminSitePageInputSchema;

export type SitePageFields = z.infer<typeof SitePageFieldsSchema>;
export type AdminSitePage = z.infer<typeof AdminSitePageSchema>;
export type AdminSitePageListItem = z.infer<typeof AdminSitePageListItemSchema>;
export type PublicSitePage = z.infer<typeof PublicSitePageSchema>;
export type CreateSitePageInput = z.infer<typeof CreateSitePageInputSchema>;
export type UpdateSitePageInput = z.infer<typeof UpdateSitePageInputSchema>;
