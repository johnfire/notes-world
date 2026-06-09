import { ReactNode } from "react";
import { Link } from "react-router-dom";

/**
 * Shared chrome (nav + footer) for the public marketing/content pages
 * (use-case pages, FAQ). English-only and intentionally simpler than the
 * landing page nav — no language switcher or pricing anchors. The landing
 * page keeps its own nav and is not refactored onto this layout.
 */
export function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0f0f0f] text-[#f0f0f0] font-sans flex flex-col">
      <nav className="flex items-center justify-between px-8 py-4 border-b border-[#2a2a2a] sticky top-0 bg-[#0f0f0f]/90 backdrop-blur z-10">
        <Link
          to="/"
          className="flex items-center gap-2 font-bold text-sm tracking-wide"
        >
          <div className="w-6 h-6 rounded bg-accent flex items-center justify-center text-white text-xs font-extrabold">
            N
          </div>
          notes-world
        </Link>
        <div className="flex items-center gap-4">
          <Link
            to="/login"
            className="text-sm text-[#888] border border-[#2a2a2a] px-4 py-1.5 rounded-lg hover:text-white hover:border-[#444] transition-colors"
          >
            Sign in
          </Link>
          <Link
            to="/login"
            className="text-sm font-semibold bg-accent text-white px-4 py-1.5 rounded-lg hover:opacity-90 transition-opacity"
          >
            Get started
          </Link>
        </div>
      </nav>

      <div className="flex-1">{children}</div>

      <footer className="border-t border-[#2a2a2a] py-8 text-center text-xs text-[#555]">
        <p>
          &copy; 2026 Notes World &mdash;{" "}
          <Link
            to="/"
            className="text-[#888] hover:text-white transition-colors"
          >
            Home
          </Link>{" "}
          &middot;{" "}
          <Link
            to="/docs"
            className="text-[#888] hover:text-white transition-colors"
          >
            Docs
          </Link>{" "}
          &middot;{" "}
          <Link
            to="/faq"
            className="text-[#888] hover:text-white transition-colors"
          >
            FAQ
          </Link>{" "}
          &middot;{" "}
          <Link
            to="/privacy"
            className="text-[#888] hover:text-white transition-colors"
          >
            Privacy
          </Link>{" "}
          &middot;{" "}
          <Link
            to="/terms"
            className="text-[#888] hover:text-white transition-colors"
          >
            Terms
          </Link>
        </p>
      </footer>
    </div>
  );
}
