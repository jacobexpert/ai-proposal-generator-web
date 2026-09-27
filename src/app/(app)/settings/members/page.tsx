import type { Metadata } from "next";

import { MembersSettings } from "@/features/members/members-settings";

export const metadata: Metadata = { title: "Members · Settings" };

export default function MembersPage() {
  return <MembersSettings />;
}
