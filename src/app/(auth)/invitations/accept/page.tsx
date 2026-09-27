import type { Metadata } from "next";
import { cookies } from "next/headers";

import { InvitationFlow } from "@/features/invitations/invitation-flow";
import { parseInvitationToken } from "@/features/invitations/invitation-token";
import { ACCESS_COOKIE } from "@/server/session";

export const metadata: Metadata = {
  title: "Join a workspace",
  // The URL carries a one-time token: never send it to other sites or index it.
  referrer: "no-referrer",
  robots: { index: false, follow: false },
};

/** US-FE-43. Public for signed-in and signed-out users (see `proxy.ts`). */
export default async function AcceptInvitationPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  const { token } = await searchParams;
  const urlToken = parseInvitationToken(Array.isArray(token) ? token[0] : token);
  // `proxy.ts` has already renewed an expired access cookie for this request.
  const signedIn = (await cookies()).has(ACCESS_COOKIE);
  return <InvitationFlow urlToken={urlToken} signedIn={signedIn} />;
}
