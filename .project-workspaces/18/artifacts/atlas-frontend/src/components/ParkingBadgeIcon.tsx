import { useParkedCount } from "@/hooks/useParkedCount";

export function ParkingBadgeIcon({ size = 20 }: { size?: number }) {
  const count = useParkedCount();
  return (
    <span style={{ position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="4" width="16" height="16" rx="2"/>
        <path d="M10 16V8h3a2.5 2.5 0 010 5h-3"/>
      </svg>
      {count > 0 && (
        <span
          aria-label={`${count} parked`}
          style={{
            position: "absolute",
            top: -5,
            right: -6,
            minWidth: 14,
            height: 14,
            borderRadius: 999,
            background: "var(--atlas-gold)",
            color: "var(--atlas-bg)",
            fontSize: 8.5,
            fontFamily: "var(--app-font-mono)",
            fontWeight: 700,
            letterSpacing: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "0 3px",
            lineHeight: 1,
            pointerEvents: "none",
          }}
        >
          {count > 99 ? "99+" : count}
        </span>
      )}
    </span>
  );
}
