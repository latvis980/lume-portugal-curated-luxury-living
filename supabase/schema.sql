


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE TYPE "public"."address_visibility" AS ENUM (
    'exact',
    'approximate',
    'hidden'
);


ALTER TYPE "public"."address_visibility" OWNER TO "postgres";


CREATE TYPE "public"."article_status" AS ENUM (
    'draft',
    'published'
);


ALTER TYPE "public"."article_status" OWNER TO "postgres";


CREATE TYPE "public"."article_type" AS ENUM (
    'news',
    'memorandum'
);


ALTER TYPE "public"."article_type" OWNER TO "postgres";


CREATE TYPE "public"."collecting_media_type" AS ENUM (
    'image',
    'video'
);


ALTER TYPE "public"."collecting_media_type" OWNER TO "postgres";


CREATE TYPE "public"."internal_status" AS ENUM (
    'draft',
    'ready_for_review',
    'live',
    'on_hold',
    'off_market'
);


ALTER TYPE "public"."internal_status" OWNER TO "postgres";


CREATE TYPE "public"."listing_status" AS ENUM (
    'draft',
    'available',
    'reserved',
    'sold',
    'rented',
    'off_market'
);


ALTER TYPE "public"."listing_status" OWNER TO "postgres";


CREATE TYPE "public"."listing_type" AS ENUM (
    'sale',
    'rent',
    'seasonal_rent'
);


ALTER TYPE "public"."listing_type" OWNER TO "postgres";


CREATE TYPE "public"."priority_level" AS ENUM (
    'low',
    'medium',
    'high'
);


ALTER TYPE "public"."priority_level" OWNER TO "postgres";


CREATE TYPE "public"."property_condition" AS ENUM (
    'new',
    'excellent',
    'renovated',
    'good',
    'to_refurbish'
);


ALTER TYPE "public"."property_condition" OWNER TO "postgres";


CREATE TYPE "public"."property_type" AS ENUM (
    'apartment',
    'penthouse',
    'townhouse',
    'villa',
    'project_apartment',
    'project_villa'
);


ALTER TYPE "public"."property_type" OWNER TO "postgres";


CREATE TYPE "public"."service_category" AS ENUM (
    'administrative',
    'healthcare_family',
    'home',
    'investment_advisory',
    'settling_in',
    'health',
    'education',
    'lifestyle',
    'environment',
    'leisure',
    'signature'
);


ALTER TYPE "public"."service_category" OWNER TO "postgres";


CREATE TYPE "public"."view_tag" AS ENUM (
    'sea',
    'ocean',
    'river',
    'golf',
    'city',
    'countryside',
    'mountain',
    'garden',
    'marina',
    'panoramic',
    'lake',
    'pool',
    'none'
);


ALTER TYPE "public"."view_tag" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_published_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
    if new.status = 'available' and (old.status is null or old.status != 'available') then
        if new.published_at is null then
            new.published_at = now();
        end if;
    end if;
    return new;
end;
$$;


ALTER FUNCTION "public"."set_published_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_published_at_journal"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
    if new.status = 'published'
       and (old.status is null or old.status <> 'published')
       and new.published_at is null then
        new.published_at = now();
    end if;
    return new;
end;
$$;


ALTER FUNCTION "public"."set_published_at_journal"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
    new.updated_at = now();
    return new;
end;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."translations_set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
    new.updated_at = now();
    return new;
end;
$$;


ALTER FUNCTION "public"."translations_set_updated_at"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."collecting_media" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "media_type" "public"."collecting_media_type" DEFAULT 'image'::"public"."collecting_media_type" NOT NULL,
    "src" "text" NOT NULL,
    "poster" "text",
    "tag" "text",
    "tag_i18n" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "label" "text",
    "label_i18n" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "duration_seconds" numeric(8,2),
    "file_size_bytes" bigint,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."collecting_media" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."contacts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" "text" NOT NULL,
    "name" "text",
    "phone" "text",
    "source" "text",
    "questionnaire_answers" "jsonb",
    "message" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."contacts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."journal_articles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "slug" "text" NOT NULL,
    "type" "public"."article_type" DEFAULT 'memorandum'::"public"."article_type" NOT NULL,
    "status" "public"."article_status" DEFAULT 'draft'::"public"."article_status" NOT NULL,
    "kicker" "text",
    "kicker_i18n" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "title" "text" NOT NULL,
    "title_i18n" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "subtitle" "text",
    "subtitle_i18n" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "body" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "body_i18n" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "cover_image" "text",
    "author" "text",
    "sort_order" integer DEFAULT 0 NOT NULL,
    "published_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "main_sources" "text",
    "main_sources_i18n" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL
);


ALTER TABLE "public"."journal_articles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."listings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "reference" "text" NOT NULL,
    "title" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "property_type" "public"."property_type" NOT NULL,
    "listing_type" "public"."listing_type" NOT NULL,
    "status" "public"."listing_status" DEFAULT 'draft'::"public"."listing_status" NOT NULL,
    "price" numeric(14,2) NOT NULL,
    "currency" "text" DEFAULT 'EUR'::"text" NOT NULL,
    "featured" boolean DEFAULT false NOT NULL,
    "country" "text" DEFAULT 'Portugal'::"text" NOT NULL,
    "region" "text" NOT NULL,
    "city" "text" NOT NULL,
    "area" "text" NOT NULL,
    "development_name" "text",
    "address_visibility" "public"."address_visibility" DEFAULT 'approximate'::"public"."address_visibility" NOT NULL,
    "latitude" numeric(10,7),
    "longitude" numeric(10,7),
    "bedrooms" integer NOT NULL,
    "bathrooms" numeric(4,1) NOT NULL,
    "interior_living_area" numeric(10,2) NOT NULL,
    "plot_size" numeric(12,2),
    "views" "public"."view_tag"[] DEFAULT '{}'::"public"."view_tag"[] NOT NULL,
    "build_year" integer,
    "gross_built_area" numeric(10,2),
    "gross_private_area" numeric(10,2),
    "terrace_area" numeric(10,2),
    "balcony_area" numeric(10,2),
    "garden_area" numeric(10,2),
    "outdoor_area_total" numeric(10,2),
    "suites" integer,
    "guest_wc" integer,
    "floors" integer,
    "floor_number" integer,
    "living_rooms" integer,
    "office" boolean DEFAULT false,
    "storage_room" boolean DEFAULT false,
    "renovation_year" integer,
    "condition" "public"."property_condition",
    "energy_rating" "text",
    "elevator" boolean DEFAULT false,
    "new_development" boolean DEFAULT false,
    "garage" boolean DEFAULT false,
    "parking_spaces" integer,
    "covered_parking" boolean DEFAULT false,
    "underground_parking" boolean DEFAULT false,
    "ev_charging" boolean DEFAULT false,
    "terrace" boolean DEFAULT false,
    "balcony" boolean DEFAULT false,
    "garden" boolean DEFAULT false,
    "private_garden" boolean DEFAULT false,
    "roof_terrace" boolean DEFAULT false,
    "patio" boolean DEFAULT false,
    "pool" boolean DEFAULT false,
    "heated_pool" boolean DEFAULT false,
    "outdoor_kitchen" boolean DEFAULT false,
    "bbq_area" boolean DEFAULT false,
    "air_conditioning" boolean DEFAULT false,
    "heating" boolean DEFAULT false,
    "underfloor_heating" boolean DEFAULT false,
    "fireplace" boolean DEFAULT false,
    "equipped_kitchen" boolean DEFAULT false,
    "laundry_room" boolean DEFAULT false,
    "walk_in_wardrobe" boolean DEFAULT false,
    "smart_home" boolean DEFAULT false,
    "alarm_system" boolean DEFAULT false,
    "security" boolean DEFAULT false,
    "concierge" boolean DEFAULT false,
    "furnished" boolean DEFAULT false,
    "lifestyle_tags" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "short_description" "text" NOT NULL,
    "full_description" "text",
    "key_selling_points" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "ai_summary" "text",
    "cover_image" "text" NOT NULL,
    "gallery" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "floor_plans" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "video_url" "text",
    "virtual_tour_url" "text",
    "brochure_url" "text",
    "agent_name" "text",
    "agent_phone" "text",
    "agent_email" "text",
    "agent_whatsapp" "text",
    "office_name" "text",
    "company" "text" NOT NULL,
    "listing_agent" "text" NOT NULL,
    "partner" "text",
    "partner_commission_percent" numeric(5,2),
    "internal_status" "public"."internal_status" DEFAULT 'draft'::"public"."internal_status" NOT NULL,
    "source" "text",
    "priority" "public"."priority_level" DEFAULT 'medium'::"public"."priority_level" NOT NULL,
    "confidential" boolean DEFAULT false NOT NULL,
    "internal_notes" "text",
    "published_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "nearby" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "title_i18n" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "short_description_i18n" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "full_description_i18n" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "ai_summary_i18n" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    CONSTRAINT "apartment_floor_check" CHECK ((("property_type" <> ALL (ARRAY['apartment'::"public"."property_type", 'penthouse'::"public"."property_type", 'project_apartment'::"public"."property_type"])) OR ("floor_number" IS NOT NULL))),
    CONSTRAINT "land_plot_required_check" CHECK ((("property_type" <> ALL (ARRAY['villa'::"public"."property_type", 'project_villa'::"public"."property_type"])) OR ("plot_size" IS NOT NULL))),
    CONSTRAINT "listings_balcony_area_check" CHECK (("balcony_area" >= (0)::numeric)),
    CONSTRAINT "listings_bathrooms_check" CHECK (("bathrooms" >= (0)::numeric)),
    CONSTRAINT "listings_bedrooms_check" CHECK (("bedrooms" >= 0)),
    CONSTRAINT "listings_build_year_check" CHECK ((("build_year" >= 1800) AND ("build_year" <= 2100))),
    CONSTRAINT "listings_floors_check" CHECK (("floors" >= 0)),
    CONSTRAINT "listings_garden_area_check" CHECK (("garden_area" >= (0)::numeric)),
    CONSTRAINT "listings_gross_built_area_check" CHECK (("gross_built_area" >= (0)::numeric)),
    CONSTRAINT "listings_gross_private_area_check" CHECK (("gross_private_area" >= (0)::numeric)),
    CONSTRAINT "listings_guest_wc_check" CHECK (("guest_wc" >= 0)),
    CONSTRAINT "listings_interior_living_area_check" CHECK (("interior_living_area" >= (0)::numeric)),
    CONSTRAINT "listings_living_rooms_check" CHECK (("living_rooms" >= 0)),
    CONSTRAINT "listings_outdoor_area_total_check" CHECK (("outdoor_area_total" >= (0)::numeric)),
    CONSTRAINT "listings_parking_spaces_check" CHECK (("parking_spaces" >= 0)),
    CONSTRAINT "listings_partner_commission_percent_check" CHECK ((("partner_commission_percent" IS NULL) OR (("partner_commission_percent" >= (0)::numeric) AND ("partner_commission_percent" <= (100)::numeric)))),
    CONSTRAINT "listings_plot_size_check" CHECK (("plot_size" >= (0)::numeric)),
    CONSTRAINT "listings_renovation_year_check" CHECK ((("renovation_year" >= 1800) AND ("renovation_year" <= 2100))),
    CONSTRAINT "listings_suites_check" CHECK (("suites" >= 0)),
    CONSTRAINT "listings_terrace_area_check" CHECK (("terrace_area" >= (0)::numeric))
);


ALTER TABLE "public"."listings" OWNER TO "postgres";


COMMENT ON COLUMN "public"."listings"."nearby" IS 'Proximity tags: beach, airport, golf_course, marina, yacht_club, tennis_court, equestrian, fine_dining, wine_region, spa_wellness, international_school, private_hospital, historic_center, cultural_district, river_waterfront, park_nature, surf_spot, cycling_paths, peace_quiet, public_transport, coworking_space, ski_resort';



CREATE TABLE IF NOT EXISTS "public"."locations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "slug" "text" NOT NULL,
    "name" "text" NOT NULL,
    "city" "text" NOT NULL,
    "region" "text",
    "description" "text",
    "image_path" "text",
    "property_count" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."locations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."regions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "display_name" "text" NOT NULL,
    "lifestyle_tags" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "country" "text" DEFAULT 'Portugal'::"text" NOT NULL,
    "sort_order" integer DEFAULT 0,
    "active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."regions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."services" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "slug" "text" NOT NULL,
    "category" "public"."service_category" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "icon" "text",
    "image_path" "text",
    "sort_order" integer DEFAULT 0 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "title_i18n" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "description_i18n" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL
);


ALTER TABLE "public"."services" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."team_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "slug" "text" NOT NULL,
    "name" "text" NOT NULL,
    "role" "text",
    "image_url" "text",
    "sort_order" integer DEFAULT 0 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."team_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."translations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "namespace" "text" NOT NULL,
    "key" "text" NOT NULL,
    "en" "text",
    "pt_pt" "text",
    "ru" "text",
    "es" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."translations" OWNER TO "postgres";


ALTER TABLE ONLY "public"."collecting_media"
    ADD CONSTRAINT "collecting_media_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."contacts"
    ADD CONSTRAINT "contacts_email_unique" UNIQUE ("email");



ALTER TABLE ONLY "public"."contacts"
    ADD CONSTRAINT "contacts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."journal_articles"
    ADD CONSTRAINT "journal_articles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."journal_articles"
    ADD CONSTRAINT "journal_articles_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."listings"
    ADD CONSTRAINT "listings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."listings"
    ADD CONSTRAINT "listings_reference_key" UNIQUE ("reference");



ALTER TABLE ONLY "public"."listings"
    ADD CONSTRAINT "listings_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."locations"
    ADD CONSTRAINT "locations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."locations"
    ADD CONSTRAINT "locations_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."regions"
    ADD CONSTRAINT "regions_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."regions"
    ADD CONSTRAINT "regions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."services"
    ADD CONSTRAINT "services_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."services"
    ADD CONSTRAINT "services_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."team_members"
    ADD CONSTRAINT "team_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."team_members"
    ADD CONSTRAINT "team_members_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."translations"
    ADD CONSTRAINT "translations_namespace_key_key" UNIQUE ("namespace", "key");



ALTER TABLE ONLY "public"."translations"
    ADD CONSTRAINT "translations_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_collecting_media_active" ON "public"."collecting_media" USING "btree" ("is_active");



CREATE INDEX "idx_collecting_media_sort" ON "public"."collecting_media" USING "btree" ("sort_order");



CREATE INDEX "idx_contacts_email" ON "public"."contacts" USING "btree" ("email");



CREATE INDEX "idx_contacts_source" ON "public"."contacts" USING "btree" ("source");



CREATE INDEX "idx_journal_articles_fts" ON "public"."journal_articles" USING "gin" ("to_tsvector"('"english"'::"regconfig", ((COALESCE("title", ''::"text") || ' '::"text") || COALESCE("subtitle", ''::"text"))));



CREATE INDEX "idx_journal_articles_published" ON "public"."journal_articles" USING "btree" ("published_at" DESC NULLS LAST);



CREATE INDEX "idx_journal_articles_slug" ON "public"."journal_articles" USING "btree" ("slug");



CREATE INDEX "idx_journal_articles_status" ON "public"."journal_articles" USING "btree" ("status");



CREATE INDEX "idx_journal_articles_type" ON "public"."journal_articles" USING "btree" ("type");



CREATE INDEX "idx_listings_bedrooms" ON "public"."listings" USING "btree" ("bedrooms");



CREATE INDEX "idx_listings_city" ON "public"."listings" USING "btree" ("city");



CREATE INDEX "idx_listings_featured" ON "public"."listings" USING "btree" ("featured") WHERE ("featured" = true);



CREATE INDEX "idx_listings_fts" ON "public"."listings" USING "gin" ("to_tsvector"('"english"'::"regconfig", ((((((COALESCE("title", ''::"text") || ' '::"text") || COALESCE("city", ''::"text")) || ' '::"text") || COALESCE("region", ''::"text")) || ' '::"text") || COALESCE("short_description", ''::"text"))));



CREATE INDEX "idx_listings_internal" ON "public"."listings" USING "btree" ("internal_status");



CREATE INDEX "idx_listings_price" ON "public"."listings" USING "btree" ("price");



CREATE INDEX "idx_listings_property_type" ON "public"."listings" USING "btree" ("property_type");



CREATE INDEX "idx_listings_published" ON "public"."listings" USING "btree" ("published_at" DESC NULLS LAST);



CREATE INDEX "idx_listings_slug" ON "public"."listings" USING "btree" ("slug");



CREATE INDEX "idx_listings_status" ON "public"."listings" USING "btree" ("status");



CREATE INDEX "idx_locations_city" ON "public"."locations" USING "btree" ("city");



CREATE INDEX "idx_locations_slug" ON "public"."locations" USING "btree" ("slug");



CREATE INDEX "idx_services_category" ON "public"."services" USING "btree" ("category");



CREATE INDEX "idx_services_slug" ON "public"."services" USING "btree" ("slug");



CREATE INDEX "regions_lifestyle_tags_idx" ON "public"."regions" USING "gin" ("lifestyle_tags");



CREATE INDEX "translations_namespace_idx" ON "public"."translations" USING "btree" ("namespace");



CREATE OR REPLACE TRIGGER "team_members_set_updated_at" BEFORE UPDATE ON "public"."team_members" FOR EACH ROW EXECUTE FUNCTION "public"."translations_set_updated_at"();



CREATE OR REPLACE TRIGGER "translations_set_updated_at" BEFORE UPDATE ON "public"."translations" FOR EACH ROW EXECUTE FUNCTION "public"."translations_set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_collecting_media_updated_at" BEFORE UPDATE ON "public"."collecting_media" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_contacts_updated_at" BEFORE UPDATE ON "public"."contacts" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_journal_articles_published_at" BEFORE INSERT OR UPDATE ON "public"."journal_articles" FOR EACH ROW EXECUTE FUNCTION "public"."set_published_at_journal"();



CREATE OR REPLACE TRIGGER "trg_journal_articles_updated_at" BEFORE UPDATE ON "public"."journal_articles" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_listings_published_at" BEFORE INSERT OR UPDATE ON "public"."listings" FOR EACH ROW EXECUTE FUNCTION "public"."set_published_at"();



CREATE OR REPLACE TRIGGER "trg_listings_updated_at" BEFORE UPDATE ON "public"."listings" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_locations_updated_at" BEFORE UPDATE ON "public"."locations" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_services_updated_at" BEFORE UPDATE ON "public"."services" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE POLICY "Admin full access to collecting_media" ON "public"."collecting_media" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Admin full access to contacts" ON "public"."contacts" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Admin full access to journal_articles" ON "public"."journal_articles" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Admin full access to listings" ON "public"."listings" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Admin full access to locations" ON "public"."locations" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Admin full access to services" ON "public"."services" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Allow public insert on contacts" ON "public"."contacts" FOR INSERT TO "authenticated", "anon" WITH CHECK (true);



CREATE POLICY "Anyone can submit a contact form" ON "public"."contacts" FOR INSERT WITH CHECK (true);



CREATE POLICY "Anyone can submit contact form" ON "public"."contacts" FOR INSERT TO "anon" WITH CHECK (true);



CREATE POLICY "Public can read active collecting_media" ON "public"."collecting_media" FOR SELECT TO "anon" USING (("is_active" = true));



CREATE POLICY "Public can read active regions" ON "public"."regions" FOR SELECT USING (("active" = true));



CREATE POLICY "Public can read active services" ON "public"."services" FOR SELECT TO "anon" USING (("is_active" = true));



CREATE POLICY "Public can read available listings" ON "public"."listings" FOR SELECT TO "anon" USING (("status" = 'available'::"public"."listing_status"));



CREATE POLICY "Public can read locations" ON "public"."locations" FOR SELECT TO "anon" USING (true);



CREATE POLICY "Public can read published journal_articles" ON "public"."journal_articles" FOR SELECT TO "anon" USING (("status" = 'published'::"public"."article_status"));



CREATE POLICY "Service role has full access to contacts" ON "public"."contacts" USING (true) WITH CHECK (true);



ALTER TABLE "public"."collecting_media" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."contacts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."journal_articles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."listings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."locations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."regions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."services" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."team_members" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "team_members are public read" ON "public"."team_members" FOR SELECT USING ("is_active");



ALTER TABLE "public"."translations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "translations are public read" ON "public"."translations" FOR SELECT USING (true);



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."collecting_media" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."collecting_media" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."collecting_media" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."contacts" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."contacts" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."contacts" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."journal_articles" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."journal_articles" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."journal_articles" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."listings" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."listings" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."listings" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."locations" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."locations" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."locations" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."regions" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."regions" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."regions" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."services" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."services" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."services" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."team_members" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."team_members" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."team_members" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."translations" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."translations" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."translations" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT UPDATE ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT UPDATE ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT UPDATE ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLES TO "service_role";







