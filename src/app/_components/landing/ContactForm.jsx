// ContactForm: the landing page's contact form, the one client island on the static page: its
// fields and checks, the messages under Submit, and the send (POST /api/contact).

"use client";

import { useId, useState } from "react";
import { useContact } from "../../_hooks/useContact";
import { isBlank, isTooLong, isValidEmail } from "../../_lib/validation";

import styles from "../../_styling/landing.module.css";

// The API's keys for each choice (docs/api.md → Contact form), with the sentence the form shows.
const STARTING_POINTS = [
  {
    key: "has_website",
    label: "I have a website, but it isn't bringing in work",
  },
  {
    key: "unfinished_website",
    label: "I started a website, but didn't finish it",
  },
  { key: "no_website", label: "I don't have a website yet" },
];
// Limits from docs/api.md → Validation rules, Contact form.
const MAX_NAME = 100;
const MAX_BUSINESS = 100;
const MAX_GOAL = 2000;
// The fields in display order, which is also the order their messages are listed in and Submit
// looks for the first error in.
const FIELD_ORDER = ["name", "business", "email", "startingPoint", "goal"];
const EMPTY_VALUES = {
  name: "",
  business: "",
  email: "",
  startingPoint: "",
  goal: "",
};

// Frontend checks, UX only: the backend re-validates everything. Messages word for word from the
// backend's (docs/api.md → Validation rules).
function validate({ name, business, email, startingPoint, goal }) {
  const errors = {};
  if (isBlank(name)) errors.name = "Name is required.";
  else if (isTooLong(name, MAX_NAME))
    errors.name = "Name must be 100 characters or fewer.";
  if (isBlank(business)) errors.business = "Business name is required.";
  else if (isTooLong(business, MAX_BUSINESS))
    errors.business = "Business name must be 100 characters or fewer.";
  if (isBlank(email)) errors.email = "Email is required.";
  else if (!isValidEmail(email)) errors.email = "Enter a valid email address.";
  if (!startingPoint)
    errors.startingPoint = "Choose where you're starting from.";
  if (isBlank(goal)) errors.goal = "Tell me what you want your site to do.";
  else if (isTooLong(goal, MAX_GOAL))
    errors.goal = "Your answer must be 2000 characters or fewer.";
  return errors;
}

export default function ContactForm() {
  const id = useId();
  const { sendInquiry } = useContact();
  const [values, setValues] = useState(EMPTY_VALUES);
  // The honeypot: hidden from people, so only a bot fills it (docs/api.md → Contact form).
  const [contactCode, setContactCode] = useState("");
  // Fields the visitor has left at least once; only their messages are shown.
  const [touched, setTouched] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState(null);
  const [sent, setSent] = useState(false);

  const errors = validate(values);
  const serverFields = serverError?.fields ?? {};
  // A backend message for a field wins over the frontend's, since it is the one that rejected it.
  const shownErrors = FIELD_ORDER.map((field) => ({
    field,
    message:
      serverFields[field] ?? (touched[field] ? errors[field] : undefined),
  })).filter(({ message }) => message);
  // A rejection with no message for a field on the form (a 429, a 500, no connection).
  const generalError =
    serverError && !FIELD_ORDER.some((field) => serverFields[field])
      ? serverError.message
      : null;

  function setValue(field, value) {
    setValues((current) => ({ ...current, [field]: value }));
    // The backend's message was about the old value. Once none of its field messages are left, the
    // whole rejection goes, so its general sentence never shows in their place.
    if (serverFields[field]) {
      setServerError((current) => {
        const fields = { ...current.fields };
        delete fields[field];
        return Object.keys(fields).length > 0 ? { ...current, fields } : null;
      });
    }
  }

  function touch(field) {
    setTouched((current) => ({ ...current, [field]: true }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitting) return;
    setTouched(Object.fromEntries(FIELD_ORDER.map((field) => [field, true])));
    const firstInvalid = FIELD_ORDER.find((field) => errors[field]);
    if (firstInvalid) {
      document.getElementById(`${id}-${firstInvalid}`)?.focus();
      return;
    }

    setSubmitting(true);
    setServerError(null);
    try {
      await sendInquiry({
        name: values.name.trim(),
        business: values.business.trim(),
        email: values.email.trim(),
        startingPoint: values.startingPoint,
        goal: values.goal.trim(),
        contactCode,
      });
      setSent(true);
    } catch (err) {
      // Everything typed stays in the form.
      setServerError({ message: err.message, fields: err.fields ?? {} });
    } finally {
      setSubmitting(false);
    }
  }

  // Wires a field to its value, its blur and its message under Submit.
  function fieldProps(field) {
    const isShown = shownErrors.some((error) => error.field === field);
    return {
      id: `${id}-${field}`,
      required: true,
      value: values[field],
      onChange: (e) => setValue(field, e.target.value),
      onBlur: () => touch(field),
      "aria-invalid": isShown ? true : undefined,
      "aria-describedby": isShown ? `${id}-${field}-error` : undefined,
    };
  }

  if (sent) {
    // Focused on arrival, so a screen reader reads it where the form was.
    return (
      <p
        role="status"
        tabIndex={-1}
        ref={(element) => element?.focus()}
        className={styles.sentNote}
      >
        Your message is on its way! I&apos;ll get back to you soon.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className={styles.contactForm}>
      <p className={styles.requiredNote}>
        <i>All fields required</i>
      </p>

      <label htmlFor={`${id}-name`}>Name</label>
      <input
        type="text"
        autoComplete="name"
        maxLength={MAX_NAME}
        {...fieldProps("name")}
      />

      <label htmlFor={`${id}-business`}>Business Name</label>
      <input
        type="text"
        autoComplete="organization"
        maxLength={MAX_BUSINESS}
        {...fieldProps("business")}
      />

      <label htmlFor={`${id}-email`}>Email</label>
      <input type="email" autoComplete="email" {...fieldProps("email")} />

      <label htmlFor={`${id}-startingPoint`}>
        Where are you starting from?
      </label>
      <select {...fieldProps("startingPoint")}>
        <option value="">Choose one</option>
        {STARTING_POINTS.map(({ key, label }) => (
          <option key={key} value={key}>
            {label}
          </option>
        ))}
      </select>

      <label htmlFor={`${id}-goal`}>What do you want your site to do?</label>
      <textarea maxLength={MAX_GOAL} {...fieldProps("goal")} />

      {/* The honeypot, kept out of the tab order and away from screen readers and autofill. */}
      <input
        type="text"
        name="contactCode"
        className={styles.honeypot}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        value={contactCode}
        onChange={(e) => setContactCode(e.target.value)}
      />

      <button
        type="submit"
        disabled={submitting}
        className={styles.submitButton}
      >
        {submitting ? "Sending…" : "Submit"}
      </button>

      {shownErrors.map(({ field, message }) => (
        <p key={field} id={`${id}-${field}-error`} className={styles.formError}>
          {message}
        </p>
      ))}
      {generalError && <p className={styles.formError}>{generalError}</p>}
    </form>
  );
}
