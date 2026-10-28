import { and, count, eq, isNotNull } from "drizzle-orm";
import { PostsTable, PostLikesTable } from "@/lib/db/schema";

async function findPublishedPost(db: DB, postId: number) {
  const [post] = await db
    .select({ id: PostsTable.id })
    .from(PostsTable)
    .where(
      and(eq(PostsTable.id, postId), isNotNull(PostsTable.publicSnapshotJson)),
    )
    .limit(1);

  return post ?? null;
}

export async function getPostLikesSummary(
  db: DB,
  postId: number,
  userId: string | null,
) {
  if (!(await findPublishedPost(db, postId))) return null;

  const [likeCount] = await db
    .select({ count: count() })
    .from(PostLikesTable)
    .where(eq(PostLikesTable.postId, postId));

  const likedByViewer = userId
    ? Boolean(
        await db.query.PostLikesTable.findFirst({
          where: and(
            eq(PostLikesTable.postId, postId),
            eq(PostLikesTable.userId, userId),
          ),
          columns: { postId: true },
        }),
      )
    : false;

  return {
    count: likeCount?.count ?? 0,
    likedByViewer,
  };
}

export async function setPostLike(
  db: DB,
  input: { postId: number; userId: string; liked: boolean },
) {
  if (!(await findPublishedPost(db, input.postId))) return null;

  const conditions = and(
    eq(PostLikesTable.postId, input.postId),
    eq(PostLikesTable.userId, input.userId),
  );

  if (input.liked) {
    await db
      .insert(PostLikesTable)
      .values({ postId: input.postId, userId: input.userId })
      .onConflictDoNothing();
  } else {
    await db.delete(PostLikesTable).where(conditions);
  }

  return getPostLikesSummary(db, input.postId, input.userId);
}
