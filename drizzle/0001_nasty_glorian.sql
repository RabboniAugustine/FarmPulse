CREATE TABLE IF NOT EXISTS "cages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"location" text DEFAULT '',
	"capacity" integer DEFAULT 1 NOT NULL,
	"notes" text DEFAULT '',
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "rabbits" ADD COLUMN "cage_id" uuid;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "rabbits" ADD CONSTRAINT "rabbits_cage_id_cages_id_fk" FOREIGN KEY ("cage_id") REFERENCES "public"."cages"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
