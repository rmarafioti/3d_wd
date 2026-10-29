// AuditEventTable (admin): the Audit Events page's read-only table, one row per audit event in
// the order given (newest first). Times show in the admin's local time, metadata as compact
// "key: value" pairs, and a field the event doesn't have as an empty cell.

import styles from "../_styling/auditEvents.module.css";

// { websiteId: "w1", reason: "no_account" } → "websiteId: w1, reason: no_account".
export function formatMetadata(metadata) {
  if (!metadata) return "";
  return Object.entries(metadata)
    .map(([key, value]) => {
      const text = typeof value === "object" ? JSON.stringify(value) : value;
      return `${key}: ${text}`;
    })
    .join(", ");
}

export default function AuditEventTable({ events }) {
  return (
    // The wrapper scrolls the wide table sideways inside its own box at phone width, since the
    // page itself hides horizontal overflow.
    <div className={styles.tableWrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th scope="col">Created at</th>
            <th scope="col">Actor email</th>
            <th scope="col">Action</th>
            <th scope="col">Target type</th>
            <th scope="col">Target id</th>
            <th scope="col">IP</th>
            <th scope="col">Metadata</th>
          </tr>
        </thead>
        <tbody>
          {events.map((event) => (
            <tr key={event.id}>
              <td>{new Date(event.createdAt).toLocaleString()}</td>
              <td>{event.actorEmail}</td>
              <td>{event.action}</td>
              <td>{event.targetType}</td>
              <td>{event.targetId}</td>
              <td>{event.ip}</td>
              <td>{formatMetadata(event.metadata)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
