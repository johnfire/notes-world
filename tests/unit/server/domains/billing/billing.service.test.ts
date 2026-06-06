import { billingRole } from "../../../../../packages/server/src/domains/billing/billing.service";

// Regression: a subscription webhook must only govern the free <-> paid
// entitlement and must NEVER overwrite a privileged role (admin / gift),
// otherwise a past-due/cancelled event would silently de-admin a user.

describe("billingRole", () => {
  test("active subscription promotes a free user to paid", () => {
    expect(billingRole("free", true)).toBe("paid");
  });

  test("inactive subscription demotes a paid user to free", () => {
    expect(billingRole("paid", false)).toBe("free");
  });

  test("active subscription keeps a paid user paid", () => {
    expect(billingRole("paid", true)).toBe("paid");
  });

  test("never demotes an admin, regardless of subscription state", () => {
    expect(billingRole("admin", false)).toBe("admin");
    expect(billingRole("admin", true)).toBe("admin");
  });

  test("never overwrites a gift role", () => {
    expect(billingRole("gift", false)).toBe("gift");
    expect(billingRole("gift", true)).toBe("gift");
  });
});
