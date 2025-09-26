import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { SafeStorage } from "@/lib/storage-utils";

// Persist and restore the last visited route across reloads without causing unwanted redirects.
// We avoid saving/restoring auth or subscription-related pages and only restore from true fallbacks.
const SKIP_PAGES = new Set([
  "/login",
  "/register",
  "/verify-email",
  "/payment-success",
  "/payment-error",
  "/account/subscription",
  "/pricing",
]);

const FALLBACK_PAGES = new Set(["/", "/dashboard"]);

function shouldSkip(pathname: string) {
  return SKIP_PAGES.has(pathname);
}

export default function RoutePersistence() {
  const location = useLocation();
  const navigate = useNavigate();
  const restoredOnce = useRef(false);

  const fullPath = `${location.pathname}${location.search}${location.hash}`;

  // Attempt restore only once on first mount, and only from real fallbacks
  useEffect(() => {
    if (restoredOnce.current) return;
    restoredOnce.current = true;

    try {
      const saved =
        SafeStorage.safeGetItem("last-path", true) ||
        SafeStorage.safeGetItem("last-path", false);
      if (!saved) return;

      // Never override explicit auth/subscription/payment pages
      if (shouldSkip(location.pathname)) return;

      // Validate saved path and ensure we don't restore to skipped pages
      if (typeof saved !== "string" || !saved.startsWith("/") || shouldSkip(saved)) return;

      const isFallbackPath = FALLBACK_PAGES.has(location.pathname);

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
    if (shouldSkip(location.pathname)) return;
    try {
      // Save in session first, then local as a backup using safe storage
      SafeStorage.safeSetItem("last-path", fullPath, true);
      SafeStorage.safeSetItem("last-path", fullPath, false);
    } catch {
      // ignore quota issues for a tiny string
    }
  }, [fullPath, location.pathname]);

  return null;
}
