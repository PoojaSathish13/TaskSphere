"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { PublicNavbar } from "@/shared/components/layout/PublicNavbar";
import { PublicFooter } from "@/shared/components/layout/PublicFooter";
import { Check, ArrowRight } from "lucide-react";

export default function PricingPage() {
  const [hasMounted, setHasMounted] = useState(false);
  const [isAnnual, setIsAnnual] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!hasMounted) {
    return null;
  }

  const plans = [
    {
      name: "Developer Starter",
      desc: "For individual contractors and developers seeking daily focus and planner workflows.",
      priceMonthly: 0,
      priceAnnual: 0,
      features: [
        "Single Workspace context",
        "Unlimited Task creation",
        "Personal Daily Planner timeblocks",
        "Personal Focus Mode timer logs",
        "Standard theme customization"
      ],
      cta: "Start Free",
      href: "/auth/register",
      popular: false
    },
    {
      name: "SaaS Pro",
      desc: "For growing collaborative engineering and operations teams requiring RBAC and telemetry.",
      priceMonthly: 19,
      priceAnnual: 15,
      features: [
        "Multi-Tenancy Workspace switcher",
        "Predefined RBAC Roles & Permissions",
        "Shared Team Pulse Dashboards",
        "Collaborative Daily Standups sync",
        "Blocker Center with urgencies log",
        "Slack, Teams, & Jira Integrations",
        "Standard SLA email notifications"
      ],
      cta: "Start Free Trial",
      href: "/auth/register",
      popular: true
    },
    {
      name: "Enterprise",
      desc: "For large organizations requiring full audit logs, billing thresholds, and dedicated support.",
      priceMonthly: 49,
      priceAnnual: 39,
      features: [
        "Everything in SaaS Pro",
        "Unlimited Tenant Seats allocations",
        "Centralized SaaS Admin Control Center",
        "Full Security Audit Logs tracking",
        "Custom billing meters & limits",
        "Dedicated account manager",
        "99.9% SLA uptime commitment"
      ],
      cta: "Contact Sales",
      href: "/contact",
      popular: false
    }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a0c] text-foreground transition-linear">
      <PublicNavbar />

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-16 space-y-16">
        {/* Header */}
        <section className="text-center max-w-3xl mx-auto space-y-4">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight">
            Flexible Plans for{" "}
            <span className="bg-gradient-to-r from-primary to-indigo-400 bg-clip-text text-transparent">
              Any Workspace Scale.
            </span>
          </h1>
          <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed max-w-lg mx-auto">
            Choose the workspace capability that matches your team velocity. Try any paid plan free for 14 days.
          </p>

          {/* Billing Cycle Toggle */}
          <div className="flex items-center justify-center gap-3 pt-6">
            <span className={`text-xs font-semibold ${!isAnnual ? "text-foreground" : "text-muted-foreground"}`}>
              Billed Monthly
            </span>
            <button
              onClick={() => setIsAnnual(!isAnnual)}
              className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent bg-muted transition-colors duration-200 ease-in-out focus:outline-none"
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-foreground shadow ring-0 transition duration-200 ease-in-out ${
                  isAnnual ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
            <span className={`text-xs font-semibold flex items-center gap-1.5 ${isAnnual ? "text-foreground" : "text-muted-foreground"}`}>
              Billed Annually
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-bold text-emerald-400 uppercase tracking-wide">
                Save 20%
              </span>
            </span>
          </div>
        </section>

        {/* Pricing Cards Grid */}
        <section className="grid md:grid-cols-3 gap-8 items-stretch">
          {plans.map((plan) => {
            const price = isAnnual ? plan.priceAnnual : plan.priceMonthly;

            return (
              <div
                key={plan.name}
                className={`bg-glass border rounded-2xl p-8 flex flex-col justify-between shadow-lg relative overflow-hidden transition-all duration-300 ${
                  plan.popular
                    ? "border-primary/50 ring-1 ring-primary/20 scale-105 md:scale-100 lg:scale-105 z-10"
                    : "border-border/40 hover:border-primary/20"
                }`}
              >
                {/* Popular Badge */}
                {plan.popular && (
                  <div className="absolute top-0 right-0 bg-primary text-primary-foreground font-black text-[9px] uppercase tracking-wider px-3.5 py-1 rounded-bl-xl shadow-md">
                    Most Popular
                  </div>
                )}

                <div className="space-y-6">
                  <div className="space-y-1">
                    <h3 className="text-base font-extrabold text-foreground">{plan.name}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{plan.desc}</p>
                  </div>

                  <div className="flex items-baseline gap-1 pt-2">
                    <span className="text-3xl font-black text-foreground">${price}</span>
                    <span className="text-xs text-muted-foreground font-semibold">/user/month</span>
                  </div>

                  {/* Divider */}
                  <div className="border-t border-border/40 my-4" />

                  {/* Feature List */}
                  <ul className="space-y-3">
                    {plan.features.map((feat) => (
                      <li key={feat} className="flex items-start gap-2.5 text-xs text-muted-foreground leading-tight">
                        <Check className="h-4 w-4 text-primary shrink-0 pt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-8">
                  <Link
                    href={plan.href}
                    className={`w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition ${
                      plan.popular
                        ? "bg-primary text-primary-foreground hover:bg-primary/95 shadow-lg shadow-primary/10"
                        : "bg-muted hover:bg-muted/80 text-foreground"
                    }`}
                  >
                    {plan.cta} <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
