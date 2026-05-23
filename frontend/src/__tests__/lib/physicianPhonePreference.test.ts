import { describe, it, expect, beforeEach } from "vitest";
import {
  loadPhysicianPhonePreference,
  savePhysicianPhonePreference,
} from "@/lib/physicianPhonePreference";
import { PHYSICIAN_PHONE_STORAGE_KEY } from "@/lib/physicianPhones";

beforeEach(() => {
  localStorage.clear();
});

describe("physicianPhonePreference", () => {
  it("returns the formatted default when nothing is stored", () => {
    expect(loadPhysicianPhonePreference()).toBe("555-555-5550");
  });

  it("returns the default when the stored value is too short", () => {
    localStorage.setItem(PHYSICIAN_PHONE_STORAGE_KEY, "12345");
    expect(loadPhysicianPhonePreference()).toBe("555-555-5550");
  });

  it("returns the formatted stored value when valid", () => {
    localStorage.setItem(PHYSICIAN_PHONE_STORAGE_KEY, "5557779999");
    expect(loadPhysicianPhonePreference()).toBe("555-777-9999");
  });

  it("save normalizes and stores", () => {
    savePhysicianPhonePreference("(555) 999-1111");
    expect(localStorage.getItem(PHYSICIAN_PHONE_STORAGE_KEY)).toBe("5559991111");
  });
});
