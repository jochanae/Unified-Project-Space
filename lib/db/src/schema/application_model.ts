import { pgTable, text, serial, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { z } from "zod/v4";
import { projectsTable } from "./projects";

export const applicationModelsTable = pgTable("application_models", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projectsTable.id, { onDelete: "cascade" }).unique(),
  version: integer("version").notNull().default(1),
  identity: jsonb("identity").notNull().default({}),
  intent: jsonb("intent").notNull().default({}),
  pages: jsonb("pages").notNull().default([]),
  components: jsonb("components").notNull().default([]),
  data: jsonb("data").notNull().default({ entities: [], relationships: [] }),
  logic: jsonb("logic").notNull().default([]),
  buildState: jsonb("build_state").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const applicationModelHistoryTable = pgTable("application_model_history", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projectsTable.id, { onDelete: "cascade" }),
  modelVersion: integer("model_version").notNull(),
  fieldChanged: text("field_changed").notNull(),
  previousValue: jsonb("previous_value"),
  newValue: jsonb("new_value"),
  reason: text("reason"),
  changedAt: timestamp("changed_at", { withTimezone: true }).notNull().defaultNow(),
});

export const ApplicationModelIdentitySchema = z.object({
  name: z.string().optional(),
  purpose: z.string().optional(),
  audience: z.string().optional(),
  category: z.string().optional(),
}).default({});

export const ApplicationModelIntentSchema = z.object({
  summary: z.string().optional(),
  coreProblems: z.array(z.string()).default([]),
  keyOutcomes: z.array(z.string()).default([]),
  constraints: z.array(z.string()).default([]),
  approvedAt: z.string().nullable().optional(),
}).default(() => ({ coreProblems: [], keyOutcomes: [], constraints: [] }));

export const ApplicationModelPageSchema = z.object({
  id: z.string(),
  name: z.string(),
  route: z.string().optional(),
  description: z.string().optional(),
  layout: z.string().optional(),
  children: z.array(z.string()).default([]),
});

export const ApplicationModelComponentSchema = z.object({
  id: z.string(),
  name: z.string(),
  pageId: z.string().optional(),
  description: z.string().optional(),
  props: z.record(z.string(), z.unknown()).default({}),
  children: z.array(z.string()).default([]),
});

export const ApplicationModelEntitySchema = z.object({
  id: z.string(),
  name: z.string(),
  fields: z.array(z.object({
    name: z.string(),
    type: z.string(),
    required: z.boolean().default(false),
    description: z.string().optional(),
  })).default([]),
  description: z.string().optional(),
});

export const ApplicationModelRelationshipSchema = z.object({
  id: z.string(),
  from: z.string(),
  to: z.string(),
  type: z.enum(["one-to-one", "one-to-many", "many-to-many"]).default("one-to-many"),
  label: z.string().optional(),
});

export const ApplicationModelLogicSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(["rule", "flow", "state-machine"]).default("rule"),
  description: z.string().optional(),
  triggers: z.array(z.string()).default([]),
  actions: z.array(z.string()).default([]),
});

export const ApplicationModelBuildStateSchema = z.object({
  generated: z.boolean().default(false),
  generatedAt: z.string().nullable().optional(),
  deployedAt: z.string().nullable().optional(),
  deployUrl: z.string().nullable().optional(),
  generatedFileCount: z.number().default(0),
}).default(() => ({ generated: false, generatedFileCount: 0 }));

export const ApplicationModelDataSchema = z.object({
  entities: z.array(ApplicationModelEntitySchema).default([]),
  relationships: z.array(ApplicationModelRelationshipSchema).default([]),
});

export const ApplicationModelSchema = z.object({
  id: z.number(),
  projectId: z.number(),
  version: z.number(),
  identity: ApplicationModelIdentitySchema,
  intent: ApplicationModelIntentSchema,
  pages: z.array(ApplicationModelPageSchema).default([]),
  components: z.array(ApplicationModelComponentSchema).default([]),
  data: ApplicationModelDataSchema,
  logic: z.array(ApplicationModelLogicSchema).default([]),
  buildState: ApplicationModelBuildStateSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const ApplicationModelPatchSchema = z.object({
  identity: ApplicationModelIdentitySchema.optional(),
  intent: ApplicationModelIntentSchema.optional(),
  pages: z.array(ApplicationModelPageSchema).optional(),
  components: z.array(ApplicationModelComponentSchema).optional(),
  data: ApplicationModelDataSchema.optional(),
  logic: z.array(ApplicationModelLogicSchema).optional(),
  buildState: ApplicationModelBuildStateSchema.optional(),
  reason: z.string().optional(),
});

export const ApplicationModelHistorySchema = z.object({
  id: z.number(),
  projectId: z.number(),
  modelVersion: z.number(),
  fieldChanged: z.string(),
  previousValue: z.unknown().nullable(),
  newValue: z.unknown().nullable(),
  reason: z.string().nullable(),
  changedAt: z.string(),
});

export type ApplicationModel = typeof applicationModelsTable.$inferSelect;
export type ApplicationModelHistory = typeof applicationModelHistoryTable.$inferSelect;
