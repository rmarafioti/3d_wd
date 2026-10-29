// Audit Events page (/admin/auditEvents): the read-only audit log, one UTC month at a time,
// newest first, with previous and next month controls that step only through the months that
// have events, "Load more" for the month's later pages,
// and a "Hide my sign-ins" switch (off by default) that hides only the admin's own sign-in and
// sign-out rows. Role-gated by the admin layout. A Client Component on purpose: per-user data is
// only ever fetched client-side.

"use client";

import { useState } from "react";
import { GoChevronLeft, GoChevronRight } from "react-icons/go";
import { useAuth } from "../../_hooks/useAuth";
import { useAuditEvents } from "../../_hooks/useAuditEvents";
import { useAuditEventMonths } from "../../_hooks/useAuditEventMonths";
import AuditEventTable from "../../_components/AuditEventTable";
import Toggle from "../../_components/Toggle";

import styles from "../../_styling/auditEvents.module.css";

// Hidden by "Hide my sign-ins" when the admin is the actor. A failed login always shows: a
// takeover of the admin's Google account would sign in under the admin's own email too.
const SIGN_IN_ACTIONS = ["auth.login_succeeded", "auth.logout"];

// The month is a UTC calendar month ("YYYY-MM"), the one the API filters by.
function currentUtcMonth() {
  return new Date().toISOString().slice(0, 7);
}

// "2026-10" → "October 2026".
function monthLabel(month) {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Date(Date.UTC(year, monthNumber - 1, 1)).toLocaleString(
    undefined,
    { month: "long", year: "numeric", timeZone: "UTC" },
  );
}

export default function AuditEventsPage() {
  const { user } = useAuth();
  const months = useAuditEventMonths();
  // The month the admin stepped to, or null for the newest month with events.
  const [chosenMonth, setChosenMonth] = useState(null);
  const [hideMySignIns, setHideMySignIns] = useState(false);

  // Until the months arrive nothing is fetched. An empty log shows the current month's empty state.
  let month = null;
  if (months.data) month = chosenMonth ?? months.data[0] ?? currentUtcMonth();
  const {
    data,
    loading,
    error,
    hasMore,
    loadMore,
    loadingMore,
    loadMoreError,
  } = useAuditEvents(month);

  // months.data is newest first, so the older month is the next entry and the newer one the
  // entry before. A month not in the list (the empty log's current month) has neither.
  const index = months.data?.indexOf(month) ?? -1;
  const olderMonth = index === -1 ? null : (months.data[index + 1] ?? null);
  const newerMonth = index === -1 ? null : (months.data[index - 1] ?? null);
  const events = (data ?? []).filter(
    (event) =>
      !hideMySignIns ||
      !SIGN_IN_ACTIONS.includes(event.action) ||
      event.actorEmail !== user?.email,
  );

  let content;
  if (months.error) content = <p>{months.error.message}</p>;
  else if (error) content = <p>{error.message}</p>;
  else if (loading) content = <p>Loading…</p>;
  else if (data.length === 0) content = <p>No audit events this month.</p>;
  else if (events.length === 0)
    content = <p>No audit events to show. Your sign-ins are hidden.</p>;
  else content = <AuditEventTable events={events} />;

  return (
    <article className={styles.auditEvents}>
      {/* Shrinks to the table's width, so the heading and the switch line up with its left edge
          and the month controls with its right edge. */}
      <div className={styles.tableArea}>
        <div className={styles.topRow}>
          <h1>Audit Events</h1>
          <div className={styles.monthRow}>
            <button
              type="button"
              aria-label="Previous month"
              title="Previous month"
              onClick={() => setChosenMonth(olderMonth)}
              disabled={!olderMonth}
              className={styles.monthButton}
            >
              <GoChevronLeft aria-hidden="true" />
            </button>
            {month && <p>{monthLabel(month)}</p>}
            <button
              type="button"
              aria-label="Next month"
              title="Next month"
              onClick={() => setChosenMonth(newerMonth)}
              disabled={!newerMonth}
              className={styles.monthButton}
            >
              <GoChevronRight aria-hidden="true" />
            </button>
          </div>
        </div>
        <div className={styles.toggleRow}>
          <p aria-hidden="true">Hide my sign-ins</p>
          <Toggle
            label="Hide my sign-ins"
            checked={hideMySignIns}
            onChange={setHideMySignIns}
          />
        </div>
        {content}
      </div>
      {hasMore && !error && (
        <button
          type="button"
          onClick={loadMore}
          disabled={loadingMore}
          className={styles.loadMore}
        >
          {loadingMore ? "Loading…" : "Load more"}
        </button>
      )}
      {loadMoreError && <p>{loadMoreError.message}</p>}
    </article>
  );
}
