"use client";

import { Input } from "@/shared/ui/input";

/**
 * Why the confirm button is still disabled, and the one field that can unblock it.
 *
 * Split out of `ReleaseCommandConfirmDialog` because that file passed the
 * presentation contract's 200-line cap once its long lines were wrapped. These
 * blocks share one responsibility — telling the operator what is standing
 * between them and running the command — and none of them decides anything: the
 * dialog still owns the state and the confirm action.
 */
export function ReleaseCommandConfirmBlockers(props: {
  minimumNativeVersionRequired: boolean;
  minimumNativeVersionSatisfied: boolean;
  requiredParametersSatisfied: boolean;
  requiredPhrase: string;
  confirmedPhrase?: string;
  phrase: string;
  onPhraseChange: (value: string) => void;
  locked: boolean;
  t: (key: string) => string;
}) {
  const {
    minimumNativeVersionRequired,
    minimumNativeVersionSatisfied,
    requiredParametersSatisfied,
    requiredPhrase,
    confirmedPhrase,
    phrase,
    onPhraseChange,
    locked,
    t,
  } = props;
  return (
    <>
      {minimumNativeVersionRequired && !minimumNativeVersionSatisfied ? (
        <p
          id='google-play-console-presentation-components-releasecommandconfirmblockers-text-1-svvtng'
          role="alert"
          className="rounded-md bg-error-container p-2 text-on-error-container"
        >
          {t("releaseConsole.confirmRun.minimumNativeVersionRequired")}
        </p>
      ) : null}
      {!requiredParametersSatisfied ? (
        <p
          id='google-play-console-presentation-components-releasecommandconfirmblockers-text-2-qzln8u'
          role="alert"
          className="rounded-md bg-error-container p-2 text-on-error-container"
        >
          {t("releaseConsole.confirmRun.requiredParametersMissing")}
        </p>
      ) : null}
      {requiredPhrase && confirmedPhrase !== requiredPhrase ? (
        <div id='google-play-console-presentation-components-releasecommandconfirmblockers-div-3-zinyep' className="space-y-1">
          <p id='google-play-console-presentation-components-releasecommandconfirmblockers-text-4-qooe36'>
            {t("releaseConsole.build.confirmationExact").replace("{{phrase}}", requiredPhrase)}
          </p>
          <Input
            id='google-play-console-presentation-components-releasecommandconfirmblockers-input-5-r5xfit'
            value={phrase}
            placeholder={requiredPhrase}
            dir="ltr"
            onChange={(event) => onPhraseChange(event.target.value)}
          />
        </div>
      ) : null}
      {locked ? (
        <p id='google-play-console-presentation-components-releasecommandconfirmblockers-text-6-a2t7se' className="rounded-md bg-muted p-2">
          {t("releaseConsole.confirmRun.locked")}
        </p>
      ) : null}
    </>
  );
}
