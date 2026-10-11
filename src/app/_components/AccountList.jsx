// AccountList (admin): every site owner account (active and inactive, sorted by name as the
// API returns them) with the websites linked to each. Never shows post content. Each account has
// a "Link a Website" button; the page owns the dialog it opens (onLink receives the account).

import styles from "../_styling/adminDash.module.css";

export default function AccountList({ accounts, loading, error, onLink }) {
  if (error) return <p>{error.message}</p>;
  if (loading && !accounts) return <p>Loading…</p>;
  if (accounts.length === 0) return <p>No site owner accounts yet.</p>;

  return (
    <ul className={styles.account}>
      {accounts.map((account) => (
        <li key={account.id} className={styles.accountInfo}>
          <p className={styles.key}>Site Owner:</p>
          <p className={styles.value}>{account.name}</p>
          <p className={styles.key}>Email:</p>
          <p className={styles.value}>{account.email}</p>
          <p
            className={`${styles.pill} ${account.active ? styles.active : styles.inactive}`}
          >
            {account.active ? "active" : "inactive"}
          </p>
          <p className={styles.key}>Websites:</p>
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
                  <span
                    className={`${styles.pill} ${website.active ? styles.active : styles.inactive}`}
                  >
                    {website.active ? "active" : "inactive"}
                  </span>
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
        </li>
      ))}
    </ul>
  );
}
