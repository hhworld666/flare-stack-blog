import { z } from "zod";

export const PostLikesInputSchema = z.object({
  postId: z.number().int().positive(),
});

export const SetPostLikeInputSchema = PostLikesInputSchema.extend({
  liked: z.boolean(),
});

export const PostLikesSummarySchema = z.object({
  count: z.number().int().nonnegative(),
  likedByViewer: z.boolean(),
});

export type PostLikesSummary = z.infer<typeof PostLikesSummarySchema>;
