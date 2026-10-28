import {
  PostLikesInputSchema,
  PostLikesSummarySchema,
  SetPostLikeInputSchema,
} from "@/features/post-likes/post-likes.schema";
import * as PostLikesService from "@/features/post-likes/service/post-likes.service";
import {
  authProcedure,
  optionalSessionProcedure,
  withRateLimit,
} from "@/lib/orpc/procedure";
import { unwrapResult } from "@/lib/orpc/unwrap-result";

const postLikeErrors = {
  POST_NOT_FOUND: { status: 404, message: "Published post not found." },
} as const;

const summary = optionalSessionProcedure
  .errors(postLikeErrors)
  .route({
    method: "GET",
    path: "/posts/{postId}/likes",
    summary: "Get a published post's like count and viewer state",
    tags: ["Post Likes"],
  })
  .input(PostLikesInputSchema)
  .output(PostLikesSummarySchema)
  .handler(({ context, input, errors }) =>
    unwrapResult(
      PostLikesService.getPostLikesSummary(context, {
        ...input,
        userId: context.session?.user.id ?? null,
      }),
      {
        POST_NOT_FOUND: () => {
          throw errors.POST_NOT_FOUND();
        },
      },
    ),
  );

const set = authProcedure
  .use(
    withRateLimit({
      capacity: 30,
      interval: "1m",
      key: "posts:likes",
    }),
  )
  .errors(postLikeErrors)
  .route({
    method: "PUT",
    path: "/posts/{postId}/likes",
    summary: "Like or unlike a published post",
    description:
      "Sets the signed-in user's like state. Repeating the same state is safe.",
    tags: ["Post Likes"],
  })
  .input(SetPostLikeInputSchema)
  .output(PostLikesSummarySchema)
  .handler(({ context, input, errors }) =>
    unwrapResult(
      PostLikesService.setPostLike(context, {
        ...input,
        userId: context.session.user.id,
      }),
      {
        POST_NOT_FOUND: () => {
          throw errors.POST_NOT_FOUND();
        },
      },
    ),
  );

export default { summary, set };
