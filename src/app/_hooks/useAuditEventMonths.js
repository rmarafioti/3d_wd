// useAuditEventMonths (admin): every UTC month ("YYYY-MM") with at least one audit event, newest
// first (GET /api/admin/auditEvents/months), so the Audit Events month controls reach only months
// with events. Returns { data, loading, error }.

"use client";

import { useApiResource } from "./useApiResource";

export function useAuditEventMonths() {
  const { data, loading, error } = useApiResource(
    "/api/admin/auditEvents/months",
  );

  return { data, loading, error };
}
