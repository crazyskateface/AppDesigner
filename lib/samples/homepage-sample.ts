import { appSpecSchema, type AppSpec } from "@/lib/domain/app-spec";

export const homepageSampleSpec: AppSpec = appSpecSchema.parse({
  appId: "sample-consultant-crm",
  prompt: "Build a lightweight CRM for a solo consultant to track leads, meetings, follow-ups, and deal stages.",
  title: "Consultant CRM",
  archetype: "crm",
  entities: [
    {
      id: "leads",
      name: "Leads",
      fields: [
        { key: "name", label: "Name", type: "text" },
        { key: "company", label: "Company", type: "text" },
        { key: "stage", label: "Stage", type: "status" },
        { key: "nextStep", label: "Next step", type: "text" },
      ],
    },
    {
      id: "meetings",
      name: "Meetings",
      fields: [
        { key: "title", label: "Title", type: "text" },
        { key: "date", label: "Date", type: "date" },
        { key: "attendee", label: "Attendee", type: "text" },
      ],
    },
  ],
  navigation: [
    { id: "overview-nav", label: "Overview", pageId: "overview" },
    { id: "pipeline-nav", label: "Pipeline", pageId: "pipeline" },
    { id: "meetings-nav", label: "Meetings", pageId: "meetings" },
  ],
  pages: [
    {
      id: "overview",
      title: "Overview",
      pageType: "dashboard",
      pageLayout: "dashboard",
      entityIds: ["leads", "meetings"],
      sections: [
        { id: "overview-stats", type: "stats", title: "Pipeline health", placement: "main", emphasis: "hero" },
        { id: "overview-activity", type: "activity", title: "Recent follow-ups", entityId: "leads", placement: "main", emphasis: "default" },
      ],
    },
    {
      id: "pipeline",
      title: "Pipeline",
      pageType: "list",
      pageLayout: "two-column",
      entityIds: ["leads"],
      sections: [
        { id: "pipeline-table", type: "table", title: "Lead pipeline", entityId: "leads", placement: "main", emphasis: "default" },
        { id: "pipeline-list", type: "list", title: "Next actions", entityId: "leads", placement: "secondary", emphasis: "compact" },
      ],
    },
    {
      id: "meetings",
      title: "Meetings",
      pageType: "calendar",
      pageLayout: "stack",
      entityIds: ["meetings"],
      sections: [
        { id: "meetings-schedule", type: "list", title: "Upcoming meetings", entityId: "meetings", placement: "main", emphasis: "default" },
      ],
    },
  ],
});
