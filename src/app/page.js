// Landing page: public and static for SEO, with the Pitch's hero, proof, pricing, about and contact
// sections. A Server Component with no data fetching; ContactForm, its one client island, sends.

import ContactForm from "./_components/landing/ContactForm";

import styles from "./_styling/landing.module.css";

// The anchor both "Contact me" links jump to: a plain link, so the page needs no script for it.
const CONTACT_ANCHOR = "contact";

function ContactLink() {
  return (
    <a href={`#${CONTACT_ANCHOR}`} className={styles.contactButton}>
      Contact me
    </a>
  );
}

// A client's own website, opened in a new tab; noreferrer sends it no referrer and no handle
// back to this page.
function ClientLink({ href, children }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
}

export default function Home() {
  return (
    <article className={styles.landing}>
      <section className={styles.section}>
        <h1 className={styles.heroHeading}>
          Your website brings in the customers. You get your time back.
        </h1>
        <p>
          A website that presents your business in your own voice, designed and
          built for you, so you never have to take on the tech yourself.
        </p>
        <ContactLink />
      </section>

      <section className={styles.section}>
        <h2>From the occasional inquiry to a steady stream of new business.</h2>
        <p>
          Clients have come to me with live websites that brought in 5 or fewer
          potential customers a month. I took over and rebuilt each site around
          what the business needed. For one, that number jumped to as many as 30
          a month. Another reached as many as 15 with a single landing page.
          Here&apos;s what the right website can do for you:
        </p>
        <ul className={styles.points}>
          <li>
            <strong>More engagement.</strong> People who find your site fill out
            your form, instead of moving on.
          </li>
          <li>
            <strong>Hours back each week.</strong> Less time going back and
            forth answering the same questions.
          </li>
          <li>
            <strong>Well-informed customers.</strong> Your site answers their
            questions clearly and correctly, so they reach out knowing what they
            want.
          </li>
        </ul>
      </section>

      <section className={styles.section}>
        <h2>Pricing made simple.</h2>
        <p>
          Every site is custom designed, and the possibilities are endless, from
          illustration to animations, all quoted with your build.
        </p>
        <p>
          Payment plans available. Changes after launch start at $75 an hour.
        </p>
        <ul className={styles.cardGroup}>
          <li className={styles.card}>
            <h3 className={styles.cardTitle}>
              Starter site
              <span className={styles.price}>from $700</span>
            </h3>
            <p>An effective landing page that brings in business.</p>
          </li>
          <li className={styles.card}>
            <h3 className={styles.cardTitle}>
              Business site
              <span className={styles.price}>from $2,000</span>
            </h3>
            <p>
              Several pages, with booking or quote forms set up around your
              services. First year of hosting included.
            </p>
          </li>
          <li className={styles.card}>
            <h3 className={styles.cardTitle}>
              Full build
              <span className={styles.price}>from $5,000</span>
            </h3>
            <p>
              A business site, plus tools and workflows built for how you work.
            </p>
          </li>
        </ul>
        <h3 className={styles.subheading}>
          One yearly plan keeps everything running.
        </h3>
        <ul className={styles.cardGroup}>
          <li className={styles.card}>
            <h4 className={styles.cardTitle}>
              Hosting
              <span className={styles.price}>$240 a year</span>
            </h4>
            <p>
              Your site online, secure and backed up, with the 3DWD Client
              Portal to manage your own updates.
            </p>
          </li>
          <li className={styles.card}>
            <h4 className={styles.cardTitle}>
              Partner
              <span className={styles.price}>$640 a year</span>
            </h4>
            <p>
              Everything in Hosting, plus four check-ins a year: we go over who
              visits your site and how they find it, plan new features (built at
              the hourly rate), and answer your questions, so your site keeps
              growing with your business.
            </p>
          </li>
        </ul>
        <ContactLink />
        <h3 className={styles.subheading}>Don&apos;t want to be boxed in?</h3>
        <p>
          You&apos;re never locked in. Every site I build can be handed over if
          you choose to leave: keep it running on its yearly plan, move it to
          another developer, or take your posts and photos with you. Your domain
          is always in your name.
        </p>
      </section>

      <section className={styles.section}>
        <h2>From experience, I know where the hours go.</h2>
        <p>
          I spent twenty years on the owner&apos;s side of a small business:
        </p>
        <ul className={`${styles.points} ${styles.bullets}`}>
          <li>
            Worked independently for ten years, with a waitlist of up to four
            months.
          </li>
          <li>
            Owned my own business for ten years, and more than doubled its
            profits.
          </li>
          <li>
            Built the systems my business ran on: booking, scheduling, client
            intake and waitlists.
          </li>
          <li>
            Ran its marketing: a mailing list of 3,000 customers and a social
            following of close to 10,000.
          </li>
        </ul>
        <p>
          Now I design and build websites for owners like I was: busy, hands-on,
          and doing it all themselves. I studied illustration at the Rhode
          Island School of Design and software engineering at Fullstack Academy.
        </p>

        <h3 className={styles.subheading}>What clients have to say</h3>
        <figure className={styles.quote}>
          <blockquote>
            <p>
              &quot;Rich is extremely reliable, efficient, and
              knowledgeable!&quot;
            </p>
          </blockquote>
          <figcaption>
            Owner,{" "}
            <ClientLink href="https://www.gbgrooming.com/">
              GB Grooming
            </ClientLink>
          </figcaption>
        </figure>
        <figure className={styles.quote}>
          <blockquote>
            <p>
              &quot;Easy to work with, knowledgeable, understanding and all
              around good experience from idea to execution.&quot;
            </p>
          </blockquote>
          <figcaption>
            Owner,{" "}
            <ClientLink href="https://www.legacytattoochicago.com/">
              Legacy Tattoo
            </ClientLink>
          </figcaption>
        </figure>
      </section>

      <section id={CONTACT_ANCHOR} className={styles.section}>
        <h2>Let&apos;s make your website do more of the work.</h2>
        <p>
          Tell me about your business and what you want your site to do.
          I&apos;ll come back with a few options at different prices, and you
          pick what fits.
        </p>
        <ContactForm />
      </section>
    </article>
  );
}
