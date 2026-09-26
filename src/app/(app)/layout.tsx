import type { ReactNode } from "react";

import { AppShell } from "@/components/layout/app-shell";

export default function AppLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <AppShell showDevTools={process.env.NODE_ENV !== "production"}>{children}</AppShell>;
}
