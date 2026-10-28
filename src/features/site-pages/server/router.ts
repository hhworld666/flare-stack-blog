import {
  AdminSitePageListItemSchema,
  AdminSitePageSchema,
  CreateSitePageInputSchema,
  DeleteSitePageInputSchema,
  GetAdminSitePageInputSchema,
  PublicSitePageNavigationItemSchema,
  PublicSitePageSchema,
  SitePageSlugInputSchema,
  UpdateSitePageInputSchema,
} from "@/features/site-pages/site-pages.schema";
import * as SitePagesService from "@/features/site-pages/service/site-pages.service";
import { adminProcedure, publicProcedure } from "@/lib/orpc/procedure";
import { unwrapResult } from "@/lib/orpc/unwrap-result";

const pageErrors = {
  NOT_FOUND: { status: 404, message: "Page not found." },
  SLUG_TAKEN: { status: 409, message: "This page path is already in use." },
} as const;

const navigation = publicProcedure
  .route({
    method: "GET",
    path: "/site-pages/navigation",
    summary: "List navigation pages",
    tags: ["Site Pages"],
  })
  .output(PublicSitePageNavigationItemSchema.array())
  .handler(({ context }) =>
    SitePagesService.getPublicSitePageNavigation(context),
  );

const bySlug = publicProcedure
  .route({
    method: "GET",
    path: "/site-pages/{slug}",
    summary: "Get a public page by path",
    tags: ["Site Pages"],
  })
  .input(SitePageSlugInputSchema)
  .output(PublicSitePageSchema.nullable())
  .handler(({ context, input }) =>
    SitePagesService.getPublicSitePageBySlug(context, input.slug),
  );

const adminList = adminProcedure
  .route({
    method: "GET",
    path: "/admin/site-pages",
    summary: "List navigation pages for the Admin",
    tags: ["Admin Site Pages"],
  })
  .output(AdminSitePageListItemSchema.array())
  .handler(({ context }) => SitePagesService.getAdminSitePages(context));

const adminGet = adminProcedure
  .route({
    method: "GET",
    path: "/admin/site-pages/{id}",
    summary: "Get a navigation page for editing",
    tags: ["Admin Site Pages"],
  })
  .input(GetAdminSitePageInputSchema)
  .output(AdminSitePageSchema.nullable())
  .handler(({ context, input }) =>
    SitePagesService.getAdminSitePage(context, input.id),
  );

const create = adminProcedure
  .errors(pageErrors)
  .route({
    method: "POST",
    path: "/admin/site-pages",
    summary: "Create a navigation page",
    description:
      "Creates a public Markdown page and adds it to the public navigation.",
    tags: ["Admin Site Pages"],
  })
  .input(CreateSitePageInputSchema)
  .output(AdminSitePageSchema)
  .handler(({ context, input, errors }) =>
    unwrapResult(SitePagesService.createSitePage(context, input), {
      SLUG_TAKEN: () => {
        throw errors.SLUG_TAKEN();
      },
    }),
  );

const update = adminProcedure
  .errors(pageErrors)
  .route({
    method: "PATCH",
    path: "/admin/site-pages/{id}",
    summary: "Update a navigation page",
    tags: ["Admin Site Pages"],
  })
  .input(UpdateSitePageInputSchema)
  .output(AdminSitePageSchema)
  .handler(({ context, input, errors }) =>
    unwrapResult(SitePagesService.updateSitePage(context, input), {
      NOT_FOUND: () => {
        throw errors.NOT_FOUND();
      },
      SLUG_TAKEN: () => {
        throw errors.SLUG_TAKEN();
      },
    }),
  );

const remove = adminProcedure
  .errors(pageErrors)
  .route({
    method: "DELETE",
    path: "/admin/site-pages/{id}",
    summary: "Delete a navigation page",
    tags: ["Admin Site Pages"],
  })
  .input(DeleteSitePageInputSchema)
  .handler(({ context, input, errors }) =>
    unwrapResult(SitePagesService.deleteSitePage(context, input.id), {
      NOT_FOUND: () => {
        throw errors.NOT_FOUND();
      },
    }),
  );

export default {
  navigation,
  bySlug,
  admin: {
    list: adminList,
    get: adminGet,
    create,
    update,
    remove,
  },
};
