ALTER TABLE waitlist_submissions
ADD COLUMN annual_price_tier_next TEXT CHECK (
  annual_price_tier_next IS NULL OR annual_price_tier_next IN (
    'usd_19_99',
    'usd_29_99',
    'usd_39_99',
    'usd_49_99_plus'
  )
);

UPDATE waitlist_submissions
SET annual_price_tier_next = annual_price_tier;

ALTER TABLE waitlist_submissions
DROP COLUMN annual_price_tier;

ALTER TABLE waitlist_submissions
RENAME COLUMN annual_price_tier_next TO annual_price_tier;
