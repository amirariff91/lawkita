CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid,
	"before_data" jsonb,
	"after_data" jsonb,
	"metadata" jsonb,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "case_lawyers" (
	"case_id" uuid NOT NULL,
	"lawyer_id" uuid NOT NULL,
	"role" text NOT NULL,
	"role_description" text,
	"is_verified" boolean DEFAULT false NOT NULL,
	"confidence_score" numeric(3, 2),
	"source_type" text,
	"source_url" text,
	"scraped_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "case_lawyers_case_id_lawyer_id_pk" PRIMARY KEY("case_id","lawyer_id")
);
--> statement-breakpoint
CREATE TABLE "case_media_references" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid NOT NULL,
	"source" text NOT NULL,
	"title" text NOT NULL,
	"url" text NOT NULL,
	"published_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "case_suggestions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid NOT NULL,
	"lawyer_id" uuid NOT NULL,
	"suggestion_type" text NOT NULL,
	"content" jsonb NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"admin_notes" text,
	"reviewed_at" timestamp,
	"reviewed_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "case_timeline" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid NOT NULL,
	"date" timestamp NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"court" text,
	"image" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"subtitle" text,
	"description" text,
	"category" text NOT NULL,
	"case_number" text,
	"citation" text,
	"court" text,
	"alternative_names" jsonb DEFAULT '[]'::jsonb,
	"status" text DEFAULT 'ongoing' NOT NULL,
	"is_published" boolean DEFAULT false NOT NULL,
	"is_featured" boolean DEFAULT false NOT NULL,
	"verdict_summary" text,
	"verdict_date" timestamp,
	"outcome" text,
	"duration_days" integer,
	"witness_count" integer,
	"hearing_count" integer,
	"charge_count" integer,
	"og_image" text,
	"meta_description" text,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "cases_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "cities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"state_id" uuid NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "claims" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lawyer_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"bar_membership_number" text NOT NULL,
	"firm_email" text,
	"verification_method" text,
	"verification_document" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"rejection_reason" text,
	"email_verification_token" text,
	"email_verification_expires" timestamp,
	"reviewed_by" text,
	"reviewed_at" timestamp,
	"admin_notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "endorsements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"endorser_id" uuid NOT NULL,
	"endorsee_id" uuid NOT NULL,
	"relationship" text NOT NULL,
	"years_known" integer,
	"content" text,
	"endorsed_practice_areas" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "enquiries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lawyer_id" uuid NOT NULL,
	"sender_name" text NOT NULL,
	"sender_email" text NOT NULL,
	"sender_phone" text,
	"is_email_verified" boolean DEFAULT false NOT NULL,
	"case_type" text,
	"urgency" text DEFAULT 'medium',
	"description" text NOT NULL,
	"budget_range" text DEFAULT 'not_specified',
	"timeline" text DEFAULT 'not_specified',
	"is_first_lawyer" boolean,
	"status" text DEFAULT 'pending' NOT NULL,
	"viewed_at" timestamp,
	"first_response_at" timestamp,
	"response_time_hours" numeric(8, 2),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "experiment_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"experiment_id" uuid NOT NULL,
	"visitor_id" text NOT NULL,
	"variant_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "experiment_conversions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"assignment_id" uuid NOT NULL,
	"conversion_type" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "experiments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"variants" jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"started_at" timestamp,
	"ended_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "firms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"address" text,
	"state" text,
	"city" text,
	"phone" text,
	"email" text,
	"website" text,
	"subscription_tier" text DEFAULT 'free',
	"subscription_expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "firms_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "lawyer_education" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lawyer_id" uuid NOT NULL,
	"institution" text NOT NULL,
	"degree" text NOT NULL,
	"field" text,
	"graduation_year" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lawyer_firms" (
	"lawyer_id" uuid NOT NULL,
	"firm_id" uuid NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"title" text,
	"start_date" timestamp,
	"end_date" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "lawyer_firms_lawyer_id_firm_id_pk" PRIMARY KEY("lawyer_id","firm_id")
);
--> statement-breakpoint
CREATE TABLE "lawyer_practice_areas" (
	"lawyer_id" uuid NOT NULL,
	"practice_area_id" uuid NOT NULL,
	"experience_level" text DEFAULT 'intermediate',
	"years_experience" integer,
	CONSTRAINT "lawyer_practice_areas_lawyer_id_practice_area_id_pk" PRIMARY KEY("lawyer_id","practice_area_id")
);
--> statement-breakpoint
CREATE TABLE "lawyer_qualifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lawyer_id" uuid NOT NULL,
	"title" text NOT NULL,
	"issuing_body" text,
	"issued_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lawyers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"phone" text,
	"photo" text,
	"bio" text,
	"bar_membership_number" text,
	"bar_admission_date" timestamp,
	"bar_status" text DEFAULT 'active',
	"state" text,
	"city" text,
	"address" text,
	"primary_firm_id" uuid,
	"firm_name" text,
	"is_verified" boolean DEFAULT false NOT NULL,
	"is_claimed" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"verified_at" timestamp,
	"claimed_at" timestamp,
	"subscription_tier" text DEFAULT 'free' NOT NULL,
	"subscription_expires_at" timestamp,
	"years_at_bar" integer,
	"court_appearances" integer DEFAULT 0,
	"review_count" integer DEFAULT 0,
	"average_rating" numeric(2, 1),
	"response_rate" numeric(5, 2),
	"avg_response_time_hours" numeric(5, 2),
	"case_association_opt_out" boolean DEFAULT false NOT NULL,
	"opt_out_requested_at" timestamp,
	"scraped_data" jsonb,
	"last_scraped_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "lawyers_slug_unique" UNIQUE("slug"),
	CONSTRAINT "lawyers_bar_membership_number_unique" UNIQUE("bar_membership_number")
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"enquiry_id" uuid NOT NULL,
	"sender_id" uuid,
	"sender_type" text NOT NULL,
	"content" text NOT NULL,
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "practice_areas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"icon" text,
	"parent_id" uuid,
	"level" integer DEFAULT 1 NOT NULL,
	"is_user_facing" boolean DEFAULT true NOT NULL,
	"seo_content" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "practice_areas_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "profile_views" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lawyer_id" uuid NOT NULL,
	"visitor_id" text,
	"source" text,
	"search_query" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lawyer_id" uuid NOT NULL,
	"reviewer_email" text NOT NULL,
	"reviewer_name" text,
	"overall_rating" integer NOT NULL,
	"communication_rating" integer,
	"expertise_rating" integer,
	"responsiveness_rating" integer,
	"value_rating" integer,
	"title" text,
	"content" text,
	"pros" text,
	"cons" text,
	"verification_document" text,
	"is_verified" boolean DEFAULT false NOT NULL,
	"verification_status" text DEFAULT 'pending' NOT NULL,
	"verification_notes" text,
	"verified_at" timestamp,
	"is_published" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scraping_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_type" text NOT NULL,
	"source_type" text NOT NULL,
	"source_url" text,
	"status" text DEFAULT 'running' NOT NULL,
	"records_processed" integer DEFAULT 0,
	"records_created" integer DEFAULT 0,
	"records_updated" integer DEFAULT 0,
	"records_skipped" integer DEFAULT 0,
	"error_count" integer DEFAULT 0,
	"errors" jsonb,
	"metadata" jsonb,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"duration_ms" integer
);
--> statement-breakpoint
CREATE TABLE "search_impressions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lawyer_id" uuid NOT NULL,
	"search_query" text,
	"position" integer,
	"clicked" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	"impersonated_by" text,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "states" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"code" text,
	CONSTRAINT "states_slug_unique" UNIQUE("slug"),
	CONSTRAINT "states_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lawyer_id" uuid,
	"firm_id" uuid,
	"stripe_customer_id" text,
	"stripe_subscription_id" text,
	"stripe_price_id" text,
	"tier" text NOT NULL,
	"billing_period" text,
	"status" text DEFAULT 'active' NOT NULL,
	"current_period_start" timestamp,
	"current_period_end" timestamp,
	"canceled_at" timestamp,
	"grace_ends_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"role" text,
	"banned" boolean DEFAULT false,
	"ban_reason" text,
	"ban_expires" timestamp,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_lawyers" ADD CONSTRAINT "case_lawyers_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_lawyers" ADD CONSTRAINT "case_lawyers_lawyer_id_lawyers_id_fk" FOREIGN KEY ("lawyer_id") REFERENCES "public"."lawyers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_media_references" ADD CONSTRAINT "case_media_references_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_suggestions" ADD CONSTRAINT "case_suggestions_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_suggestions" ADD CONSTRAINT "case_suggestions_lawyer_id_lawyers_id_fk" FOREIGN KEY ("lawyer_id") REFERENCES "public"."lawyers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_suggestions" ADD CONSTRAINT "case_suggestions_reviewed_by_user_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_timeline" ADD CONSTRAINT "case_timeline_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cities" ADD CONSTRAINT "cities_state_id_states_id_fk" FOREIGN KEY ("state_id") REFERENCES "public"."states"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claims" ADD CONSTRAINT "claims_lawyer_id_lawyers_id_fk" FOREIGN KEY ("lawyer_id") REFERENCES "public"."lawyers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claims" ADD CONSTRAINT "claims_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claims" ADD CONSTRAINT "claims_reviewed_by_user_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "endorsements" ADD CONSTRAINT "endorsements_endorser_id_lawyers_id_fk" FOREIGN KEY ("endorser_id") REFERENCES "public"."lawyers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "endorsements" ADD CONSTRAINT "endorsements_endorsee_id_lawyers_id_fk" FOREIGN KEY ("endorsee_id") REFERENCES "public"."lawyers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enquiries" ADD CONSTRAINT "enquiries_lawyer_id_lawyers_id_fk" FOREIGN KEY ("lawyer_id") REFERENCES "public"."lawyers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "experiment_assignments" ADD CONSTRAINT "experiment_assignments_experiment_id_experiments_id_fk" FOREIGN KEY ("experiment_id") REFERENCES "public"."experiments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "experiment_conversions" ADD CONSTRAINT "experiment_conversions_assignment_id_experiment_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."experiment_assignments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lawyer_education" ADD CONSTRAINT "lawyer_education_lawyer_id_lawyers_id_fk" FOREIGN KEY ("lawyer_id") REFERENCES "public"."lawyers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lawyer_firms" ADD CONSTRAINT "lawyer_firms_lawyer_id_lawyers_id_fk" FOREIGN KEY ("lawyer_id") REFERENCES "public"."lawyers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lawyer_firms" ADD CONSTRAINT "lawyer_firms_firm_id_firms_id_fk" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lawyer_practice_areas" ADD CONSTRAINT "lawyer_practice_areas_lawyer_id_lawyers_id_fk" FOREIGN KEY ("lawyer_id") REFERENCES "public"."lawyers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lawyer_practice_areas" ADD CONSTRAINT "lawyer_practice_areas_practice_area_id_practice_areas_id_fk" FOREIGN KEY ("practice_area_id") REFERENCES "public"."practice_areas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lawyer_qualifications" ADD CONSTRAINT "lawyer_qualifications_lawyer_id_lawyers_id_fk" FOREIGN KEY ("lawyer_id") REFERENCES "public"."lawyers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lawyers" ADD CONSTRAINT "lawyers_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_enquiry_id_enquiries_id_fk" FOREIGN KEY ("enquiry_id") REFERENCES "public"."enquiries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_views" ADD CONSTRAINT "profile_views_lawyer_id_lawyers_id_fk" FOREIGN KEY ("lawyer_id") REFERENCES "public"."lawyers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_lawyer_id_lawyers_id_fk" FOREIGN KEY ("lawyer_id") REFERENCES "public"."lawyers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "search_impressions" ADD CONSTRAINT "search_impressions_lawyer_id_lawyers_id_fk" FOREIGN KEY ("lawyer_id") REFERENCES "public"."lawyers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_lawyer_id_lawyers_id_fk" FOREIGN KEY ("lawyer_id") REFERENCES "public"."lawyers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_firm_id_firms_id_fk" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "audit_logs_entity_idx" ON "audit_logs" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "case_lawyers_lawyer_id_idx" ON "case_lawyers" USING btree ("lawyer_id");--> statement-breakpoint
CREATE INDEX "case_timeline_case_id_idx" ON "case_timeline" USING btree ("case_id");--> statement-breakpoint
CREATE INDEX "cases_category_idx" ON "cases" USING btree ("category");--> statement-breakpoint
CREATE INDEX "cases_status_idx" ON "cases" USING btree ("status");--> statement-breakpoint
CREATE INDEX "cases_is_published_idx" ON "cases" USING btree ("is_published");--> statement-breakpoint
CREATE INDEX "cases_case_number_idx" ON "cases" USING btree ("case_number");--> statement-breakpoint
CREATE UNIQUE INDEX "cities_state_slug_idx" ON "cities" USING btree ("state_id","slug");--> statement-breakpoint
CREATE INDEX "claims_lawyer_id_idx" ON "claims" USING btree ("lawyer_id");--> statement-breakpoint
CREATE INDEX "claims_status_idx" ON "claims" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "endorsements_unique_idx" ON "endorsements" USING btree ("endorser_id","endorsee_id");--> statement-breakpoint
CREATE INDEX "endorsements_endorsee_id_idx" ON "endorsements" USING btree ("endorsee_id");--> statement-breakpoint
CREATE INDEX "enquiries_lawyer_id_idx" ON "enquiries" USING btree ("lawyer_id");--> statement-breakpoint
CREATE INDEX "enquiries_status_idx" ON "enquiries" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "experiment_assignments_unique_idx" ON "experiment_assignments" USING btree ("experiment_id","visitor_id");--> statement-breakpoint
CREATE INDEX "lawyers_state_idx" ON "lawyers" USING btree ("state");--> statement-breakpoint
CREATE INDEX "lawyers_city_idx" ON "lawyers" USING btree ("city");--> statement-breakpoint
CREATE INDEX "lawyers_subscription_tier_idx" ON "lawyers" USING btree ("subscription_tier");--> statement-breakpoint
CREATE INDEX "lawyers_is_verified_idx" ON "lawyers" USING btree ("is_verified");--> statement-breakpoint
CREATE INDEX "messages_enquiry_id_idx" ON "messages" USING btree ("enquiry_id");--> statement-breakpoint
CREATE INDEX "profile_views_lawyer_id_idx" ON "profile_views" USING btree ("lawyer_id");--> statement-breakpoint
CREATE INDEX "profile_views_created_at_idx" ON "profile_views" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "reviews_lawyer_id_idx" ON "reviews" USING btree ("lawyer_id");--> statement-breakpoint
CREATE INDEX "reviews_verification_status_idx" ON "reviews" USING btree ("verification_status");--> statement-breakpoint
CREATE INDEX "scraping_logs_job_type_idx" ON "scraping_logs" USING btree ("job_type");--> statement-breakpoint
CREATE INDEX "scraping_logs_status_idx" ON "scraping_logs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "scraping_logs_started_at_idx" ON "scraping_logs" USING btree ("started_at");--> statement-breakpoint
CREATE INDEX "search_impressions_lawyer_id_idx" ON "search_impressions" USING btree ("lawyer_id");--> statement-breakpoint
CREATE INDEX "search_impressions_created_at_idx" ON "search_impressions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "subscriptions_lawyer_id_idx" ON "subscriptions" USING btree ("lawyer_id");--> statement-breakpoint
CREATE INDEX "subscriptions_stripe_customer_id_idx" ON "subscriptions" USING btree ("stripe_customer_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");