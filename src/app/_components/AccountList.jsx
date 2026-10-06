// AccountList (admin): every site owner account (active and inactive, sorted by name as the
// API returns them) with the websites linked to each. Never shows post content.

export default function AccountList({ accounts, loading, error }) {
  if (error) return <p>{error.message}</p>;
  if (loading && !accounts) return <p>Loading…</p>;
  if (accounts.length === 0) return <p>No site owner accounts yet.</p>;

  return (
    <ul>
      {accounts.map((account) => (
        <li key={account.id}>
          <p>
            {account.name} — {account.email} —{" "}
            {account.active ? "active" : "inactive"}
          </p>

          {account.websites.length === 0 ? (
            <p>No websites linked.</p>
          ) : (
            <ul>
              {account.websites.map((website) => (
                <li key={website.id}>
                  {website.websiteName} — {website.url} —{" "}
                  {website.active ? "active" : "inactive"}
                </li>
              ))}
            </ul>
          )}
        </li>
      ))}
    </ul>
  );
}
