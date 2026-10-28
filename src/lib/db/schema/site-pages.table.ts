import { index, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { createdAt, id, updatedAt } from "./helper";

/** A standalone Markdown page that is also listed in the public navigation. */
export const SitePagesTable = sqliteTable(
  "site_pages",
  {
    id,
    title: text().notNull(),
    slug: text().notNull(),
    contentMarkdown: text("content_markdown").notNull(),
    createdAt,
    updatedAt,
  },
  (table) => [
    uniqueIndex("site_pages_slug_unique").on(table.slug),
    index("site_pages_updated_at_idx").on(table.updatedAt),
  ],
);

export type SitePage = typeof SitePagesTable.$inferSelect;
