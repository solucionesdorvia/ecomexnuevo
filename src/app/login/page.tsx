import { redirect } from "next/navigation";

export default function LoginPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const redirectTo = typeof searchParams.redirect === "string" ? searchParams.redirect : undefined;
  redirect(redirectTo ? `/account/login?redirect=${encodeURIComponent(redirectTo)}` : "/account/login");
}
