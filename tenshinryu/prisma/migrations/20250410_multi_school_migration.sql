-- Tenshinryu Multi-School Migration
-- Adds support for multiple physical dojo locations

-- Step 1: Add new fields to Dojo table
ALTER TABLE "Dojo" 
ADD COLUMN IF NOT EXISTS "city" TEXT,
ADD COLUMN IF NOT EXISTS "country" TEXT DEFAULT 'Japan',
ADD COLUMN IF NOT EXISTS "dojoCode" TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS "isVirtual" BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS "description" TEXT,
ADD COLUMN IF NOT EXISTS "currency" TEXT DEFAULT 'JPY',
ADD COLUMN IF NOT EXISTS "logoUrl" TEXT;

-- Step 2: Create unique index on dojoCode
CREATE UNIQUE INDEX IF NOT EXISTS "idx_dojo_code" ON "Dojo"("dojoCode");

-- Step 3: Add DojoSettings table for per-location configuration
CREATE TABLE IF NOT EXISTS "DojoSettings" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    "dojoId" TEXT NOT NULL REFERENCES "Dojo"("id") ON DELETE CASCADE,
    "key" TEXT NOT NULL,
    "value" TEXT,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE("dojoId", "key")
);

-- Step 4: Add index for faster lookups
CREATE INDEX IF NOT EXISTS "idx_dojo_settings_dojo" ON "DojoSettings"("dojoId");

-- Step 5: Seed initial dojo locations
-- First, check if we have an existing dojo
DO $$
BEGIN
    -- Create Tokyo HQ (primary)
    IF NOT EXISTS (SELECT 1 FROM "Dojo" WHERE "dojoCode" = 'TOKYO') THEN
        INSERT INTO "Dojo" ("id", "name", "location", "city", "country", "dojoCode", "timezone", "currency", "description")
        VALUES (
            gen_random_uuid(),
            'Tenshinryu Tokyo Headquarters',
            'Shinjuku, Tokyo',
            'Tokyo',
            'Japan',
            'TOKYO',
            'Asia/Tokyo',
            'JPY',
            'Main headquarters of Tenshinryu Hyoho. All advanced training and examinations.'
        );
    END IF;

    -- Create Osaka Branch
    IF NOT EXISTS (SELECT 1 FROM "Dojo" WHERE "dojoCode" = 'OSAKA') THEN
        INSERT INTO "Dojo" ("id", "name", "location", "city", "country", "dojoCode", "timezone", "currency", "description")
        VALUES (
            gen_random_uuid(),
            'Tenshinryu Osaka',
            'Namba, Osaka',
            'Osaka',
            'Japan',
            'OSAKA',
            'Asia/Tokyo',
            'JPY',
            'Branch dojo serving Kansai region students.'
        );
    END IF;

    -- Create International Online
    IF NOT EXISTS (SELECT 1 FROM "Dojo" WHERE "dojoCode" = 'ONLINE') THEN
        INSERT INTO "Dojo" ("id", "name", "location", "city", "country", "dojoCode", "timezone", "currency", "isVirtual", "description")
        VALUES (
            gen_random_uuid(),
            'Tenshinryu International Online',
            'Virtual Dojo',
            'Global',
            'International',
            'ONLINE',
            'UTC',
            'USD',
            TRUE,
            'Online training for international students. Live streaming and recorded curriculum.'
        );
    END IF;

    -- Create placeholder for future locations
    IF NOT EXISTS (SELECT 1 FROM "Dojo" WHERE "dojoCode" = 'EUROPE') THEN
        INSERT INTO "Dojo" ("id", "name", "location", "city", "country", "dojoCode", "timezone", "currency", "description", "isActive")
        VALUES (
            gen_random_uuid(),
            'Tenshinryu Europe (Planned)',
            'TBD',
            'Europe',
            'EU',
            'EUROPE',
            'Europe/Berlin',
            'EUR',
            'Future European training center. Coming soon.',
            FALSE
        );
    END IF;
END $$;

-- Step 6: Update existing classes to associate with appropriate dojo
-- This is a placeholder - actual migration would map based on class.location field
-- UPDATE "Class" SET "dojoId" = (SELECT "id" FROM "Dojo" WHERE "dojoCode" = 'TOKYO') WHERE "location" ILIKE '%tokyo%';
