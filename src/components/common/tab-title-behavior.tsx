import { useEffect } from "react";

const AWAY_TITLE = "(☉д☉)不要走！再看看嘛";
const RETURN_TITLE = "(･ωω )欢迎肥来喵";
const SITE_TITLE = "hh‘s Blog";
const RETURN_TITLE_DURATION_MS = 1500;

type TabTitleMode = "active" | "away" | "returning";

/** Adds a short leave-and-return title sequence to the browser tab. */
export function TabTitleBehavior() {
  useEffect(() => {
    let mode: TabTitleMode = "active";
    let returnTimer: number | undefined;

    const clearReturnTimer = () => {
      if (returnTimer === undefined) return;
      window.clearTimeout(returnTimer);
      returnTimer = undefined;
    };

    const setTitle = (title: string) => {
      if (document.title !== title) document.title = title;
    };

    const showAwayTitle = () => {
      clearReturnTimer();
      mode = "away";
      setTitle(AWAY_TITLE);
    };

    const showReturnTitle = () => {
      if (mode !== "away") return;
      clearReturnTimer();
      mode = "returning";
      setTitle(RETURN_TITLE);
      returnTimer = window.setTimeout(() => {
        mode = "active";
        returnTimer = undefined;
        setTitle(SITE_TITLE);
      }, RETURN_TITLE_DURATION_MS);
    };

    const syncVisibility = () => {
      if (document.hidden) showAwayTitle();
      else showReturnTitle();
    };

    // Keep transition copy visible if client-side navigation changes the title.
    const titleObserver = new MutationObserver(() => {
      if (mode === "away") setTitle(AWAY_TITLE);
      if (mode === "returning") setTitle(RETURN_TITLE);
    });
    titleObserver.observe(document.head, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    const syncFocus = () => {
      if (document.hidden) showAwayTitle();
      else showReturnTitle();
    };

    document.addEventListener("visibilitychange", syncVisibility);
    window.addEventListener("blur", showAwayTitle);
    window.addEventListener("focus", syncFocus);
    syncVisibility();

    return () => {
      clearReturnTimer();
      titleObserver.disconnect();
      document.removeEventListener("visibilitychange", syncVisibility);
      window.removeEventListener("blur", showAwayTitle);
      window.removeEventListener("focus", syncFocus);
    };
  }, []);

  return null;
}
