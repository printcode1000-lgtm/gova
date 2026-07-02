UPDATE `hero_slider_slides`
SET `image_url` = CASE
  WHEN `priority` = 100 THEN '/images/mainCategories/Tech%20%26%20Electronics.webp'
  WHEN `priority` = 200 THEN '/images/mainCategories/Real%20Estate.webp'
  ELSE `image_url`
END
WHERE `slider_id` = 'home-hero-slider'
  AND `image_key` IS NULL
  AND `image_url` LIKE 'https://lh3.googleusercontent.com/%';
