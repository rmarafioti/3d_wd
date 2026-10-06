// AuthContext: holds the signed-in user (filled by the dashboard layouts from GET /api/auth/me).
// Starts empty and never fetches on its own.

"use client";

import { createContext, useState } from "react";

export const AuthContext = createContext({ user: null, setUser: () => {} });

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  return (
    <AuthContext.Provider value={{ user, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}
