import assert from "node:assert/strict";
import {
  SPATIAL_CAROUSEL_CONTINUOUS_STEP_PX,
  SPATIAL_CAROUSEL_DRAG_DETECT_PX,
  SPATIAL_CAROUSEL_HORIZONTAL_SLOTS,
  SPATIAL_CAROUSEL_MIN_CONTINUOUS_STEP_PX,
  SPATIAL_CAROUSEL_SETTLE_DELAY_MS,
  getSpatialCarouselDragStepPx,
  getSpatialCarouselIconStyle,
  getSpatialCarouselIconWrapStyle,
  getSpatialCarouselPopoverArrowStyle,
  getSpatialCarouselPopoverStyle,
  shouldShowSpatialCarouselLabel,
  SPATIAL_CAROUSEL_SWIPE_PX,
  SPATIAL_CAROUSEL_POPOVER_ARROW_CLASSNAME,
  SPATIAL_CAROUSEL_POPOVER_CLASSNAME,
  getSpatialCarouselItemPresentation,
} from "../index";

assert.equal(SPATIAL_CAROUSEL_SETTLE_DELAY_MS, 1000);
assert.equal(SPATIAL_CAROUSEL_DRAG_DETECT_PX, 8);
assert.equal(SPATIAL_CAROUSEL_SWIPE_PX, 34);
assert.equal(SPATIAL_CAROUSEL_CONTINUOUS_STEP_PX, 52);
assert.equal(SPATIAL_CAROUSEL_MIN_CONTINUOUS_STEP_PX, 28);
assert.equal(getSpatialCarouselDragStepPx(0), 52);
assert.ok(getSpatialCarouselDragStepPx(1) < 52);
assert.equal(getSpatialCarouselDragStepPx(100), 28);
assert.deepEqual(SPATIAL_CAROUSEL_HORIZONTAL_SLOTS, [
  "0px",
  "clamp(54px, 18vw, 68px)",
  "clamp(96px, 31vw, 122px)",
  "clamp(126px, 42vw, 164px)",
  "clamp(148px, 50vw, 194px)",
]);

const centered = getSpatialCarouselItemPresentation(2, 2, 8, "#336699");
assert.equal(centered.centered, true);
assert.equal(centered.distance, 0);
assert.match(String(centered.style.transform), /translateZ\(52px\)/);

const wrapped = getSpatialCarouselItemPresentation(7, 0, 8, "#336699");
assert.equal(wrapped.offset, -1);
assert.equal(wrapped.distance, 1);
assert.match(String(wrapped.style.transform), /rotateY\(33deg\)/);


assert.equal(shouldShowSpatialCarouselLabel(true), true);
assert.equal(shouldShowSpatialCarouselLabel(false), false);
assert.equal(getSpatialCarouselIconStyle("#123456", true).width, "1.65rem");
assert.equal(getSpatialCarouselIconStyle("#123456", false).width, "2.15rem");
assert.equal(getSpatialCarouselIconWrapStyle(true).width, "2rem");
assert.equal(getSpatialCarouselIconWrapStyle(false).width, "2.6rem");
assert.match(SPATIAL_CAROUSEL_POPOVER_CLASSNAME, /rounded/);
assert.match(SPATIAL_CAROUSEL_POPOVER_ARROW_CLASSNAME, /rotate-45/);
assert.equal(getSpatialCarouselPopoverStyle("#123456").borderColor, "#12345655");
assert.equal(getSpatialCarouselPopoverArrowStyle("#123456").borderColor, "#12345655");

console.log("spatial-carousel-core tests passed");
