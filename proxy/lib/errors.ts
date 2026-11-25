/** Errors that map cleanly to HTTP responses. The watch shows `message` to the user. */
export class BridgeError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "BridgeError";
  }
}

export const notFound = (what: string) => new BridgeError(404, "not_found", `${what} not found`);
export const badRequest = (msg: string) => new BridgeError(400, "bad_request", msg);
export const unauthorized = () => new BridgeError(401, "unauthorized", "Missing or wrong x-bridge-key");
export const upstream = (msg: string, status = 502) => new BridgeError(status, "upstream_error", msg);
export const forbidden = (msg: string) => new BridgeError(403, "forbidden", msg);
