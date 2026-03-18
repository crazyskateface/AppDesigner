import type {
  AppArchetype,
  EntityConfig,
  FieldType,
  PageLayout,
  PageType,
  SectionEmphasis,
  SectionPlacement,
  SectionType,
} from "@/lib/domain/app-spec/types";

type EntityTemplate = {
  id: string;
  name: string;
  fields: Array<{ key: string; label: string; type: FieldType }>;
  keywords?: string[];
};

type PageTemplate = {
  id: string;
  title: string;
  pageType: PageType;
  pageLayout: PageLayout;
  entityIds: string[];
  sections: Array<{
    id: string;
    type: SectionType;
    title: string;
    entityId?: string;
    placement?: SectionPlacement;
    emphasis?: SectionEmphasis;
  }>;
};

export type ArchetypeTemplate = {
  archetype: AppArchetype;
  defaultTitle: string;
  description: string;
  entities: EntityTemplate[];
  pages: PageTemplate[];
};

export const promptExamples = [
  "Build a lightweight CRM for a solo consultant to track leads, meetings, and deal stages.",
  "Create a booking app for a boutique fitness studio to manage classes and reservations.",
  "Design a creator dashboard for a newsletter operator to track content and sponsors.",
  "Make an inventory app for a furniture brand to manage SKUs, suppliers, and purchase orders.",
];

export const supportedAppTypes = [
  {
    title: "CRM",
    description: "Lead, deal, and pipeline structure for founder-led sales or consulting workflows.",
  },
  {
    title: "Booking",
    description: "Reservations, schedules, and service operations for classes, appointments, or sessions.",
  },
  {
    title: "Creator",
    description: "Content, campaigns, and sponsor workflows for newsletter or media operators.",
  },
  {
    title: "Inventory",
    description: "Products, suppliers, and purchase-order structure for stock-driven businesses.",
  },
];

export const archetypeTemplates: Record<AppArchetype, ArchetypeTemplate> = {
  crm: {
    archetype: "crm",
    defaultTitle: "Pipeline CRM",
    description: "A lightweight CRM structure for tracking leads and deals.",
    entities: [
      entity("lead", "Lead", [
        field("name", "Name", "text"),
        field("company", "Company", "text"),
        field("stage", "Stage", "status"),
        field("nextStep", "Next step", "text"),
      ]),
      entity(
        "company",
        "Company",
        [
          field("name", "Name", "text"),
          field("industry", "Industry", "text"),
          field("status", "Status", "status"),
        ],
        ["company", "client"],
      ),
      entity("deal", "Deal", [
        field("name", "Deal name", "text"),
        field("stage", "Stage", "status"),
        field("closeDate", "Close date", "date"),
      ]),
    ],
    pages: [
      page("dashboard", "Dashboard", "dashboard", "dashboard", ["lead", "deal"], [
        section("dashboard-stats", "stats", "Key stats", { placement: "full", emphasis: "hero" }),
        section("dashboard-activity", "activity", "Recent activity", { entityId: "lead", placement: "secondary" }),
      ]),
      page("leads", "Leads", "list", "two-column", ["lead"], [
        section("leads-table", "table", "Lead table", { entityId: "lead", placement: "main" }),
        section("leads-list", "list", "Lead segments", {
          entityId: "lead",
          placement: "secondary",
          emphasis: "compact",
        }),
      ]),
      page("pipeline", "Pipeline", "list", "two-column", ["deal"], [
        section("pipeline-list", "list", "Deal stages", { entityId: "deal", placement: "main" }),
        section("pipeline-activity", "activity", "Open follow-ups", { entityId: "deal", placement: "secondary" }),
      ]),
      page("settings", "Settings", "settings", "stack", [], [
        section("settings-form", "form", "CRM settings", { placement: "main" }),
      ]),
    ],
  },
  booking: {
    archetype: "booking",
    defaultTitle: "Booking Workspace",
    description: "A scheduling and reservations structure for services and appointments.",
    entities: [
      entity("booking", "Booking", [
        field("reference", "Reference", "text"),
        field("status", "Status", "status"),
        field("date", "Date", "date"),
      ]),
      entity(
        "customer",
        "Customer",
        [
          field("name", "Name", "text"),
          field("email", "Email", "text"),
          field("status", "Status", "status"),
        ],
        ["customer", "member", "client"],
      ),
      entity(
        "service",
        "Service",
        [
          field("name", "Name", "text"),
          field("duration", "Duration", "number"),
          field("status", "Status", "status"),
        ],
        ["service", "class", "session"],
      ),
    ],
    pages: [
      page("dashboard", "Dashboard", "dashboard", "dashboard", ["booking"], [
        section("booking-stats", "stats", "Booking stats", { placement: "full", emphasis: "hero" }),
        section("booking-activity", "activity", "Upcoming changes", {
          entityId: "booking",
          placement: "secondary",
        }),
      ]),
      page("bookings", "Bookings", "list", "two-column", ["booking"], [
        section("bookings-table", "table", "Booking table", { entityId: "booking", placement: "main" }),
        section("bookings-form", "form", "New booking flow", { entityId: "booking", placement: "secondary" }),
      ]),
      page("calendar", "Calendar", "calendar", "two-column", ["booking", "service"], [
        section("calendar-list", "list", "Schedule blocks", { entityId: "booking", placement: "main" }),
        section("calendar-form", "form", "Availability controls", {
          entityId: "service",
          placement: "secondary",
          emphasis: "compact",
        }),
      ]),
      page("settings", "Settings", "settings", "stack", [], [
        section("booking-settings", "form", "Booking settings", { placement: "main" }),
      ]),
    ],
  },
  creator: {
    archetype: "creator",
    defaultTitle: "Creator Dashboard",
    description: "A creator-oriented workspace for content, campaigns, and sponsor ops.",
    entities: [
      entity("content", "Content", [
        field("title", "Title", "text"),
        field("status", "Status", "status"),
        field("publishDate", "Publish date", "date"),
      ]),
      entity(
        "campaign",
        "Campaign",
        [
          field("name", "Name", "text"),
          field("status", "Status", "status"),
          field("date", "Date", "date"),
        ],
        ["campaign", "launch"],
      ),
      entity(
        "sponsor",
        "Sponsor",
        [
          field("name", "Name", "text"),
          field("status", "Status", "status"),
          field("contact", "Contact", "text"),
        ],
        ["sponsor", "brand", "advertiser"],
      ),
    ],
    pages: [
      page("dashboard", "Dashboard", "dashboard", "dashboard", ["content", "campaign"], [
        section("creator-stats", "stats", "Creator stats", { placement: "full", emphasis: "hero" }),
        section("creator-activity", "activity", "Publishing activity", {
          entityId: "content",
          placement: "secondary",
        }),
      ]),
      page("content", "Content", "list", "two-column", ["content"], [
        section("content-list", "list", "Content queue", {
          entityId: "content",
          placement: "secondary",
          emphasis: "compact",
        }),
        section("content-table", "table", "Content table", { entityId: "content", placement: "main" }),
      ]),
      page("campaigns", "Campaigns", "list", "two-column", ["campaign", "sponsor"], [
        section("campaigns-list", "list", "Campaigns", { entityId: "campaign", placement: "main" }),
        section("campaigns-activity", "activity", "Sponsor coordination", {
          entityId: "sponsor",
          placement: "secondary",
        }),
      ]),
      page("settings", "Settings", "settings", "stack", [], [
        section("creator-settings", "form", "Creator settings", { placement: "main" }),
      ]),
    ],
  },
  inventory: {
    archetype: "inventory",
    defaultTitle: "Inventory Workspace",
    description: "A lean stock-management structure for products and suppliers.",
    entities: [
      entity(
        "product",
        "Product",
        [
          field("name", "Name", "text"),
          field("status", "Status", "status"),
          field("sku", "SKU", "text"),
        ],
        ["product", "item"],
      ),
      entity("supplier", "Supplier", [
        field("name", "Name", "text"),
        field("status", "Status", "status"),
        field("contact", "Contact", "text"),
      ]),
      entity(
        "purchase-order",
        "Purchase Order",
        [
          field("reference", "Reference", "text"),
          field("status", "Status", "status"),
          field("eta", "ETA", "date"),
        ],
        ["purchase order", "purchase-order", "po"],
      ),
    ],
    pages: [
      page("dashboard", "Dashboard", "dashboard", "dashboard", ["product"], [
        section("inventory-stats", "stats", "Inventory stats", { placement: "full", emphasis: "hero" }),
        section("inventory-activity", "activity", "Stock movement", {
          entityId: "product",
          placement: "secondary",
        }),
      ]),
      page("inventory", "Inventory", "list", "two-column", ["product"], [
        section("inventory-table", "table", "Inventory table", { entityId: "product", placement: "main" }),
        section("inventory-list", "list", "Stock groups", {
          entityId: "product",
          placement: "secondary",
          emphasis: "compact",
        }),
      ]),
      page("suppliers", "Suppliers", "list", "two-column", ["supplier", "purchase-order"], [
        section("suppliers-table", "table", "Supplier table", { entityId: "supplier", placement: "main" }),
        section("suppliers-activity", "activity", "Purchase-order flow", {
          entityId: "purchase-order",
          placement: "secondary",
        }),
      ]),
      page("settings", "Settings", "settings", "stack", [], [
        section("inventory-settings", "form", "Inventory settings", { placement: "main" }),
      ]),
    ],
  },
};

function field(key: string, label: string, type: FieldType) {
  return { key, label, type };
}

function entity(id: string, name: string, fields: EntityConfig["fields"], keywords: string[] = []): EntityTemplate {
  return { id, name, fields, keywords };
}

function section(
  id: string,
  type: SectionType,
  title: string,
  options: {
    entityId?: string;
    placement?: SectionPlacement;
    emphasis?: SectionEmphasis;
  } = {},
) {
  return { id, type, title, ...options };
}

function page(
  id: string,
  title: string,
  pageType: PageType,
  pageLayout: PageLayout,
  entityIds: string[],
  sections: PageTemplate["sections"],
): PageTemplate {
  return { id, title, pageType, pageLayout, entityIds, sections };
}
