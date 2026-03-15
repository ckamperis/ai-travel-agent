import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Travel Agent | Afea Travel",
  description: "Agentic AI travel assistant demo — multiple AI agents collaborating in real-time",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="el">
      <body className="min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
