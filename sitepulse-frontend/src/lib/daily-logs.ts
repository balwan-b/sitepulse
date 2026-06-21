import { API_URL } from "@/constants";
import type { DailyLogRecord } from "@/types";

type ApiDataResponse<T> = {
  data: T;
};

type ApiErrorPayload = {
  message?: string;
};

const readErrorMessage = async (response: Response) => {
  const payload = (await response.json().catch(() => ({}))) as ApiErrorPayload;
  return payload.message || "Request failed";
};

export const submitDailyLogRequest = async (id: string) => {
  const response = await fetch(`${API_URL}/daily-logs/${id}/submit`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  const payload = (await response.json()) as ApiDataResponse<DailyLogRecord>;
  return payload.data;
};
