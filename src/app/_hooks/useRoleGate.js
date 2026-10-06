// useRoleGate(requiredRole): used once by each dashboard layout. Calls GET /api/auth/me,
// stores the user in AuthContext when their role matches, and otherwise redirects to the
// dashboard for their role. UX only — the backend enforces access on every request.
// Returns { data, loading, error }.

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "../_lib/apiFetch";
import { useAuth } from "./useAuth";

const HOME_BY_ROLE = { admin: "/admin", site_owner: "/dashboard" };

export function useRoleGate(requiredRole) {
  const router = useRouter();
  const { setUser } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Ignore a response that arrives after this effect was cleaned up
    // (React Strict Mode runs effects twice in development).
    let ignore = false;

    apiFetch("/api/auth/me")
      .then((me) => {
        if (ignore) return;
        if (me.role !== requiredRole) {
          // Stay in the loading state while the redirect happens.
          router.replace(HOME_BY_ROLE[me.role] ?? "/");
          return;
        }
        setUser(me);
        setData(me);
        setLoading(false);
      })
      .catch((err) => {
        // On a 401, apiFetch is already redirecting to /sign-in; keep showing loading.
        if (ignore || err.status === 401) return;
        setError(err);
        setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [requiredRole, router, setUser]);

  return { data, loading, error };
}
