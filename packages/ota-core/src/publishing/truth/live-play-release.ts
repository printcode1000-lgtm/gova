import { ok, err, type Result } from "../../errors/result";
import { OtaCoreError } from "../../errors/ota-core-error";
import {
  readLiveTrackVersionCodes,
  type LivePlayRelease,
} from "../adapters/google-play.adapter";

export type { LivePlayRelease };

export async function readLivePlayRelease(
  track: string,
): Promise<Result<LivePlayRelease | null, OtaCoreError>> {
  try {
    const release = await readLiveTrackVersionCodes(track);
    return ok(release);
  } catch (error) {
    return err(
      OtaCoreError.internal(`Failed to read live Google Play track ${track}`, error),
    );
  }
}
