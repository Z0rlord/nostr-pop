import { NextRequest, NextResponse } from "next/server";

export interface ApiError {
  message: string;
  status: number;
  code?: string;
}

export function handleApiError(
  error: unknown,
  context?: Record<string, unknown>
): NextResponse {
  console.error("API Error:", error, context);

  let status = 500;
  let message = "Internal server error";
  let code = "INTERNAL_ERROR";

  if (error instanceof Error) {
    if (error.name === "PrismaClientKnownRequestError") {
      status = 400;
      message = "Database request failed";
      code = "DATABASE_ERROR";
    }
    if (error.message.includes("unauthorized") || error.message.includes("UNAUTHORIZED")) {
      status = 401;
      message = "Unauthorized";
      code = "UNAUTHORIZED";
    }
    if (error.message.includes("not found") || error.message.includes("NOT_FOUND")) {
      status = 404;
      message = "Resource not found";
      code = "NOT_FOUND";
    }
  }

  return NextResponse.json(
    {
      error: message,
      code,
      ...(process.env.NODE_ENV === "development" && {
        details: error instanceof Error ? error.message : String(error),
      }),
    },
    { status }
  );
}

export function validateRequiredFields(
  body: Record<string, unknown>,
  required: string[]
): { valid: true } | { valid: false; missing: string[] } {
  const missing = required.filter((field) => {
    const value = body[field];
    return value === undefined || value === null || value === "";
  });

  if (missing.length > 0) {
    return { valid: false, missing };
  }

  return { valid: true };
}

export function createValidationError(missing: string[]): NextResponse {
  return NextResponse.json(
    {
      error: "Validation failed",
      code: "VALIDATION_ERROR",
      missing,
    },
    { status: 400 }
  );
}
