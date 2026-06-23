import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render } from "@testing-library/react";
import { resolveSpinnerSize, LoadingSpinner } from "./loading-spinner";

describe("resolveSpinnerSize", () => {
  it.each([
    ["page", "lg"],
    ["content", "lg"],
    ["section", "md"],
    ["inline", "sm"],
    ["button", "sm"],
  ] as const)("context=%s → %s", (ctx, expected) => {
    expect(resolveSpinnerSize(undefined, ctx)).toBe(expected);
  });

  it("explicit size overrides context", () => {
    expect(resolveSpinnerSize("sm", "page")).toBe("sm");
    expect(resolveSpinnerSize("lg", "button")).toBe("lg");
  });

  it("bare call falls back to md", () => {
    expect(resolveSpinnerSize()).toBe("md");
  });

  it("invalid context falls back to md", () => {
    // @ts-expect-error — purposeful invalid input
    expect(resolveSpinnerSize(undefined, "bogus")).toBe("md");
  });

  it("invalid size falls back to md", () => {
    // @ts-expect-error — purposeful invalid input
    expect(resolveSpinnerSize("xl", undefined)).toBe("md");
  });
});

describe("LoadingSpinner dev warnings", () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  });
  afterEach(() => {
    warnSpy.mockRestore();
  });

  it("warns once when bare", () => {
    render(<LoadingSpinner />);
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0]?.[0]).toMatch(/Missing `context`/);
  });

  it("does not warn when context is set", () => {
    render(<LoadingSpinner context="page" />);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it("renders without crashing for every context", () => {
    for (const ctx of ["page", "content", "section", "inline", "button"] as const) {
      const { unmount } = render(<LoadingSpinner context={ctx} />);
      unmount();
    }
  });
});
