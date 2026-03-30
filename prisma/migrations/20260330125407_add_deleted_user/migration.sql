-- Insert deleted user for soft delete simulation
INSERT INTO "ngc"."User" (id, "createdAt", "updatedAt") VALUES ('00000000-0000-0000-0000-000000000000', NOW(), NOW())
ON CONFLICT DO NOTHING;
