import assert from "node:assert/strict";
import test from "node:test";

import type { AppSpec } from "@/lib/domain/app-spec";
import { getEditGenerationNoopMessage } from "@/lib/builder/edit-generation-result";

const baseSpec: AppSpec = {
  appId: "consultant-crm",
  prompt: "Build a CRM for a solo consultant to track leads and meetings.",
  title: "Consultant CRM",
  archetype: "crm",
  entities: [
    {
      id: "lead",
      name: "Lead",
      fields: [
        { key: "name", label: "Name", type: "text" },
        { key: "stage", label: "Stage", type: "status" },
      ],
    },
  ],
  navigation: [{ id: "dashboard-nav", label: "Dashboard", pageId: "dashboard" }],
  pages: [
    {
      id: "dashboard",
      title: "Dashboard",
      pageType: "dashboard",
      pageLayout: "dashboard",
      entityIds: ["lead"],
      sections: [
        {
          id: "stats",
          type: "stats",
          title: "Key stats",
          entityId: "lead",
          placement: "full",
          emphasis: "hero",
        },
      ],
    },
  ],
};

test("edit generation noop message is null when the spec changed", () => {
  const nextSpec: AppSpec = {
    ...baseSpec,
    pages: [
      ...baseSpec.pages,
      {
        id: "settings",
        title: "Settings",
        pageType: "settings",
        pageLayout: "stack",
        entityIds: [],
        sections: [
          {
            id: "settings-form",
            type: "form",
            title: "Settings",
            placement: "main",
            emphasis: "default",
          },
        ],
      },
    ],
    navigation: [...baseSpec.navigation, { id: "settings-nav", label: "Settings", pageId: "settings" }],
  };

  assert.equal(getEditGenerationNoopMessage(baseSpec, nextSpec, "Add settings."), null);
});

test("edit generation noop falls back to a generic unchanged message when the spec did not change", () => {
  const message = getEditGenerationNoopMessage(
    baseSpec,
    baseSpec,
    "Add a section with text and video to the dashboard.",
  );

  assert.match(message ?? "", /left unchanged/i);
  assert.doesNotMatch(message ?? "", /not represented yet|only supports/i);
});
