-- Step 0: Add subcategory column if it doesn't exist (was added via db:push in some envs)
ALTER TABLE "flat-cove_expenses" ADD COLUMN IF NOT EXISTS "subcategory" varchar(100);--> statement-breakpoint
-- Step 1: Remap old Splitwise category strings to proper subcategory IDs
-- (subcategory was NULL for all pre-migration imports)
UPDATE "flat-cove_expenses" SET "subcategory" = CASE LOWER(TRIM("category"))
  WHEN 'groceries' THEN 'groceries'
  WHEN 'food and drink' THEN 'other-food-drinks'
  WHEN 'dining out' THEN 'restaurant'
  WHEN 'liquor' THEN 'bar'
  WHEN 'taxi' THEN 'taxi'
  WHEN 'parking' THEN 'parking'
  WHEN 'gas/fuel' THEN 'gas'
  WHEN 'car' THEN 'other-transport'
  WHEN 'bus/train' THEN 'public-transit'
  WHEN 'clothing' THEN 'clothes'
  WHEN 'electronics' THEN 'electronics'
  WHEN 'household supplies' THEN 'home-goods'
  WHEN 'movies' THEN 'movies'
  WHEN 'games' THEN 'games'
  WHEN 'sports' THEN 'sports'
  WHEN 'music' THEN 'music'
  WHEN 'entertainment - other' THEN 'other-entertainment'
  WHEN 'rent' THEN 'rent'
  WHEN 'mortgage' THEN 'rent'
  WHEN 'maintenance' THEN 'maintenance'
  WHEN 'furniture' THEN 'furniture'
  WHEN 'home - other' THEN 'other-housing'
  WHEN 'electricity' THEN 'electric'
  WHEN 'heat/gas' THEN 'other-utilities'
  WHEN 'water' THEN 'water'
  WHEN 'tv/phone/internet' THEN 'internet'
  WHEN 'utilities - other' THEN 'other-utilities'
  WHEN 'insurance' THEN 'other-health'
  WHEN 'medical expenses' THEN 'doctor'
  WHEN 'hotel' THEN 'hotel'
  WHEN 'plane' THEN 'flight'
  WHEN 'services' THEN 'other-subscriptions'
  WHEN 'education' THEN 'other-education'
  WHEN 'gifts' THEN 'gift'
  WHEN 'pets' THEN 'other'
  ELSE 'other'
END
WHERE "subcategory" IS NULL AND "category" IS NOT NULL;--> statement-breakpoint
-- Step 2: Remap the category column from Splitwise strings to group IDs
UPDATE "flat-cove_expenses" SET "category" = CASE LOWER(TRIM("category"))
  WHEN 'groceries' THEN 'food-drinks'
  WHEN 'food and drink' THEN 'food-drinks'
  WHEN 'dining out' THEN 'food-drinks'
  WHEN 'liquor' THEN 'food-drinks'
  WHEN 'taxi' THEN 'transport'
  WHEN 'parking' THEN 'transport'
  WHEN 'gas/fuel' THEN 'transport'
  WHEN 'car' THEN 'transport'
  WHEN 'bus/train' THEN 'transport'
  WHEN 'clothing' THEN 'shopping'
  WHEN 'electronics' THEN 'shopping'
  WHEN 'household supplies' THEN 'shopping'
  WHEN 'movies' THEN 'entertainment'
  WHEN 'games' THEN 'entertainment'
  WHEN 'sports' THEN 'entertainment'
  WHEN 'music' THEN 'entertainment'
  WHEN 'entertainment - other' THEN 'entertainment'
  WHEN 'rent' THEN 'housing'
  WHEN 'mortgage' THEN 'housing'
  WHEN 'maintenance' THEN 'housing'
  WHEN 'furniture' THEN 'housing'
  WHEN 'home - other' THEN 'housing'
  WHEN 'electricity' THEN 'utilities'
  WHEN 'heat/gas' THEN 'utilities'
  WHEN 'water' THEN 'utilities'
  WHEN 'tv/phone/internet' THEN 'utilities'
  WHEN 'utilities - other' THEN 'utilities'
  WHEN 'insurance' THEN 'health'
  WHEN 'medical expenses' THEN 'health'
  WHEN 'hotel' THEN 'travel'
  WHEN 'plane' THEN 'travel'
  WHEN 'services' THEN 'subscriptions'
  WHEN 'education' THEN 'education'
  WHEN 'gifts' THEN 'gifts'
  WHEN 'pets' THEN 'other'
  ELSE 'other'
END
WHERE "category" NOT IN ('food-drinks','transport','shopping','entertainment','housing','utilities','health','travel','subscriptions','education','gifts','other');--> statement-breakpoint
-- Step 3: Backfill any remaining NULLs
UPDATE "flat-cove_expenses" SET "description" = '' WHERE "description" IS NULL;--> statement-breakpoint
UPDATE "flat-cove_expenses" SET "category" = 'other' WHERE "category" IS NULL;--> statement-breakpoint
UPDATE "flat-cove_expenses" SET "subcategory" = 'other' WHERE "subcategory" IS NULL;--> statement-breakpoint
-- Step 4: Add NOT NULL constraints
ALTER TABLE "flat-cove_expenses" ALTER COLUMN "description" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "flat-cove_expenses" ALTER COLUMN "category" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "flat-cove_expenses" ALTER COLUMN "subcategory" SET NOT NULL;
