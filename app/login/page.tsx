"use client"

import { supabase } from "@/lib/supabase"
import { Auth } from "@supabase/auth-ui-react"
import { ThemeSupa } from "@supabase/auth-ui-shared"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

export default function LoginPage() {
  const router = useRouter()
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
    // Check if they log in, and if so, send them back to the home page
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        router.push("/")
      }
    })

    return () => authListener.subscription.unsubscribe()
  }, [router])

  // Prevent hydration mismatch
  if (!isMounted) return null

  return (
    <main className="max-w-md mx-auto mt-20 p-8 bg-card rounded-2xl border border-border shadow-sm">
      <h1 className="text-3xl font-bold mb-2 text-center">Welcome Back</h1>
      <p className="text-muted-foreground text-center mb-8">
        Sign in to lock in your Candidates prediction.
      </p>
      
      {/* This is the pre-built Supabase Login Box */}
      <Auth
        supabaseClient={supabase}
        appearance={{ theme: ThemeSupa }}
        providers={[]} // We will stick to Email for now to keep it simple!
      />
    </main>
  )
}