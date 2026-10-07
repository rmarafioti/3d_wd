// PostList (site owner): each of the owner's websites with its posts (active and inactive,
// newest first as the API returns them). Each post name links to /dashboard/post/{id}.

import Link from "next/link";

export default function PostList({ websites, loading, error }) {
  if (error) return <p>{error.message}</p>;
  if (loading && !websites) return <p>Loading…</p>;
  if (websites.length === 0) return <p>You have no websites yet.</p>;

  return websites.map((website) => (
    <section key={website.id}>
      <h2>{website.websiteName}</h2>

      {website.posts.length === 0 ? (
        <p>No posts yet.</p>
      ) : (
        <ul>
          {website.posts.map((post) => (
            <li key={post.id}>
              <Link href={`/dashboard/post/${post.id}`}>{post.postName}</Link>
              {post.postDate && <> — {post.postDate}</>} —{" "}
              {post.active ? "active" : "inactive"}
            </li>
          ))}
        </ul>
      )}
    </section>
  ));
}
