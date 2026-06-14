export const ErrorCode = {
  BAD_REQUEST: "BAD_REQUEST",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  CONFLICT: "CONFLICT",
  VALIDATION_FAILED: "VALIDATION_FAILED",
  RATE_LIMITED: "RATE_LIMITED",
  SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",
  NOT_IMPLEMENTED: "NOT_IMPLEMENTED",
  INTERNAL_ERROR: "INTERNAL_ERROR"
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

export type AppErrorOptions = {
  code: ErrorCode;
  message: string;
  statusCode?: number;
  details?: unknown;
  expose?: boolean;
};

export type ErrorResponse = {
  error: {
    code: ErrorCode;
    message: string;
    requestId?: string;
    details?: unknown;
  };
};

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly statusCode: number;
  readonly details?: unknown;
  readonly expose: boolean;

  constructor(options: AppErrorOptions) {
    super(options.message);
    this.name = "AppError";
    this.code = options.code;
    this.statusCode = options.statusCode ?? statusForErrorCode(options.code);
    this.details = options.details;
    this.expose = options.expose ?? this.statusCode < 500;
  }
}

export function statusForErrorCode(code: ErrorCode): number {
  switch (code) {
    case ErrorCode.BAD_REQUEST:
    case ErrorCode.VALIDATION_FAILED:
      return 400;
    case ErrorCode.UNAUTHORIZED:
      return 401;
    case ErrorCode.FORBIDDEN:
      return 403;
    case ErrorCode.NOT_FOUND:
      return 404;
    case ErrorCode.CONFLICT:
      return 409;
    case ErrorCode.RATE_LIMITED:
      return 429;
    case ErrorCode.SERVICE_UNAVAILABLE:
      return 503;
    case ErrorCode.NOT_IMPLEMENTED:
      return 501;
    case ErrorCode.INTERNAL_ERROR:
    default:
      return 500;
  }
}

export function toErrorResponse(error: unknown, requestId?: string): ErrorResponse {
  if (error instanceof AppError) {
    const response: ErrorResponse["error"] = {
      code: error.code,
      message: error.expose ? error.message : "Internal server error"
    };

    if (requestId) {
      response.requestId = requestId;
    }

    if (error.expose && error.details !== undefined) {
      response.details = error.details;
    }

    return {
      error: response
    };
  }

  const response: ErrorResponse["error"] = {
    code: ErrorCode.INTERNAL_ERROR,
    message: "Internal server error"
  };

  if (requestId) {
    response.requestId = requestId;
  }

  return {
    error: response
  };
}
