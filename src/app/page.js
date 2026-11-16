// Landing page: public and static for SEO, with the Pitch's hero, proof, pricing, about and contact
// sections. A Server Component with no data fetching; its client islands send the contact form,
// scroll to a section and back to the top.

import ContactForm from "./_components/landing/ContactForm";
import SectionLink from "./_components/landing/SectionLink";
import BackToTop from "./_components/landing/BackToTop";
import { SECTION_IDS, MAIN_CONTENT_ID } from "./_lib/landingSections";

import styles from "./_styling/landing.module.css";

function ContactLink() {
  return (
    <SectionLink id={SECTION_IDS.contact} className={styles.contactButton}>
      Contact me
    </SectionLink>
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
    // tabIndex -1 on the article and the headings: the skip link, the section links and Back to top
    // move focus to them, so Tab continues from there.
    <article id={MAIN_CONTENT_ID} tabIndex={-1} className={styles.landing}>
      <section className={styles.section}>
        <h1 tabIndex={-1} className={styles.brandHeading}>
          Now showing: your business.
        </h1>
        <p>
          A website that presents what you do in your own voice, designed and
          built for you, so you never have to take on the tech yourself.
        </p>
        <ContactLink />
      </section>

      <section className={styles.section}>
        <h2>A steady stream of new customers awaits.</h2>
        <p>
          Clients have come to me with live websites that brought in 5 or fewer
          potential customers a month. I took over and rebuilt each site around
          what the business needed. For one, that number jumped to as many as 30
          a month. Another reached as many as 15 with a single landing page.
          Here&apos;s what the right website can do for you:
        </p>
        <ul className={styles.points}>
          <li>
            <strong>Well-informed customers.</strong> Your site answers their
            questions clearly and correctly, so they reach out knowing what they
            want.
          </li>
          <li>
            <strong>More engagement.</strong> People who find your site reach
            out instead of moving on.
          </li>
          <li>
            <strong>Time for the real work.</strong> Bookings, intake and
            follow-ups run themselves, so you can focus on your craft.
          </li>
        </ul>
      </section>

      <section id={SECTION_IDS.pricing} className={styles.section}>
        <h2 tabIndex={-1} className={styles.brandHeading}>
          Pricing made simple. No investigator required.
        </h2>
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
        <h3 className={styles.subheading}>I won&apos;t hold you hostage.</h3>
        <p>
          You&apos;re never locked in. Every site I build can be handed over if
          you choose to leave: keep it running on its yearly plan, move it to
          another developer, or take your posts and photos with you. Your domain
          is always in your name.
        </p>
      </section>

      <section id={SECTION_IDS.about} className={styles.section}>
        <h2 tabIndex={-1} className={styles.brandHeading}>
          From experience, I know what makes the cut.
        </h2>
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
          and doing it all themselves. Running a business taught me how a site
          should speak to your customers. As a graduate of the Rhode Island
          School of Design, I bring an eye for aesthetics and design, and from
          my training at Fullstack Academy and more than three years working in
          tech, the engineering skills to build it.
        </p>

        <h3 className={styles.subheading}>The reviews are in.</h3>
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

      <section id={SECTION_IDS.contact} className={styles.section}>
        <h2 tabIndex={-1} className={styles.brandHeading}>
          Let&apos;s put your story on the big screen.
        </h2>
        <p>
          Tell me about your business and what you want your site to do.
          I&apos;ll come back with a few options at different prices, and you
          pick what fits.
        </p>
        <ContactForm />
      </section>
      <BackToTop />
    </article>
  );
}
