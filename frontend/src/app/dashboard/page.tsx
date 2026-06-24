"use client";

import React from "react";
import { ProtectedRoute } from "@/features/rbac/components/ProtectedRoute";
import { DashboardGrid } from "@/features/dashboard/components/DashboardGrid";

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardGrid />
    </ProtectedRoute>
  );
}
