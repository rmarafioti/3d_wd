// AccountList (admin): every site owner account (active and inactive, sorted by name as the
// API returns them): site owner, email and status. Each account's "Websites" disclosure holds the
// websites linked to it and a "Link a Website" button; AccountsAside owns the dialog it opens
// (onLink receives the account). Never shows post content.

import StatusPill from "./StatusPill";

import styles from "../_styling/dashPages.module.css";

export default function AccountList({ accounts, loading, error, onLink }) {
  if (error) return <p>{error.message}</p>;
  if (loading && !accounts) return <p>Loading…</p>;
  if (accounts.length === 0) return <p>No site owner accounts yet.</p>;

  return (
    <ul className={styles.accountList}>
      {accounts.map((account) => (
        <li key={account.id} className={styles.account}>
          <p className={styles.key}>Site Owner:</p>
          <p className={styles.value}>{account.name}</p>
          <p className={styles.key}>Email:</p>
          <p className={styles.value}>{account.email}</p>
          <StatusPill active={account.active} className={styles.statusPill} />
          <details>
            <summary className={styles.key}>Websites</summary>
            {account.websites.length === 0 ? (
              <p>No websites linked.</p>
            ) : (
              <ul className={styles.websites}>
                {account.websites.map((website) => (
                  <li key={website.id}>
                    <a
                      href={website.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {website.websiteName}
                    </a>{" "}
                    <StatusPill active={website.active} />
                  </li>
                ))}
              </ul>
            )}
            <button
              type="button"
              onClick={() => onLink(account)}
              className={styles.linkWebsiteButton}
            >
              Link a Website
            </button>
          </details>
        </li>
      ))}
    </ul>
  );
}
