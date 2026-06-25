import type {
  BaseRecord,
  CrudFilter,
  CreateManyParams,
  DataProvider,
  DeleteManyResponse,
  DeleteManyParams,
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
  error?: {
    code?: string;
    message?: string;
  };
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
    const errorMessage =
      payload.error?.message || payload.message || "Request failed";
    const error = new Error(errorMessage) as Error & {
      code?: string;
      response?: Response;
      statusCode?: number;
    };
    error.code = payload.error?.code ?? payload.code;
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
    if (!ids.length) {
      return { data: [] as TData[] };
    }

    const requestedIds = ids.map((id) => String(id));
    const query = new URLSearchParams();
    query.set("page", "1");
    query.set("limit", String(Math.max(requestedIds.length, 1)));
    requestedIds.forEach((id) => {
      query.append("ids", id);
    });

    const payload = await request<ApiListResponse<TData>>(
      `${resource}?${query.toString()}`,
    );
    const recordsById = new Map(
      payload.data.map((record) => [String(record.id), record]),
    );
    const records = requestedIds
      .map((id) => recordsById.get(id))
      .filter((record): record is TData => Boolean(record));

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
    params: CreateManyParams<TVariables>,
  ) => {
    // MVP batch writes fan out to the existing single-record endpoints.
    const items = (params as CreateManyParams<TVariables> & {
      data: TVariables[];
    }).data;
    const records = await Promise.all(
      items.map((variables: TVariables) =>
        request<ApiDataResponse<TData>>(params.resource, {
          method: "POST",
          body: JSON.stringify(variables ?? {}),
        }).then((payload) => payload.data),
      ),
    );

    return { data: records };
  },
  updateMany: async <
    TData extends BaseRecord = BaseRecord,
    TVariables = Record<string, unknown>,
  >(
    params: UpdateManyParams<TVariables>,
  ) => {
    const records = await Promise.all(
      params.ids.map((id) =>
        request<ApiDataResponse<TData>>(`${params.resource}/${id}`, {
          method: "PATCH",
          body: JSON.stringify(params.variables ?? {}),
        }).then((payload) => payload.data),
      ),
    );

    return { data: records as unknown as UpdateManyResponse<TData>["data"] };
  },
  deleteOne: async <
    TData extends BaseRecord = BaseRecord,
    TVariables = Record<string, unknown>,
  >(params: DeleteOneParams<TVariables>) => {
    // The backend MVP does not expose destructive delete endpoints yet.
    // Return the requested key shape so Refine can treat this as a no-op.
    return Promise.resolve({
      data: { id: params.id } as TData,
    });
  },
  deleteMany: async <
    TData extends BaseRecord = BaseRecord,
    TVariables = Record<string, unknown>,
  >(
    params: DeleteManyParams<TVariables>,
  ) => {
    // Delete UI is not wired to destructive backend routes yet.
    return {
      data: params.ids as unknown as DeleteManyResponse<TData>["data"],
    };
  },
  custom: async () => {
    await notImplemented("custom");
    return {} as never;
  },
};
