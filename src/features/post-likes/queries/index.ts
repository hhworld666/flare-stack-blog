import { orpc } from "@/lib/orpc";

export function postLikesQuery(postId: number) {
  return orpc.postLikes.summary.queryOptions({ input: { postId } });
}
