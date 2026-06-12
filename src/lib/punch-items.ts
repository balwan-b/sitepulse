import { API_URL } from "@/constants";
import type { PunchItemRecord } from "@/types";

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

export const transitionPunchItemRequest = async (
  id: string,
  status: PunchItemRecord["status"],
) => {
  const response = await fetch(`${API_URL}/punch-items/${id}/transition`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ status }),
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  const payload = (await response.json()) as ApiDataResponse<PunchItemRecord>;
  return payload.data;
};
