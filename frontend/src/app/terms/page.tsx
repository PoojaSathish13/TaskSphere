"use client";

import React, { useState, useEffect } from "react";
import { PublicNavbar } from "@/shared/components/layout/PublicNavbar";
import { PublicFooter } from "@/shared/components/layout/PublicFooter";

export default function TermsPage() {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!hasMounted) {
    return null;
  }

  const sections = [
    {
      title: "1. Acceptance of Terms",
      content: "By creating a TaskSphere account, registereing an organization, or logging into your active tenant workspace, you agree to comply with and be bound by these Terms & Conditions. If you disagree, you must not access the platform."
    },
    {
      title: "2. Account Management and Security",
      content: "Users are responsible for safeguarding password credentials and configuring multi-factor verification keys. TaskSphere is not liable for unauthorized access resulting from credential leakage or failure to enable MFA protocols."
    },
    {
      title: "3. Service Usage and Tenant Limits",
      content: "Paid accounts are billed on a metered monthly or annual cycle. Usage limits (such as user seat allocations, storage space, and API request count thresholds) are enforced based on your subscription tier. Violating limits may result in subscription upgrades or suspension."
    },
    {
      title: "4. Intellectual Property Rights",
      content: "All codebase libraries, icons, database designs, landing page assets, and Command Palette console configurations are the exclusive intellectual property of TaskSphere Inc. You may not copy, reverse-engineer, or resell the software."
    },
    {
      title: "5. Platform SLA and Liability Limits",
      content: "While we strive for 99.9% uptime, TaskSphere is provided 'as is' without warranty. We are not liable for operational downtime, data corruption, or celery task queue delays that occur during hosting operations."
    }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a0c] text-foreground transition-linear">
      <PublicNavbar />

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-16 space-y-10">
        <div className="space-y-2 border-b border-border/40 pb-6">
          <h1 className="text-3xl font-black tracking-tight">Terms & Conditions</h1>
          <p className="text-xs text-muted-foreground">Last Updated: June 24, 2026</p>
        </div>

        <section className="space-y-8">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Welcome to TaskSphere. These terms define the rules and guidelines governing the use of our multi-tenant SaaS application.
          </p>

          <div className="space-y-6">
            {sections.map((sec) => (
              <div key={sec.title} className="space-y-2.5">
                <h2 className="text-sm font-extrabold text-foreground">{sec.title}</h2>
                <p className="text-xs text-muted-foreground leading-relaxed">{sec.content}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
