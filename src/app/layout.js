// Root layout: loads the fonts and wraps every page in AuthProvider and NavProvider (both start
// empty and never fetch), Navbar and Footer.

import { BBH_Hegarty, Montserrat } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "./_context/AuthContext";
import { NavProvider } from "./_context/NavContext";
import Navbar from "./_layout/Navbar";
import Footer from "./_layout/Footer";

// Downloaded at build time and served from our own origin, so the CSP's font-src 'self' allows
// them. globals.css names them --logoFont, --headerFont and --copyFont.
const bbhHegarty = BBH_Hegarty({
  weight: "400",
  subsets: ["latin"],
  variable: "--fontBbhHegarty",
  // Next.js has no metrics for this font to size a fallback by, and warns on every compile unless
  // it is given its own fallback.
  fallback: ["sans-serif"],
});
const montserrat = Montserrat({
  weight: ["400", "600"],
  subsets: ["latin"],
  variable: "--fontMontserrat",
});

export const metadata = {
  title: "3D Web Dev",
  description: "Websites that do real work for small businesses.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${bbhHegarty.variable} ${montserrat.variable}`}>
      <body>
        <AuthProvider>
          <NavProvider>
            <Navbar />
            {children}
            <Footer />
          </NavProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
