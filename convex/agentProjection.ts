import type { Doc } from "./_generated/dataModel";
import type { AgentCategory } from "../shared/agentAccess";

const fields: Record<AgentCategory, readonly string[]> = {
  people: [
    "firstName",
    "lastName",
    "relationship",
    "dateOfBirth",
    "email",
    "phone",
    "drivingLicenseDate",
    "drivingLicenseExpiryDate",
    "passportExpiryDate",
    "lifeInsuranceProvider",
    "lifeInsuranceCover",
    "lifeInsuranceExpiryDate",
  ],
  vehicles: [
    "make",
    "model",
    "year",
    "color",
    "licensePlate",
    "registrationExpiry",
    "insuranceProvider",
    "insuranceExpiry",
    "motExpiry",
    "serviceInterval",
    "nextServiceDueDate",
    "insuredAt",
    "addedToDart",
  ],
  homes: [
    "nickname",
    "address",
    "city",
    "state",
    "postalCode",
    "country",
    "propertyType",
    "ownership",
    "purchaseDate",
    "purchasePrice",
    "mortgageProvider",
    "mortgageBalance",
    "insuranceProvider",
    "insuranceExpiry",
    "councilTaxBand",
  ],
  mobileContracts: [
    "provider",
    "phoneNumber",
    "monthlyCost",
    "contractType",
    "registeredAt",
    "contractStartDate",
    "contractEndDate",
    "dataAllowance",
    "archived",
  ],
  documents: ["personId", "documentType", "fileName", "uploadedAt"],
};
const identityFields = [
  "drivingLicenseNumber",
  "passportNumber",
  "nationalInsuranceNumber",
  "nhsNumber",
  "lifeInsurancePolicyNumber",
];

export function projectAgentRecord(
  category: AgentCategory,
  row: Doc<AgentCategory>,
  allowIdentityNumbers: boolean,
) {
  const source = row as unknown as Record<string, unknown>;
  const selected = [
    ...fields[category],
    ...(category === "people" && allowIdentityNumbers ? identityFields : []),
    ...(category === "vehicles" && allowIdentityNumbers ? ["vin"] : []),
  ];
  const safe: Record<string, string | number | boolean> = {};
  for (const field of selected) {
    const value = source[field];
    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    )
      safe[field] = value;
  }
  const text = (key: string) =>
    typeof safe[key] === "string" ? safe[key] : "";
  const label =
    category === "people"
      ? `${text("firstName")} ${text("lastName")}`.trim()
      : category === "vehicles"
        ? `${text("make")} ${text("model")} ${safe.year ?? ""}`.trim()
        : category === "homes"
          ? text("nickname")
          : category === "mobileContracts"
            ? `${text("provider")} ${text("phoneNumber")}`.trim()
            : text("fileName");
  return { id: row._id as string, category, label, fields: safe };
}

export const expiryFields: Partial<Record<AgentCategory, readonly string[]>> = {
  people: [
    "drivingLicenseExpiryDate",
    "passportExpiryDate",
    "lifeInsuranceExpiryDate",
  ],
  vehicles: [
    "registrationExpiry",
    "insuranceExpiry",
    "motExpiry",
    "nextServiceDueDate",
  ],
  homes: ["insuranceExpiry"],
  mobileContracts: ["contractEndDate"],
};

export function isDateOnly(value: string): boolean {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(value)) &&
    new Date(value).toISOString().slice(0, 10) === value
  );
}
