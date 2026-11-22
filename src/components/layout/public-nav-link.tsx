import { Link } from "@tanstack/react-router";
import { ExternalLink } from "lucide-react";
import type { NavOption } from "@/components/layout/layout-props";

const STATIC_HREF = {
  "/": "/",
  "/posts": "/posts",
  "/friend-links": "/friend-links",
} as const;

function postSlugFromHref(href: string): string | null {
  const [path] = href.split(/[?#]/);
  const match = /^\/post\/([^/]+)\/?$/.exec(path ?? "");
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

/**
 * Custom public pages use the catch-all `/$` route. Passing the decoded path
 * as its splat parameter lets TanStack Router handle the navigation in the
 * client instead of falling back to a full document request.
 */
function internalHrefParts(href: string) {
  let url: URL;
  try {
    url = new URL(href, "https://router.local");
  } catch {
    return null;
  }

  if (url.pathname === "/" || !url.pathname.startsWith("/")) return null;

  let splat: string;
  try {
    splat = decodeURIComponent(url.pathname.slice(1));
  } catch {
    return null;
  }

  return {
    splat,
    search: Object.fromEntries(url.searchParams.entries()),
    hash: url.hash.slice(1),
  };
}

export function PublicNavLink({
  option,
  className,
  activeClassName,
  onClick,
}: {
  option: NavOption;
  className?: string;
  activeClassName?: string;
  onClick?: () => void;
}) {
  const label = (
    <>
      <span className="truncate">{option.label}</span>
      {option.external ? (
        <ExternalLink
          size={14}
          strokeWidth={1.75}
          className="ml-1 shrink-0 opacity-70"
        />
      ) : null}
    </>
  );

  if (option.external) {
    return (
      <a
        href={option.href}
        target="_blank"
        rel="noreferrer"
        className={className}
        onClick={onClick}
      >
        {label}
      </a>
    );
  }

  const slug = postSlugFromHref(option.href);
  if (slug) {
    return (
      <Link
        to="/post/$slug"
        params={{ slug }}
        className={className}
        activeProps={
          activeClassName ? { className: activeClassName } : undefined
        }
        onClick={onClick}
      >
        {label}
      </Link>
    );
  }

  const staticTo = STATIC_HREF[option.href as keyof typeof STATIC_HREF];
  if (staticTo) {
    return (
      <Link
        to={staticTo}
        className={className}
        activeProps={
          activeClassName ? { className: activeClassName } : undefined
        }
        onClick={onClick}
      >
        {label}
      </Link>
    );
  }

  const internal = internalHrefParts(option.href);
  if (internal) {
    return (
      <Link
        to="/$"
        params={{ _splat: internal.splat }}
        search={internal.search}
        hash={internal.hash || undefined}
        className={className}
        activeProps={
          activeClassName ? { className: activeClassName } : undefined
        }
        onClick={onClick}
      >
        {label}
      </Link>
    );
  }

  return (
    <a href={option.href} className={className} onClick={onClick}>
      {label}
    </a>
  );
}
