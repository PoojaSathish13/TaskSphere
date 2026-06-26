"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building, Menu, X, ArrowRight } from "lucide-react";
import { useAuthStore } from "@/infrastructure/store/auth-store";

export const PublicNavbar: React.FC = () => {
  const pathname = usePathname();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [isOpen, setIsOpen] = useState(false);

  const links = [
    { name: "About", href: "/about" },
    { name: "Pricing", href: "/pricing" },
    { name: "Contact", href: "/contact" },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#d0d7de] bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2 hover:opacity-90 transition">
          <Building className="h-5 w-5 text-[#0969da]" />
          <span className="font-extrabold text-xs tracking-tight text-slate-800 uppercase">
            TaskSphere
          </span>
        </Link>

        {/* Desktop Nav Links */}
        <nav className="hidden md:flex items-center gap-8">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-xs font-semibold transition ${
                pathname === link.href
                  ? "text-[#0969da]"
                  : "text-slate-600 hover:text-[#0969da]"
              }`}
            >
              {link.name}
            </Link>
          ))}
        </nav>

        {/* Desktop CTA */}
        <div className="hidden md:flex items-center gap-4">
          {isAuthenticated ? (
            <Link
              href="/"
              className="text-xs font-bold bg-[#2da44e] hover:bg-[#2c974b] text-white px-4 py-2 rounded-md transition shadow-sm flex items-center gap-1.5"
            >
              Go to Dashboard <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          ) : (
            <>
              <Link
                href="/auth/login"
                className="text-xs font-bold text-slate-600 hover:text-slate-900 transition"
              >
                Sign In
              </Link>
              <Link
                href="/auth/register"
                className="text-xs font-bold bg-[#2da44e] hover:bg-[#2c974b] text-white px-4 py-2 rounded-md transition shadow-sm flex items-center gap-1"
              >
                Get Started
              </Link>
            </>
          )}
        </div>

        {/* Mobile menu button */}
        <div className="md:hidden">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-1.5 text-muted-foreground hover:text-foreground focus:outline-none"
          >
            {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden border-b border-[#d0d7de] bg-white animate-fade-in">
          <div className="px-4 pt-2 pb-6 space-y-4">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className={`block text-xs font-semibold py-1.5 transition ${
                  pathname === link.href ? "text-[#0969da]" : "text-slate-600 hover:text-[#0969da]"
                }`}
              >
                {link.name}
              </Link>
            ))}
            <div className="border-t border-[#d0d7de] pt-4 flex flex-col gap-3">
              {isAuthenticated ? (
                <Link
                  href="/"
                  onClick={() => setIsOpen(false)}
                  className="w-full text-center text-xs font-bold bg-[#2da44e] text-white py-2 rounded-md transition flex items-center justify-center gap-1"
                >
                  Go to Dashboard <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              ) : (
                <>
                  <Link
                    href="/auth/login"
                    onClick={() => setIsOpen(false)}
                    className="w-full text-center text-xs font-bold text-slate-600 hover:text-slate-900 py-2 border border-[#d0d7de] rounded-md"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/auth/register"
                    onClick={() => setIsOpen(false)}
                    className="w-full text-center text-xs font-bold bg-[#2da44e] text-white py-2.5 rounded-md"
                  >
                    Get Started
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
export default PublicNavbar;
