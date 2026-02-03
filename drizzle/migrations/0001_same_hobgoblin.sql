CREATE TABLE "firm_claims" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"firm_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"position" text,
	"verification_document" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"rejection_reason" text,
	"reviewed_by" text,
	"reviewed_at" timestamp,
	"admin_notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lawyer_firm_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lawyer_id" uuid NOT NULL,
	"firm_name" text NOT NULL,
	"firm_id" uuid,
	"firm_address" text,
	"first_seen" timestamp DEFAULT now() NOT NULL,
	"last_seen" timestamp DEFAULT now() NOT NULL,
	"is_current" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "firms" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "firms" ADD COLUMN "logo" text;--> statement-breakpoint
ALTER TABLE "firms" ADD COLUMN "normalized_address" text;--> statement-breakpoint
ALTER TABLE "firms" ADD COLUMN "owner_id" text;--> statement-breakpoint
ALTER TABLE "firms" ADD COLUMN "is_claimed" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "firms" ADD COLUMN "claimed_at" timestamp;--> statement-breakpoint
ALTER TABLE "firms" ADD COLUMN "lawyer_count" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "firms" ADD COLUMN "avg_years_experience" numeric(4, 1);--> statement-breakpoint
ALTER TABLE "firm_claims" ADD CONSTRAINT "firm_claims_firm_id_firms_id_fk" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "firm_claims" ADD CONSTRAINT "firm_claims_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "firm_claims" ADD CONSTRAINT "firm_claims_reviewed_by_user_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lawyer_firm_history" ADD CONSTRAINT "lawyer_firm_history_lawyer_id_lawyers_id_fk" FOREIGN KEY ("lawyer_id") REFERENCES "public"."lawyers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lawyer_firm_history" ADD CONSTRAINT "lawyer_firm_history_firm_id_firms_id_fk" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "firm_claims_firm_id_idx" ON "firm_claims" USING btree ("firm_id");--> statement-breakpoint
CREATE INDEX "firm_claims_user_id_idx" ON "firm_claims" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "firm_claims_status_idx" ON "firm_claims" USING btree ("status");--> statement-breakpoint
CREATE INDEX "lawyer_firm_history_lawyer_id_idx" ON "lawyer_firm_history" USING btree ("lawyer_id");--> statement-breakpoint
CREATE INDEX "lawyer_firm_history_firm_id_idx" ON "lawyer_firm_history" USING btree ("firm_id");--> statement-breakpoint
ALTER TABLE "firms" ADD CONSTRAINT "firms_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "firms_normalized_address_idx" ON "firms" USING btree ("normalized_address");--> statement-breakpoint
CREATE INDEX "firms_state_idx" ON "firms" USING btree ("state");--> statement-breakpoint
CREATE INDEX "firms_city_idx" ON "firms" USING btree ("city");--> statement-breakpoint
CREATE INDEX "firms_owner_id_idx" ON "firms" USING btree ("owner_id");