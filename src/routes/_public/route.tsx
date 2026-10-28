import {
  createFileRoute,
  Outlet,
  useNavigate,
  useRouteContext,
} from "@tanstack/react-router";
import { useEffect } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { PublicLayout as SitePublicLayout } from "@/components/layout/public-layout";
import { Toaster } from "@/components/layout/toaster";
import { useLogout } from "@/features/auth/hooks/use-logout";
import { authClient } from "@/lib/auth/auth-client";
import { sitePageNavigationQuery } from "@/features/site-pages/queries";
import { CACHE_CONTROL } from "@/lib/constants";
import { clientEnv } from "@/lib/env/client.env";
import { isExternalNavHref } from "@/features/config/utils/nav-links";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/_public")({
  component: PublicLayout,
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(sitePageNavigationQuery);
  },
  headers: () => {
    return CACHE_CONTROL.public;
  },
  head: () => {
    const env = clientEnv();
    return {
      scripts: env.VITE_UMAMI_WEBSITE_ID
        ? [
            {
              src: "/stats.js",
              defer: true,
              "data-website-id": env.VITE_UMAMI_WEBSITE_ID,
            },
          ]
        : [],
    };
  },
});

function PublicLayout() {
  const navigate = useNavigate();
  const { siteConfig } = useRouteContext({ from: "__root__" });
  const { data: session, isPending: isSessionPending } =
    authClient.useSession();
  const { data: sitePages } = useSuspenseQuery(sitePageNavigationQuery);
  const { logout } = useLogout();

  const navOptions = [
    { id: "home", label: m.nav_home(), href: "/", external: false },
    { id: "posts", label: m.nav_posts(), href: "/posts", external: false },
    {
      id: "friend-links",
      label: m.nav_friend_links(),
      href: "/friend-links",
      external: false,
    },
    ...siteConfig.navLinks.map((link, index) => ({
      id: `custom-${index}`,
      label: link.label,
      href: link.href,
      external: isExternalNavHref(link.href),
    })),
    ...sitePages.map((page) => ({
      id: `site-page-${page.id}`,
      label: page.title,
      href: `/${encodeURIComponent(page.slug)}`,
      external: false,
    })),
  ];

  // Global shortcut: Cmd/Ctrl + K to navigate to search
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isToggle = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k";
      if (isToggle) {
        e.preventDefault();
        void navigate({ to: "/search" });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navigate]);

  return (
    <>
      <SitePublicLayout
        navOptions={navOptions}
        user={session?.user}
        isSessionLoading={isSessionPending}
        logout={logout}
      >
        <Outlet />
      </SitePublicLayout>
      <Toaster />
    </>
  );
}
