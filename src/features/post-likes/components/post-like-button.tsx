import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Heart } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { postLikesQuery } from "@/features/post-likes/queries";
import { authClient } from "@/lib/auth/auth-client";
import { orpcClient } from "@/lib/orpc";
import { m } from "@/paraglide/messages";

export function PostLikeButton({
  postId,
  redirectTo,
}: {
  postId: number;
  redirectTo: string;
}) {
  const queryClient = useQueryClient();
  const { data: session, isPending: isSessionPending } =
    authClient.useSession();
  const likesQuery = postLikesQuery(postId);
  const {
    data: summary,
    isPending: isSummaryPending,
    isError,
  } = useQuery({ ...likesQuery, staleTime: 30_000 });

  const setLike = useMutation({
    mutationFn: (liked: boolean) => orpcClient.postLikes.set({ postId, liked }),
    onSuccess: (nextSummary) => {
      queryClient.setQueryData(likesQuery.queryKey, nextSummary);
    },
    onError: () => toast.error(m.post_likes_save_failed()),
  });

  const isSignedIn = Boolean(session?.user);
  const isBusy =
    isSessionPending || isSummaryPending || setLike.isPending || isError;

  return (
    <div className="flex flex-col items-center gap-2">
      <Button
        variant={summary?.likedByViewer ? "primary" : "regular"}
        disabled={!isSignedIn || isBusy}
        aria-pressed={summary?.likedByViewer ?? false}
        onClick={() => setLike.mutate(!summary?.likedByViewer)}
        icon={
          <Heart
            size={18}
            strokeWidth={1.7}
            fill={summary?.likedByViewer ? "currentColor" : "none"}
          />
        }
      >
        {summary?.likedByViewer ? m.post_likes_unlike() : m.post_likes_like()}
        <span className="ml-1 tabular-nums">
          {isSummaryPending ? "—" : (summary?.count ?? 0)}
        </span>
      </Button>

      {!isSessionPending && !isSignedIn ? (
        <Link
          to="/login"
          search={{ redirectTo }}
          className="text-sm fuwari-text-50 hover:fuwari-text-90 transition-colors"
        >
          {m.post_likes_sign_in_hint()}
        </Link>
      ) : null}

      {isError ? (
        <p className="text-sm fuwari-text-50" role="status">
          {m.post_likes_load_failed()}
        </p>
      ) : null}
    </div>
  );
}
