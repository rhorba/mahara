"use client";

interface Props {
  score: number; // 0–100
  size?: "sm" | "md";
  showLabel?: boolean;
}

function scoreLabel(score: number): string {
  if (score >= 80) return "Excellent";
  if (score >= 60) return "Bon";
  return "Partiel";
}

function scoreColors(score: number): { bar: string; text: string; bg: string } {
  if (score >= 80) return { bar: "bg-mahara-green", text: "text-mahara-green", bg: "bg-mahara-green/10" };
  if (score >= 60) return { bar: "bg-mahara-gold", text: "text-mahara-gold", bg: "bg-mahara-gold/10" };
  return { bar: "bg-gray-300", text: "text-gray-500", bg: "bg-gray-100" };
}

export function MatchScoreBadge({ score, size = "md", showLabel = true }: Props) {
  const { bar, text, bg } = scoreColors(score);
  const barWidth = size === "sm" ? "w-12" : "w-20";

  return (
    <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full ${bg}`}>
      <div className={`h-1.5 ${barWidth} bg-gray-200 rounded-full overflow-hidden`}>
        <div
          className={`h-full rounded-full transition-all ${bar}`}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className={`text-xs font-semibold tabular-nums ${text}`}>{score}%</span>
      {showLabel && (
        <span className={`text-xs font-medium ${text} hidden sm:inline`}>
          {scoreLabel(score)}
        </span>
      )}
    </div>
  );
}
