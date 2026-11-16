import type { ProjectionFormState } from "../types/projection";
import { DEFAULT_FORM_STATE } from "./format";

const STORAGE_KEY = "pension.savedForm.v1";

export interface SavedFormSnapshot {
  savedAt: string;
  form: ProjectionFormState;
}

export function loadSavedForm(): SavedFormSnapshot | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SavedFormSnapshot>;
    if (!parsed || typeof parsed !== "object" || !parsed.form) {
      return null;
    }
    return {
      savedAt: typeof parsed.savedAt === "string" ? parsed.savedAt : new Date().toISOString(),
      form: {
        ...DEFAULT_FORM_STATE,
        ...parsed.form
      }
    };
  } catch {
    return null;
  }
}

export function saveFormSnapshot(form: ProjectionFormState): SavedFormSnapshot {
  const snapshot: SavedFormSnapshot = {
    savedAt: new Date().toISOString(),
    form
  };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // Ignore quota/private-mode storage errors gracefully
  }
  return snapshot;
}

export function clearSavedForm(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage errors
  }
}

export function formatSavedTimestamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export function exportFormJson(form: ProjectionFormState): void {
  const payload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    form
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json;charset=utf-8"
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `pension-inputs-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function parseImportedFormJson(rawText: string): ProjectionFormState {
  const parsed = JSON.parse(rawText) as { form?: Partial<ProjectionFormState> } | Partial<ProjectionFormState>;
  const candidate =
    parsed && typeof parsed === "object" && "form" in parsed && parsed.form
      ? parsed.form
      : (parsed as Partial<ProjectionFormState>);

  if (!candidate || typeof candidate !== "object" || !("userBirthDate" in candidate)) {
    throw new Error("올바른 입력값 JSON 파일이 아닙니다.");
  }

  return {
    ...DEFAULT_FORM_STATE,
    ...candidate
  };
}
