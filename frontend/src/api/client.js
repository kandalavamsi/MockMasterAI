async function request(path, options) {
  let response;

  try {
    response = await fetch(path, options);
  } catch {
    throw new Error("Could not reach the backend. Check that it is running on port 8000.");
  }

  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const body = await response.json();
      if (typeof body.detail === "string") message = body.detail;
    } catch {
      // Keep the HTTP status message when the response body is not JSON.
    }
    throw new Error(message);
  }

  return response.json();
}

export function getHealth() {
  return request("/health");
}

export function getExamMetadata() {
  return request("/api/exams");
}

export function generatePaper(payload) {
  return request("/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function createMockTestJob(payload) {
  return request("/mock-test?async_mode=true", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function getMockTestJob(jobId) {
  return request(`/api/jobs/${encodeURIComponent(jobId)}`);
}
