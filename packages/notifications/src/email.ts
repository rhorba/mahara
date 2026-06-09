import { Resend } from "resend";

// Lazy init — only fails at send time if key is missing, not at module load
function getResend() {
  return new Resend(process.env.RESEND_API_KEY ?? "re_placeholder_dev");
}

const FROM = "Mahara <noreply@mahara.ma>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://mahara.ma";

// ── Welcome email ─────────────────────────────────────────────────────────────

export async function sendWelcomeEmail(to: string, name: string, role: "talent" | "business") {
  const resend = getResend();
  const isTalent = role === "talent";

  await resend.emails.send({
    from: FROM,
    to,
    subject: isTalent
      ? "Bienvenue sur Mahara — votre profil talent vous attend"
      : "Bienvenue sur Mahara — postez votre première mission",
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:32px 24px;color:#1a1a1a">
        <h1 style="color:#1B4332;font-size:24px;margin-bottom:8px">Bonjour ${name} 👋</h1>
        <p style="color:#555;line-height:1.6">
          ${
            isTalent
              ? "Votre compte talent Mahara est prêt. Complétez votre profil pour apparaître dans les résultats de recherche et recevoir des alertes missions."
              : "Votre compte entreprise Mahara est prêt. Publiez votre première mission et accédez aux meilleurs talents marocains vérifiés."
          }
        </p>
        <a href="${APP_URL}/${isTalent ? "talent/profile" : "business/profile"}"
           style="display:inline-block;margin-top:24px;padding:12px 24px;background:#1B4332;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">
          ${isTalent ? "Compléter mon profil" : "Créer mon profil entreprise"}
        </a>
        <p style="margin-top:32px;font-size:12px;color:#999">
          Vous recevez cet email car vous venez de créer un compte sur Mahara.<br>
          <a href="${APP_URL}" style="color:#1B4332">mahara.ma</a>
        </p>
      </div>
    `,
  });
}

// ── Gig alert digest ──────────────────────────────────────────────────────────

export type GigSummary = {
  id: string;
  title: string;
  budget: number; // centimes
  category: string;
};

export async function sendGigAlertDigest(
  to: string,
  name: string,
  matchedGigs: GigSummary[],
) {
  if (matchedGigs.length === 0) return;
  const resend = getResend();

  const gigRows = matchedGigs
    .slice(0, 5)
    .map(
      (g) => `
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid #f0f0f0">
          <a href="${APP_URL}/gigs/${g.id}" style="font-weight:600;color:#1B4332;text-decoration:none">${g.title}</a>
          <br><span style="font-size:12px;color:#888">${g.category} · ${Math.round(g.budget / 100)} MAD</span>
        </td>
      </tr>`,
    )
    .join("");

  await resend.emails.send({
    from: FROM,
    to,
    subject: `${matchedGigs.length} nouvelle${matchedGigs.length > 1 ? "s" : ""} mission${matchedGigs.length > 1 ? "s" : ""} correspond${matchedGigs.length > 1 ? "ent" : ""} à votre profil`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:32px 24px;color:#1a1a1a">
        <h1 style="color:#1B4332;font-size:22px;margin-bottom:8px">Bonjour ${name},</h1>
        <p style="color:#555;line-height:1.6">
          ${matchedGigs.length} mission${matchedGigs.length > 1 ? "s correspondent" : " correspond"} à vos compétences cette semaine :
        </p>
        <table style="width:100%;border-collapse:collapse;margin-top:16px">${gigRows}</table>
        <a href="${APP_URL}/gigs"
           style="display:inline-block;margin-top:24px;padding:12px 24px;background:#1B4332;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">
          Voir toutes les offres
        </a>
        <p style="margin-top:32px;font-size:12px;color:#999">
          <a href="${APP_URL}" style="color:#1B4332">mahara.ma</a>
        </p>
      </div>
    `,
  });
}

// ── Payment confirmation ──────────────────────────────────────────────────────

export async function sendPaymentConfirmation(
  to: string,
  name: string,
  gigTitle: string,
  amountCentimes: number,
) {
  const resend = getResend();
  const amountMAD = Math.round(amountCentimes / 100);

  await resend.emails.send({
    from: FROM,
    to,
    subject: `Paiement de ${amountMAD} MAD reçu — ${gigTitle}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:32px 24px;color:#1a1a1a">
        <h1 style="color:#1B4332;font-size:22px;margin-bottom:8px">Paiement reçu ✓</h1>
        <p style="color:#555;line-height:1.6">
          Bonjour ${name},<br><br>
          Votre paiement de <strong>${amountMAD} MAD</strong> pour la mission
          <strong>${gigTitle}</strong> a été libéré.
        </p>
        <a href="${APP_URL}/talent/earnings"
           style="display:inline-block;margin-top:24px;padding:12px 24px;background:#1B4332;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">
          Voir mes revenus
        </a>
        <p style="margin-top:32px;font-size:12px;color:#999">
          <a href="${APP_URL}" style="color:#1B4332">mahara.ma</a>
        </p>
      </div>
    `,
  });
}

// ── Review request ────────────────────────────────────────────────────────────

export async function sendReviewRequest(to: string, name: string, gigTitle: string, gigId: string) {
  const resend = getResend();

  await resend.emails.send({
    from: FROM,
    to,
    subject: `Laissez un avis pour "${gigTitle}"`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:32px 24px;color:#1a1a1a">
        <h1 style="color:#1B4332;font-size:22px;margin-bottom:8px">La mission est terminée 🎉</h1>
        <p style="color:#555;line-height:1.6">
          Bonjour ${name},<br><br>
          La mission <strong>${gigTitle}</strong> est maintenant terminée.
          Partagez votre expérience en laissant un avis — cela aide la communauté Mahara à grandir.
        </p>
        <a href="${APP_URL}/gigs/${gigId}"
           style="display:inline-block;margin-top:24px;padding:12px 24px;background:#1B4332;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">
          Laisser un avis
        </a>
        <p style="margin-top:32px;font-size:12px;color:#999">
          Les avis mutuels permettent de libérer le paiement (ou sont automatiquement ignorés après 72h).
          <br><a href="${APP_URL}" style="color:#1B4332">mahara.ma</a>
        </p>
      </div>
    `,
  });
}
