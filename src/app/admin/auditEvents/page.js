// Audit Events page: the read-only audit log, one UTC month or one local day at a time. A Client
// Component on purpose, since per-user data is only ever fetched client-side.

"use client";

import { useState } from "react";
import { GoChevronLeft, GoChevronRight } from "react-icons/go";
import { useAuth } from "../../_hooks/useAuth";
import { auditEventsQuery, useAuditEvents } from "../../_hooks/useAuditEvents";
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

// Today in the admin's time zone, as a date field's value ("YYYY-MM-DD"): the latest day to pick.
function todayLocalDate() {
  const now = new Date();
  const pad = (number) => String(number).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
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
  // The day picked in the date field ("YYYY-MM-DD"), or "" for the whole month.
  const [date, setDate] = useState("");
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
    pageNumber,
    pages,
  } = useAuditEvents(month && auditEventsQuery({ month, date }));

  // The nearest months with events either side of the one shown ("YYYY-MM" sorts as text), so a
  // date picked in a month without events can still step away. months.data is newest first.
  const olderMonth = months.data?.find((entry) => entry < month) ?? null;
  const newerMonth = months.data?.findLast((entry) => entry > month) ?? null;
  const events = (data ?? []).filter(
    (event) =>
      !hideMySignIns ||
      !SIGN_IN_ACTIONS.includes(event.action) ||
      event.actorEmail !== user?.email,
  );

  function handleDateChange(event) {
    const picked = event.target.value;
    setDate(picked);
    // The month name follows the picked day.
    if (picked) setChosenMonth(picked.slice(0, 7));
  }

  // A chevron leaves the picked day for the whole of the month it steps to.
  function stepTo(nextMonth) {
    setDate("");
    setChosenMonth(nextMonth);
  }

  let content;
  if (months.error) content = <p>{months.error.message}</p>;
  else if (error) content = <p>{error.message}</p>;
  else if (loading) content = <p>Loading…</p>;
  else if (data.length === 0 && date)
    content = <p>No audit events on this day.</p>;
  else if (data.length === 0) content = <p>No audit events this month.</p>;
  else if (events.length === 0)
    content = <p>No audit events to show. Your sign-ins are hidden.</p>;
  else content = <AuditEventTable events={events} />;

  return (
    <article className={styles.auditEvents}>
      {/* Shrinks to the table's width, so the rows above it line up with its left edge. */}
      <div className={styles.tableArea}>
        <div className={styles.topRow}>
          <h1>Audit Events</h1>
          <div className={styles.monthRow}>
            <button
              type="button"
              aria-label="Previous month"
              title="Previous month"
              onClick={() => stepTo(olderMonth)}
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
              onClick={() => stepTo(newerMonth)}
              disabled={!newerMonth}
              className={styles.monthButton}
            >
              <GoChevronRight aria-hidden="true" />
            </button>
          </div>
        </div>
        <div className={styles.dateRow}>
          <label className={styles.dateField}>
            Date
            <input
              type="date"
              className={styles.dateInput}
              value={date}
              max={todayLocalDate()}
              onChange={handleDateChange}
            />
          </label>
          {date && (
            <button
              type="button"
              onClick={() => setDate("")}
              className={styles.clearButton}
            >
              Clear
            </button>
          )}
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
      {/* Stays on the last page, where Load more is gone, so the admin knows it is the end. */}
      {data?.length > 0 && !error && (
        <div className={styles.pagingRow}>
          {hasMore && (
            <button type="button" onClick={loadMore} disabled={loadingMore}>
              {loadingMore ? "Loading…" : "Load more"}
            </button>
          )}
          {pages > 0 && (
            <p>
              Page {pageNumber} of {pages}
            </p>
          )}
        </div>
      )}
      {loadMoreError && <p>{loadMoreError.message}</p>}
    </article>
  );
}
