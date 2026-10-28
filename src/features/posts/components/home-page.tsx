import { Megaphone } from "lucide-react";
import type { PostItem } from "@/features/posts/schema/posts.schema";
import { m } from "@/paraglide/messages";
import { HomePagination } from "./home-pagination";
import { PostCard } from "./post-card";

export const POPULAR_POSTS_LIMIT = 3;

interface HomePageProps {
  announcement: string;
  posts: Array<PostItem>;
  popularPosts?: Array<PostItem>;
  page: number;
  totalPages: number;
}

export function HomePage({
  announcement,
  posts,
  popularPosts,
  page,
  totalPages,
}: HomePageProps) {
  const popularSlugs = new Set((popularPosts ?? []).map((post) => post.slug));
  const showAnnouncement = page === 1 && announcement.trim().length > 0;
  return (
    <div className="flex flex-col gap-4">
      {showAnnouncement ? (
        <aside
          aria-labelledby="home-announcement-title"
          className="fuwari-card-base relative overflow-hidden rounded-(--fuwari-radius-large) px-6 py-5"
          style={{ borderLeft: "4px solid var(--fuwari-primary)" }}
        >
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-(--fuwari-btn-regular-bg) text-(--fuwari-primary)">
              <Megaphone size={18} aria-hidden="true" />
            </span>
            <h2
              id="home-announcement-title"
              className="text-lg font-semibold fuwari-text-90"
            >
              {m.home_announcement_title()}
            </h2>
          </div>
          <div className="mt-3 whitespace-pre-wrap break-words text-base leading-7 fuwari-text-75">
            {announcement}
          </div>
        </aside>
      ) : null}
      <div className="flex flex-col rounded-(--fuwari-radius-large) bg-(--fuwari-card-bg) py-1 md:py-0 md:bg-transparent md:gap-4">
        {posts.map((post, i) => (
          <div
            key={post.slug}
            className="fuwari-onload-animation"
            style={{
              animationDelay: `calc(var(--fuwari-content-delay) + ${i * 50}ms)`,
            }}
          >
            <PostCard
              post={post}
              pinned={Boolean(post.pinnedAt)}
              popular={!post.pinnedAt && popularSlugs.has(post.slug)}
            />
            {i < posts.length - 1 && (
              <div className="border-t border-dashed mx-6 border-black/10 dark:border-white/15 md:hidden" />
            )}
          </div>
        ))}
      </div>
      <HomePagination page={page} totalPages={totalPages} />
    </div>
  );
}
