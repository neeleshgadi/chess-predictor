"use client";

import { supabase } from "@/lib/supabase";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_, session) => {
        if (session) router.push("/");
      },
    );
    return () => authListener.subscription.unsubscribe();
  }, [router]);

  if (!isMounted) return null;

  return (
    <main className="min-h-screen bg-[#F8FAFC] flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden">
          {/* Header band */}
          <div className="px-8 pt-8 pb-6 border-b border-[#E2E8F0]">
            <p className="text-xs font-bold tracking-[0.15em] uppercase text-[#64748B] mb-3">
              Candidates Tournament
            </p>
            <h1
              className="text-3xl font-bold text-[#0F172A] mb-2"
              style={{
                letterSpacing: "-0.02em",
                fontFamily: "var(--font-primary)",
              }}
            >
              Sign{" "}
              <span
                className="text-highlight"
                style={
                  {
                    "--highlight-color": "var(--highlight-cyan)",
                  } as React.CSSProperties
                }
              >
                In
              </span>
            </h1>
            <p className="text-sm text-[#64748B]">
              Lock in your prediction before the tournament starts.
            </p>
          </div>

          {/* Auth form */}
          <div className="px-8 py-6">
            <Auth
              supabaseClient={supabase}
              appearance={{
                theme: ThemeSupa,
                variables: {
                  default: {
                    colors: {
                      brand: "#0F172A",
                      brandAccent: "#1E293B",
                      inputBackground: "#F8FAFC",
                      inputBorder: "#E2E8F0",
                      inputBorderFocus: "#0F172A",
                      inputText: "#334155",
                    },
                    radii: {
                      borderRadiusButton: "8px",
                      inputBorderRadius: "8px",
                    },
                    fonts: {
                      bodyFontFamily: `'Space Mono', monospace`,
                      buttonFontFamily: `'Space Mono', monospace`,
                      inputFontFamily: `'Space Mono', monospace`,
                      labelFontFamily: `'Space Mono', monospace`,
                    },
                    fontSizes: {
                      baseBodySize: "13px",
                      baseInputSize: "13px",
                      baseLabelSize: "11px",
                      baseButtonSize: "13px",
                    },
                  },
                },
              }}
              providers={[]}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
