import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { verifyAuthToken } from "@/lib/auth/jwt";

export const runtime = "nodejs";

export default async function AccountPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("ecomex_auth")?.value;
  const payload = token ? await verifyAuthToken(token) : null;

  if (payload?.sub) {
    redirect("/app");
  } else {
    redirect("/account/login");
  }
}
