const SITE_PAGE_SLUG_PATTERN = /^[\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)*$/u;

/** Top-level paths already owned by the application. */
const RESERVED_SITE_PAGE_SLUGS = new Set([
  "admin",
  "api",
  "forgot-password",
  "friend-links",
  "images",
  "login",
  "post",
  "posts",
  "profile",
  "register",
  "reset-link",
  "search",
  "submit-friend-link",
  "unsubscribe",
  "verify-email",
]);

export function isValidSitePageSlug(value: string) {
  const slug = value.trim().toLowerCase();
  return (
    slug.length > 0 &&
    slug.length <= 100 &&
    SITE_PAGE_SLUG_PATTERN.test(slug) &&
    !RESERVED_SITE_PAGE_SLUGS.has(slug)
  );
}

/** Returns a decoded, validated slug for an otherwise-unmatched public path. */
export function sitePageSlugFromPathname(pathname: string): string | null {
  const path =
    pathname.length > 1 && pathname.endsWith("/")
      ? pathname.slice(0, -1)
      : pathname;
  if (!path.startsWith("/")) return null;

  const encodedSlug = path.slice(1);
  if (!encodedSlug || encodedSlug.includes("/")) return null;

  let slug: string;
  try {
    slug = decodeURIComponent(encodedSlug).toLowerCase();
  } catch {
    return null;
  }

  return isValidSitePageSlug(slug) ? slug : null;
}
