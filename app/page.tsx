"use client";

import Link from "next/link";
import { motion, useInView } from "framer-motion";
import { useRef, useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/layout/navbar";
import {
  Code2, Trophy, ArrowRight, GitCommit, Flame, Brain,
  Target, Activity, Sparkles, Star, ChevronRight,
} from "lucide-react";

// ── GitHub icon ────────────────────────────────────────────────────────────────
const GithubIcon = (props: React.ComponentProps<"svg">) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.2c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);

// ── Animation variants ─────────────────────────────────────────────────────────
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.65, ease: [0.19, 1, 0.22, 1] as const } },
};
const stagger = { show: { transition: { staggerChildren: 0.1 } } };

// ── Seeded random — no hydration mismatch ──────────────────────────────────────
function seededRand(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 4294967295;
  };
}

// ── Mini heatmap (deterministic) ───────────────────────────────────────────────
function MiniHeatmap({ cols = 16, rows = 7, seed = 42 }: { cols?: number; rows?: number; seed?: number }) {
  const rand = seededRand(seed);
  const cells = Array.from({ length: cols * rows }, () => {
    const v = rand();
    return v > 0.88 ? 0.95 : v > 0.65 ? 0.6 : v > 0.4 ? 0.3 : v > 0.15 ? 0.12 : 0.03;
  });
  return (
    <div className="flex gap-[3px]">
      {Array.from({ length: cols }).map((_, c) => (
        <div key={c} className="flex flex-col gap-[3px]">
          {Array.from({ length: rows }).map((_, r) => (
            <div
              key={r}
              className="h-[9px] w-[9px] rounded-[2px]"
              style={{ background: `hsl(265 89% 62% / ${cells[c * rows + r]})` }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

// ── Animated counter ───────────────────────────────────────────────────────────
function Counter({ to, suffix = "" }: { to: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!inView) return;
    let v = 0;
    const step = to / 50;
    const id = setInterval(() => {
      v += step;
      if (v >= to) { setVal(to); clearInterval(id); }
      else setVal(Math.floor(v));
    }, 20);
    return () => clearInterval(id);
  }, [inView, to]);
  return <span ref={ref}>{val.toLocaleString()}{suffix}</span>;
}

// ── Platform marquee ───────────────────────────────────────────────────────────
const PLATFORMS = [
  { name: "GitHub",       Icon: GithubIcon, color: "#e2e8f0" },
  { name: "LeetCode",     Icon: Code2,      color: "#fbbf24" },
  { name: "Codeforces",   Icon: Trophy,     color: "#f87171" },
  { name: "CodeChef",     Icon: Star,       color: "#fb923c" },
];

function Marquee() {
  const items = [...PLATFORMS, ...PLATFORMS, ...PLATFORMS];
  return (
    <div className="relative overflow-hidden">
      <div className="absolute inset-y-0 left-0 w-20 z-10 pointer-events-none"
        style={{ background: "linear-gradient(90deg, #06060f, transparent)" }} />
      <div className="absolute inset-y-0 right-0 w-20 z-10 pointer-events-none"
        style={{ background: "linear-gradient(-90deg, #06060f, transparent)" }} />
      <motion.div
        className="flex gap-10 w-max py-1"
        animate={{ x: ["0%", "-33.33%"] }}
        transition={{ duration: 24, ease: "linear", repeat: Infinity }}
      >
        {items.map((p, i) => (
          <div key={i} className="flex items-center gap-2.5 shrink-0">
            <p.Icon className="h-4 w-4" style={{ color: p.color, opacity: 0.75 }} />
            <span className="text-sm text-slate-500 font-medium">{p.name}</span>
          </div>
        ))}
      </motion.div>
    </div>
  );
}

// ── Product preview card ───────────────────────────────────────────────────────
function ProductPreview() {
  return (
    <div className="relative">
      {/* Ambient glow behind card */}
      <div className="absolute -inset-12 pointer-events-none"
        style={{ background: "radial-gradient(ellipse 60% 50% at 50% 50%, hsl(265 89% 58% / 0.1), transparent 70%)" }} />

      <div className="relative rounded-2xl overflow-hidden border border-white/[0.09]"
        style={{ boxShadow: "0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)" }}>
        {/* Browser bar */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06]"
          style={{ background: "#0c0c1e" }}>
          <div className="flex gap-1.5 shrink-0">
            <div className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
            <div className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
            <div className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
          </div>
          <div className="flex-1 flex justify-center">
            <div className="flex items-center gap-1.5 px-3 h-6 rounded-md bg-white/[0.05] text-[10px] text-slate-600 font-mono">
              🔒 codepulse.app/dashboard
            </div>
          </div>
        </div>

        {/* App content */}
        <div className="p-5 space-y-3" style={{ background: "#080814" }}>
          {/* Stats row */}
          <div className="grid grid-cols-4 gap-2.5">
            {[
              { l: "Streak",    v: "47d",   c: "#fb923c", I: Flame     },
              { l: "LC Solved", v: "412",   c: "#a78bfa", I: Code2     },
              { l: "CF Rating", v: "1,892", c: "#f87171", I: Trophy    },
              { l: "Commits",   v: "2.8K",  c: "#4ade80", I: GitCommit },
            ].map((s) => (
              <div key={s.l} className="rounded-xl p-3 border border-white/[0.06]"
                style={{ background: "#0e0e22" }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[9px] text-slate-600 uppercase tracking-wide">{s.l}</span>
                  <s.I className="h-3 w-3" style={{ color: s.c }} />
                </div>
                <p className="text-sm font-bold" style={{ color: s.c }}>{s.v}</p>
              </div>
            ))}
          </div>

          {/* Heatmap */}
          <div className="rounded-xl p-3.5 border border-white/[0.06]" style={{ background: "#0e0e22" }}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] text-slate-500 font-medium">Unified Activity · All platforms</span>
              <span className="text-[9px] text-emerald-400 flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" /> Live
              </span>
            </div>
            <MiniHeatmap cols={22} rows={7} seed={97531} />
          </div>

          {/* ML cards row */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="rounded-xl p-3.5 border border-white/[0.06]" style={{ background: "#0e0e22" }}>
              <div className="flex items-center gap-1.5 mb-2.5">
                <Brain className="h-3 w-3 text-violet-400" />
                <span className="text-[9px] text-slate-600 uppercase tracking-wide">Peak time</span>
              </div>
              <p className="text-2xl font-bold text-white leading-none">21:00</p>
              <p className="text-[10px] text-violet-300/60 mt-1">Tuesday · 84% confidence</p>
              <span className="inline-block mt-2 text-[9px] px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-300 border border-violet-500/20">
                Evening Coder
              </span>
            </div>
            <div className="rounded-xl p-3.5 border border-white/[0.06]" style={{ background: "#0e0e22" }}>
              <div className="flex items-center gap-1.5 mb-2.5">
                <Target className="h-3 w-3 text-amber-400" />
                <span className="text-[9px] text-slate-600 uppercase tracking-wide">Contest ready</span>
              </div>
              <div className="flex items-end gap-1.5">
                <p className="text-2xl font-bold text-white leading-none">78</p>
                <p className="text-xs text-slate-600 pb-0.5">/100</p>
              </div>
              <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ background: "#1a1a30" }}>
                <div className="h-full rounded-full bg-gradient-to-r from-amber-600 to-amber-400" style={{ width: "78%" }} />
              </div>
              <p className="text-[9px] text-amber-400/70 mt-1.5">Contest Ready</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Feature data ───────────────────────────────────────────────────────────────
const FEATURES = [
  {
    Icon: Brain,
    label: "Machine Learning",
    title: "Know exactly when to code.",
    desc: "An XGBoost model trained exclusively on your personal history — not generic patterns. It learns your rhythm, predicts your peak hours with 7×24 probability grids, scores contest readiness across 5 dimensions, and estimates the odds your streak survives each day of the week.",
    color: "#a78bfa",
    visual: (
      <div className="rounded-xl p-5 border border-white/[0.07] space-y-4" style={{ background: "#0e0e22" }}>
        <div className="flex items-end justify-between">
          <div>
            <p className="text-4xl font-bold text-white leading-none">21:00</p>
            <p className="text-xs text-violet-300/60 mt-1.5">Tuesday · your peak hour</p>
          </div>
          <div className="relative h-14 w-14 shrink-0">
            <svg className="h-14 w-14 -rotate-90" viewBox="0 0 56 56">
              <circle cx="28" cy="28" r="22" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="4" />
              <circle cx="28" cy="28" r="22" fill="none" stroke="#a78bfa" strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 22}`}
                strokeDashoffset={`${2 * Math.PI * 22 * (1 - 0.84)}`} />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-violet-300">84%</span>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {["Evening Coder", "Consistent Grinder"].map((t) => (
            <span key={t} className="text-[10px] px-2.5 py-1 rounded-full bg-violet-500/10 text-violet-300 border border-violet-500/20">{t}</span>
          ))}
        </div>
        <div className="flex items-end gap-0.5 h-10">
          {[0.1,0.12,0.1,0.11,0.16,0.22,0.28,0.38,0.32,0.28,0.45,0.58,0.42,0.32,0.38,0.5,0.62,0.72,0.88,1,0.82,0.68,0.48,0.28].map((h, i) => (
            <div key={i} className="flex-1 rounded-sm transition-all"
              style={{ height: `${h * 100}%`, background: `hsl(265 89% 62% / ${h * 0.7 + 0.2})` }} />
          ))}
        </div>
        <p className="text-[10px] text-slate-600">Hourly probability · this week</p>
      </div>
    ),
  },
  {
    Icon: Activity,
    label: "Unified Dashboard",
    title: "One graph. Every platform.",
    desc: "Stop switching tabs. CodePulse merges GitHub commits, LeetCode submissions, Codeforces rounds, and CodeChef contests into a single contribution heatmap — color-coded by source, filterable by date range.",
    color: "#60a5fa",
    visual: (
      <div className="rounded-xl p-5 border border-white/[0.07] space-y-4" style={{ background: "#0e0e22" }}>
        <MiniHeatmap cols={21} rows={7} seed={55123} />
        <div className="grid grid-cols-5 gap-2">
          {[
            { name: "GitHub",   color: "#e2e8f0", pct: 55 },
            { name: "LeetCode", color: "#fbbf24", pct: 25 },
            { name: "CF",       color: "#f87171", pct: 10 },
            { name: "CC",       color: "#fb923c", pct: 6  },
          ].map((p) => (
            <div key={p.name} className="space-y-1">
              <div className="flex justify-between text-[9px]">
                <span className="text-slate-500">{p.name}</span>
                <span style={{ color: p.color }}>{p.pct}%</span>
              </div>
              <div className="h-1 rounded-full overflow-hidden" style={{ background: "#1a1a30" }}>
                <div className="h-full rounded-full" style={{ width: `${p.pct}%`, background: p.color }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    Icon: Target,
    label: "Smart Analysis",
    title: "Find the gaps before contests do.",
    desc: "Scans your entire LeetCode history across 20+ DSA topics. Flags the ones you've never touched, highlights patterns you've under-practiced, and surfaces exactly what to study next. No more guessing.",
    color: "#fb923c",
    visual: (
      <div className="rounded-xl p-5 border border-white/[0.07] space-y-2.5" style={{ background: "#0e0e22" }}>
        {[
          { name: "Dynamic Programming", pct: 38, color: "#fb923c" },
          { name: "Trees & Graphs",      pct: 72, color: "#4ade80" },
          { name: "Segment Trees",       pct: 5,  color: "#ef4444" },
          { name: "Sliding Window",      pct: 61, color: "#fbbf24" },
          { name: "Binary Search",       pct: 89, color: "#4ade80" },
        ].map((r) => (
          <div key={r.name} className="space-y-1">
            <div className="flex justify-between text-[10px]">
              <span className="text-slate-400">{r.name}</span>
              <span style={{ color: r.color }}>{r.pct}%</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "#1a1a30" }}>
              <motion.div
                initial={{ width: 0 }}
                whileInView={{ width: `${r.pct}%` }}
                viewport={{ once: true }}
                transition={{ duration: 1.1, ease: [0.19, 1, 0.22, 1] }}
                className="h-full rounded-full"
                style={{ background: r.color + "bb" }}
              />
            </div>
          </div>
        ))}
        <p className="text-[10px] text-orange-400/70 flex items-center gap-1.5 pt-1.5 border-t border-white/[0.05]">
          <span className="h-1.5 w-1.5 rounded-full bg-orange-400 shrink-0" />
          Focus on Segment Trees — 0 problems attempted
        </p>
      </div>
    ),
  },
];

// ── Testimonials ───────────────────────────────────────────────────────────────
const AVATAR_COLORS = ["#a78bfa", "#60a5fa", "#4ade80", "#fb923c", "#f87171", "#38bdf8", "#e879f9"];

const STATIC_TESTIMONIALS = [
  {
    quote: "Finally one place for my LeetCode streak and GitHub commits. The peak time prediction is scarily accurate — it knew I code best at 10pm before I did.",
    name: "Aryan Mehta", role: "SDE-2 @ Flipkart", color: "#a78bfa",
  },
  {
    quote: "Contest readiness score kept me accountable for 3 weeks straight before an ICPC qualifier. It quantified what I felt intuitively. Got through regionals.",
    name: "Priya Sharma", role: "CS @ IIT Bombay", color: "#60a5fa",
  },
  {
    quote: "Weak topic detection found I had zero segment tree problems in 6 months of LeetCode. Fixed that in two weeks. +200 rating on Codeforces.",
    name: "Rohan Das", role: "Competitive Programmer", color: "#4ade80",
  },
];

// ── Page ───────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const [dynamicTestimonials, setDynamicTestimonials] = useState<
    Array<{ id: string; name: string; role: string | null; message: string }>
  >([]);

  useEffect(() => {
    fetch("/api/testimonials")
      .then((r) => r.ok ? r.json() : { data: [] })
      .then((json) => setDynamicTestimonials(json.data ?? []))
      .catch(() => {});
  }, []);

  const allTestimonials = [
    ...STATIC_TESTIMONIALS,
    ...dynamicTestimonials.map((t, i) => ({
      quote: t.message,
      name:  t.name,
      role:  t.role ?? "CodePulse User",
      color: AVATAR_COLORS[(STATIC_TESTIMONIALS.length + i) % AVATAR_COLORS.length],
    })),
  ];

  return (
    <div className="dark">
      <Navbar />
      <div className="relative min-h-screen overflow-x-hidden" style={{ background: "#06060f" }}>

        {/* Background glows */}
        <div aria-hidden className="fixed inset-0 pointer-events-none -z-10" style={{
          background: [
            "radial-gradient(ellipse 80% 45% at 50% -5%, hsl(265 89% 58% / 0.14) 0%, transparent 65%)",
            "radial-gradient(ellipse 40% 35% at 85% 75%, hsl(210 100% 56% / 0.07) 0%, transparent 60%)",
          ].join(","),
        }} />
        {/* Subtle grid */}
        <div aria-hidden className="fixed inset-0 pointer-events-none -z-10" style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.025) 1px,transparent 1px)",
          backgroundSize: "64px 64px",
          maskImage: "radial-gradient(ellipse 100% 80% at 50% 30%, black 10%, transparent 100%)",
        }} />

        {/* ══════════════════════════
            HERO
            ══════════════════════════ */}
        <section className="relative pt-24 pb-8 px-4 sm:px-6 lg:px-8">
          <motion.div
            className="mx-auto max-w-5xl text-center"
            variants={stagger} initial="hidden" animate="show"
          >
            {/* Eyebrow badge */}
            <motion.div variants={fadeUp} className="flex justify-center mb-6">
              <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-violet-500/25 bg-violet-500/[0.06] text-sm text-violet-300 font-medium tracking-wide">
                <Sparkles className="h-3.5 w-3.5 text-violet-400 shrink-0" />
                5 platforms · XGBoost ML predictions
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              variants={fadeUp}
              className="text-5xl sm:text-6xl lg:text-[4.5rem] font-extrabold tracking-tight leading-[1.07] mb-5"
            >
              <span className="text-white">Your competitive edge</span>
              <br />
              <span style={{
                backgroundImage: "linear-gradient(130deg, #c084fc 0%, #818cf8 40%, #38bdf8 85%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}>
                starts with data.
              </span>
            </motion.h1>

            {/* Subheading */}
            <motion.p
              variants={fadeUp}
              className="text-lg text-slate-400 max-w-xl mx-auto leading-relaxed mb-9"
            >
              Track GitHub, LeetCode, Codeforces & CodeChef in one place.
              ML models predict your peak hours, contest readiness, and surface weak spots automatically.
            </motion.p>

            {/* CTAs */}
            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-7">
              <Link href="/sign-up">
                <Button variant="gradient" size="xl" className="gap-2 min-w-[160px]">
                  Start for free
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/sign-in">
                <Button variant="glass" size="xl" className="gap-2 min-w-[140px]">
                  Sign in
                </Button>
              </Link>
            </motion.div>

            {/* Social proof */}
            <motion.div variants={fadeUp} className="flex items-center justify-center gap-3 mb-16">
              <div className="flex -space-x-2.5">
                {(["#a78bfa", "#60a5fa", "#fb923c", "#4ade80", "#f87171"] as const).map((c, i) => (
                  <div key={i}
                    className="h-7 w-7 rounded-full border-2 flex items-center justify-center text-[9px] font-bold select-none"
                    style={{ background: c + "28", color: c, borderColor: "#06060f" }}>
                    {["A","P","R","K","S"][i]}
                  </div>
                ))}
              </div>
              <p className="text-sm text-slate-500">
                <span className="text-slate-200 font-semibold">2,400+</span> developers tracking their pulse
              </p>
            </motion.div>

            {/* Product preview */}
            <motion.div variants={fadeUp}>
              <ProductPreview />
            </motion.div>
          </motion.div>
        </section>

        {/* ══════════════════════════
            PLATFORMS MARQUEE
            ══════════════════════════ */}
        <section className="py-14 border-y border-white/[0.05]">
          <p className="text-center text-[10px] uppercase tracking-[0.18em] text-slate-600 font-semibold mb-6">
            Syncs with your favourite platforms
          </p>
          <Marquee />
        </section>

        {/* ══════════════════════════
            FEATURES
            ══════════════════════════ */}
        <section id="features" className="py-28 px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            {/* Section header */}
            <motion.div
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ duration: 0.65 }}
              className="text-center mb-20 space-y-4"
            >
              <p className="text-[11px] uppercase tracking-[0.2em] text-violet-400 font-semibold">Features</p>
              <h2 className="text-4xl sm:text-5xl font-bold text-white tracking-tight leading-tight">
                Everything you need<br />to level up.
              </h2>
              <p className="text-slate-400 max-w-lg mx-auto text-lg">
                Not just a tracker. A personal analytics engine.
              </p>
            </motion.div>

            {/* Feature cards — alternating layout */}
            <div className="space-y-6">
              {FEATURES.map((f, i) => (
                <motion.div
                  key={f.title}
                  initial={{ opacity: 0, y: 36 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.7, ease: [0.19, 1, 0.22, 1] }}
                  className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center rounded-2xl border border-white/[0.07] p-8 lg:p-12 transition-colors hover:border-white/[0.11]"
                  style={{ background: "rgba(14,14,34,0.5)" }}
                >
                  {/* Text */}
                  <div className={`space-y-5 ${i % 2 === 1 ? "lg:order-2" : ""}`}>
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl shrink-0"
                        style={{ background: f.color + "18", color: f.color }}>
                        <f.Icon className="h-5 w-5" />
                      </div>
                      <span className="text-xs uppercase tracking-[0.16em] font-semibold"
                        style={{ color: f.color + "cc" }}>
                        {f.label}
                      </span>
                    </div>
                    <h3 className="text-2xl sm:text-3xl font-bold text-white leading-snug">{f.title}</h3>
                    <p className="text-slate-400 leading-relaxed">{f.desc}</p>
                  </div>

                  {/* Visual */}
                  <div className={i % 2 === 1 ? "lg:order-1" : ""}>
                    {f.visual}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════════
            STATS
            ══════════════════════════ */}
        <section className="py-16 px-4 sm:px-6 lg:px-8 border-y border-white/[0.05]">
          <motion.div
            className="mx-auto max-w-4xl grid grid-cols-2 lg:grid-cols-4 gap-10"
            variants={stagger} initial="hidden" whileInView="show"
            viewport={{ once: true, margin: "-40px" }}
          >
            {[
              { n: 5,   s: "",  label: "Platforms",         sub: "All major CP platforms" },
              { n: 8,   s: "+", label: "ML Predictions",    sub: "Peak, readiness & more"  },
              { n: 168, s: "",  label: "Hourly data points", sub: "Per-request trained model" },
              { n: 100, s: "%", label: "Real-time sync",    sub: "Always fresh data"        },
            ].map((s) => (
              <motion.div key={s.label} variants={fadeUp} className="text-center space-y-2">
                <p className="text-4xl lg:text-5xl font-extrabold text-white tabular-nums">
                  <Counter to={s.n} suffix={s.s} />
                </p>
                <p className="text-sm font-semibold text-slate-200">{s.label}</p>
                <p className="text-xs text-slate-600">{s.sub}</p>
              </motion.div>
            ))}
          </motion.div>
        </section>

        {/* ══════════════════════════
            TESTIMONIALS
            ══════════════════════════ */}
        <section id="testimonials" className="py-28 px-4 sm:px-6 lg:px-8">
          <motion.div
            className="mx-auto max-w-5xl"
            variants={stagger} initial="hidden" whileInView="show"
            viewport={{ once: true, margin: "-60px" }}
          >
            <motion.div variants={fadeUp} className="text-center mb-16 space-y-3">
              <p className="text-[11px] uppercase tracking-[0.2em] text-violet-400 font-semibold">Testimonials</p>
              <h2 className="text-4xl font-bold text-white tracking-tight">
                Trusted by competitive programmers.
              </h2>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {allTestimonials.map((t, i) => (
                <motion.div
                  key={i}
                  variants={fadeUp}
                  className="relative rounded-2xl border border-white/[0.07] p-7 flex flex-col gap-5 transition-colors hover:border-white/[0.12] group"
                  style={{ background: "rgba(14,14,34,0.5)" }}
                >
                  {/* Top accent */}
                  <div className="absolute top-0 left-8 right-8 h-px rounded-b-full"
                    style={{ background: `linear-gradient(90deg, transparent, ${t.color}55, transparent)` }} />

                  {/* Stars */}
                  <div className="flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <Star key={j} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    ))}
                  </div>

                  <p className="text-slate-300 leading-relaxed text-[15px] flex-1">"{t.quote}"</p>

                  <div className="flex items-center gap-3 pt-4 border-t border-white/[0.06]">
                    <div className="h-9 w-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                      style={{ background: t.color + "18", color: t.color }}>
                      {t.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white leading-tight">{t.name}</p>
                      <p className="text-xs text-slate-600 mt-0.5">{t.role}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </section>

        {/* ══════════════════════════
            CTA
            ══════════════════════════ */}
        <section className="py-24 px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.7, ease: [0.19, 1, 0.22, 1] }}
            className="mx-auto max-w-2xl text-center space-y-6"
          >
            <p className="text-[11px] uppercase tracking-[0.2em] text-violet-400 font-semibold">Get started</p>
            <h2 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
              Ready to track your{" "}
              <span style={{
                backgroundImage: "linear-gradient(130deg, #c084fc 0%, #818cf8 50%, #38bdf8 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}>
                pulse?
              </span>
            </h2>
            <p className="text-slate-400 text-lg">
              No credit card required. Free forever core tier. Ready in 2 minutes.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Link href="/sign-up">
                <Button variant="gradient" size="xl" className="gap-2 min-w-[180px]">
                  Get started free
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/sign-in">
                <Button variant="ghost" size="xl" className="gap-2 text-slate-500 hover:text-white">
                  Already have an account
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </motion.div>
        </section>

        {/* ══════════════════════════
            FOOTER
            ══════════════════════════ */}
        <footer className="border-t border-white/[0.06] py-10 px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-violet-500/20"
                style={{ background: "rgba(139,92,246,0.1)" }}>
                <Code2 className="h-3.5 w-3.5 text-violet-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-white leading-none">CodePulse</p>
                <p className="text-xs text-slate-600 mt-0.5">Your coding journey, unified.</p>
              </div>
            </div>
            <div className="flex items-center gap-7 text-sm text-slate-600">
              <Link href="#features" className="hover:text-white transition-colors duration-200">Features</Link>
              <Link href="/sign-in"  className="hover:text-white transition-colors duration-200">Sign in</Link>
              <Link href="/sign-up"  className="hover:text-white transition-colors duration-200">Sign up</Link>
            </div>
            <p className="text-xs text-slate-700">© {new Date().getFullYear()} CodePulse.</p>
          </div>
        </footer>

      </div>
    </div>
  );
}
