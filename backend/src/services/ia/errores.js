export class ErrorIA extends Error {
  constructor(status, code, message, retryAfter) {
    super(message);
    Object.assign(this, { status, code, retryAfter });
  }
}
