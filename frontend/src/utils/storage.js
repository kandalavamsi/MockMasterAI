const HISTORY_KEY = "mockmasterai.mockTestHistory";
const HISTORY_LIMIT = 20;

export function getMockTestHistory() {
  let stored;
  try {
    stored = window.localStorage.getItem(HISTORY_KEY);
  } catch {
    throw new Error("This browser does not allow access to local storage.");
  }

  if (!stored) return [];

  try {
    const history = JSON.parse(stored);
    if (!Array.isArray(history)) {
      throw new Error("Saved history has an unexpected format.");
    }
    return history;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error("Saved test history could not be read. Clear browser data to reset it.");
    }
    throw error;
  }
}

export function saveMockTestResult(result) {
  const history = getMockTestHistory();
  const updatedHistory = [result, ...history].slice(0, HISTORY_LIMIT);
  try {
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(updatedHistory));
  } catch {
    throw new Error("The result could not be saved to browser history.");
  }
  return updatedHistory;
}

export function clearMockTestHistory() {
  try {
    window.localStorage.removeItem(HISTORY_KEY);
  } catch {
    throw new Error("Saved history could not be cleared from this browser.");
  }
}
