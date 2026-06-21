import { API_URL } from "@/constants";
import type { ChangeOrderRecord } from "@/types";

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

const workflowRequest = async (
  path: string,
  body?: Record<string, unknown>,
) => {
  const response = await fetch(`${API_URL}/${path}`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body ?? {}),
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  const payload = (await response.json()) as ApiDataResponse<ChangeOrderRecord>;
  return payload.data;
};

export const submitChangeOrderRequest = async (id: string) =>
  workflowRequest(`change-orders/${id}/submit`);

export const approveChangeOrderRequest = async (
  id: string,
  values: {
    approvedAmount?: number | null;
    approvedDays?: number | null;
    reviewNotes?: string | null;
  },
) => workflowRequest(`change-orders/${id}/approve`, values);

export const rejectChangeOrderRequest = async (
  id: string,
  reviewNotes: string,
) => workflowRequest(`change-orders/${id}/reject`, { reviewNotes });
