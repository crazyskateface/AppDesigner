import type { EntityConfig, EntityField } from "@/lib/domain/app-spec/schema";

const statusValues = ["Active", "Pending", "Review", "Complete", "Open"];
const monthValues = ["Apr", "May", "Jun", "Jul", "Aug"];

export function fakeFieldValue(field: EntityField, entity: EntityConfig, index: number) {
  switch (field.type) {
    case "number":
      return String((index + 1) * 12);
    case "date":
      return `${monthValues[index % monthValues.length]} ${10 + index}`;
    case "status":
      return statusValues[index % statusValues.length];
    case "text":
    default:
      return fakeTextValue(field, entity, index);
  }
}

export function fakeStatValue(field: EntityField, index: number) {
  switch (field.type) {
    case "number":
      return String((index + 2) * 24);
    case "date":
      return `${7 + index}d`;
    case "status":
      return `${68 + index * 7}%`;
    case "text":
    default:
      return String((index + 1) * 18);
  }
}

export function fakeFormPlaceholder(field: EntityField, entity: EntityConfig, index: number) {
  const baseValue = fakeFieldValue(field, entity, index);
  return field.type === "status" ? `Select ${field.label.toLowerCase()}` : `Enter ${baseValue.toLowerCase()}`;
}

function fakeTextValue(field: EntityField, entity: EntityConfig, index: number) {
  const loweredKey = field.key.toLowerCase();
  const loweredLabel = field.label.toLowerCase();

  if (loweredKey.includes("email") || loweredLabel.includes("email")) {
    return `contact${index + 1}@example.com`;
  }

  if (loweredKey.includes("company") || loweredLabel.includes("company")) {
    return `Company ${index + 1}`;
  }

  if (loweredKey.includes("reference") || loweredLabel.includes("reference")) {
    return `REF-10${index + 1}`;
  }

  if (loweredKey.includes("sku") || loweredLabel.includes("sku")) {
    return `SKU-20${index + 1}`;
  }

  if (loweredKey.includes("contact") || loweredLabel.includes("contact")) {
    return `Contact ${index + 1}`;
  }

  return `${entity.name} ${index + 1}`;
}
