import { AppError } from "../lib/http.js";
import { parsePositiveInt } from "../lib/validation.js";

export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 10;
export const MAX_LIMIT = 100;

/**
 * Parse the common page/limit query contract used by list endpoints.
 */
export const parsePagination = (query: Record<string, unknown>) => {
  const page = parsePositiveInt(query.page, "page", {
    fallback: DEFAULT_PAGE,
    maximum: 10_000,
  });
  const limit = parsePositiveInt(query.limit, "limit", {
    fallback: DEFAULT_LIMIT,
    maximum: MAX_LIMIT,
  });

  return {
    page,
    limit,
    offset: (page - 1) * limit,
  };
};

/**
 * Parse a comma-separated or repeated query param list into unique ids.
 */
export const parseIdList = (query: Record<string, unknown>, key = "ids") => {
  const raw = query[key];

  if (raw == null) {
    return null;
  }

  const values = Array.isArray(raw) ? raw : String(raw).split(",");
  const ids = values
    .map((value) => String(value).trim())
    .filter((value) => value.length > 0);

  return [...new Set(ids)];
};

/**
 * Normalize nullable dates for API responses.
 */
export const toIsoString = (value: Date | null) => value?.toISOString() ?? null;

export const assertRecord = <T>(record: T | undefined, message: string) => {
  if (!record) {
    throw new AppError(404, "NOT_FOUND", message);
  }

  return record;
};
