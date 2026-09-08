/**
 * Desired schema for the `profile-core` Turso database.
 *
 * Generated once from the verified schema of the database this repository was
 * already running against, then owned here by hand. It is the provisioning
 * SSOT: schema sync compares *this* with a live Turso read-back, and no local
 * SQLite file, migration replay, or embedded database engine takes part.
 *
 * Drizzle `sqliteTable(...)` declarations remain the application data mapping
 * and historical migrations remain history; a static parity test keeps the
 * three from drifting apart.
 */
import type { DatabaseSchema } from '../core/types';

export const profileCoreDesiredSchema: DatabaseSchema = {
  "source": "profile-core",
  "tables": {
    "user_profiles": {
      "name": "user_profiles",
      "createSql": "CREATE TABLE \"user_profiles\" (uid text PRIMARY KEY NOT NULL, store_name text NOT NULL DEFAULT '', store_description text NOT NULL DEFAULT '', store_story text NOT NULL DEFAULT '', store_name_search text NOT NULL DEFAULT '', store_description_search text NOT NULL DEFAULT '', custom_request_enabled integer NOT NULL DEFAULT 1, trending_label text NOT NULL DEFAULT 'الأكثر رواجًا', primary_phone text NOT NULL DEFAULT '', primary_phone_normalized text NOT NULL DEFAULT '', primary_whatsapp text NOT NULL DEFAULT '', primary_whatsapp_normalized text NOT NULL DEFAULT '', primary_email text NOT NULL DEFAULT '', primary_address text NOT NULL DEFAULT '', primary_governorate text NOT NULL DEFAULT '', primary_city text NOT NULL DEFAULT '', primary_area text NOT NULL DEFAULT '', primary_latitude text NOT NULL DEFAULT '', primary_longitude text NOT NULL DEFAULT '', rating_enabled integer NOT NULL DEFAULT 1, rating_mode text NOT NULL DEFAULT 'stars-comments', rating_average integer NOT NULL DEFAULT 0, rating_count integer NOT NULL DEFAULT 0, shipping_pricing_mode text NOT NULL DEFAULT 'free', shipping_flat_rate integer NOT NULL DEFAULT 0, shipping_location_base_rate integer NOT NULL DEFAULT 0, shipping_special_vehicle_fee integer NOT NULL DEFAULT 0, shipping_free_shipping_threshold integer NOT NULL DEFAULT 0, shipping_notes text NOT NULL DEFAULT '', returns_enabled integer NOT NULL DEFAULT 0, return_window_days integer NOT NULL DEFAULT 14, return_shipping_payer text NOT NULL DEFAULT 'case_by_case', return_policy_text text NOT NULL DEFAULT '')",
      "columns": [
        {
          "name": "uid",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": null,
          "primaryKeyPosition": 1
        },
        {
          "name": "store_name",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": "''",
          "primaryKeyPosition": 0
        },
        {
          "name": "store_description",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": "''",
          "primaryKeyPosition": 0
        },
        {
          "name": "store_story",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": "''",
          "primaryKeyPosition": 0
        },
        {
          "name": "store_name_search",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": "''",
          "primaryKeyPosition": 0
        },
        {
          "name": "store_description_search",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": "''",
          "primaryKeyPosition": 0
        },
        {
          "name": "custom_request_enabled",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "1",
          "primaryKeyPosition": 0
        },
        {
          "name": "trending_label",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": "'الأكثر رواجًا'",
          "primaryKeyPosition": 0
        },
        {
          "name": "primary_phone",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": "''",
          "primaryKeyPosition": 0
        },
        {
          "name": "primary_phone_normalized",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": "''",
          "primaryKeyPosition": 0
        },
        {
          "name": "primary_whatsapp",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": "''",
          "primaryKeyPosition": 0
        },
        {
          "name": "primary_whatsapp_normalized",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": "''",
          "primaryKeyPosition": 0
        },
        {
          "name": "primary_email",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": "''",
          "primaryKeyPosition": 0
        },
        {
          "name": "primary_address",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": "''",
          "primaryKeyPosition": 0
        },
        {
          "name": "primary_governorate",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": "''",
          "primaryKeyPosition": 0
        },
        {
          "name": "primary_city",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": "''",
          "primaryKeyPosition": 0
        },
        {
          "name": "primary_area",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": "''",
          "primaryKeyPosition": 0
        },
        {
          "name": "primary_latitude",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": "''",
          "primaryKeyPosition": 0
        },
        {
          "name": "primary_longitude",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": "''",
          "primaryKeyPosition": 0
        },
        {
          "name": "rating_enabled",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "1",
          "primaryKeyPosition": 0
        },
        {
          "name": "rating_mode",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": "'stars-comments'",
          "primaryKeyPosition": 0
        },
        {
          "name": "rating_average",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "rating_count",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "shipping_pricing_mode",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": "'free'",
          "primaryKeyPosition": 0
        },
        {
          "name": "shipping_flat_rate",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "shipping_location_base_rate",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "shipping_special_vehicle_fee",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "shipping_free_shipping_threshold",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "shipping_notes",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": "''",
          "primaryKeyPosition": 0
        },
        {
          "name": "returns_enabled",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "return_window_days",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "14",
          "primaryKeyPosition": 0
        },
        {
          "name": "return_shipping_payer",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": "'case_by_case'",
          "primaryKeyPosition": 0
        },
        {
          "name": "return_policy_text",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": "''",
          "primaryKeyPosition": 0
        }
      ],
      "foreignKeys": [],
      "constraints": {
        "checks": [],
        "autoIncrement": false,
        "uniqueConstraints": []
      }
    },
    "user_specialties": {
      "name": "user_specialties",
      "createSql": "CREATE TABLE user_specialties (`uid` text PRIMARY KEY NOT NULL, `womens_clothing_1` integer NOT NULL DEFAULT 0, `hijab_fashion_13` integer NOT NULL DEFAULT 0, `mens_clothing_2` integer NOT NULL DEFAULT 0, `childrens_and_newborn_clothing_3` integer NOT NULL DEFAULT 0, `shoes_leather_and_fabric_bags_5` integer NOT NULL DEFAULT 0, `mens_and_womens_accessories_6` integer NOT NULL DEFAULT 0, `sportswear_7` integer NOT NULL DEFAULT 0, `formal_wear_weddings_parties_8` integer NOT NULL DEFAULT 0, `underwear_and_homewear_9` integer NOT NULL DEFAULT 0, `stock_lots_11` integer NOT NULL DEFAULT 0, `quick_dishes_and_fast_meals_1` integer NOT NULL DEFAULT 0, `bakery_and_pastry_2` integer NOT NULL DEFAULT 0, `sweets_3` integer NOT NULL DEFAULT 0, `drinks_and_natural_juices_4` integer NOT NULL DEFAULT 0, `cafes_13` integer NOT NULL DEFAULT 0, `restaurants_14` integer NOT NULL DEFAULT 0, `dairy_and_eggs_6` integer NOT NULL DEFAULT 0, `spices_and_herbs_7` integer NOT NULL DEFAULT 0, `nuts_seeds_and_dried_fruits_8` integer NOT NULL DEFAULT 0, `meat_poultry_and_fish_10` integer NOT NULL DEFAULT 0, `smartphones_and_tablets_1` integer NOT NULL DEFAULT 0, `laptops_and_desktops_2` integer NOT NULL DEFAULT 0, `digital_accessories_3` integer NOT NULL DEFAULT 0, `development_and_software_4` integer NOT NULL DEFAULT 0, `cameras_security_and_home_monitoring_7` integer NOT NULL DEFAULT 0, `networking_and_telecom_11` integer NOT NULL DEFAULT 0, `skin_and_face_care_1` integer NOT NULL DEFAULT 0, `hair_care_2` integer NOT NULL DEFAULT 0, `makeup_and_beauty_tools_3` integer NOT NULL DEFAULT 0, `perfumes_incense_and_burners_4` integer NOT NULL DEFAULT 0, `hygiene_and_bath_supplies_5` integer NOT NULL DEFAULT 0, `electric_personal_care_tools_11` integer NOT NULL DEFAULT 0, `beauty_centers_12` integer NOT NULL DEFAULT 0, `mens_and_womens_perfumes_1` integer NOT NULL DEFAULT 0, `cosmetics_2` integer NOT NULL DEFAULT 0, `cars_for_sale_1` integer NOT NULL DEFAULT 0, `vehicle_maintenance_5` integer NOT NULL DEFAULT 0, `car_rental_services_6` integer NOT NULL DEFAULT 0, `bicycle_services_2` integer NOT NULL DEFAULT 0, `spare_parts_3` integer NOT NULL DEFAULT 0, `vehicle_accessories_4` integer NOT NULL DEFAULT 0, `oils_tires_wheels_and_batteries_7` integer NOT NULL DEFAULT 0, `living_room_and_bedroom_furniture_1` integer NOT NULL DEFAULT 0, `office_furniture_and_workspaces_3` integer NOT NULL DEFAULT 0, `kitchen_supplies_4` integer NOT NULL DEFAULT 0, `kitchen_furniture_14` integer NOT NULL DEFAULT 0, `carpets_curtains_and_rugs_5` integer NOT NULL DEFAULT 0, `lighting_and_lamps_16` integer NOT NULL DEFAULT 0, `artworks_and_decor_7` integer NOT NULL DEFAULT 0, `garden_and_outdoor_decor_11` integer NOT NULL DEFAULT 0, `bedding_covers_and_pillows_12` integer NOT NULL DEFAULT 0, `home_electrical_appliances_13` integer NOT NULL DEFAULT 0, `interior_design_and_decoration_6` integer NOT NULL DEFAULT 0, `bathroom_and_toilet_supplies_8` integer NOT NULL DEFAULT 0, `apartments_and_houses_for_sale_or_rent_1` integer NOT NULL DEFAULT 0, `chalets_and_villas_7` integer NOT NULL DEFAULT 0, `lands_and_commercial_property_3` integer NOT NULL DEFAULT 0, `offices_and_workspaces_4` integer NOT NULL DEFAULT 0, `gym_2` integer NOT NULL DEFAULT 0, `sports_equipment_4` integer NOT NULL DEFAULT 0, `drawing_and_artworks_1` integer NOT NULL DEFAULT 0, `handmade_jewelry_2` integer NOT NULL DEFAULT 0, `embroidery_and_sewing_3` integer NOT NULL DEFAULT 0, `candles_and_home_fragrances_4` integer NOT NULL DEFAULT 0, `art_tools_and_supplies_5` integer NOT NULL DEFAULT 0, `leather_and_wood_products_6` integer NOT NULL DEFAULT 0, `heritage_and_traditional_crafts_8` integer NOT NULL DEFAULT 0, `event_planning_services_8` integer NOT NULL DEFAULT 0, `gifts_and_flower_arrangements_1` integer NOT NULL DEFAULT 0, `photography_and_video_5` integer NOT NULL DEFAULT 0, `household_cleaners_6` integer NOT NULL DEFAULT 0, `canned_food_5` integer NOT NULL DEFAULT 0, `x_ray_services_202` integer NOT NULL DEFAULT 0, `lab_tests_and_checks_203` integer NOT NULL DEFAULT 0, `pharmacies_204` integer NOT NULL DEFAULT 0, `home_nursing_205` integer NOT NULL DEFAULT 0, `elderly_and_special_needs_care_208` integer NOT NULL DEFAULT 0, `medical_devices_11` integer NOT NULL DEFAULT 0, `obstetrics_and_gynaecology_300` integer NOT NULL DEFAULT 0, `orthopedic_301` integer NOT NULL DEFAULT 0, `dental_302` integer NOT NULL DEFAULT 0, `psychiatry_303` integer NOT NULL DEFAULT 0, `internal_304` integer NOT NULL DEFAULT 0, `chest_305` integer NOT NULL DEFAULT 0, `neurology_307` integer NOT NULL DEFAULT 0, `general_surgery_308` integer NOT NULL DEFAULT 0, `nutrition_309` integer NOT NULL DEFAULT 0, `pediatrics_and_new_born_310` integer NOT NULL DEFAULT 0, `cardiology_311` integer NOT NULL DEFAULT 0, `ear_nose_and_throat_313` integer NOT NULL DEFAULT 0, `vascular_surgery_314` integer NOT NULL DEFAULT 0, `physical_therapy_315` integer NOT NULL DEFAULT 0, `ophthalmology_316` integer NOT NULL DEFAULT 0, `neurosurgery_317` integer NOT NULL DEFAULT 0, `gastroenterology_and_hepatology_318` integer NOT NULL DEFAULT 0, `plastic_surgery_319` integer NOT NULL DEFAULT 0, `rheumatology_320` integer NOT NULL DEFAULT 0, `endocrinology_322` integer NOT NULL DEFAULT 0, `physical_and_sport_injuries_324` integer NOT NULL DEFAULT 0, `dermatology_and_andrology_325` integer NOT NULL DEFAULT 0, `pediatric_surgery_326` integer NOT NULL DEFAULT 0, `hematology_327` integer NOT NULL DEFAULT 0, `oncosurgeon_328` integer NOT NULL DEFAULT 0, `pain_management_329` integer NOT NULL DEFAULT 0, `phoniatrics_330` integer NOT NULL DEFAULT 0, `oncology_331` integer NOT NULL DEFAULT 0, `allergy_and_immunology_332` integer NOT NULL DEFAULT 0, `cardiothoracic_surgery_333` integer NOT NULL DEFAULT 0, `nephrology_and_urology_334` integer NOT NULL DEFAULT 0, `audiology_335` integer NOT NULL DEFAULT 0, `family_336` integer NOT NULL DEFAULT 0, `diagnostic_radiology_338` integer NOT NULL DEFAULT 0, `gastrointestinal_surgery_339` integer NOT NULL DEFAULT 0, `geriatrics_340` integer NOT NULL DEFAULT 0, `general_practice_341` integer NOT NULL DEFAULT 0, `interventional_radiology_343` integer NOT NULL DEFAULT 0, `bariatric_surgery_345` integer NOT NULL DEFAULT 0, `child_orthopaedics_346` integer NOT NULL DEFAULT 0, `ivf_and_infertility_347` integer NOT NULL DEFAULT 0, `genetics_348` integer NOT NULL DEFAULT 0, `platforms_1` integer NOT NULL DEFAULT 0, `libraries_2` integer NOT NULL DEFAULT 0, `printing_presses_3` integer NOT NULL DEFAULT 0, `educational_centers_4` integer NOT NULL DEFAULT 0, `buying_and_selling_4` integer NOT NULL DEFAULT 0, `pet_food_hygiene_toys_and_accessories_1` integer NOT NULL DEFAULT 0, `animal_care_and_training_5` integer NOT NULL DEFAULT 0, `my_way_23` integer NOT NULL DEFAULT 0, `oriflame_44` integer NOT NULL DEFAULT 0, `avon_45` integer NOT NULL DEFAULT 0, `delivery_services_46` integer NOT NULL DEFAULT 0)",
      "columns": [
        {
          "name": "uid",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": null,
          "primaryKeyPosition": 1
        },
        {
          "name": "womens_clothing_1",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "hijab_fashion_13",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "mens_clothing_2",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "childrens_and_newborn_clothing_3",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "shoes_leather_and_fabric_bags_5",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "mens_and_womens_accessories_6",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "sportswear_7",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "formal_wear_weddings_parties_8",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "underwear_and_homewear_9",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "stock_lots_11",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "quick_dishes_and_fast_meals_1",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "bakery_and_pastry_2",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "sweets_3",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "drinks_and_natural_juices_4",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "cafes_13",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "restaurants_14",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "dairy_and_eggs_6",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "spices_and_herbs_7",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "nuts_seeds_and_dried_fruits_8",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "meat_poultry_and_fish_10",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "smartphones_and_tablets_1",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "laptops_and_desktops_2",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "digital_accessories_3",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "development_and_software_4",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "cameras_security_and_home_monitoring_7",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "networking_and_telecom_11",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "skin_and_face_care_1",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "hair_care_2",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "makeup_and_beauty_tools_3",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "perfumes_incense_and_burners_4",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "hygiene_and_bath_supplies_5",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "electric_personal_care_tools_11",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "beauty_centers_12",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "mens_and_womens_perfumes_1",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "cosmetics_2",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "cars_for_sale_1",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "vehicle_maintenance_5",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "car_rental_services_6",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "bicycle_services_2",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "spare_parts_3",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "vehicle_accessories_4",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "oils_tires_wheels_and_batteries_7",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "living_room_and_bedroom_furniture_1",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "office_furniture_and_workspaces_3",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "kitchen_supplies_4",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "kitchen_furniture_14",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "carpets_curtains_and_rugs_5",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "lighting_and_lamps_16",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "artworks_and_decor_7",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "garden_and_outdoor_decor_11",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "bedding_covers_and_pillows_12",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "home_electrical_appliances_13",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "interior_design_and_decoration_6",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "bathroom_and_toilet_supplies_8",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "apartments_and_houses_for_sale_or_rent_1",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "chalets_and_villas_7",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "lands_and_commercial_property_3",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "offices_and_workspaces_4",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "gym_2",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "sports_equipment_4",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "drawing_and_artworks_1",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "handmade_jewelry_2",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "embroidery_and_sewing_3",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "candles_and_home_fragrances_4",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "art_tools_and_supplies_5",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "leather_and_wood_products_6",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "heritage_and_traditional_crafts_8",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "event_planning_services_8",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "gifts_and_flower_arrangements_1",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "photography_and_video_5",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "household_cleaners_6",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "canned_food_5",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "x_ray_services_202",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "lab_tests_and_checks_203",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "pharmacies_204",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "home_nursing_205",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "elderly_and_special_needs_care_208",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "medical_devices_11",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "obstetrics_and_gynaecology_300",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "orthopedic_301",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "dental_302",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "psychiatry_303",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "internal_304",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "chest_305",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "neurology_307",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "general_surgery_308",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "nutrition_309",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "pediatrics_and_new_born_310",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "cardiology_311",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "ear_nose_and_throat_313",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "vascular_surgery_314",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "physical_therapy_315",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "ophthalmology_316",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "neurosurgery_317",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "gastroenterology_and_hepatology_318",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "plastic_surgery_319",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "rheumatology_320",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "endocrinology_322",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "physical_and_sport_injuries_324",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "dermatology_and_andrology_325",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "pediatric_surgery_326",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "hematology_327",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "oncosurgeon_328",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "pain_management_329",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "phoniatrics_330",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "oncology_331",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "allergy_and_immunology_332",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "cardiothoracic_surgery_333",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "nephrology_and_urology_334",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "audiology_335",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "family_336",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "diagnostic_radiology_338",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "gastrointestinal_surgery_339",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "geriatrics_340",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "general_practice_341",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "interventional_radiology_343",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "bariatric_surgery_345",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "child_orthopaedics_346",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "ivf_and_infertility_347",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "genetics_348",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "platforms_1",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "libraries_2",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "printing_presses_3",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "educational_centers_4",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "buying_and_selling_4",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "pet_food_hygiene_toys_and_accessories_1",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "animal_care_and_training_5",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "my_way_23",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "oriflame_44",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "avon_45",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "delivery_services_46",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        }
      ],
      "foreignKeys": [],
      "constraints": {
        "checks": [],
        "autoIncrement": false,
        "uniqueConstraints": []
      }
    }
  },
  "indexes": {
    "user_profiles_store_name_search_idx": {
      "name": "user_profiles_store_name_search_idx",
      "tableName": "user_profiles",
      "sql": "CREATE INDEX user_profiles_store_name_search_idx ON user_profiles (store_name_search)",
      "unique": false,
      "columns": [
        "store_name_search"
      ],
      "where": null
    },
    "user_profiles_primary_phone_idx": {
      "name": "user_profiles_primary_phone_idx",
      "tableName": "user_profiles",
      "sql": "CREATE INDEX user_profiles_primary_phone_idx ON user_profiles (primary_phone_normalized)",
      "unique": false,
      "columns": [
        "primary_phone_normalized"
      ],
      "where": null
    },
    "user_profiles_primary_location_idx": {
      "name": "user_profiles_primary_location_idx",
      "tableName": "user_profiles",
      "sql": "CREATE INDEX user_profiles_primary_location_idx ON user_profiles (primary_latitude, primary_longitude)",
      "unique": false,
      "columns": [
        "primary_latitude",
        "primary_longitude"
      ],
      "where": null
    }
  },
  "views": {},
  "triggers": {}
};
