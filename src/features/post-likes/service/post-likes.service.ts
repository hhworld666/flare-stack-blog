import * as PostLikesRepo from "@/features/post-likes/data/post-likes.data";
import type { PostLikesInput } from "@/features/post-likes/types";
import { err, ok } from "@/lib/errors";

export async function getPostLikesSummary(
  context: DbContext,
  input: PostLikesInput & { userId: string | null },
) {
  const summary = await PostLikesRepo.getPostLikesSummary(
    context.db,
    input.postId,
    input.userId,
  );

  return summary ? ok(summary) : err({ reason: "POST_NOT_FOUND" });
}

export async function setPostLike(
  context: DbContext,
  input: PostLikesInput & { userId: string; liked: boolean },
) {
  const summary = await PostLikesRepo.setPostLike(context.db, input);
  return summary ? ok(summary) : err({ reason: "POST_NOT_FOUND" });
}
