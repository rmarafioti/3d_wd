// useAuth: reads AuthContext, returns { user, setUser }.

"use client";

import { useContext } from "react";
import { AuthContext } from "../_context/AuthContext";

export function useAuth() {
  return useContext(AuthContext);
}
