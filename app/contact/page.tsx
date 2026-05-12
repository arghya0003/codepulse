"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { contactSchema, type ContactInput } from "@/lib/contact-schema";
import { submitContact } from "@/actions/contact";
import { Code2, Mail, Bug, Star, MessageSquare, AlertTriangle, CheckCircle2, ArrowLeft } from "lucide-react";

const TYPES = [
  { value: "feedback",   label: "Feedback",    Icon: Star,           desc: "Share what you love",        color: "#a78bfa" },
  { value: "experience", label: "Experience",  Icon: MessageSquare,  desc: "Tell us your story",          color: "#60a5fa" },
  { value: "bug",        label: "Bug Report",  Icon: Bug,            desc: "Something isn't working",     color: "#f87171" },
  { value: "flaw",       label: "Flaw",        Icon: AlertTriangle,  desc: "Design or UX issue",          color: "#fb923c" },
] as const;

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.19, 1, 0.22, 1] as const } },
};

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<ContactInput>({
    resolver: zodResolver(contactSchema),
    defaultValues: { type: "feedback" },
  });

  const selectedType = watch("type");

  async function onSubmit(data: ContactInput) {
    setServerError(null);
    const res = await submitContact(data);
    if (res.success) setSubmitted(true);
    else setServerError(res.error ?? "Something went wrong.");
  }

  return (
    <div className="dark">
      <Navbar />
      <div className="min-h-screen relative overflow-x-hidden" style={{ background: "#06060f" }}>

        {/* Background glow */}
        <div aria-hidden className="fixed inset-0 pointer-events-none -z-10" style={{
          background: "radial-gradient(ellipse 70% 45% at 50% 0%, hsl(265 89% 58% / 0.12) 0%, transparent 65%)",
        }} />

        <div className="max-w-2xl mx-auto px-4 pt-28 pb-20">

          {/* Back link */}
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-300 transition-colors mb-8">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to home
          </Link>

          {submitted ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-20 space-y-4"
            >
              <div className="flex justify-center">
                <div className="h-16 w-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                  <CheckCircle2 className="h-8 w-8 text-emerald-400" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-white">Message sent!</h2>
              <p className="text-slate-400 max-w-sm mx-auto">
                {selectedType === "feedback"
                  ? "Thanks! Your feedback will appear in our testimonials shortly."
                  : "Thanks for reaching out. We'll look into it soon."}
              </p>
              <Link href="/"
                className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 rounded-full text-sm font-semibold text-white"
                style={{ background: "#3b82f6" }}>
                <ArrowLeft className="h-3.5 w-3.5" /> Go home
              </Link>
            </motion.div>
          ) : (
            <motion.div variants={fadeUp} initial="hidden" animate="show" className="space-y-8">

              {/* Header */}
              <div className="space-y-2">
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="h-9 w-9 rounded-xl flex items-center justify-center"
                    style={{ background: "linear-gradient(135deg, #7c3aed, #2563eb)", boxShadow: "0 2px 12px rgba(124,58,237,0.4)" }}>
                    <Mail className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-sm text-slate-500 font-mono">arghyabhatt2003@gmail.com</span>
                </div>
                <h1 className="text-3xl font-bold text-white tracking-tight">Get in touch</h1>
                <p className="text-slate-400">Bug report, feedback, or just want to say hi — we read everything.</p>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

                {/* Type selector */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {TYPES.map(({ value, label, Icon, desc, color }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setValue("type", value)}
                      className="relative rounded-xl p-3.5 border text-left transition-all duration-150"
                      style={{
                        background:   selectedType === value ? `${color}12` : "rgba(255,255,255,0.03)",
                        borderColor:  selectedType === value ? `${color}50` : "rgba(255,255,255,0.07)",
                      }}
                    >
                      <Icon className="h-4 w-4 mb-2" style={{ color }} />
                      <p className="text-xs font-semibold text-white">{label}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">{desc}</p>
                      {selectedType === value && (
                        <div className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full" style={{ background: color }} />
                      )}
                    </button>
                  ))}
                </div>

                {/* Name + Email */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-400">Name *</label>
                    <input
                      {...register("name")}
                      placeholder="Aryan Mehta"
                      className="w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder-slate-600 outline-none transition-colors"
                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                      onFocus={e => e.currentTarget.style.borderColor = "rgba(124,58,237,0.5)"}
                      onBlur={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"}
                    />
                    {errors.name && <p className="text-[11px] text-red-400">{errors.name.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-400">Email *</label>
                    <input
                      {...register("email")}
                      type="email"
                      placeholder="you@example.com"
                      className="w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder-slate-600 outline-none transition-colors"
                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                      onFocus={e => e.currentTarget.style.borderColor = "rgba(124,58,237,0.5)"}
                      onBlur={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"}
                    />
                    {errors.email && <p className="text-[11px] text-red-400">{errors.email.message}</p>}
                  </div>
                </div>

                {/* Role (optional, shown for feedback/experience) */}
                {(selectedType === "feedback" || selectedType === "experience") && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-400">
                      Your role <span className="text-slate-600">(optional — shown with testimonial)</span>
                    </label>
                    <input
                      {...register("role")}
                      placeholder="e.g. SDE-2 @ Google, CS @ IIT Bombay"
                      className="w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder-slate-600 outline-none transition-colors"
                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                      onFocus={e => e.currentTarget.style.borderColor = "rgba(124,58,237,0.5)"}
                      onBlur={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"}
                    />
                  </div>
                )}

                {/* Message */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-400">Message *</label>
                  <textarea
                    {...register("message")}
                    rows={5}
                    placeholder={
                      selectedType === "bug"        ? "Describe the bug — what happened, what you expected, and steps to reproduce..." :
                      selectedType === "flaw"       ? "Describe the design or UX issue you noticed..." :
                      selectedType === "experience" ? "Tell us about your experience using CodePulse..." :
                      "Share what you love or what could be better..."
                    }
                    className="w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder-slate-600 outline-none transition-colors resize-none"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                    onFocus={e => e.currentTarget.style.borderColor = "rgba(124,58,237,0.5)"}
                    onBlur={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"}
                  />
                  {errors.message && <p className="text-[11px] text-red-400">{errors.message.message}</p>}
                </div>

                {serverError && (
                  <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">{serverError}</p>
                )}

                {selectedType === "feedback" && (
                  <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
                    <Star className="h-3 w-3 text-violet-400" />
                    Your feedback will be displayed in the testimonials section on the home page.
                  </p>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 rounded-full text-sm font-semibold text-white transition-opacity disabled:opacity-60 cursor-pointer"
                  style={{ background: "linear-gradient(135deg, #7c3aed, #2563eb)" }}
                >
                  {isSubmitting ? "Sending…" : "Send message"}
                </button>
              </form>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
