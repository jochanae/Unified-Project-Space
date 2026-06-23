import { useState, useEffect } from 'react';

const PROMPTS = [
  "Drop your chaos. I'll structure the strategy.",
  "Drop your chaos. I'll build the funnel.",
  "Drop your chaos. I'll write the copy.",
  "Drop your chaos. I'll design the page.",
  "Drop your chaos. I'll generate the leads.",
];

export function LoginTypewriter({ delay = 0 }: { delay?: number }) {
  const [lineIndex, setLineIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [ready, setReady] = useState(delay === 0);

  // Staggered start delay
  useEffect(() => {
    if (delay > 0) {
      const t = setTimeout(() => setReady(true), delay);
      return () => clearTimeout(t);
    }
  }, [delay]);

  const currentLine = PROMPTS[lineIndex % PROMPTS.length];

  useEffect(() => {
    if (!ready) return;
    const speed = isDeleting ? 20 : 40;
    const timer = setTimeout(() => {
      if (!isDeleting) {
        if (charIndex < currentLine.length) {
          setCharIndex((c) => c + 1);
        } else {
          setTimeout(() => setIsDeleting(true), 3000);
        }
      } else {
        if (charIndex > 0) {
          setCharIndex((c) => c - 1);
        } else {
          setIsDeleting(false);
          setLineIndex((l) => l + 1);
        }
      }
    }, speed);

    return () => clearTimeout(timer);
  }, [charIndex, isDeleting, currentLine.length, ready]);

  return (
    <div className="glass rounded-lg px-4 py-3 mt-4 transition-opacity duration-500 opacity-100">
      <p className="text-sm text-muted-foreground font-mono min-h-[1.5em] flex items-center">
        <span className="text-primary/60 mr-1">›</span>
        {!ready ? (
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            <span className="h-1.5 w-1.5 rounded-full bg-primary/60 animate-pulse [animation-delay:150ms]" />
            <span className="h-1.5 w-1.5 rounded-full bg-primary/30 animate-pulse [animation-delay:300ms]" />
          </span>
        ) : (
          <>
            {currentLine.slice(0, charIndex)}
            <span className="animate-pulse text-primary">▍</span>
          </>
        )}
      </p>
    </div>
  );
}
