// useAuditEventMonths (admin): every UTC month ("YYYY-MM") with an audit event, newest first, for
// the Audit Events month controls. Returns { data, loading, error }.

"use client";

import { useApiResource } from "./useApiResource";

export function useAuditEventMonths() {
  const { data, loading, error } = useApiResource(
    "/api/admin/auditEvents/months",
  );

  return { data, loading, error };
}
