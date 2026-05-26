import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "KITEKO — KI-gestütztes Stakeholder-Training",
  description: "Auftragsklärung, Persona-Simulation und Archetyp-Dialog mit Gemini",
};

export default function RootLayout({ children }) {
  return (
    <html lang="de" className={`${inter.className} h-full antialiased`}>
      <body className="min-h-full bg-slate-50 text-slate-900">{children}</body>
    </html>
  );
}
