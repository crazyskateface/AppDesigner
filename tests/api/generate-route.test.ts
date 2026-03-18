import assert from "node:assert/strict";
import test from "node:test";

import { POST } from "@/app/api/generate/route";

test("generate route rejects edit mode without currentSpec", async () => {
  const request = new Request("http://localhost/api/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt: "Add a calendar page for meetings and reschedules.",
      mode: "edit",
    }),
  });

  const response = await POST(request);
  const payload = (await response.json()) as { error?: string };

  assert.equal(response.status, 400);
  assert.equal(payload.error, "Please enter a more descriptive prompt about the app you want to build.");
});
