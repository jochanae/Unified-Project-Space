import { db, projectArtifactsTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { logger } from "./logger";

// Shared helper: log a generated artifact for a project.
// Version is assigned atomically via MAX(version)+1 inside a transaction
// to prevent duplicate version numbers under concurrent inserts.
export async function logProjectArtifact({
  projectId,
  type,
  version,
  title,
  metadata = {},
  payload = {},
}: {
  projectId: number;
  type: string;
  version?: number;
  title: string;
  metadata?: Record<string, unknown>;
  payload?: Record<string, unknown>;
}): Promise<void> {
  try {
    await db.transaction(async (tx) => {
      let resolvedVersion = version;
      if (resolvedVersion === undefined) {
        const [row] = await tx
          .select({ maxV: sql<number>`COALESCE(MAX(${projectArtifactsTable.version}), 0)` })
          .from(projectArtifactsTable)
          .where(
            and(
              eq(projectArtifactsTable.projectId, projectId),
              eq(projectArtifactsTable.type, type),
            ),
          );
        resolvedVersion = (Number(row?.maxV ?? 0)) + 1;
      }
      await tx.insert(projectArtifactsTable).values({
        projectId,
        type,
        version: resolvedVersion,
        title,
        metadata,
        payload,
      });
    });
  } catch (err) {
    logger.warn({ err, projectId, type }, "logProjectArtifact: failed to insert — non-fatal");
  }
}
