CREATE TYPE "public"."genome_stage" AS ENUM('Think', 'Shape', 'Decide', 'Workspace', 'Strategize', 'Build', 'Operate', 'Evolve');
--> statement-breakpoint
CREATE TYPE "public"."object_type" AS ENUM('Idea', 'Goal', 'Blocker', 'Decision', 'Audience', 'Feature', 'Risk', 'Insight');
--> statement-breakpoint
CREATE TABLE "project_genome" (
"id" serial PRIMARY KEY NOT NULL,
"project_id" integer NOT NULL,
"purpose" text,
"core_emotion" text,
"audience" text,
"identity" text,
"constraints" text[] DEFAULT '{}' NOT NULL,
"open_questions" text[] DEFAULT '{}' NOT NULL,
"stage" "genome_stage" DEFAULT 'Think' NOT NULL,
"confidence_score" integer DEFAULT 0 NOT NULL,
"last_evolved_at" timestamp with time zone,
"last_extracted_at" timestamp with time zone,
"created_at" timestamp with time zone DEFAULT now() NOT NULL,
"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
CONSTRAINT "project_genome_project_id_unique" UNIQUE("project_id")
);
--> statement-breakpoint
ALTER TABLE "entries" ADD COLUMN "type" "object_type" DEFAULT 'Decision' NOT NULL;
--> statement-breakpoint
UPDATE "entries" SET "type" = 'Decision' WHERE "type" IS NULL;
--> statement-breakpoint
ALTER TABLE "project_genome" ADD CONSTRAINT "project_genome_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
