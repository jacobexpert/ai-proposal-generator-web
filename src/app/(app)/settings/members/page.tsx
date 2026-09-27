import type { Metadata } from "next";

import { MembersSettings } from "@/features/members/members-settings";

export const metadata: Metadata = { title: "Members" };

export default function MembersPage() {
  return <MembersSettings />;
}
