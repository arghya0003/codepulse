"use client";

import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background relative overflow-hidden">
      {/* Ambient background */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 0%, hsl(210 100% 56% / 0.10) 0%, transparent 70%)",
        }}
      />
      <div
        aria-hidden
        className="absolute inset-0 bg-grid-pattern bg-[size:32px_32px] opacity-[0.03] pointer-events-none"
      />

      <div className="relative z-10">
        <SignUp
          appearance={{
            elements: {
              rootBox: "mx-auto",
              card: "bg-card border border-border shadow-2xl rounded-2xl",
              headerTitle: "text-foreground font-bold text-2xl",
              headerSubtitle: "text-muted-foreground",
              socialButtonsBlockButton:
                "border border-border bg-background hover:bg-accent text-foreground transition-colors",
              formFieldInput:
                "bg-background border-border text-foreground focus:ring-primary",
              formButtonPrimary:
                "bg-primary hover:bg-primary/90 text-primary-foreground",
              footerActionLink: "text-primary hover:text-primary/80",
            },
          }}
          signInUrl="/sign-in"
        />
      </div>
    </main>
  );
}
