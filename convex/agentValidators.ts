import { v } from "convex/values";

export const agentCategory = v.union(
  v.literal("people"),
  v.literal("vehicles"),
  v.literal("homes"),
  v.literal("mobileContracts"),
  v.literal("documents"),
);
export const agentOperation = v.union(
  v.literal("search_records"),
  v.literal("get_record"),
  v.literal("get_upcoming_expiries"),
  v.literal("list_documents"),
);
export const agentOutcome = v.union(
  v.literal("allowed"),
  v.literal("denied"),
  v.literal("not_found"),
);
export const agentRecord = v.object({
  id: v.string(),
  category: agentCategory,
  label: v.string(),
  fields: v.record(v.string(), v.union(v.string(), v.number(), v.boolean())),
});
export const agentData = v.object({
  records: v.array(agentRecord),
  expiries: v.array(
    v.object({
      recordId: v.string(),
      category: agentCategory,
      label: v.string(),
      field: v.string(),
      date: v.string(),
    }),
  ),
  nextCursor: v.union(v.string(), v.null()),
});
export const agentErrorCode = v.union(
  v.literal("unauthorized"),
  v.literal("forbidden"),
  v.literal("not_found"),
  v.literal("rate_limited"),
  v.literal("invalid_request"),
);
export const agentResult = v.union(
  v.object({ ok: v.literal(true), data: agentData }),
  v.object({ ok: v.literal(false), code: agentErrorCode, message: v.string() }),
);
export const agentReadArgs = {
  operation: agentOperation,
  category: v.optional(agentCategory),
  recordId: v.optional(v.string()),
  personId: v.optional(v.string()),
  query: v.optional(v.string()),
  cursor: v.optional(v.string()),
  limit: v.optional(v.number()),
  from: v.optional(v.string()),
  through: v.optional(v.string()),
};
