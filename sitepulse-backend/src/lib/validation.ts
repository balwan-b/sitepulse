import { AppError } from "./http.js";
import { FIELD_LIMITS, TEXT_PATTERNS } from "./field-policies.js";

type TextOptions = {
  field: string;
  min?: number;
  max: number;
  pattern?: RegExp;
  uppercase?: boolean;
};

const CONTROL_CHAR_PATTERN = /[\u0000-\u001F\u007F]/g;

const collapseWhitespace = (value: string) => value.replace(/\s+/g, " ").trim();

export const sanitizeText = (
  value: unknown,
  { field, min = 1, max, pattern, uppercase = false }: TextOptions,
) => {
  if (typeof value !== "string") {
    throw new AppError(400, "VALIDATION_ERROR", `${field} must be a string.`);
  }

  const cleaned = collapseWhitespace(
    value.replace(CONTROL_CHAR_PATTERN, "").replace(/^[\s.,;:!?-]+|[\s.,;:!?-]+$/g, ""),
  );

  const normalized = uppercase ? cleaned.toUpperCase() : cleaned;

  if (normalized.length < min) {
    throw new AppError(
      400,
      "VALIDATION_ERROR",
      `${field} must be at least ${min} characters.`,
    );
  }

  if (normalized.length > max) {
    throw new AppError(
      400,
      "VALIDATION_ERROR",
      `${field} must be at most ${max} characters.`,
    );
  }

  if (pattern && !pattern.test(normalized)) {
    throw new AppError(
      400,
      "VALIDATION_ERROR",
      `${field} contains unsupported characters.`,
    );
  }

  return normalized;
};

export const sanitizeOptionalText = (value: unknown, options: TextOptions) => {
  if (value == null || value === "") return null;
  return sanitizeText(value, { ...options, min: 0 });
};

export const sanitizePersonName = (value: unknown, field = "name") =>
  sanitizeText(value, {
    field,
    min: FIELD_LIMITS.name.min,
    max: FIELD_LIMITS.name.max,
    pattern: TEXT_PATTERNS.personName,
  });

export const sanitizeEmail = (value: unknown, field = "email") =>
  sanitizeText(value, {
    field,
    min: FIELD_LIMITS.email.min,
    max: FIELD_LIMITS.email.max,
    pattern: TEXT_PATTERNS.email,
  }).toLowerCase();

export const validateIdentifier = (value: unknown, field: string) =>
  sanitizeText(value, {
    field,
    min: FIELD_LIMITS.identifier.min,
    max: FIELD_LIMITS.identifier.max,
    pattern: TEXT_PATTERNS.identifier,
  });

export const assertEnumValue = <T extends readonly string[]>(
  value: unknown,
  allowedValues: T,
  field: string,
) => {
  if (typeof value !== "string" || !allowedValues.includes(value)) {
    throw new AppError(400, "VALIDATION_ERROR", `${field} is invalid.`);
  }

  return value as T[number];
};

export const parsePositiveInt = (
  value: unknown,
  field: string,
  {
    minimum = 1,
    maximum,
    fallback,
  }: { minimum?: number; maximum?: number; fallback?: number } = {},
) => {
  if ((value == null || value === "") && fallback != null) return fallback;

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < minimum) {
    throw new AppError(400, "VALIDATION_ERROR", `${field} must be a valid integer.`);
  }

  if (maximum != null && parsed > maximum) {
    throw new AppError(
      400,
      "VALIDATION_ERROR",
      `${field} must be at most ${maximum}.`,
    );
  }

  return parsed;
};

export const parseIsoDate = (value: unknown, field: string) => {
  if (typeof value !== "string") {
    throw new AppError(400, "VALIDATION_ERROR", `${field} must be a date string.`);
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    throw new AppError(400, "VALIDATION_ERROR", `${field} must be a valid date.`);
  }

  return parsed;
};

export const parseDateOnly = (value: unknown, field: string) => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new AppError(
      400,
      "VALIDATION_ERROR",
      `${field} must be a valid YYYY-MM-DD date.`,
    );
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);

  if (Number.isNaN(parsed.getTime())) {
    throw new AppError(400, "VALIDATION_ERROR", `${field} must be a valid date.`);
  }

  return parsed;
};
