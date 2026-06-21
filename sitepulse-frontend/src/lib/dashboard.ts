import { API_URL } from "@/constants";
import type { DashboardRecord, ProjectTimelineEventRecord } from "@/types";

type ApiDataResponse<T> = {
  data: T;
};

type ApiListResponse<T> = {
  data: T[];
  pagination: {
    total: number;
  };
};

type ApiErrorPayload = {
  message?: string;
};

const readErrorMessage = async (response: Response) => {
  const payload = (await response.json().catch(() => ({}))) as ApiErrorPayload;
  return payload.message || "Request failed";
};

const request = async <T>(path: string) => {
  const response = await fetch(`${API_URL}/${path}`, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  return (await response.json()) as T;
};

export const fetchDashboardSnapshot = async () => {
  const payload = await request<ApiDataResponse<DashboardRecord>>("dashboard");
  return payload.data;
};

export const fetchProjectTimeline = async (projectId: string, limit = 8) => {
  const payload = await request<ApiListResponse<ProjectTimelineEventRecord>>(
    `projects/${projectId}/timeline?page=1&limit=${limit}`,
  );
  return payload.data;
};
