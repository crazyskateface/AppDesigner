import assert from "node:assert/strict";
import test from "node:test";

import { POST } from "@/app/api/orchestrator/plan/route";

test("orchestrator plan route rejects underspecified prompts", async () => {
  const request = new Request("http://localhost/api/orchestrator/plan", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt: "Build app",
    }),
  });

  const response = await POST(request);
  const payload = (await response.json()) as { error?: string };

  assert.equal(response.status, 400);
  assert.equal(payload.error, "Please enter a more descriptive prompt about the app you want to build.");
});
