import { basename } from "jsr:@std/path@^1.0.8";

export interface ImportState {
  filePath: string;
  totalRecords: number;
  lastSuccessfulIndex: number;
  completedRefCodes: string[];
  timestamp: string;
}

export function getStateFilePath(csvPath: string): string {
  const fileBase = basename(csvPath).replace(/[^a-zA-Z0-9._-]/g, "_");
  return `.import_state_${fileBase}.json`;
}

export async function loadState(csvPath: string): Promise<ImportState | null> {
  const statePath = getStateFilePath(csvPath);
  try {
    const text = await Deno.readTextFile(statePath);
    return JSON.parse(text) as ImportState;
  } catch (_e) {
    return null;
  }
}

export async function saveState(state: ImportState): Promise<void> {
  const statePath = getStateFilePath(state.filePath);
  try {
    await Deno.writeTextFile(statePath, JSON.stringify(state, null, 2));
  } catch (e) {
    console.warn(`Warning: Could not save import state to '${statePath}':`, e);
  }
}

export async function clearState(csvPath: string): Promise<void> {
  const statePath = getStateFilePath(csvPath);
  try {
    await Deno.remove(statePath);
  } catch (_e) {
    // Ignore error if file doesn't exist
  }
}
