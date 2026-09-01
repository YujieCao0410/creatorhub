/**
 * Application error hierarchy.
 *
 * Services throw these instead of returning error values or raw `Error`s.
 * The API layer (`handleApiError`) maps them to HTTP status codes and a
 * consistent JSON body, so route handlers never build error responses by hand.
 */
export class AppError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

/** Input failed validation (Zod or a business rule). 422. */
export class ValidationError extends AppError {
  constructor(details?: unknown, message = "Validation failed") {
    super(message, 422, "VALIDATION_ERROR", details);
  }
}

/** No valid session / not signed in. 401. */
export class AuthenticationError extends AppError {
  constructor(message = "Authentication required") {
    super(message, 401, "AUTHENTICATION_ERROR");
  }
}

/** Signed in, but not allowed to do this. 403. */
export class AuthorizationError extends AppError {
  constructor(message = "You do not have permission to perform this action") {
    super(message, 403, "AUTHORIZATION_ERROR");
  }
}

/** Resource does not exist (or is hidden from this user). 404. */
export class NotFoundError extends AppError {
  constructor(resource = "Resource") {
    super(`${resource} not found`, 404, "NOT_FOUND");
  }
}

/** Request conflicts with current state (e.g. duplicate email). 409. */
export class ConflictError extends AppError {
  constructor(message = "Resource already exists") {
    super(message, 409, "CONFLICT");
  }
}

/** Client has sent too many requests in a window. 429. */
export class RateLimitError extends AppError {
  constructor(retryAfterSeconds: number) {
    super("Too many requests. Please try again later.", 429, "RATE_LIMITED", {
      retryAfterSeconds,
    });
  }
}

/** A required Pro membership is missing. 402. */
export class PaymentRequiredError extends AppError {
  constructor(message = "This feature requires a Pro membership") {
    super(message, 402, "PAYMENT_REQUIRED");
  }
}

/** A dependency (e.g. billing) is not configured or is down. 503. */
export class ServiceUnavailableError extends AppError {
  constructor(message = "This service is temporarily unavailable") {
    super(message, 503, "SERVICE_UNAVAILABLE");
  }
}
