"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { apiClient } from "@/infrastructure/api/api-client";
import { ProtectedRoute } from "@/features/rbac/components/ProtectedRoute";
import { 
  CreditCard, 
  ArrowLeft,
  AlertCircle,
  CheckCircle,
  Receipt,
  ExternalLink,
  Check,
  ArrowRight,
  Zap,
  Loader2
} from "lucide-react";

interface PlanItem {
  id: string;
  name: string;
  code: string;
  price_monthly: string;
  max_tasks: number;
  max_members: number;
}

interface SubscriptionDetails {
  plan_name: string;
  plan_code: string;
  price_monthly: string;
  max_tasks: number;
  max_members: number;
  status: string;
  current_period_end: string;
}

interface InvoiceItem {
  id: string;
  amount: string;
  status: 'PAID' | 'UNPAID' | 'FAILED';
  stripe_invoice_id: string;
  created_at: string;
}

// Inner component that uses useSearchParams
function AdminBillingContent() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  // Handle ?checkout= and ?portal= query params on mount
  useEffect(() => {
    const checkoutParam = searchParams.get("checkout");
    const portalParam = searchParams.get("portal");
    if (checkoutParam === "success") {
      showToast("✅ Subscription upgraded successfully! Your new plan is now active.", "success");
      queryClient.invalidateQueries({ queryKey: ["saas-subscription"] });
      queryClient.invalidateQueries({ queryKey: ["saas-usage"] });
    } else if (checkoutParam === "cancelled") {
      showToast("Checkout was cancelled. No changes were made.", "error");
    } else if (checkoutParam === "simulated") {
      showToast("⚠️ Simulated mode — add STRIPE_SECRET_KEY to backend/.env to enable live payments.", "error");
    } else if (portalParam === "simulated") {
      showToast("⚠️ Billing portal is in simulated mode — Stripe not configured.", "error");
    }
  }, [searchParams, queryClient]);

  // Query: Fetch subscription
  const { data: subscription } = useQuery<SubscriptionDetails>({
    queryKey: ["saas-subscription"],
    queryFn: async () => {
      const res = await apiClient.get("/api/v1/organizations/subscription/");
      return res.data.data;
    }
  });

  // Query: Fetch plans
  const { data: plans = [] } = useQuery<PlanItem[]>({
    queryKey: ["saas-plans"],
    queryFn: async () => {
      const res = await apiClient.get("/api/v1/organizations/plans/");
      return (Array.isArray(res.data?.data) ? res.data.data : (Array.isArray(res.data) ? res.data : []));
    }
  });

  // Query: Fetch invoices
  const { data: invoices = [], isLoading: loadingInvoices } = useQuery<InvoiceItem[]>({
    queryKey: ["saas-invoices"],
    queryFn: async () => {
      const res = await apiClient.get("/api/v1/organizations/invoices/");
      return (Array.isArray(res.data?.data) ? res.data.data : (Array.isArray(res.data) ? res.data : []));
    }
  });

  // Mutation: Upgrade subscription (internal plan switch)
  const upgradeSubscriptionMutation = useMutation({
    mutationFn: async (planCode: string) => {
      const res = await apiClient.post("/api/v1/organizations/subscription/", { plan_code: planCode });
      return res.data.data;
    },
    onSuccess: (data) => {
      showToast(`Subscription plan updated to ${data.plan_name}`, "success");
      queryClient.invalidateQueries({ queryKey: ["saas-subscription"] });
      queryClient.invalidateQueries({ queryKey: ["saas-usage"] });
    },
    onError: () => {
      showToast("Failed to update subscription", "error");
    }
  });

  // Stripe Checkout
  const handleStripeCheckout = async (planCode: string) => {
    setCheckoutLoading(planCode);
    try {
      const res = await apiClient.post('/api/v1/organizations/stripe-checkout/', { plan_code: planCode });
      const { checkout_url, simulated } = res.data.data ?? res.data;
      if (simulated) {
        alert(
          '⚠️ Stripe is not configured. Add STRIPE_SECRET_KEY to backend/.env to enable live payments.\n\n' +
          'In production, user would be redirected to Stripe Checkout.'
        );
      } else {
        window.location.href = checkout_url;
      }
    } catch {
      showToast("Failed to initiate Stripe Checkout.", "error");
    } finally {
      setCheckoutLoading(null);
    }
  };

  // Stripe Billing Portal
  const handleBillingPortal = async () => {
    setPortalLoading(true);
    try {
      const res = await apiClient.post('/api/v1/organizations/stripe-portal/', {});
      const { portal_url, simulated } = res.data.data ?? res.data;
      if (simulated) {
        alert(
          '⚠️ Billing portal is in simulated mode.\n\n' +
          'Add STRIPE_SECRET_KEY to backend/.env and ensure your Stripe customer exists to enable the live portal.'
        );
      } else {
        window.location.href = portal_url;
      }
    } catch {
      showToast("Failed to open Stripe Billing Portal.", "error");
    } finally {
      setPortalLoading(false);
    }
  };

  return (
    <ProtectedRoute allowedPermissions={["ORG_MANAGE"]}>
      <main className="space-y-6 pb-12 text-foreground bg-[#0a0a0c]">
        {/* Toast alerts */}
        {toast && (
          <div className={`fixed bottom-5 right-5 z-50 p-4 rounded-xl border shadow-2xl flex items-center gap-2 text-xs font-bold bg-[#121214] text-white print:hidden ${
            toast.type === "success" ? "border-emerald-500/40 text-emerald-400" : "border-rose-500/40 text-rose-400"
          }`}>
            {toast.type === "success" ? <CheckCircle className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
            <span>{toast.message}</span>
          </div>
        )}

        {/* Back navigation */}
        <div>
          <Link href="/admin" className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1.5 font-semibold">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Admin Console
          </Link>
        </div>

        {/* Header */}
        <header className="border-b border-[#1f1f23] pb-5">
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-3 text-white">
            <CreditCard className="h-7 w-7 text-indigo-500" />
            Billing &amp; Subscriptions
          </h1>
          <p className="text-[#8e8e95] text-xs mt-1">
            Manage organization subscriptions, invoices receipts database, plans comparisons, and payment methods.
          </p>
        </header>

        {/* Plan status banner */}
        <div className="p-5 bg-indigo-500/5 border border-indigo-500/20 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold text-indigo-400 tracking-wider">Active Subscription</span>
            <h3 className="text-xl font-bold text-white">{subscription?.plan_name} Tier</h3>
            <p className="text-[10px] text-[#8e8e95]">Renewing on: {subscription?.current_period_end || 'N/A'}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="text-2xl font-black text-white">${subscription?.price_monthly}</span>
              <span className="text-[10px] text-[#8e8e95] block">/ month</span>
            </div>
            {/* Manage Billing via Stripe Portal */}
            <button
              id="manage-billing-btn"
              onClick={handleBillingPortal}
              disabled={portalLoading}
              className="flex items-center gap-1.5 px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-xs font-bold rounded-lg transition"
            >
              {portalLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <CreditCard className="h-3.5 w-3.5" />
              )}
              Manage Billing <ExternalLink className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Plans scale matrix */}
        <div className="space-y-4">
          <h2 className="text-xs font-bold text-white uppercase tracking-wider">Scale Subscription Plan Tier</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map(p => (
              <div 
                key={p.id} 
                className={`p-6 rounded-xl border flex flex-col justify-between space-y-4 relative ${
                  subscription?.plan_code === p.code 
                    ? "bg-indigo-500/5 border-indigo-500/40" 
                    : "bg-[#1c1c1f]/40 border-[#2d2d34]/60"
                }`}
              >
                {subscription?.plan_code === p.code && (
                  <span className="absolute top-4 right-4 text-[9px] bg-indigo-500 text-white font-bold px-2 py-0.5 rounded flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" /> Active Plan
                  </span>
                )}
                
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-white">{p.name}</h4>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-black text-white">${p.price_monthly}</span>
                    <span className="text-[10px] text-[#8e8e95]">/mo</span>
                  </div>
                </div>

                <ul className="space-y-2 text-[11px] text-[#8e8e95]">
                  <li className="flex items-center gap-1.5"><Check className="h-4 w-4 text-indigo-400" /> Max Tasks: {p.max_tasks}</li>
                  <li className="flex items-center gap-1.5"><Check className="h-4 w-4 text-indigo-400" /> Max Members: {p.max_members}</li>
                </ul>

                {subscription?.plan_code !== p.code && (
                  <div className="flex flex-col gap-2">
                    {/* Stripe Checkout — primary CTA */}
                    <button
                      id={`stripe-checkout-${p.code}`}
                      onClick={() => handleStripeCheckout(p.code)}
                      disabled={checkoutLoading === p.code}
                      className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-60 text-white font-bold text-xs rounded-lg transition flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-500/20"
                    >
                      {checkoutLoading === p.code ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Zap className="h-3.5 w-3.5" />
                      )}
                      Upgrade via Stripe
                    </button>
                    {/* Internal plan switch (no payment) */}
                    <button
                      id={`internal-upgrade-${p.code}`}
                      onClick={() => upgradeSubscriptionMutation.mutate(p.code)}
                      disabled={upgradeSubscriptionMutation.isPending}
                      className="w-full py-2 border border-[#2d2d34] text-[#8e8e95] hover:text-white hover:border-indigo-500/40 font-bold text-[10px] rounded-lg transition flex items-center justify-center gap-1.5"
                    >
                      Switch Plan (No Payment) <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Invoice Statement log */}
        <div className="space-y-4 pt-4">
          <h2 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
            <Receipt className="h-4.5 w-4.5 text-indigo-500" /> Billing Invoices Ledger
          </h2>
          <div className="border border-[#1f1f23] rounded-xl overflow-hidden bg-[#121214]">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#1f1f23] bg-[#161619] text-[#8e8e95]">
                  <th className="p-4 font-bold">Stripe Invoice Reference ID</th>
                  <th className="p-4 font-bold">Billing Amount</th>
                  <th className="p-4 font-bold">Transaction Status</th>
                  <th className="p-4 font-bold">Settlement Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1f1f23]/60">
                {loadingInvoices ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-[#8e8e95]">Loading statements...</td>
                  </tr>
                ) : invoices.length === 0 ? (
                  <tr><td colSpan={4} className="p-4 text-center text-[#8e8e95]">No invoices found.</td></tr>
                ) : (
                  invoices.map(inv => (
                    <tr key={inv.id} className="text-[#c5c5ca]">
                      <td className="p-4 font-mono">{inv.stripe_invoice_id || 'MOCK_REF_ID'}</td>
                      <td className="p-4 font-bold text-white">${inv.amount}</td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded font-bold text-[9px] uppercase ${
                          inv.status === 'PAID' ? "bg-emerald-500/10 text-emerald-400" :
                          inv.status === 'FAILED' ? "bg-rose-500/10 text-rose-400" : "bg-[#2d2d34] text-[#8e8e95]"
                        }`}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="p-4 font-mono text-[#8e8e95]">{new Date(inv.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </main>
    </ProtectedRoute>
  );
}

// Wrap with Suspense because useSearchParams requires it in Next.js App Router
export default function AdminBillingPage() {
  return (
    <Suspense fallback={<div className="text-white p-8">Loading billing...</div>}>
      <AdminBillingContent />
    </Suspense>
  );
}
