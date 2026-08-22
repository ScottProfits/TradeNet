import { useEffect } from "react";

// Module-level so multiple lightboxes (ExpandableVideo, ImageGallery, ...)
// share one lock instead of each saving/restoring body styles independently —
// with independent locks, two overlapping opens (e.g. a stray tap opening a
// second lightbox before the first closes) restore out of order and can
// leave body permanently pinned with a stale offset, breaking scroll app-wide.
let lockCount = 0;
let savedStyle: { position: string; top: string; left: string; right: string; width: string } | null = null;
let savedScrollY = 0;

function lock() {
  if (lockCount === 0) {
    savedScrollY = window.scrollY;
    const body = document.body.style;
    savedStyle = { position: body.position, top: body.top, left: body.left, right: body.right, width: body.width };
    body.position = "fixed";
    body.top = `-${savedScrollY}px`;
    body.left = "0";
    body.right = "0";
    body.width = "100%";
  }
  lockCount++;
}

function unlock() {
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount === 0 && savedStyle) {
    const body = document.body.style;
    body.position = savedStyle.position;
    body.top = savedStyle.top;
    body.left = savedStyle.left;
    body.right = savedStyle.right;
    body.width = savedStyle.width;
    window.scrollTo(0, savedScrollY);
    savedStyle = null;
  }
}

// Also blocks iOS WKWebView's native rubber-band scroll during a lightbox
// drag/swipe — CSS alone (touch-action, overflow) doesn't reliably stop it.
function preventScroll(e: TouchEvent) {
  e.preventDefault();
}

export function useBodyScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    lock();
    document.addEventListener("touchmove", preventScroll, { passive: false });
    return () => {
      unlock();
      document.removeEventListener("touchmove", preventScroll);
    };
  }, [active]);
}
