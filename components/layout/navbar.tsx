"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { SignInButton, UserButton, useAuth } from "@clerk/nextjs";
import { Code2, ArrowRight, Menu, X, LayoutDashboard, Moon, Sun } from "lucide-react";
import { useState, useEffect } from "react";
import { useTheme } from "next-themes";

const LANDING_LINKS = [
  { href: "#features",     label: "Features",     external: false },
  { href: "#testimonials", label: "Testimonials", external: false },
  { href: "/contact",      label: "Contact",      external: false },
];

const BORDER_IDLE     = "linear-gradient(135deg, rgba(124,58,237,0.25) 0%, rgba(255,255,255,0.05) 45%, rgba(37,99,235,0.2) 100%)";
const BORDER_SCROLLED = "linear-gradient(135deg, rgba(124,58,237,0.55) 0%, rgba(255,255,255,0.10) 45%, rgba(37,99,235,0.45) 100%)";

function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <motion.button
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.92 }}
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      aria-label="Toggle theme"
      className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors duration-150 ${className ?? ""}`}
      style={{
        background: resolvedTheme === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
        border: resolvedTheme === "dark" ? "1px solid rgba(255,255,255,0.10)" : "1px solid rgba(0,0,0,0.10)",
        color: resolvedTheme === "dark" ? "rgba(148,163,184,1)" : "rgba(71,85,105,1)",
      }}
    >
      {mounted
        ? resolvedTheme === "dark"
          ? <Sun className="h-3.5 w-3.5" />
          : <Moon className="h-3.5 w-3.5" />
        : <Moon className="h-3.5 w-3.5" />}
    </motion.button>
  );
}

export function Navbar() {
  const pathname  = usePathname();
  const isLanding = pathname === "/";
  const { isSignedIn, isLoaded } = useAuth();
  const { resolvedTheme } = useTheme();
  const [mounted,    setMounted]    = useState(false);
  const [scrolled,   setScrolled]   = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [hovered,    setHovered]    = useState<string | null>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", h, { passive: true });
    return () => window.removeEventListener("scroll", h);
  }, []);

  const isDark = !mounted || resolvedTheme === "dark";

  // ── Landing — floating pill ──────────────────────────────────────────────────
  if (isLanding) {
    const pillBg = isDark
      ? scrolled ? "rgba(5,5,14,0.96)"    : "rgba(5,5,14,0.52)"
      : scrolled ? "rgba(255,255,255,0.97)" : "rgba(255,255,255,0.80)";

    const textMuted  = isDark ? "rgba(148,163,184,1)" : "rgba(71,85,105,1)";
    const textActive = isDark ? "rgba(255,255,255,0.92)" : "rgba(15,23,42,1)";
    const hoverBg    = isDark ? "rgba(255,255,255,0.065)" : "rgba(0,0,0,0.05)";

    return (
      <motion.div
        initial={{ y: -18, opacity: 0 }}
        animate={{ y: 0,   opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.19, 1, 0.22, 1] }}
        className="fixed top-0 left-0 right-0 z-50 flex justify-center px-4 pt-4"
      >
        <div
          className="w-full max-w-[860px] transition-all duration-500"
          style={{
            filter: scrolled
              ? "drop-shadow(0 20px 56px rgba(0,0,0,0.35)) drop-shadow(0 4px 16px rgba(124,58,237,0.12))"
              : "none",
          }}
        >
          {/* Gradient border */}
          <div
            className="rounded-[18px] p-[1px] transition-all duration-500"
            style={{ background: scrolled ? BORDER_SCROLLED : BORDER_IDLE }}
          >
            {/* Pill inner */}
            <div
              className="rounded-[17px] backdrop-blur-[20px] overflow-hidden transition-all duration-500"
              style={{
                background: pillBg,
                boxShadow: isDark
                  ? "inset 0 1px 0 rgba(255,255,255,0.07), inset 0 -1px 0 rgba(0,0,0,0.2)"
                  : "inset 0 1px 0 rgba(255,255,255,0.9),  inset 0 -1px 0 rgba(0,0,0,0.04)",
              }}
            >
              <div className="flex h-[54px] items-center px-4 gap-2">

                {/* Logo */}
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
                    <span className="absolute -top-[3px] -right-[3px] flex h-[9px] w-[9px]">
                      <span className="animate-ping absolute h-full w-full rounded-full bg-cyan-400 opacity-60" />
                      <span className="h-[9px] w-[9px] rounded-full bg-cyan-400 border-[1.5px] border-[#050510]" />
                    </span>
                  </motion.div>
                  <span className="text-[15px] font-bold tracking-[-0.01em]" style={{ color: textActive }}>
                    CodePulse
                  </span>
                  <span
                    className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-semibold tracking-wide uppercase border"
                    style={{
                      color: "rgba(167,139,250,0.9)",
                      borderColor: "rgba(124,58,237,0.3)",
                      background: "rgba(124,58,237,0.08)",
                    }}
                  >
                    Beta
                  </span>
                </Link>

                {/* Center nav */}
                <nav className="hidden md:flex flex-1 justify-center items-center gap-0.5">
                  {LANDING_LINKS.map((l) => {
                    const isPage = l.href.startsWith("/");
                    const Comp = isPage ? Link : "a";
                    return (
                      <Comp
                        key={l.href}
                        href={l.href}
                        onMouseEnter={() => setHovered(l.href)}
                        onMouseLeave={() => setHovered(null)}
                        className="relative px-4 py-[7px] text-sm rounded-xl transition-colors duration-150 select-none"
                        style={{ color: hovered === l.href ? textActive : textMuted }}
                      >
                        {hovered === l.href && (
                          <motion.span
                            layoutId="nav-bg"
                            className="absolute inset-0 rounded-xl"
                            style={{ background: hoverBg }}
                            initial={false}
                            transition={{ type: "spring", stiffness: 500, damping: 36 }}
                          />
                        )}
                        <span className="relative z-10">{l.label}</span>
                      </Comp>
                    );
                  })}
                </nav>

                {/* Right actions */}
                <div className="flex items-center gap-2 shrink-0 ml-auto md:ml-0">
                  {isLoaded && !isSignedIn && (
                    <Link href="/sign-up">
                      <motion.span
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.96 }}
                        className="inline-flex items-center gap-1.5 px-5 py-[7px] rounded-full text-sm font-semibold text-white cursor-pointer"
                        style={{ background: "#3b82f6" }}
                      >
                        Join <ArrowRight className="h-3.5 w-3.5" />
                      </motion.span>
                    </Link>
                  )}

                  {isSignedIn && (
                    <>
                      <Link href="/dashboard">
                        <motion.span
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.97 }}
                          className="hidden sm:inline-flex items-center gap-1.5 px-4 py-[7px] rounded-full text-sm font-medium cursor-pointer text-white"
                          style={{ background: "#3b82f6" }}
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
                    className="md:hidden p-2 rounded-full transition-colors duration-150"
                    style={{ color: textMuted }}
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

              {/* Mobile menu */}
              <AnimatePresence>
                {mobileOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: [0.19, 1, 0.22, 1] }}
                    className="overflow-hidden"
                    style={{ borderTop: `1px solid ${isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.06)"}` }}
                  >
                    <div className="px-4 py-3 flex flex-col gap-1">
                      {LANDING_LINKS.map((l) => {
                        const isPage = l.href.startsWith("/");
                        const Comp = isPage ? Link : "a";
                        return (
                          <Comp
                            key={l.href}
                            href={l.href}
                            onClick={() => setMobileOpen(false)}
                            className="px-3 py-2.5 rounded-xl text-sm transition-colors duration-150"
                            style={{ color: textMuted }}
                          >
                            {l.label}
                          </Comp>
                        );
                      })}
                      {isLoaded && !isSignedIn && (
                        <>
                          <SignInButton mode="modal">
                            <button
                              onClick={() => setMobileOpen(false)}
                              className="mt-1 px-3 py-2.5 rounded-xl text-sm text-left cursor-pointer"
                              style={{ color: textMuted }}
                            >
                              Sign in
                            </button>
                          </SignInButton>
                          <Link href="/sign-up" onClick={() => setMobileOpen(false)}>
                            <span className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-full text-sm font-semibold text-white cursor-pointer"
                              style={{ background: "#3b82f6" }}>
                              Join <ArrowRight className="h-3.5 w-3.5" />
                            </span>
                          </Link>
                        </>
                      )}
                      {isSignedIn && (
                        <Link href="/dashboard" onClick={() => setMobileOpen(false)}>
                          <span className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm cursor-pointer"
                            style={{ color: textMuted }}>
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
      className="fixed top-0 left-0 right-0 z-50 h-16 backdrop-blur-[18px] bg-background/90 border-b border-border"
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
              <span className="h-[9px] w-[9px] rounded-full bg-cyan-400 border-[1.5px] border-background" />
            </span>
          </div>
          <span className="text-[15px] font-bold text-foreground tracking-[-0.01em]">CodePulse</span>
        </Link>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          {isSignedIn && (
            <UserButton
              appearance={{
                elements: {
                  avatarBox: "h-8 w-8 ring-1 ring-border ring-offset-2 ring-offset-background",
                },
              }}
            />
          )}
          {isLoaded && !isSignedIn && (
            <SignInButton mode="modal">
              <button className="px-4 py-2 rounded-xl text-sm text-muted-foreground hover:text-foreground transition-colors duration-150 cursor-pointer">
                Sign in
              </button>
            </SignInButton>
          )}
        </div>
      </div>
    </motion.header>
  );
}
