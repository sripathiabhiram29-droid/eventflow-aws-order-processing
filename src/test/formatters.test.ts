import { describe, expect, it } from "vitest";
import { formatCurrency, statusLabel } from "../utils";

describe("formatters", () => {
  it("formats monetary values as GBP", () => {
    expect(formatCurrency(1234.5)).toBe("£1,234.50");
  });

  it("converts API statuses into readable labels", () => {
    expect(statusLabel("PARTIALLY_COMPLETED")).toBe("Partially Completed");
    expect(statusLabel("IN_PROGRESS")).toBe("In Progress");
  });
});
