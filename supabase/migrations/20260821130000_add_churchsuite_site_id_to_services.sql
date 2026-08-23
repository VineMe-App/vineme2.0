ALTER TABLE "public"."services" ADD COLUMN "churchsuite_site_id" "text";

CREATE INDEX "services_churchsuite_site_id_idx" ON "public"."services" USING "btree" ("churchsuite_site_id");
