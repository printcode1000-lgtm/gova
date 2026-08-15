/** Single responsibility: identify the recoverable old-manifest/new-file publication race. */
export class OtaStaleRemoteFileError extends Error {
  constructor(readonly filePath: string) {
    super(`OTA remote file checksum mismatch: ${filePath}`);
    this.name = "OtaStaleRemoteFileError";
  }
}
