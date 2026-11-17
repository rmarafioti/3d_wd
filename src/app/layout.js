// Root layout: loads the fonts and wraps every page in AuthProvider and NavProvider (both start
// empty and never fetch), the landing page's skip link, Navbar and Footer.

import { Syne, Prompt } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "./_context/AuthContext";
import { NavProvider } from "./_context/NavContext";
import Navbar from "./_layout/Navbar";
import Footer from "./_layout/Footer";
import SkipLink from "./_components/landing/SkipLink";

// Downloaded at build time and served from our own origin, so the CSP's font-src 'self' allows
// them. globals.css names them --logoFont, --headerFont and --copyFont.
// Syne is a variable font: one file holds every weight the headings and logo use.
const syne = Syne({
  subsets: ["latin"],
  variable: "--fontSyne",
});
// Prompt Light for copy, and SemiBold so bold text uses a real face rather than a faked bold.
const prompt = Prompt({
  weight: ["300", "600"],
  subsets: ["latin"],
  variable: "--fontPrompt",
});

export const metadata = {
  title: "3D Web Dev",
  description: "Websites that do real work for small businesses.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${syne.variable} ${prompt.variable}`}>
      <body>
        <AuthProvider>
          <NavProvider>
            <SkipLink />
            <Navbar />
            {children}
            <Footer />
          </NavProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
