import { redirect } from "next/navigation";

/** Settings has sub-pages (General, Members): open the first one. */
export default function SettingsPage() {
  redirect("/settings/workspace");
}
