import { db, applicationModelsTable, designPlansTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

export interface ReadinessCheck {
  name: string;
  status: "pass" | "fail" | "warn";
  explanation: string;
}

export interface BuildReadinessResult {
  ready: boolean;
  confidence: number;
  checks: ReadinessCheck[];
  summary: string;
  originalMessage?: string;
}

export async function checkBuildReadiness(projectId: number): Promise<BuildReadinessResult> {
  const [amRows, planRows] = await Promise.all([
    db
      .select()
      .from(applicationModelsTable)
      .where(eq(applicationModelsTable.projectId, projectId))
      .limit(1),
    db
      .select()
      .from(designPlansTable)
      .where(eq(designPlansTable.projectId, projectId))
      .orderBy(desc(designPlansTable.version))
      .limit(1),
  ]);

  const model = amRows[0] ?? null;
  const plan = planRows[0] ?? null;
  const checks: ReadinessCheck[] = [];

  const identity = (model?.identity as Record<string, unknown>) ?? {};
  const intent = (model?.intent as Record<string, unknown>) ?? {};
  const hasIdentity = !!(identity.name || identity.purpose);
  const hasIntent = !!(intent.summary || (intent.coreProblems as unknown[])?.length);

  if (hasIdentity && hasIntent) {
    const name = (identity.name as string) ?? "Project";
    const summary = (intent.summary as string ?? "").slice(0, 80);
    checks.push({
      name: "Requirements present",
      status: "pass",
      explanation: `${name}: ${summary || "intent captured"}`,
    });
  } else if (hasIdentity || hasIntent) {
    checks.push({
      name: "Requirements present",
      status: "warn",
      explanation: hasIdentity
        ? "Project named but intent is thin — Builder may miss context"
        : "Intent captured but project identity is unclear",
    });
  } else {
    checks.push({
      name: "Requirements present",
      status: "fail",
      explanation: "No project identity or intent found — Builder will have to invent the purpose",
    });
  }

  const experienceIntent = (model?.experienceIntent as Record<string, unknown>) ?? {};
  const hasEI = Object.keys(experienceIntent).length > 0;
  const eiConfirmed = !!(experienceIntent.lastConfirmed);
  const eiConfidence = (experienceIntent.confidence as number) ?? 0;

  if (eiConfirmed && eiConfidence >= 60) {
    const register = (experienceIntent.emotionalRegister as string[] | undefined)?.join(", ") ?? "";
    checks.push({
      name: "Experience Intent confirmed",
      status: "pass",
      explanation: `${register || "aesthetic confirmed"} — confidence ${eiConfidence}%`,
    });
  } else if (hasEI) {
    checks.push({
      name: "Experience Intent confirmed",
      status: "warn",
      explanation: `Experience intent inferred but not explicitly confirmed (confidence ${eiConfidence}%) — Builder will make visual guesses`,
    });
  } else {
    checks.push({
      name: "Experience Intent confirmed",
      status: "warn",
      explanation: "No experience intent — Builder will default to generic visual decisions",
    });
  }

  if (plan?.status === "committed") {
    checks.push({
      name: "Design Plan committed",
      status: "pass",
      explanation: `v${plan.version} committed — layout and interaction decisions locked`,
    });
  } else if (plan?.status === "proposed") {
    checks.push({
      name: "Design Plan committed",
      status: "warn",
      explanation: "Design Plan exists but not committed — Builder will have to invent layout decisions",
    });
  } else {
    checks.push({
      name: "Design Plan committed",
      status: "warn",
      explanation: "No Design Plan — Builder will have to invent visual and interaction decisions from scratch",
    });
  }

  const planBody = (plan?.body as Record<string, unknown>) ?? {};
  const responsiveIntent = (planBody.responsiveIntent as Record<string, unknown>) ?? {};
  const hasResponsive = !!(responsiveIntent.mobile || responsiveIntent.desktop);

  if (plan?.status === "committed" && hasResponsive) {
    checks.push({
      name: "Responsive intent declared",
      status: "pass",
      explanation: "Mobile and desktop layout approaches specified",
    });
  } else if (hasResponsive) {
    checks.push({
      name: "Responsive intent declared",
      status: "warn",
      explanation: "Responsive intent specified but Design Plan not committed",
    });
  } else {
    checks.push({
      name: "Responsive intent declared",
      status: "warn",
      explanation: "No responsive intent — Builder will pick breakpoints arbitrarily",
    });
  }

  const creativePrinciples = (model?.creativePrinciples as string[]) ?? [];
  if (creativePrinciples.length >= 2) {
    checks.push({
      name: "Design principles captured",
      status: "pass",
      explanation: `${creativePrinciples.length} principles — e.g. "${(creativePrinciples[0] ?? "").slice(0, 60)}"`,
    });
  } else if (creativePrinciples.length === 1) {
    checks.push({
      name: "Design principles captured",
      status: "warn",
      explanation: "Only 1 principle captured — richer constraints help Builder make better decisions",
    });
  } else {
    checks.push({
      name: "Design principles captured",
      status: "warn",
      explanation: "No creative principles — Builder will make style and tone decisions without guidance",
    });
  }

  const passCount = checks.filter((c) => c.status === "pass").length;
  const failCount = checks.filter((c) => c.status === "fail").length;
  const total = checks.length;
  const confidence = Math.round((passCount / total) * 100);
  const ready = failCount === 0 && passCount >= 2;

  const lockedParts: string[] = [];
  if (hasIdentity && identity.name) lockedParts.push(identity.name as string);
  if (intent.summary) lockedParts.push((intent.summary as string).slice(0, 60));
  if (plan?.status === "committed") lockedParts.push(`Design Plan v${plan.version}`);
  if (eiConfirmed) {
    const register = (experienceIntent.emotionalRegister as string[] | undefined)?.slice(0, 2).join(", ");
    if (register) lockedParts.push(register);
  }
  const summary = lockedParts.length > 0 ? lockedParts.join(" · ") : "Building from current context";

  return { ready, confidence, checks, summary };
}
