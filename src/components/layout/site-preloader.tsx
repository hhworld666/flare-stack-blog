import { useEffect, useState } from "react";
import { m } from "@/paraglide/messages";
import "./site-preloader.css";

const MINIMUM_VISIBLE_DURATION_MS = 780;
const FADE_DURATION_MS = 360;
const COMPLETE_PAUSE_MS = 120;
const MAXIMUM_LOAD_WAIT_MS = 8000;

export function SitePreloader() {
  const [isVisible, setIsVisible] = useState(true);
  const [isLeaving, setIsLeaving] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const startedAt = performance.now();
    let hasCompleted = false;
    let completionTimer = 0;
    let fadeTimer = 0;
    let hideTimer = 0;
    let loadFallbackTimer = 0;

    const progressTimer = window.setInterval(() => {
      setProgress((current) => Math.min(current + 8, 90));
    }, 70);

    const completeLoading = () => {
      if (hasCompleted) return;
      hasCompleted = true;
      window.clearTimeout(loadFallbackTimer);

      const elapsed = performance.now() - startedAt;
      const remaining = Math.max(0, MINIMUM_VISIBLE_DURATION_MS - elapsed);

      completionTimer = window.setTimeout(() => {
        window.clearInterval(progressTimer);
        setProgress(100);

        fadeTimer = window.setTimeout(
          () => setIsLeaving(true),
          COMPLETE_PAUSE_MS,
        );
        hideTimer = window.setTimeout(
          () => setIsVisible(false),
          COMPLETE_PAUSE_MS + FADE_DURATION_MS,
        );
      }, remaining);
    };

    loadFallbackTimer = window.setTimeout(
      completeLoading,
      MAXIMUM_LOAD_WAIT_MS,
    );

    if (document.readyState === "complete") {
      completeLoading();
    } else {
      window.addEventListener("load", completeLoading, { once: true });
    }

    return () => {
      window.clearInterval(progressTimer);
      window.clearTimeout(loadFallbackTimer);
      window.clearTimeout(completionTimer);
      window.clearTimeout(fadeTimer);
      window.clearTimeout(hideTimer);
      window.removeEventListener("load", completeLoading);
    };
  }, []);

  if (!isVisible) return null;

  return (
    <div
      className={`site-preloader${isLeaving ? " is-leaving" : ""}`}
      role="status"
      aria-label={m.site_preloader_loading()}
    >
      <div className="site-preloader__content">
        <img
          className="site-preloader__cat"
          src="/images/preloader-kitty.png"
          alt=""
          width={436}
          height={440}
          fetchPriority="high"
        />
        <div
          className="site-preloader__progress"
          role="progressbar"
          aria-label={m.site_preloader_loading()}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
        >
          <span
            className="site-preloader__progress-fill"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
