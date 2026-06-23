import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export type SpinnerSize = "sm" | "md" | "lg";
export type SpinnerContext = "page" | "content" | "section" | "inline" | "button";

interface LoadingSpinnerProps {
  /**
   * Explicit size override. Prefer `context` instead — `size` is an escape hatch
   * for one-off cases and is flagged by the spinner ESLint rule.
   */
  size?: SpinnerSize;
  /**
   * Semantic context — picks the right size automatically:
   * - "page" / "content": large (full-page or main content-area loads)
   * - "section": medium (standard sub-section loads)
   * - "inline" / "button": small (inside a button or tight inline space)
   */
  context?: SpinnerContext;
  className?: string;
  text?: string;
}

const sizeMap = {
  sm: { circle: 28, glow: 60 },
  md: { circle: 48, glow: 100 },
  lg: { circle: 96, glow: 220 },
};

const CONTEXT_SIZE: Record<SpinnerContext, SpinnerSize> = {
  page: "lg",
  content: "lg",
  section: "md",
  inline: "sm",
  button: "sm",
};

const VALID_CONTEXTS = new Set<SpinnerContext>(["page", "content", "section", "inline", "button"]);
const VALID_SIZES = new Set<SpinnerSize>(["sm", "md", "lg"]);

const GRADIENT =
  "linear-gradient(135deg, hsl(43 80% 60%) 0%, hsl(36 72% 58%) 45%, hsl(47 82% 72%) 100%)";
const GLOW_COLOR = "hsla(43, 80%, 60%, 0.36)";
const BLUR_BG =
  "radial-gradient(circle, hsla(43, 80%, 60%, 0.4) 0%, hsla(47, 82%, 72%, 0.18) 48%, transparent 72%)";

const CIRCLE_COUNT = 5;
const STAGGER = 0.3; // seconds
const DURATION = 2.5; // seconds

/**
 * Resolve which size to render. Pure function — exported for tests.
 *
 * Precedence:
 *  1. Explicit `size` if provided AND valid (escape hatch).
 *  2. `context` mapped via CONTEXT_SIZE if provided AND valid.
 *  3. Safe default of "md" (== context "section").
 */
export function resolveSpinnerSize(size?: SpinnerSize, context?: SpinnerContext): SpinnerSize {
  if (size && VALID_SIZES.has(size)) return size;
  if (context && VALID_CONTEXTS.has(context)) return CONTEXT_SIZE[context];
  return "md";
}

export function LoadingSpinner({ size, context, className, text }: LoadingSpinnerProps) {
  const resolvedSize = resolveSpinnerSize(size, context);
  const config = sizeMap[resolvedSize];

  // Dev-only fallback warnings — never log in production builds.
  const warnedRef = useRef(false);
  useEffect(() => {
    if (!import.meta.env.DEV || warnedRef.current) return;
    warnedRef.current = true;
    if (!size && !context) {
      console.warn(
        '[LoadingSpinner] Missing `context` prop — fell back to size "md". ' +
          'Add context="page" | "content" | "section" | "inline" | "button". ' +
          "See docs/spinner.md.",
      );
    } else if (context && !VALID_CONTEXTS.has(context)) {
      console.warn(
        `[LoadingSpinner] Invalid context="${context}" — fell back to size "md". ` +
          "Valid: page | content | section | inline | button.",
      );
    } else if (size && !VALID_SIZES.has(size)) {
      console.warn(
        `[LoadingSpinner] Invalid size="${size}" — fell back to "md". Valid: sm | md | lg.`,
      );
    }
  }, [size, context]);

  return (
    <div className={cn("flex flex-col items-center justify-center gap-3", className)}>
      <div
        className="relative flex items-center justify-center"
        style={{ width: config.glow, height: config.glow }}
        role="status"
        aria-label="Loading"
      >
        {Array.from({ length: CIRCLE_COUNT }).map((_, i) => (
          <div
            key={`blur-${i}`}
            className="absolute rounded-full blur-xl"
            style={{
              width: config.circle * 0.8,
              height: config.circle * 0.8,
              background: BLUR_BG,
              animation: `sanctum-bloom-blur ${DURATION}s cubic-bezier(0.4,0,0.2,1) ${i * STAGGER}s infinite`,
              opacity: 0,
            }}
          />
        ))}

        {Array.from({ length: CIRCLE_COUNT }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              width: config.circle,
              height: config.circle,
              background: GRADIENT,
              boxShadow: `0 0 30px ${GLOW_COLOR}`,
              animation: `sanctum-bloom-circle ${DURATION}s ease-out ${i * STAGGER}s infinite`,
              opacity: 0,
            }}
          />
        ))}
      </div>
      {text && <p className="font-display text-sm text-gold-soft/85">{text}</p>}

      <style>{`
        @keyframes sanctum-bloom-circle {
          0%   { transform: scale(0.2) rotate(0deg);   opacity: 0; }
          25%  { transform: scale(0.7) rotate(90deg);  opacity: 0.7; }
          35%  { transform: scale(1)   rotate(180deg); opacity: 1; }
          65%  { transform: scale(1)   rotate(270deg); opacity: 1; }
          75%  { transform: scale(1.1) rotate(320deg); opacity: 0.7; }
          100% { transform: scale(1.3) rotate(360deg); opacity: 0; }
        }
        @keyframes sanctum-bloom-blur {
          0%   { transform: scale(0.3); opacity: 0; }
          50%  { transform: scale(1.5); opacity: 0.5; }
          100% { transform: scale(2);   opacity: 0; }
        }
      `}</style>
    </div>
  );
}

export default LoadingSpinner;
