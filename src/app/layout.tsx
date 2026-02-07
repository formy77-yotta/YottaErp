import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "YottaErp - Sistema Gestionale ERP",
  description: "Sistema ERP completo per la gestione aziendale",
};

// Forza rendering dinamico per evitare problemi di pre-rendering
// Nota: global-error.tsx è stato rimosso perché causava problemi durante il build su Vercel
// Gli errori vengono gestiti con error.tsx nelle route specifiche
export const dynamic = 'force-dynamic';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
