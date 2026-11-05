// Landing page: public and static for SEO. Must stay a Server Component with no fetching.

import styles from "./_styling/landing.module.css";

export default function Home() {
  return (
    <article className={styles.landing}>
      <div className={styles.content}>
        <h1 className={styles.title}>3D Web Dev</h1>
        <p className={styles.tagline}>
          Websites that do real work for small businesses.
        </p>
        <p className={styles.copy}>
          Booking, quotes, inquiries, and the tools that grow from there. I work
          alongside you to find the right solution for your business and budget,
          one that brings in new customers. Your website takes everyday work off
          your plate, and it looks great doing it.
        </p>
      </div>
    </article>
  );
}
