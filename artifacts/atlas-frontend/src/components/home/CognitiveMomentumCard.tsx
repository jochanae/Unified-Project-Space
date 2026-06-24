import { useEffect, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const GOLD = "#C9A24C";
const MONO = "var(--app-font-mono)";
const MUTED = "var(--atlas-muted)";
const FG = "var(--atlas-fg)";

type DayPoint = { day: string; sessions: number };

type DashboardStats = {
  sessionsThisWeek: number;
  parkedDecisions: number;
  totalDecisions: number;
  dailySessions: DayPoint[];
};

function CustomDot(props: { cx?: number; cy?: number; value?: number }) {
  const { cx, cy, value } = props;
  if (cx == null || cy == null || value === 0) return null;
  return (
    <circle
      cx={cx}
      cy={cy}
      r={3.5}
      fill={GOLD}
      stroke="rgba(0,0,0,0.4)"
      strokeWidth={1}
    />
  );
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const val = payload[0]?.value ?? 0;
  return (
    <div
      style={{
        background: "rgba(16,14,12,0.92)",
        border: "1px solid rgba(201,162,76,0.25)",
        borderRadius: 7,
        padding: "5px 10px",
        fontFamily: MONO,
        fontSize: 10.5,
        color: GOLD,
        letterSpacing: "0.04em",
        pointerEvents: "none",
      }}
    >
      <span style={{ color: "rgba(255,255,255,0.45)", marginRight: 6 }}>{label}</span>
      {val} session{val !== 1 ? "s" : ""}
    </div>
  );
}

export function CognitiveMomentumCard({
  onOpenParking,
}: {
  onOpenParking?: () => void;
}) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/stats/dashboard", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: DashboardStats | null) => {
        if (d) setStats(d);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const data: DayPoint[] = stats?.dailySessions ?? [];
  const sessionsThisWeek = stats?.sessionsThisWeek ?? 0;
  const parked = stats?.parkedDecisions ?? 0;
  const maxSessions = Math.max(...data.map((d) => d.sessions), 1);
  const yMax = Math.ceil(maxSessions / 2) * 2 + 2;

  return (
    <div className="atlas-discovery-card" style={{ padding: "16px 16px 14px" }}>
      <style>{`@keyframes cm-spin { to { transform: rotate(360deg); } }`}</style>

      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: 4,
        }}
      >
        <div>
          <h3
            style={{
              margin: 0,
              fontSize: 9.5,
              fontWeight: 600,
              fontFamily: MONO,
              color: FG,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              opacity: 0.7,
            }}
          >
            Cognitive Momentum
          </h3>
          <div
            style={{
              marginTop: 10,
              fontSize: 15,
              fontWeight: 600,
              color: FG,
              lineHeight: 1,
              fontFamily: "var(--app-font-sans)",
            }}
          >
            {loading ? (
              <span style={{ opacity: 0.25, fontWeight: 200 }}>—</span>
            ) : (
              <>
                <span style={{ fontSize: 26, fontWeight: 200, color: GOLD }}>
                  {sessionsThisWeek}
                </span>
                <span
                  style={{
                    fontSize: 10,
                    fontFamily: MONO,
                    color: MUTED,
                    letterSpacing: "0.07em",
                    textTransform: "uppercase",
                    opacity: 0.55,
                    marginLeft: 8,
                  }}
                >
                  sessions this week
                </span>
              </>
            )}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12, paddingTop: 2 }}>
          <div style={{ textAlign: "right" }}>
            <div
              style={{
                fontSize: 9,
                fontFamily: MONO,
                color: MUTED,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                opacity: 0.4,
                marginBottom: 2,
              }}
            >
              Parked
            </div>
            <div
              style={{
                fontSize: 14,
                fontWeight: 200,
                color: MUTED,
                opacity: 0.7,
                lineHeight: 1,
              }}
            >
              {parked}
            </div>
          </div>
          {onOpenParking && (
            <button
              type="button"
              onClick={onOpenParking}
              style={{
                background: "transparent",
                border: "none",
                padding: 0,
                fontSize: 10,
                color: GOLD,
                fontFamily: MONO,
                cursor: "pointer",
                letterSpacing: "0.05em",
                opacity: 0.6,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = "1";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = "0.6";
              }}
            >
              Parking →
            </button>
          )}
        </div>
      </div>

      <div
        style={{
          fontSize: 8.5,
          fontFamily: MONO,
          color: MUTED,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          opacity: 0.38,
          marginBottom: 12,
          marginTop: 6,
        }}
      >
        Thinking sessions / day
      </div>

      {loading ? (
        <div
          style={{
            height: 120,
            borderRadius: 6,
            background: "rgba(255,255,255,0.03)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              width: 16,
              height: 16,
              borderRadius: "50%",
              border: "1.5px solid rgba(201,162,76,0.18)",
              borderTopColor: "rgba(201,162,76,0.65)",
              animation: "cm-spin 0.8s linear infinite",
            }}
          />
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={130}>
          <AreaChart data={data} margin={{ top: 6, right: 4, left: -18, bottom: 0 }}>
            <defs>
              <linearGradient id="cm-gold-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="rgba(201,162,76,0.22)" stopOpacity={1} />
                <stop offset="95%" stopColor="rgba(201,162,76,0)" stopOpacity={1} />
              </linearGradient>
            </defs>
            <CartesianGrid
              vertical={false}
              stroke="rgba(255,255,255,0.055)"
              strokeDasharray="3 4"
            />
            <XAxis
              dataKey="day"
              axisLine={false}
              tickLine={false}
              tick={{
                fontSize: 9.5,
                fill: "rgba(255,255,255,0.3)",
                fontFamily: MONO,
                letterSpacing: "0.04em",
              }}
              dy={4}
            />
            <YAxis
              domain={[0, yMax]}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 9, fill: "rgba(255,255,255,0.22)", fontFamily: MONO }}
              allowDecimals={false}
              tickCount={4}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ stroke: "rgba(201,162,76,0.12)", strokeWidth: 1 }}
            />
            <Area
              type="monotone"
              dataKey="sessions"
              stroke={GOLD}
              strokeWidth={1.5}
              fill="url(#cm-gold-fill)"
              dot={<CustomDot />}
              activeDot={{
                r: 4,
                fill: GOLD,
                stroke: "rgba(0,0,0,0.5)",
                strokeWidth: 1,
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}

      {!loading && sessionsThisWeek === 0 && (
        <p
          style={{
            margin: "8px 0 0",
            fontSize: 11.5,
            color: MUTED,
            opacity: 0.45,
            fontStyle: "italic",
            lineHeight: 1.55,
          }}
        >
          No sessions yet this week — open a project to get started.
        </p>
      )}
    </div>
  );
}
