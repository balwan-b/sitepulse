export const buildPagination = (page: number, limit: number, total: number) => ({
  page,
  limit,
  total,
  totalPages: limit > 0 ? Math.ceil(total / limit) : 0,
});

export const buildPaginatedResponse = <T>(
  data: T[],
  page: number,
  limit: number,
  total: number,
) => ({
  data,
  pagination: buildPagination(page, limit, total),
});

export const buildDataResponse = <T>(data: T) => ({ data });
