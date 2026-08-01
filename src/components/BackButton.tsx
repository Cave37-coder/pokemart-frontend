'use client';
import { useRouter } from "next/navigation";
import type { CSSProperties, ReactNode } from "react";

// Shared "back one screen" button -- introduced 2026-08-01 after Michael
// flagged a site-wide pattern: every hardcoded "Back to X" link/button
// (Browse Cards, My Orders, My Pile, Sign In) always sent you to a FIXED
// destination instead of genuinely going back one screen. That reset
// filters/search/pagination/scroll on drill-down pages (Cards, Orders),
// and more importantly meant the browser's own Back button also felt
// broken/inconsistent site-wide, since none of these in-page buttons
// matched real back behaviour. Michael's words: "all back button, must
// be back one screen, no jumping around! This is the issue people had
// site wide and explains issues with people placing orders too!"
//
// This always tries router.back() first (a real "go back one step" using
// this tab's own history), and only falls back to a fixed destination
// (fallbackHref) if there's nothing to go back to in this tab -- e.g. the
// page was opened directly via a bookmark, shared link, or password-reset
// email, where there IS no "previous screen" in this session to return to.
//
// NOT used for in-form step-back buttons (e.g. the multi-step Register
// wizard's "← Back" buttons) -- those move between steps of ONE page via
// local state, not between pages, so real navigation would incorrectly
// abandon the form. Only use this for actual page-to-page "back".
export default function BackButton({
  fallbackHref,
  children = "← Back",
  style,
}: {
  fallbackHref: string;
  children?: ReactNode;
  style?: CSSProperties;
}) {
  const router = useRouter();

  const goBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push(fallbackHref);
    }
  };

  return (
    <button
      onClick={goBack}
      style={{
        color: "#a0a0b0",
        background: "none",
        border: "none",
        padding: 0,
        textDecoration: "none",
        fontSize: "14px",
        display: "inline-block",
        cursor: "pointer",
        fontFamily: "inherit",
        ...style,
      }}
    >
      {children}
    </button>
  );
}
