import { describe, it, expect, beforeEach, vi } from "vitest";
import { openHostedPayment, preOpenPaymentWindow } from "./openHostedPayment";

describe("openHostedPayment", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns blocked when url is empty", () => {
    const result = openHostedPayment("");
    expect(result.ok).toBe(false);
    expect(result.method).toBe("blocked");
  });

  it("uses pre-opened window when provided", () => {
    const fakeWin = { closed: false, location: { href: "" } } as unknown as Window;
    const result = openHostedPayment("https://youcanpay.com/sandbox/abc", fakeWin);
    expect(result.ok).toBe(true);
    expect(result.method).toBe("pre-opened");
    expect((fakeWin as any).location.href).toBe("https://youcanpay.com/sandbox/abc");
  });

  it("navigates same-tab when not embedded in iframe", () => {
    // jsdom: window.self === window.top by default (not embedded).
    const hrefSpy = vi.fn();
    Object.defineProperty(window, "location", {
      configurable: true,
      value: {
        get href() { return ""; },
        set href(v: string) { hrefSpy(v); },
      },
    });
    const result = openHostedPayment("https://youcanpay.com/sandbox/abc");
    expect(result.ok).toBe(true);
    expect(result.method).toBe("same-tab");
    expect(hrefSpy).toHaveBeenCalledWith("https://youcanpay.com/sandbox/abc");
  });

  it("falls back to new-tab when embedded and top is cross-origin", () => {
    // Force isEmbedded = true by making window.self !== window.top throw.
    const selfSpy = vi.spyOn(window, "self", "get").mockImplementation(() => {
      throw new Error("cross-origin");
    });
    const fakeWin = {} as Window;
    const openSpy = vi.spyOn(window, "open").mockReturnValue(fakeWin);
    const result = openHostedPayment("https://youcanpay.com/sandbox/abc");
    expect(result.ok).toBe(true);
    expect(["new-tab", "top"]).toContain(result.method);
    selfSpy.mockRestore();
    openSpy.mockRestore();
  });

  it("returns blocked when popup is denied in embedded mode", () => {
    const selfSpy = vi.spyOn(window, "self", "get").mockImplementation(() => {
      throw new Error("cross-origin");
    });
    const openSpy = vi.spyOn(window, "open").mockReturnValue(null);
    const result = openHostedPayment("https://youcanpay.com/sandbox/abc");
    expect(result.ok).toBe(false);
    expect(result.method).toBe("blocked");
    selfSpy.mockRestore();
    openSpy.mockRestore();
  });
});

describe("preOpenPaymentWindow", () => {
  it("returns null gracefully when window.open throws", () => {
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(preOpenPaymentWindow()).toBeNull();
    openSpy.mockRestore();
  });
});
