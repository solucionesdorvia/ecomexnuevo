import { Resend } from "resend";

const FROM = process.env.EMAIL_FROM ?? "E-COMEX <no-reply@e-comex.com.ar>";

let _resend: Resend | null = null;
function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string | string[];
  subject: string;
  html: string;
}) {
  const resend = getResend();
  if (!resend) {
    console.warn("[email] RESEND_API_KEY not set — skipping email send");
    return { ok: false, skipped: true };
  }
  try {
    const { data, error } = await resend.emails.send({ from: FROM, to, subject, html });
    if (error) {
      console.error("[email] Resend error:", error);
      return { ok: false, error };
    }
    return { ok: true, id: data?.id };
  } catch (err) {
    console.error("[email] Unexpected error:", err);
    return { ok: false, error: err };
  }
}
