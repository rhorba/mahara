import { MatchScoreBadge } from "@/components/matching/match-score-badge";
import { Link } from "@/i18n/navigation";
import { formatMoney } from "@mahara/core";
import type { Money, SkillEntry } from "@mahara/core";
import type { TopTalentResult } from "@mahara/matching";
import { getTranslations } from "next-intl/server";

interface Props {
  talent: TopTalentResult[];
  locale: string;
}

export async function TopTalentPanel({ talent, locale: _locale }: Props) {
  const t = await getTranslations("gigs");
  const tVerif: Record<string, string> = {
    top_talent: "bg-mahara-gold/10 text-mahara-gold",
    verified: "bg-mahara-green/10 text-mahara-green",
    pending: "bg-blue-50 text-blue-600",
    unverified: "bg-gray-50 text-gray-400",
  };

  if (talent.length === 0) {
    return <div className="text-sm text-gray-400 text-center py-6">{t("top_talent_empty")}</div>;
  }

  return (
    <div className="space-y-3">
      {talent.map((tp) => {
        const skills = (tp.skills as SkillEntry[]).slice(0, 3);
        return (
          <div
            key={tp.id}
            className="flex items-start gap-3 p-3 rounded-xl border border-gray-100 bg-white hover:border-mahara-green/30 transition-colors"
          >
            {/* Avatar */}
            <div className="h-9 w-9 shrink-0 rounded-full bg-mahara-green/10 flex items-center justify-center text-mahara-green font-bold text-sm">
              {tp.user?.name?.[0]?.toUpperCase() ?? "?"}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                <span className="text-sm font-semibold text-gray-900 truncate">
                  {tp.user?.name ?? "—"}
                </span>
                {(tp.verificationStatus === "verified" ||
                  tp.verificationStatus === "top_talent") && (
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${tVerif[tp.verificationStatus]}`}
                  >
                    {tp.verificationStatus === "top_talent"
                      ? t("top_talent_badge")
                      : t("verified_badge")}
                  </span>
                )}
              </div>

              <p className="text-xs text-gray-400 mb-1">
                {tp.user?.city ?? "Maroc"} · {tp.completedGigs} missions
              </p>

              {/* Skills */}
              {skills.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-1.5">
                  {skills.map((s) => (
                    <span
                      key={s.skill}
                      className="text-xs px-1.5 py-0.5 bg-gray-50 text-gray-500 rounded-full"
                    >
                      {s.skill}
                    </span>
                  ))}
                </div>
              )}

              <MatchScoreBadge score={tp.matchScore} size="sm" />
            </div>

            {/* Profile link */}
            <Link
              href={`/talent/${tp.userId}`}
              className="shrink-0 text-xs text-mahara-green hover:underline whitespace-nowrap"
            >
              {t("view_profile")}
            </Link>
          </div>
        );
      })}
    </div>
  );
}
