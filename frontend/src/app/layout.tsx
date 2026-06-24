import "./globals.css";
import { Providers } from "./providers";
import { AppShell } from "@/shared/components/layout/AppShell";

export const metadata = {
  title: "TaskSphere | Enterprise Daily Work Management Platform",
  description: "Plan Today. Execute Today. Deliver Today.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background text-foreground antialiased">
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
