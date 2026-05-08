"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Trophy,
  Users,
  Settings,
  TrendingUp,
  Code2,
  Zap,
  Coffee,
} from "lucide-react";

const GithubIcon = (props: React.ComponentProps<"svg">) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.2c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);

const navItems = [
  {
    label: "Overview",
    href: "/dashboard",
    icon: LayoutDashboard,
    id: "sidebar-overview",
  },
  {
    label: "GitHub",
    href: "/dashboard/github",
    icon: GithubIcon,
    id: "sidebar-github",
  },
  {
    label: "LeetCode",
    href: "/dashboard/leetcode",
    icon: Code2,
    id: "sidebar-leetcode",
  },
  {
    label: "Codeforces",
    href: "/dashboard/codeforces",
    icon: Trophy,
    id: "sidebar-codeforces",
  },
  {
    label: "CodeChef",
    href: "/dashboard/codechef",
    icon: Coffee,
    id: "sidebar-codechef",
  },
  {
    label: "Analytics",
    href: "/dashboard/analytics",
    icon: TrendingUp,
    id: "sidebar-analytics",
  },
  {
    label: "Friends",
    href: "/dashboard/friends",
    icon: Users,
    id: "sidebar-friends",
  },
  {
    label: "Settings",
    href: "/dashboard/settings",
    icon: Settings,
    id: "sidebar-settings",
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-16 h-[calc(100vh-4rem)] w-64 border-r border-border/50 bg-background/80 backdrop-blur-xl hidden lg:flex flex-col">
      {/* Brand accent top strip */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-brand-500 to-transparent" />

      <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1">
        {navItems.map((item, index) => {
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);

          return (
            <motion.div
              key={item.href}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{
                delay: index * 0.05,
                duration: 0.3,
                ease: [0.19, 1, 0.22, 1],
              }}
            >
              <Link
                href={item.href}
                id={item.id}
                className={cn(
                  "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                {/* Active indicator */}
                {isActive && (
                  <motion.span
                    layoutId="sidebar-active"
                    className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full bg-primary"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}

                <item.icon
                  className={cn(
                    "h-4 w-4 shrink-0 transition-colors duration-200",
                    isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                  )}
                />
                {item.label}

                {/* Hover glow on active item */}
                {isActive && (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                )}
              </Link>
            </motion.div>
          );
        })}
      </nav>

      {/* ML Badge at bottom */}
      <div className="p-4">
        <div className="rounded-lg border border-brand-500/20 bg-brand-500/5 p-3 space-y-1">
          <div className="flex items-center gap-2">
            <Zap className="h-3.5 w-3.5 text-brand-400" />
            <span className="text-xs font-semibold text-brand-400">ML Insights</span>
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Peak coding prediction powered by AI
          </p>
        </div>
      </div>
    </aside>
  );
}
