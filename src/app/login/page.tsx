import { redirect } from "next/navigation";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const redirectTo = typeof sp.redirect === "string" ? sp.redirect : undefined;
  redirect(redirectTo ? `/account/login?redirect=${encodeURIComponent(redirectTo)}` : "/account/login");
}
