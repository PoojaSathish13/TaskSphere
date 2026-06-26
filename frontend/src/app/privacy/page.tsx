"use client";

import React, { useState, useEffect } from "react";
import { PublicNavbar } from "@/shared/components/layout/PublicNavbar";
import { PublicFooter } from "@/shared/components/layout/PublicFooter";

export default function PrivacyPage() {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!hasMounted) {
    return null;
  }

  const sections = [
    {
      title: "1. Information We Collect",
      content: "We collect user registration details (names, email addresses, and passwords), multi-factor phone keys, active workspace configurations, system audit logs, timesheet entry hours, and performance statistics necessary to run the platform."
    },
    {
      title: "2. How We Use Your Data",
      content: "Your data is used to provide secure session authentication, manage multi-tenant access controls, track task allocations, dispatch automated SLA email alerts, compile productivity telemetry charts, and generate billing invoices."
    },
    {
      title: "3. Tenant Isolation and Security",
      content: "TaskSphere implements strict database-level isolation. Each organization's resources are locked down behind UUID filters and backend middleware constraints. Your workspace logs cannot be leaked to or viewed by other tenants."
    },
    {
      title: "4. Third-Party Integrations",
      content: "We integrate with Stripe for metered usage billing and Stripe billing portal redirection. Additionally, if enabled by organization admins, the platform communicates with external webhooks such as Slack, Microsoft Teams, Jira, or GitHub to sync planner alerts."
    },
    {
      title: "5. Your Rights and Data Erasure",
      content: "Users hold complete control over their profile session settings. You can configure multi-factor authentication (MFA), revoke active devices/IP sessions via the security settings console, or request complete workspace deletion by contacting your organization admin."
    }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a0c] text-foreground transition-linear">
      <PublicNavbar />

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-16 space-y-10">
        <div className="space-y-2 border-b border-border/40 pb-6">
          <h1 className="text-3xl font-black tracking-tight">Privacy Policy</h1>
          <p className="text-xs text-muted-foreground">Last Updated: June 24, 2026</p>
        </div>

        <section className="space-y-8">
          <p className="text-xs text-muted-foreground leading-relaxed">
            TaskSphere is committed to protecting your privacy. This policy outlines how we collect, store, and utilize data within our enterprise daily work management platform.
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
