import type {
  BaseRecord,
  CrudFilter,
  CreateManyParams,
  DataProvider,
  DeleteManyResponse,
  DeleteManyParams,
  DeleteOneResponse,
  DeleteOneParams,
  GetListParams,
  GetManyParams,
  GetOneParams,
  CreateParams,
  UpdateParams,
  UpdateManyResponse,
  UpdateManyParams,
} from "@refinedev/core";

import { API_URL } from "@/constants";

type ApiListResponse<T> = {
  data: T[];
  pagination: {
    total: number;
  };
};

type ApiDataResponse<T> = {
  data: T;
};

type ApiErrorPayload = {
  code?: string;
  message?: string;
};

const buildQueryString = (
  pagination?: GetListParams["pagination"],
  filters?: CrudFilter[],
) => {
  const query = new URLSearchParams();
  const currentPage = pagination?.currentPage ?? 1;
  const pageSize = pagination?.pageSize ?? 10;

  query.set("page", String(currentPage));
  query.set("limit", String(pageSize));

  filters?.forEach((filter) => {
    if ("field" in filter && filter.value != null && filter.operator === "eq") {
      query.set(filter.field, String(filter.value));
    }
  });

  return query.toString();
};

const request = async <T>(
  path: string,
  options: RequestInit = {},
): Promise<T> => {
  const response = await fetch(`${API_URL}/${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
    ...options,
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as ApiErrorPayload;
    const error = new Error(payload.message || "Request failed") as Error & {
      code?: string;
      response?: Response;
      statusCode?: number;
    };
    error.code = payload.code;
    error.response = response;
    error.statusCode = response.status;
    throw error;
  }

  return (await response.json()) as T;
};

const notImplemented = async (operation: string) => {
  throw new Error(`${operation} is not implemented.`);
};

export const dataProvider: DataProvider = {
  getApiUrl: () => API_URL,
  getList: async <TData extends BaseRecord = BaseRecord>(params: GetListParams) => {
    const { resource, pagination, filters } = params as GetListParams & {
      resource: string;
    };
    const query = buildQueryString(pagination, filters);
    const payload = await request<ApiListResponse<TData>>(
      `${resource}${query ? `?${query}` : ""}`,
    );

    return {
      data: payload.data,
      total: payload.pagination.total,
    };
  },
  getOne: async <TData extends BaseRecord = BaseRecord>(params: GetOneParams) => {
    const { resource, id } = params as GetOneParams & { resource: string };
    const payload = await request<ApiDataResponse<TData>>(`${resource}/${id}`);

    return {
      data: payload.data,
    };
  },
  getMany: async <TData extends BaseRecord = BaseRecord>(params: GetManyParams) => {
    const { resource, ids } = params as GetManyParams & { resource: string };
    const records = await Promise.all(
      ids.map((id: string | number) =>
        request<ApiDataResponse<TData>>(`${resource}/${id}`).then(
          (payload) => payload.data,
        ),
      ),
    );

    return {
      data: records,
    };
  },
  create: async <
    TData extends BaseRecord = BaseRecord,
    TVariables = Record<string, unknown>,
  >(
    params: CreateParams<TVariables>,
  ) => {
    const { resource, variables } = params as CreateParams<TVariables> & {
      resource: string;
    };
    const payload = await request<ApiDataResponse<TData>>(resource, {
      method: "POST",
      body: JSON.stringify(variables ?? {}),
    });

    return {
      data: payload.data,
    };
  },
  update: async <
    TData extends BaseRecord = BaseRecord,
    TVariables = Record<string, unknown>,
  >(
    params: UpdateParams<TVariables>,
  ) => {
    const { resource, id, variables } = params as UpdateParams<TVariables> & {
      resource: string;
    };
    const payload = await request<ApiDataResponse<TData>>(`${resource}/${id}`, {
      method: "PATCH",
      body: JSON.stringify(variables ?? {}),
    });

    return {
      data: payload.data,
    };
  },
  createMany: async <
    TData extends BaseRecord = BaseRecord,
    TVariables = Record<string, unknown>,
  >(
    _params: CreateManyParams<TVariables>,
  ) => {
    void _params;
    await notImplemented("createMany");
    return { data: [] as TData[] };
  },
  updateMany: async <
    TData extends BaseRecord = BaseRecord,
    TVariables = Record<string, unknown>,
  >(
    _params: UpdateManyParams<TVariables>,
  ) => {
    void _params;
    await notImplemented("updateMany");
    return { data: [] as UpdateManyResponse<TData>["data"] };
  },
  deleteOne: async <
    TData extends BaseRecord = BaseRecord,
    TVariables = Record<string, unknown>,
  >(
    _params: DeleteOneParams<TVariables>,
  ) => {
    void _params;
    await notImplemented("deleteOne");
    return { data: {} as DeleteOneResponse<TData>["data"] };
  },
  deleteMany: async <
    TData extends BaseRecord = BaseRecord,
    TVariables = Record<string, unknown>,
  >(
    _params: DeleteManyParams<TVariables>,
  ) => {
    void _params;
    await notImplemented("deleteMany");
    return { data: [] as DeleteManyResponse<TData>["data"] };
  },
  custom: async () => {
    await notImplemented("custom");
    return {} as never;
  },
};
