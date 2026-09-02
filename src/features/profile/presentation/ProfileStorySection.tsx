"use client";

import { faBookOpen } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

export function ProfileStorySection({
  story,
  expanded,
  setExpanded,
  title,
  hint,
}: {
  story: string;
  expanded: boolean;
  setExpanded: (next: boolean | ((current: boolean) => boolean)) => void;
  title: string;
  hint: string;
}) {
  return (
    <section id='features-profile-presentation-profilestorysection-section-1-kfdzn9'
      data-snapshot-expanded="profile-preview-story"
      aria-expanded={expanded}
      className="mx-2 min-w-0 rounded-3xl border border-outline-variant/70 bg-gradient-to-br from-primary/5 to-secondary/5 p-4 shadow-sm sm:mx-0 sm:p-7"
    >
      <button id='features-profile-presentation-profilestorysection-button-2-hh13nv'
        type="button"
        onClick={() => setExpanded((current) => !current)}
        className="flex w-full min-w-0 items-center gap-3 text-start"
      >
        <span id='features-profile-presentation-profilestorysection-text-3-vgrzlf' className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-lg text-primary sm:h-12 sm:w-12 sm:text-xl">
          <FontAwesomeIcon id='features-profile-presentation-profilestorysection-fontawesomeicon-4-gk4e4o' icon={faBookOpen} />
        </span>
        <span id='features-profile-presentation-profilestorysection-text-5-ut7ywd' className="min-w-0 flex-1">
          <strong id="features-profile-presentation-profilestorysection-strong-6-zuuf6x" className="block break-words text-base sm:text-lg">{title}</strong>
          <span id='features-profile-presentation-profilestorysection-text-7-zdcoyx' className="block break-words text-xs text-on-surface-variant">{hint}</span>
        </span>
        <FontAwesomeIcon id='features-profile-presentation-profilestorysection-fontawesomeicon-8-doztwh'
          icon={faBookOpen}
          className={`flex-shrink-0 text-primary transition-transform ${expanded ? "scale-110" : "opacity-60"}`}
        />
      </button>
      {expanded ? (
        <p id='features-profile-presentation-profilestorysection-text-9-ojccz9' className="mt-5 whitespace-pre-wrap break-words border-t border-outline-variant/60 pt-5 text-sm leading-8 text-on-surface-variant">
          {story}
        </p>
      ) : null}
    </section>
  );
}
