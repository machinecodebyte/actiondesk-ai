import pino, { type Logger, type LoggerOptions } from "pino";

export type { Logger } from "pino";

export type CreateLoggerOptions = {
  level?: string;
  service: string;
  environment?: string;
  version?: string;
  pretty?: boolean;
};

export type SerializedError = {
  name: string;
  message: string;
  stack?: string;
  code?: string;
  statusCode?: number;
  details?: unknown;
};

export function createLogger(options: CreateLoggerOptions): Logger {
  const loggerOptions: LoggerOptions = {
    level: options.level ?? "info",
    base: {
      service: options.service,
      environment: options.environment ?? "development",
      version: options.version ?? "0.1.0"
    },
    serializers: {
      err: serializeError,
      error: serializeError
    }
  };

  if (options.pretty) {
    loggerOptions.transport = {
      target: "pino-pretty",
      options: {
        colorize: true,
        ignore: "pid,hostname"
      }
    };
  }

  return pino(loggerOptions);
}

export function childLogger(
  logger: Logger,
  bindings: Record<string, string | number | boolean | undefined>
): Logger {
  return logger.child(bindings);
}

export function loggerWithRequestId(logger: Logger, requestId: string): Logger {
  return childLogger(logger, { requestId });
}

export function serializeError(error: unknown): SerializedError {
  if (error instanceof Error) {
    const serialized: SerializedError = {
      name: error.name,
      message: error.message
    };

    if (error.stack) {
      serialized.stack = error.stack;
    }

    const code = readStringProperty(error, "code");
    if (code) {
      serialized.code = code;
    }

    const statusCode = readNumberProperty(error, "statusCode");
    if (statusCode !== undefined) {
      serialized.statusCode = statusCode;
    }

    const details = readUnknownProperty(error, "details");
    if (details !== undefined) {
      serialized.details = details;
    }

    return serialized;
  }

  const serialized: SerializedError = {
    name: "UnknownError",
    message: typeof error === "string" ? error : "An unknown error occurred"
  };

  if (error !== undefined) {
    serialized.details = error;
  }

  return serialized;
}

function readStringProperty(value: object, key: string): string | undefined {
  const property = Reflect.get(value, key);
  return typeof property === "string" ? property : undefined;
}

function readNumberProperty(value: object, key: string): number | undefined {
  const property = Reflect.get(value, key);
  return typeof property === "number" ? property : undefined;
}

function readUnknownProperty(value: object, key: string): unknown {
  return Reflect.get(value, key);
}
