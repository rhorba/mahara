import type { Money, SkillEntry } from "@mahara/core";
import { formatMoney } from "@mahara/core";
import { db, talentProfiles, users } from "@mahara/db";
import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

export const revalidate = 300;

type Props = { params: Promise<{ locale: string; id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const profile = await db.query.talentProfiles.findFirst({
    where: eq(talentProfiles.id, id),
    with: { user: true },
  });
  if (!profile) return { title: "Talent introuvable" };
  return { title: `${profile.user?.name ?? "Talent"} — Mahara` };
}

const BADGE_COLORS: Record<string, string> = {
  top_talent: "bg-amber-500 text-white",
  verified: "bg-mahara-green text-white",
  pending: "bg-blue-100 text-blue-700",
  unverified: "bg-gray-100 text-gray-500",
};

const AVAILABILITY_COLORS: Record<string, string> = {
  available: "bg-green-100 text-green-700",
  in_project: "bg-amber-100 text-amber-700",
  unavailable: "bg-gray-100 text-gray-500",
};

export default async function PublicTalentProfile({ params }: Props) {
  const { id } = await params;

  const [t, tLevels, tAvail, tVerif] = await Promise.all([
    getTranslations("profile.talent"),
    getTranslations("profile.skill_levels"),
    getTranslations("profile.availability"),
    getTranslations("profile.verification"),
  ]);

  const profile = await db.query.talentProfiles.findFirst({
    where: eq(talentProfiles.id, id),
    with: { user: true },
  });

  if (!profile) notFound();

  const skills = (profile.skills as SkillEntry[]) ?? [];

  return (
    <main className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-6 items-start mb-8">
        {/* Avatar */}
        <div className="h-20 w-20 rounded-full bg-mahara-green/10 flex items-center justify-center text-3xl font-bold text-mahara-green shrink-0">
          {profile.user?.name?.[0]?.toUpperCase() ?? "?"}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold text-gray-900">{profile.user?.name}</h1>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${BADGE_COLORS[profile.verificationStatus]}`}
            >
              {tVerif(profile.verificationStatus)}
            </span>
          </div>

          {profile.user?.city && <p className="text-sm text-gray-500 mb-2">{profile.user.city}</p>}

          <div className="flex flex-wrap gap-3 text-sm text-gray-600 mb-3">
            <span>
              <strong>{profile.completedGigs}</strong> {t("completed_gigs")}
            </span>
            <span>
              <strong>{profile.reviewCount}</strong> {t("reviews")}
            </span>
            <span>
              <strong>{profile.responseRate}%</strong> {t("response_rate")}
            </span>
            <span>
              <strong>{profile.onTimeRate}%</strong> {t("on_time_rate")}
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            <span
              className={`text-xs px-2.5 py-1 rounded-full font-medium ${AVAILABILITY_COLORS[profile.availability]}`}
            >
              {tAvail(profile.availability)}
            </span>
            {profile.hourlyRate !== null && profile.hourlyRate !== undefined && (
              <span className="text-xs px-2.5 py-1 rounded-full bg-mahara-gold/10 text-mahara-gold font-medium">
                {formatMoney(profile.hourlyRate as Money, "fr")} / h
              </span>
            )}
            {profile.languages.map((lang) => (
              <span
                key={lang}
                className="text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-600"
              >
                {lang.toUpperCase()}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Bio */}
      {profile.bio && (
        <section className="mb-8">
          <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{profile.bio}</p>
        </section>
      )}

      {/* Skills */}
      {skills.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">{t("skills")}</h2>
          <div className="flex flex-wrap gap-2">
            {skills.map((s) => (
              <div
                key={s.skill}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-100"
              >
                <span className="text-sm font-medium text-gray-800">{s.skill}</span>
                <span className="text-xs text-gray-400">·</span>
                <span className="text-xs text-gray-500">{tLevels(s.level)}</span>
                {s.verified && (
                  <span className="text-xs text-mahara-green" title="Vérifié">
                    ✓
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Portfolio */}
      {profile.portfolioUrls.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">{t("portfolio_urls")}</h2>
          <ul className="space-y-1">
            {profile.portfolioUrls.map((url) => (
              <li key={url}>
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-mahara-green hover:underline break-all"
                >
                  {url}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
