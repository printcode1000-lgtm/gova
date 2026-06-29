export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class NetworkOfflineError extends Error {
  readonly code = 'NETWORK_OFFLINE';

  constructor() {
    super('No internet connection');
    this.name = 'NetworkOfflineError';
  }
}

export class NetworkUnavailableError extends Error {
  readonly code = 'NETWORK_UNAVAILABLE';

  constructor() {
    super('Unable to reach the server');
    this.name = 'NetworkUnavailableError';
  }
}
