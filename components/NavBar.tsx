"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";

export default function NavBar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      checkAdmin(session?.access_token);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
      checkAdmin(session?.access_token);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  function checkAdmin(token?: string) {
    if (!token) {
      setIsAdmin(false);
      return;
    }
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      const role = payload?.app_metadata?.role ?? payload?.role;
      setIsAdmin(role === "admin");
    } catch {
      setIsAdmin(false);
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  // Hide nav on login page
  if (pathname === "/login") return null;

  const navLink = (href: string, label: string) => (
    <Link
      href={href}
      className={`text-xs font-bold tracking-[0.1em] uppercase transition-colors ${
        pathname === href
          ? "text-primary"
          : "text-muted-foreground hover:text-primary"
      }`}
    >
      {label}
    </Link>
  );

  return (
    <header className="border-b border-border bg-background sticky top-0 z-50">
      <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link
          href="/"
          className="text-xs font-bold tracking-[0.15em] uppercase text-primary"
        >
          Chess Predictor
        </Link>

        {/* Nav links */}
        <nav className="flex items-center gap-6">
          {navLink("/", "Predict")}
          {navLink("/leaderboard", "Leaderboard")}
          {user && navLink("/profile", "Profile")}
          {isAdmin && navLink("/admin", "Admin")}
        </nav>

        {/* Auth */}
        <div className="flex items-center gap-3">
          {user ? (
            <>
              <span className="text-xs text-muted-foreground hidden sm:block">
                {user.email?.split("@")[0]}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSignOut}
                className="text-xs tracking-[0.05em] uppercase border-border text-muted-foreground hover:border-primary hover:text-primary rounded-lg"
              >
                Sign Out
              </Button>
            </>
          ) : (
            <Link href="/login">
              <Button
                size="sm"
                className="text-xs tracking-[0.05em] uppercase font-bold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Sign In
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
