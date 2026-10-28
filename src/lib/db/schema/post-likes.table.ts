import {
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";
import { createdAt } from "./helper";
import { PostsTable } from "./posts.table";
import { user } from "./auth.table";

/** One like per signed-in User and Published Post. */
export const PostLikesTable = sqliteTable(
  "post_likes",
  {
    postId: integer("post_id")
      .notNull()
      .references(() => PostsTable.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt,
  },
  (table) => [
    primaryKey({ columns: [table.postId, table.userId] }),
    index("post_likes_user_id_idx").on(table.userId),
  ],
);
