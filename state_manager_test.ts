import { assertEquals, assertExists } from "@std/assert";
import {
  clearState,
  getStateFilePath,
  loadState,
  saveState,
} from "./state_manager.ts";

Deno.test("saveState, loadState, and clearState work as expected", async () => {
  const testCsv = "test_sample_river.csv";
  const statePath = getStateFilePath(testCsv);
  assertExists(statePath);

  // Clean up any existing state before test
  await clearState(testCsv);

  const initialState = await loadState(testCsv);
  assertEquals(initialState, null);

  // Save new state
  const mockState = {
    filePath: testCsv,
    totalRecords: 10,
    lastSuccessfulIndex: 4,
    completedRefCodes: ["REF1", "REF2", "REF3", "REF4", "REF5"],
    timestamp: new Date().toISOString(),
  };

  await saveState(mockState);

  // Load saved state
  const loadedState = await loadState(testCsv);
  assertExists(loadedState);
  assertEquals(loadedState?.totalRecords, 10);
  assertEquals(loadedState?.lastSuccessfulIndex, 4);
  assertEquals(loadedState?.completedRefCodes.length, 5);

  // Clear state
  await clearState(testCsv);
  const clearedState = await loadState(testCsv);
  assertEquals(clearedState, null);
});
