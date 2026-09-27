import type { ReactNode } from "react";

import { PageHeader } from "@/components/layout/page-header";

import { SettingsNav } from "./settings-nav";

export default function SettingsLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <>
      <PageHeader title="Settings" description="Your workspace and the people in it." />
      <SettingsNav />
      {children}
    </>
  );
}
