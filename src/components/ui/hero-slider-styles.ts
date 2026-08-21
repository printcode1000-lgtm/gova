import type * as React from "react";

import type { HeroSliderTransition } from "./hero-slider.types";

interface SlideTransitionInput {
  current: number;
  previous: number | null;
  index: number;
  transition: HeroSliderTransition;
  transitionDuration?: number;
}

function baseStyle(transitionDuration: number): React.CSSProperties {
  return {
    transitionProperty: "opacity, transform",
    transitionDuration: `${transitionDuration}ms`,
    transitionTimingFunction: "ease-in-out",
  };
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
  const instant = transition === "None" || transitionDuration <= 0;

  const style: React.CSSProperties = instant
    ? {}
    : baseStyle(transitionDuration);

  let className = "absolute inset-0";

  switch (transition) {
    case "Fade":
    case "CrossFade":
      className += instant ? "" : " transition-opacity";
      if (isActive) className += " opacity-100 z-10 pointer-events-auto";
      else className += " opacity-0 z-0 pointer-events-none";
      break;
    case "Zoom":
      className += instant ? "" : " transition-all";
      if (isActive) className += " opacity-100 scale-100 z-10 pointer-events-auto";
      else if (isExiting) className += " opacity-0 scale-95 z-0 pointer-events-none";
      else className += " opacity-0 scale-105 z-0 pointer-events-none";
      break;
    case "SlideLeft":
      className += instant ? "" : " transition-transform";
      if (isActive) className += " translate-x-0 z-10 pointer-events-auto";
      else if (isExiting) className += " -translate-x-full z-0 pointer-events-none";
      else className += " translate-x-full z-0 pointer-events-none";
      break;
    case "SlideRight":
      className += instant ? "" : " transition-transform";
      if (isActive) className += " translate-x-0 z-10 pointer-events-auto";
      else if (isExiting) className += " translate-x-full z-0 pointer-events-none";
      else className += " -translate-x-full z-0 pointer-events-none";
      break;
    case "SlideUp":
      className += instant ? "" : " transition-transform";
      if (isActive) className += " translate-y-0 z-10 pointer-events-auto";
      else if (isExiting) className += " -translate-y-full z-0 pointer-events-none";
      else className += " translate-y-full z-0 pointer-events-none";
      break;
    case "SlideDown":
      className += instant ? "" : " transition-transform";
      if (isActive) className += " translate-y-0 z-10 pointer-events-auto";
      else if (isExiting) className += " translate-y-full z-0 pointer-events-none";
      else className += " -translate-y-full z-0 pointer-events-none";
      break;
    case "Parallax":
      className += instant ? "" : " transition-transform";
      if (isActive) className += " translate-x-0 z-10 pointer-events-auto";
      else if (isExiting) className += " -translate-x-full z-0 pointer-events-none";
      else className += " translate-x-full z-0 pointer-events-none";
      break;
    case "KenBurns":
      className += instant ? "" : " transition-opacity";
      if (isActive) className += " opacity-100 z-10 pointer-events-auto";
      else className += " opacity-0 z-0 pointer-events-none";
      break;
    case "None":
      if (isActive) className += " opacity-100 z-10 pointer-events-auto";
      else className += " opacity-0 z-0 pointer-events-none";
      break;
    default:
      if (isActive) className += " opacity-100 z-10 pointer-events-auto";
      else className += " opacity-0 z-0 pointer-events-none";
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
  const isActive = index === current;
  const isExiting = index === previous;
  const instant = transition === "None" || transitionDuration <= 0;

  if (transition === "Parallax") {
    const style: React.CSSProperties = instant
      ? {}
      : {
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

  if (transition === "KenBurns") {
    const style: React.CSSProperties = instant
      ? {}
      : {
          transitionProperty: "transform",
          transitionDuration: `${transitionDuration}ms`,
          transitionTimingFunction: "ease-in-out",
        };

    let className = "object-cover absolute inset-0";

    if (isActive) style.transform = "scale(1)";
    else if (isExiting) style.transform = "scale(1.12)";
    else style.transform = "scale(1.12)";

    return { className, style };
  }

  return {
    className: "object-cover",
    style: {},
  };
}
