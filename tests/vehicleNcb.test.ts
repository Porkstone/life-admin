import { identityFor, registerAuth } from "./authHelpers";
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "../convex/_generated/api";
import schema from "../convex/schema";
import { getWholeYearsSince } from "../shared/calendarDates";

const modules = import.meta.glob([
  "../convex/**/*.{ts,js}",
  "!../convex/**/*.d.ts",
]);

describe("NCB completed years", () => {
  it.each([
    ["2020-10-23", 5], // Tomorrow's anniversary has not been reached.
    ["2020-10-22", 6],
    ["2020-10-21", 6],
    ["2026-01-01", 0],
    ["2026-10-22", 0],
    ["2027-01-01", 0],
    ["", null],
    ["2025-02-29", null],
  ])("calculates %s as %s whole years", (startDate, expected) => {
    expect(getWholeYearsSince(startDate, new Date(2026, 9, 22))).toBe(expected);
  });

  it("handles leap-day anniversaries without treating 365 days as a whole year", () => {
    expect(getWholeYearsSince("2024-02-29", new Date(2025, 1, 28))).toBe(0);
    expect(getWholeYearsSince("2024-02-29", new Date(2025, 2, 1))).toBe(1);
    expect(getWholeYearsSince("2024-02-29", new Date(2028, 1, 28))).toBe(3);
    expect(getWholeYearsSince("2024-02-29", new Date(2028, 1, 29))).toBe(4);
  });
});

describe("vehicle NCB persistence", () => {
  async function fixture() {
    const t = convexTest(schema, modules);
  registerAuth(t);
    const userId = await t.run((ctx) =>
      ctx.db.insert("users", { email: "ncb-test@example.test" }),
    );
    return t.withIdentity(await identityFor(t, userId));
  }
  const vehicle = { make: "Test", model: "Car", year: 2020 };

  it("supports existing vehicles, saves edits, preserves omitted dates and clears explicit null", async () => {
    const t = await fixture();
    const id = await t.mutation(api.vehicles.create, vehicle);
    expect(
      (await t.query(api.vehicles.get, { id }))?.ncbStartDate,
    ).toBeUndefined();
    await t.mutation(api.vehicles.update, {
      id,
      ...vehicle,
      ncbStartDate: "2020-10-23",
    });
    expect((await t.query(api.vehicles.get, { id }))?.ncbStartDate).toBe(
      "2020-10-23",
    );
    await t.mutation(api.vehicles.update, { id, ...vehicle, model: "Updated" });
    expect((await t.query(api.vehicles.get, { id }))?.ncbStartDate).toBe(
      "2020-10-23",
    );
    await t.mutation(api.vehicles.update, {
      id,
      ...vehicle,
      ncbStartDate: null,
    });
    expect(
      (await t.query(api.vehicles.get, { id }))?.ncbStartDate,
    ).toBeUndefined();
  });

  it("accepts a start date when adding a vehicle and rejects impossible dates on add and edit", async () => {
    const t = await fixture();
    const id = await t.mutation(api.vehicles.create, {
      ...vehicle,
      ncbStartDate: "2020-02-29",
    });
    expect((await t.query(api.vehicles.get, { id }))?.ncbStartDate).toBe(
      "2020-02-29",
    );
    await expect(
      t.mutation(api.vehicles.create, {
        ...vehicle,
        ncbStartDate: "2025-02-29",
      }),
    ).rejects.toThrow("NCB start date");
    await expect(
      t.mutation(api.vehicles.update, {
        id,
        ...vehicle,
        ncbStartDate: "2026-04-31",
      }),
    ).rejects.toThrow("NCB start date");
    expect((await t.query(api.vehicles.get, { id }))?.ncbStartDate).toBe(
      "2020-02-29",
    );
  });
});
