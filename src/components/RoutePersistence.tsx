import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";

// Persist and restore the last visited route across reloads.
// This helps counter any unexpected redirects that may occur on initial mount.
const AUTH_PAGES = new Set([
  "/login",
  "/register",
  "/verify-email",
  "/payment-success",
  "/payment-error",
]);

function shouldSkipRestore(pathname: string) {
  return AUTH_PAGES.has(pathname);
}

export default function RoutePersistence() {
  const location = useLocation();
  const navigate = useNavigate();
  const restoredOnce = useRef(false);

  const fullPath = `${location.pathname}${location.search}${location.hash}`;

  // Attempt restore only once on first mount
  useEffect(() => {
    if (restoredOnce.current) return;
    restoredOnce.current = true;

    try {
      const saved = sessionStorage.getItem("last-path") || localStorage.getItem("last-path");
      if (!saved) return;

      // Never override explicit auth or payment pages
      if (shouldSkipRestore(location.pathname)) return;

      // Restore only if current path looks like a fallback and differs from the saved one
      const isFallbackPath =
        location.pathname === "/" ||
        location.pathname === "/pricing" ||
        location.pathname === "/dashboard";

      if (isFallbackPath && saved !== fullPath) {
        navigate(saved, { replace: true });
      }
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Track route changes and persist the latest path (lightweight string only)
  useEffect(() => {
    try {
      sessionStorage.setItem("last-path", fullPath);
      localStorage.setItem("last-path", fullPath);
    } catch {
      // ignore quota issues for a tiny string
    }
  }, [fullPath]);

  return null;
}
