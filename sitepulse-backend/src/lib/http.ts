export class AppError extends Error {
  statusCode: number;
  code: string;
  details?: Record<string, unknown> | undefined;

  constructor(
    statusCode: number,
    code: string,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

/**
 * Convert any request failure into the client-facing API error envelope.
 */
export const buildClientErrorResponse = (error: unknown) => {
  if (error instanceof AppError) {
    return {
      statusCode: error.statusCode,
      body: {
        code: error.code,
        message: error.message,
        error: {
          code: error.code,
          message: error.message,
        },
      },
    };
  }

  return {
    statusCode: 500,
    body: {
      code: "INTERNAL_ERROR",
      message: "An unexpected SitePulse system error occurred.",
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected SitePulse system error occurred.",
      },
      // help_url could be added in future iterations for guidance
    },
  };
};

/**
 * Map low-level database errors onto stable application errors.
 */
export const classifyDbError = (error: unknown) => {
  const message = error instanceof Error ? error.message.toLowerCase() : "";

  if (
    message.includes("duplicate") ||
    message.includes("unique constraint") ||
    message.includes("already exists")
  ) {
    return {
      statusCode: 409,
      code: "DUPLICATE_RECORD",
      message: "The requested record already exists.",
    };
  }

  if (message.includes("foreign key")) {
    return {
      statusCode: 400,
      code: "RELATIONSHIP_VIOLATION",
      message: "A referenced SitePulse record could not be validated.",
    };
  }

  return {
    statusCode: 500,
    code: "DATABASE_ERROR",
    message: "The SitePulse data request could not be completed.",
  };
};

/**
 * Ensure every thrown value becomes an AppError before it leaves service code.
 */
export const asAppError = (error: unknown) => {
  if (error instanceof AppError) {
    return error;
  }

  const classified = classifyDbError(error);
  return new AppError(
    classified.statusCode,
    classified.code,
    classified.message,
  );
};
