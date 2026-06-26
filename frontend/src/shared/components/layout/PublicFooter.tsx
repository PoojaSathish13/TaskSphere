"use client";

import React from "react";
import Link from "next/link";
import { Building } from "lucide-react";

export const PublicFooter: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full border-t border-[#d0d7de] bg-[#f6f8fa] py-8 mt-auto select-none">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-2">
          <Building className="h-5 w-5 text-slate-500" />
          <span className="font-bold text-sm tracking-tight text-slate-600">
            TaskSphere
          </span>
        </div>

        {/* Legal Links */}
        <div className="flex items-center gap-6">
          <Link
            href="/privacy"
            className="text-xs text-muted-foreground hover:text-foreground transition font-medium"
          >
            Privacy Policy
          </Link>
          <Link
            href="/terms"
            className="text-xs text-muted-foreground hover:text-foreground transition font-medium"
          >
            Terms & Conditions
          </Link>
        </div>

        {/* Copyright */}
        <p className="text-[10px] text-muted-foreground">
          © {currentYear} TaskSphere Inc. All rights reserved.
        </p>
      </div>
    </footer>
  );
};
export default PublicFooter;
