CREATE TABLE "shop_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"type" varchar(50) NOT NULL,
	"price" integer NOT NULL,
	"description" text,
	"image_url" text,
	"rarity" varchar(20) DEFAULT 'common' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_inventory" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"item_id" integer NOT NULL,
	"is_equipped" boolean DEFAULT false NOT NULL,
	"purchased_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "ai_itinerary" jsonb DEFAULT 'null'::jsonb;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "is_ai_planned" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "j_coins" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "ai_titles" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "active_title" varchar(100);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "active_badge" varchar(100);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "active_avatar_frame" varchar(100);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "activity_stats" jsonb DEFAULT '{}'::jsonb;--> statement-breakpoint
ALTER TABLE "user_inventory" ADD CONSTRAINT "user_inventory_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_inventory" ADD CONSTRAINT "user_inventory_item_id_shop_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."shop_items"("id") ON DELETE cascade ON UPDATE no action;