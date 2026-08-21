import type * as React from "react";

import type { HeroSliderTransition } from "./hero-slider.types";

interface SlideTransitionInput {
  current: number;
  previous: number | null;
  index: number;
  transition?: HeroSliderTransition;
  transitionDuration?: number;
}

export function getHeroSlideStyleAndClass({
  current,
  previous,
  index,
  transition,
  transitionDuration = 500,
}: SlideTransitionInput): {
  style: React.CSSProperties;
  className: string;
} {
  const isActive = index === current;
  const isExiting = index === previous;

  const style: React.CSSProperties = {
    transitionProperty: "opacity, transform",
    transitionDuration: `${transitionDuration}ms`,
    transitionTimingFunction: "ease-in-out",
  };

  let className = "absolute inset-0";

  switch (transition) {
    case "Fade":
      className += "transition-opacity";
      if (isActive) className += "opacity-100 z-10 pointer-events-auto";
      else className += "opacity-0 z-0 pointer-events-none";
      break;
    case "Zoom":
      className += "transition-all";
      if (isActive) className += "opacity-100 scale-100 z-10 pointer-events-auto";
      else if (isExiting) className += "opacity-0 scale-95 z-0 pointer-events-none";
      else className += "opacity-0 scale-105 z-0 pointer-events-none";
      break;
    case "SlideLeft":
    case "Parallax":
      className += "transition-transform";
      if (isActive) className += "translate-x-0 z-10 pointer-events-auto";
      else if (isExiting) className += "translate-x-[-100%] z-0 pointer-events-none";
      else className += "translate-x-[100%] z-0 pointer-events-none";
      break;
    case "SlideRight":
      className += "transition-transform";
      if (isActive) className += "translate-x-0 z-10 pointer-events-auto";
      else if (isExiting) className += "translate-x-[100%] z-0 pointer-events-none";
      else className += "translate-x-[-100%] z-0 pointer-events-none";
      break;
    default:
      if (isActive) className += "opacity-100 z-10 pointer-events-auto";
      else className += "opacity-0 z-0 pointer-events-none";
  }

  return { style, className };
}

export function getHeroImageStyle({
  current,
  previous,
  index,
  transition,
  transitionDuration = 500,
}: SlideTransitionInput): {
  className: string;
  style: React.CSSProperties;
} {
  if (transition !== "Parallax") {
    return {
      className: "object-cover",
      style: {},
    };
  }

  const isActive = index === current;
  const isExiting = index === previous;

  const style: React.CSSProperties = {
    transitionProperty: "transform",
    transitionDuration: `${transitionDuration}ms`,
    transitionTimingFunction: "ease-in-out",
  };

  let className = "object-cover scale-110 absolute inset-0";

  if (isActive) style.transform = "translate3d(0, 0, 0)";
  else if (isExiting) style.transform = "translate3d(15%, 0, 0)";
  else style.transform = "translate3d(-15%, 0, 0)";

  return { className, style };
}
