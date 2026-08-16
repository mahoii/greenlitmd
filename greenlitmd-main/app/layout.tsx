import type { Metadata } from "next";
import Link from "next/link";
import { DM_Sans } from "next/font/google";
import { Suspense } from "react";
import { createSupabaseAuthServerClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/auth/org";
import SignOutButton from "@/components/SignOutButton";
import Logo from "@/components/Logo";
import { PHProvider, PostHogPageview } from "./providers";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-dm-sans",
});

export const metadata: Metadata = {
  title: "Orthren",
  description: "AI-assisted prior authorization packet builder for orthopedic practices",
  icons: {
    icon: "/favicon-svg.svg",
  },
};

export default async function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  let isAuthenticated = false;
  let userEmail: string | null = null;
  let showTeamNav = false;
  try {
    const supabase = createSupabaseAuthServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    isAuthenticated = !!user;
    userEmail = user?.email ?? null;
    if (isAuthenticated) {
      const current = await getCurrentMembership();
      showTeamNav = current?.membership.role === "owner" || current?.membership.role === "coordinator";
    }
  } catch {
    // cookies() unavailable in some static contexts — treat as unauthenticated
  }

  return (
    <html lang="en" className={dmSans.variable}>
      <head>
        <link rel="icon" type="image/svg+xml" href="/favicon-svg.svg" />
      </head>
      <body className="font-sans">
        <PHProvider>
          <Suspense fallback={null}>
            <PostHogPageview />
          </Suspense>
          <header className="sticky top-0 z-50 border-b border-[#E2E8F0] bg-white/90 backdrop-blur">
            <nav className="mx-auto flex h-14 max-w-7xl items-center px-6" aria-label="Primary">
              <div className="flex flex-1 items-center gap-2">
                <Link
                  href="/"
                  className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                >
                  <Logo size="md" />
                  <span className="rounded-full border border-[#CBD5E1] bg-[#F8F9FB] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                    Beta
                  </span>
                </Link>
              </div>
              <div className="flex items-center">
                {isAuthenticated ? (
                  <div className="flex items-center gap-3">
                    {showTeamNav ? (
                      <Link
                        href="/team"
                        className="rounded-md border border-[#CBD5E1] px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                      >
                        Team
                      </Link>
                    ) : null}
                    <Link
                      href="/pricing"
                      className="rounded-md bg-clinical-navy px-4 py-2 text-sm font-semibold text-white transition hover:bg-clinical-blue hover:shadow-md"
                    >
                      See Plans
                    </Link>
                    <SignOutButton email={userEmail} />
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <Link
                      href="/login"
                      className="rounded-md border border-[#CBD5E1] px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                    >
                      Sign in
                    </Link>
                    <Link
                      href="/pricing"
                      className="rounded-md bg-clinical-navy px-4 py-2 text-sm font-semibold text-white transition hover:bg-clinical-blue hover:shadow-md"
                    >
                      See Plans
                    </Link>
                  </div>
                )}
              </div>
            </nav>
          </header>
          {children}
          <footer className="border-t border-slate-200 bg-white px-6 py-10 text-xs text-slate-500">
            <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 sm:flex-row">
              <div className="flex items-center gap-2">
                <Logo size="sm" />
                <span className="text-slate-400">&copy; {new Date().getFullYear()}</span>
              </div>

              <nav className="flex flex-wrap justify-center gap-5 font-semibold" aria-label="Footer navigation">
                <Link href="/pricing" className="hover:text-slate-800 transition-colors">
                  Pricing
                </Link>
                <Link href="/security" className="hover:text-slate-800 transition-colors">
                  Security
                </Link>
                <Link href="/privacy" className="hover:text-slate-800 transition-colors">
                  Privacy Policy
                </Link>
                <Link href="/terms" className="hover:text-slate-800 transition-colors">
                  Terms of Service
                </Link>
                <a href="mailto:kamari@orthren.com" className="hover:text-slate-800 transition-colors">
                  Email Us
                </a>
                <a
                  href="https://linkedin.com/company/orthren/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 hover:text-slate-800 transition-colors"
                >
                  LinkedIn
                  <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.32 1.3v-1.11h-2.8v8.37h2.8v-4.87c0-.26.05-.52.13-.7a1.11 1.11 0 0 1 .97-.73c.6 0 .86.53.86 1.3v5h2.8M6.5 8.37a1.37 1.37 0 1 0 0-2.75 1.37 1.37 0 0 0 0 2.75M8 18.5V10.13H5v8.37h3z" />
                  </svg>
                </a>
              </nav>
            </div>
          </footer>
        </PHProvider>
      </body>
    </html>
  );
}
