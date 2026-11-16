import type { ProjectionRequestPayload, ProjectionResponse } from "../types/projection";

export async function runProjection(
  payload: ProjectionRequestPayload,
  signal?: AbortSignal
): Promise<ProjectionResponse> {
  let response: Response;
  try {
    response = await fetch("/api/projections", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload),
      signal
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw err;
    }
    throw new Error(
      "서버에 연결할 수 없습니다. 백엔드 서버(python3 -m pension_service.server)가 실행 중인지 확인해 주세요."
    );
  }

  const rawText = await response.text();
  if (!rawText.trim()) {
    throw new Error(
      `백엔드 API 응답이 비어 있습니다 (HTTP ${response.status}). 'python3 -m pension_service.server'가 실행 중인지 확인해 주세요.`
    );
  }

  let data: (ProjectionResponse & { error?: string }) | null = null;
  try {
    data = JSON.parse(rawText) as ProjectionResponse & { error?: string };
  } catch {
    throw new Error(
      `서버 응답을 JSON으로 해석할 수 없습니다 (HTTP ${response.status}).`
    );
  }

  if (!response.ok) {
    throw new Error(data?.error || `프로젝션 요청 실패 (HTTP ${response.status})`);
  }
  return data;
}
