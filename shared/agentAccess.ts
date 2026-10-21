export const agentCategories = [
  "people",
  "vehicles",
  "homes",
  "mobileContracts",
  "documents",
] as const;
export type AgentCategory = (typeof agentCategories)[number];

export const categoryLabels: Record<AgentCategory, string> = {
  people: "People",
  vehicles: "Vehicles",
  homes: "Homes",
  mobileContracts: "Mobile contracts",
  documents: "Document metadata",
};

export const agentOperations = [
  "search_records",
  "get_record",
  "get_upcoming_expiries",
  "list_documents",
] as const;
export type AgentOperation = (typeof agentOperations)[number];

export async function hashAgentToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(token),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

// Generate in the browser: the raw credential never becomes a Convex function argument.
export function generateAgentToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return `la_${Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}
