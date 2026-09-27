import { redirect } from "next/navigation";

/** Settings has sub-pages (Members now; General with US-FE-45): open the first one. */
export default function SettingsPage() {
  redirect("/settings/members");
}
