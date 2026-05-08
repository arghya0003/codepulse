"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { SignInButton, UserButton, useAuth } from "@clerk/nextjs";
import { Code2, ArrowRight, Menu, X, LayoutDashboard } from "lucide-react";
import { useState, useEffect } from "react";

const LANDING_LINKS = [
  { href: "#features",     label: "Features"     },
  { href: "#testimonials", label: "Testimonials" },
];

// ── Pill border gradient ───────────────────────────────────────────────────────
const BORDER_IDLE    = "linear-gradient(135deg, rgba(124,58,237,0.25) 0%, rgba(255,255,255,0.05) 45%, rgba(37,99,235,0.2) 100%)";
const BORDER_SCROLLED= "linear-gradient(135deg, rgba(124,58,237,0.55) 0%, rgba(255,255,255,0.10) 45%, rgba(37,99,235,0.45) 100%)";

export function Navbar() {
  const pathname  = usePathname();
  const isLanding = pathname === "/";
  const { isSignedIn, isLoaded } = useAuth();
  const [scrolled,   setScrolled]   = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [hovered,    setHovered]    = useState<string | null>(null);

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", h, { passive: true });
    return () => window.removeEventListener("scroll", h);
  }, []);

  // ── Landing — floating pill ──────────────────────────────────────────────────
  if (isLanding) {
    return (
      <motion.div
        initial={{ y: -18, opacity: 0 }}
        animate={{ y: 0,   opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.19, 1, 0.22, 1] }}
        className="fixed top-0 left-0 right-0 z-50 flex justify-center px-4 pt-4"
      >
        {/* Drop-shadow wrapper — only when scrolled */}
        <div
          className="w-full max-w-[860px] transition-all duration-500"
          style={{
            filter: scrolled
              ? "drop-shadow(0 20px 56px rgba(0,0,0,0.65)) drop-shadow(0 4px 16px rgba(124,58,237,0.12))"
              : "none",
          }}
        >
          {/* Gradient border (p-[1px] trick) */}
          <div
            className="rounded-[18px] p-[1px] transition-all duration-500"
            style={{ background: scrolled ? BORDER_SCROLLED : BORDER_IDLE }}
          >
            {/* Pill inner */}
            <div
              className="rounded-[17px] backdrop-blur-[20px] overflow-hidden transition-all duration-500"
              style={{
                background: scrolled ? "rgba(5,5,14,0.96)" : "rgba(5,5,14,0.52)",
                // Inner top highlight — the "glass lit from above" effect
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.07), inset 0 -1px 0 rgba(0,0,0,0.2)",
              }}
            >
              {/* Main bar */}
              <div className="flex h-[54px] items-center px-4 gap-2">

                {/* ── Logo ── */}
                <Link href="/" className="flex items-center gap-2.5 shrink-0 group mr-1">
                  <motion.div
                    whileHover={{ scale: 1.07, rotate: 4 }}
                    whileTap={{ scale: 0.93 }}
                    transition={{ type: "spring", stiffness: 400, damping: 20 }}
                    className="relative flex h-[30px] w-[30px] items-center justify-center rounded-[10px]"
                    style={{
                      background: "linear-gradient(135deg, #7c3aed 0%, #2563eb 100%)",
                      boxShadow: "0 2px 12px rgba(124,58,237,0.4)",
                    }}
                  >
                    <Code2 className="h-[14px] w-[14px] text-white" />
                    {/* Live dot */}
                    <span className="absolute -top-[3px] -right-[3px] flex h-[9px] w-[9px]">
                      <span className="animate-ping absolute h-full w-full rounded-full bg-cyan-400 opacity-60" />
                      <span className="h-[9px] w-[9px] rounded-full bg-cyan-400 border-[1.5px] border-[#050510]" />
                    </span>
                  </motion.div>
                  <span className="text-[15px] font-bold text-white tracking-[-0.01em]">CodePulse</span>
                  <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-semibold tracking-wide uppercase border"
                    style={{
                      color: "rgba(167,139,250,0.9)",
                      borderColor: "rgba(124,58,237,0.3)",
                      background: "rgba(124,58,237,0.08)",
                    }}>
                    Beta
                  </span>
                </Link>

                {/* ── Left separator ── */}
                <div className="hidden md:block h-5 w-px mx-2 shrink-0"
                  style={{ background: "rgba(255,255,255,0.07)" }} />

                {/* ── Center nav — flex-1 so it naturally centers ── */}
                <nav className="hidden md:flex flex-1 justify-center items-center gap-0.5">
                  {LANDING_LINKS.map((l) => (
                    <a
                      key={l.href}
                      href={l.href}
                      onMouseEnter={() => setHovered(l.href)}
                      onMouseLeave={() => setHovered(null)}
                      className="relative px-4 py-[7px] text-sm rounded-xl transition-colors duration-150 select-none"
                      style={{
                        color: hovered === l.href ? "rgba(255,255,255,0.92)" : "rgba(148,163,184,1)",
                      }}
                    >
                      {/* Sliding background pill (shared layout) */}
                      {hovered === l.href && (
                        <motion.span
                          layoutId="nav-bg"
                          className="absolute inset-0 rounded-xl"
                          style={{ background: "rgba(255,255,255,0.065)" }}
                          initial={false}
                          transition={{ type: "spring", stiffness: 500, damping: 36 }}
                        />
                      )}
                      <span className="relative z-10">{l.label}</span>
                    </a>
                  ))}
                </nav>

                {/* ── Right separator ── */}
                <div className="hidden md:block h-5 w-px mx-2 shrink-0"
                  style={{ background: "rgba(255,255,255,0.07)" }} />

                {/* ── Right actions ── */}
                <div className="flex items-center gap-1.5 shrink-0 ml-auto md:ml-0">
                  {isLoaded && !isSignedIn && (
                    <>
                      <SignInButton mode="modal">
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.97 }}
                          className="hidden sm:block px-4 py-[7px] rounded-xl text-sm cursor-pointer transition-colors duration-150"
                          style={{ color: "rgba(148,163,184,1)" }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.9)")}
                          onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(148,163,184,1)")}
                        >
                          Sign in
                        </motion.button>
                      </SignInButton>

                      <Link href="/sign-up">
                        <motion.span
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.96 }}
                          className="inline-flex items-center gap-1.5 px-4 py-[7px] rounded-xl text-sm font-semibold text-white cursor-pointer"
                          style={{
                            background: "linear-gradient(135deg, #7c3aed 0%, #2563eb 100%)",
                            boxShadow: "0 0 22px rgba(124,58,237,0.3), inset 0 1px 0 rgba(255,255,255,0.15)",
                          }}
                        >
                          Get started
                          <ArrowRight className="h-3.5 w-3.5" />
                        </motion.span>
                      </Link>
                    </>
                  )}

                  {isSignedIn && (
                    <>
                      <Link href="/dashboard">
                        <motion.span
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.97 }}
                          className="hidden sm:inline-flex items-center gap-1.5 px-4 py-[7px] rounded-xl text-sm cursor-pointer transition-colors duration-150"
                          style={{ color: "rgba(148,163,184,1)" }}
                        >
                          <LayoutDashboard className="h-3.5 w-3.5" />
                          Dashboard
                        </motion.span>
                      </Link>
                      <UserButton
                        appearance={{
                          elements: {
                            avatarBox: "h-7 w-7 ring-1 ring-white/15 ring-offset-[1.5px] ring-offset-[#050510]",
                          },
                        }}
                      />
                    </>
                  )}

                  {/* Mobile toggle */}
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setMobileOpen((v) => !v)}
                    className="md:hidden p-2 rounded-xl transition-colors duration-150"
                    style={{ color: "rgba(100,116,139,1)" }}
                  >
                    <AnimatePresence mode="wait" initial={false}>
                      <motion.span
                        key={mobileOpen ? "x" : "menu"}
                        initial={{ rotate: -90, opacity: 0 }}
                        animate={{ rotate: 0,   opacity: 1 }}
                        exit={{ rotate: 90,    opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="flex"
                      >
                        {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
                      </motion.span>
                    </AnimatePresence>
                  </motion.button>
                </div>
              </div>

              {/* ── Mobile menu ── */}
              <AnimatePresence>
                {mobileOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: [0.19, 1, 0.22, 1] }}
                    className="overflow-hidden"
                    style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
                  >
                    <div className="px-4 py-3 flex flex-col gap-1">
                      {LANDING_LINKS.map((l) => (
                        <a
                          key={l.href}
                          href={l.href}
                          onClick={() => setMobileOpen(false)}
                          className="px-3 py-2.5 rounded-xl text-sm transition-colors duration-150"
                          style={{ color: "rgba(148,163,184,1)" }}
                        >
                          {l.label}
                        </a>
                      ))}
                      {isLoaded && !isSignedIn && (
                        <>
                          <SignInButton mode="modal">
                            <button
                              onClick={() => setMobileOpen(false)}
                              className="mt-1 px-3 py-2.5 rounded-xl text-sm text-left cursor-pointer transition-colors duration-150"
                              style={{ color: "rgba(148,163,184,1)" }}
                            >
                              Sign in
                            </button>
                          </SignInButton>
                          <Link href="/sign-up" onClick={() => setMobileOpen(false)}>
                            <span className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-semibold text-white cursor-pointer"
                              style={{ background: "linear-gradient(135deg, #7c3aed, #2563eb)" }}>
                              Get started <ArrowRight className="h-3.5 w-3.5" />
                            </span>
                          </Link>
                        </>
                      )}
                      {isSignedIn && (
                        <Link href="/dashboard" onClick={() => setMobileOpen(false)}>
                          <span className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm cursor-pointer"
                            style={{ color: "rgba(148,163,184,1)" }}>
                            <LayoutDashboard className="h-3.5 w-3.5" />
                            Dashboard
                          </span>
                        </Link>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  // ── Dashboard — full-width bar ───────────────────────────────────────────────
  return (
    <motion.header
      initial={{ y: -12, opacity: 0 }}
      animate={{ y: 0,   opacity: 1 }}
      transition={{ duration: 0.4, ease: [0.19, 1, 0.22, 1] }}
      className="fixed top-0 left-0 right-0 z-50 h-16 backdrop-blur-[18px]"
      style={{
        background: "rgba(5,5,14,0.9)",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
        boxShadow: "0 1px 0 rgba(255,255,255,0.025), 0 4px 24px rgba(0,0,0,0.3)",
      }}
    >
      <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <div
            className="relative flex h-[30px] w-[30px] items-center justify-center rounded-[10px]"
            style={{
              background: "linear-gradient(135deg, #7c3aed 0%, #2563eb 100%)",
              boxShadow: "0 2px 10px rgba(124,58,237,0.35)",
            }}
          >
            <Code2 className="h-[14px] w-[14px] text-white" />
            <span className="absolute -top-[3px] -right-[3px] flex h-[9px] w-[9px]">
              <span className="animate-ping absolute h-full w-full rounded-full bg-cyan-400 opacity-60" />
              <span className="h-[9px] w-[9px] rounded-full bg-cyan-400 border-[1.5px] border-[#050510]" />
            </span>
          </div>
          <span className="text-[15px] font-bold text-white tracking-[-0.01em]">CodePulse</span>
        </Link>

        <div className="flex items-center gap-3">
          {isSignedIn && (
            <UserButton
              appearance={{
                elements: {
                  avatarBox: "h-8 w-8 ring-1 ring-white/15 ring-offset-2 ring-offset-[#050510]",
                },
              }}
            />
          )}
          {isLoaded && !isSignedIn && (
            <SignInButton mode="modal">
              <button className="px-4 py-2 rounded-xl text-sm transition-colors duration-150 cursor-pointer"
                style={{ color: "rgba(148,163,184,1)" }}>
                Sign in
              </button>
            </SignInButton>
          )}
        </div>
      </div>
    </motion.header>
  );
}
