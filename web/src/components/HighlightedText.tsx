import type { ReactNode } from 'react';
import { highlightSegments } from '../lib/search-chats';

type Props = {
  text: string;
  needle: string;
  className?: string;
};

/** Renders text with case-insensitive keyword matches wrapped in <mark>. */
export function HighlightedText({ text, needle, className }: Props): ReactNode {
  const segments = highlightSegments(text, needle);
  if (segments.length === 1 && !segments[0]!.hit) {
    return className ? <span className={className}>{text}</span> : text;
  }
  return (
    <span className={className}>
      {segments.map((s, i) =>
        s.hit ? (
          <mark key={i} className="rounded-sm bg-leaf-soft px-0.5 font-semibold text-ink">
            {s.text}
          </mark>
        ) : (
          <span key={i}>{s.text}</span>
        ),
      )}
    </span>
  );
}
