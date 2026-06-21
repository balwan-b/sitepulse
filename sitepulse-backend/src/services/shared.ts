import { AppError } from "../lib/http.js";
import { parsePositiveInt } from "../lib/validation.js";

export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 10;
export const MAX_LIMIT = 100;

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

export const toIsoString = (value: Date | null) => value?.toISOString() ?? null;

export const assertRecord = <T>(record: T | undefined, message: string) => {
  if (!record) {
    throw new AppError(404, "NOT_FOUND", message);
  }

  return record;
};
