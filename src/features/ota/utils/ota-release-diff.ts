import type {
  OtaFileChange,
  OtaManifest,
  OtaReleaseDiff,
} from '../types/ota.types';

export function compareOtaManifests(base: OtaManifest, target: OtaManifest): OtaReleaseDiff {
  const paths = [...new Set([...Object.keys(base.files), ...Object.keys(target.files)])]
    .sort((left, right) => left.localeCompare(right));
  const files: OtaFileChange[] = paths.map((path) => {
    const previous = base.files[path];
    const current = target.files[path];
    if (!previous && current) {
      return {
        path,
        kind: 'added',
        currentSize: current.size,
        sizeDelta: current.size,
        currentSha256: current.sha256,
      };
    }
    if (previous && !current) {
      return {
        path,
        kind: 'deleted',
        previousSize: previous.size,
        sizeDelta: -previous.size,
        previousSha256: previous.sha256,
      };
    }
    if (!previous || !current) throw new Error('otaManifestInvalid');
    const modified = previous.sha256 !== current.sha256;
    return {
      path,
      kind: modified ? 'modified' : 'unchanged',
      previousSize: previous.size,
      currentSize: current.size,
      sizeDelta: current.size - previous.size,
      previousSha256: previous.sha256,
      currentSha256: current.sha256,
    };
  });

  const byKind = (kind: OtaFileChange['kind']) => files.filter((file) => file.kind === kind);
  const added = byKind('added');
  const modified = byKind('modified');
  const deleted = byKind('deleted');
  const unchanged = byKind('unchanged');
  const addedBytes = added.reduce((total, file) => total + (file.currentSize ?? 0), 0);
  const modifiedDownloadBytes = modified.reduce((total, file) => total + (file.currentSize ?? 0), 0);

  return {
    base: {
      releaseId: base.releaseId,
      version: base.version,
      size: base.size,
      fileCount: base.fileCount,
    },
    target: {
      releaseId: target.releaseId,
      version: target.version,
      size: target.size,
      fileCount: target.fileCount,
    },
    summary: {
      addedCount: added.length,
      modifiedCount: modified.length,
      deletedCount: deleted.length,
      unchangedCount: unchanged.length,
      addedBytes,
      modifiedDownloadBytes,
      deletedBytes: deleted.reduce((total, file) => total + (file.previousSize ?? 0), 0),
      unchangedBytes: unchanged.reduce((total, file) => total + (file.currentSize ?? 0), 0),
      downloadBytes: addedBytes + modifiedDownloadBytes,
      totalSizeDelta: target.size - base.size,
    },
    files,
  };
}
