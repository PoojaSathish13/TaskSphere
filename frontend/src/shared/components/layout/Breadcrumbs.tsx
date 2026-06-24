"use client";

import React from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";

export const Breadcrumbs: React.FC = () => {
  const pathname = usePathname();
  
  if (!pathname) return null;

  const pathParts = pathname.split("/").filter((part) => part);

  return (
    <nav className="flex items-center space-x-1.5 text-xs text-muted-foreground" aria-label="Breadcrumb">
      {/* Home link */}
      <Link href="/" className="hover:text-foreground flex items-center transition">
        <Home className="h-3.5 w-3.5" />
      </Link>

      {pathParts.map((part, index) => {
        const url = `/${pathParts.slice(0, index + 1).join("/")}`;
        const isLast = index === pathParts.length - 1;
        const name = part.charAt(0).toUpperCase() + part.slice(1).replace("-", " ");

        return (
          <React.Fragment key={url}>
            <ChevronRight className="h-3 w-3 text-muted-foreground/60" />
            {isLast ? (
              <span className="font-semibold text-foreground truncate max-w-[120px] sm:max-w-none" aria-current="page">
                {name}
              </span>
            ) : (
              <Link href={url} className="hover:text-foreground transition truncate max-w-[120px] sm:max-w-none">
                {name}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};
export default Breadcrumbs;
