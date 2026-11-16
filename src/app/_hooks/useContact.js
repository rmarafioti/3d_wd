// useContact: the landing page contact form's one mutation, sendInquiry (POST /api/contact, no
// session). It fetches nothing.

"use client";

import { useCallback } from "react";
import { apiFetch } from "../_lib/apiFetch";

export function useContact() {
  // payload: { name, business, email, startingPoint, goal, contactCode }. Returns
  // { received: true }; throws the ApiError on failure.
  const sendInquiry = useCallback(
    (payload) => apiFetch("/api/contact", { method: "POST", body: payload }),
    [],
  );

  return { sendInquiry };
}
