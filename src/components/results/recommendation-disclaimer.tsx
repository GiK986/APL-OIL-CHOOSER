import { parseDisclaimer } from "./disclaimer-segments";

// Olyslager's copyright/liability notice, shown under the recommendations.
// English only — Olyslager has no Bulgarian data, and it's a legal text.
export function RecommendationDisclaimer({ html }: { html: string | null }) {
  const segments = parseDisclaimer(html);
  if (segments.length === 0) return null;

  return (
    <p className="border-t border-border pt-4 text-xs leading-relaxed text-muted-foreground">
      {segments.map((segment, index) =>
        segment.type === "link" ? (
          // New tab: inside the TM1 iframe a same-frame link would replace the app.
          <a
            key={index}
            href={segment.href}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-foreground"
          >
            {segment.text}
          </a>
        ) : (
          <span key={index}>{segment.text}</span>
        ),
      )}
    </p>
  );
}
