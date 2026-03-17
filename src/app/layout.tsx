import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { ToastProvider } from "@/components/Toast";
import { ThemeProvider } from "@/components/ThemeProvider";

export const metadata: Metadata = {
  title: "TravelAgent AI | Smart Email Assistant for Travel Agencies",
  description: "AI-powered email assistant that handles travel inquiries in seconds",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen antialiased">
        <ThemeProvider>
          <ToastProvider>
            <div className="flex h-screen overflow-hidden">
              <Sidebar />
              <div className="flex flex-1 flex-col overflow-hidden">
                <Header />
                <main className="flex-1 overflow-y-auto"
                  style={{ background: 'var(--color-bg)' }}>
                  {children}
                </main>
              </div>
            </div>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
