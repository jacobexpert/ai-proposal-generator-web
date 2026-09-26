import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import { ProfileDetails } from "@/features/workspaces/profile-details";

export const metadata: Metadata = { title: "Profile" };

export default function ProfilePage() {
  return (
    <>
      <PageHeader title="Profile" description="Your account and the workspaces you belong to." />
      <ProfileDetails />
    </>
  );
}
