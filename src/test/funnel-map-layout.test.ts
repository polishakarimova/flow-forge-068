import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { funnelMapLayout } from "@/lib/funnelMapLayout";

const firstView = { pan: { x: 30, y: -8 }, zoom: 1.25 };
const firstNode = { id: "product", x: 15, y: 90 };

describe("funnel map preferences on a shared device", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.restoreAllMocks());

  it("restores each account independently, including after the other account resets", () => {
    const a = funnelMapLayout("first");
    a.saveView(firstView);
    a.savePositions([firstNode]);
    const b = funnelMapLayout("second");
    expect(b.view()).toBeNull();
    expect(b.positions()).toEqual({});
    b.saveView({ pan: { x: 1, y: 1 }, zoom: 2 });
    b.savePositions([{ ...firstNode, x: 200 }]);
    b.reset();
    expect(b.view()).toBeNull();
    expect(b.positions()).toEqual({});
    expect(funnelMapLayout("first").view()).toEqual(firstView);
    expect(a.positions()).toEqual({ product: { x: 15, y: 90 } });
  });

  it("never assigns an unowned legacy layout to a signed-in user or saves a guest layout", () => {
    localStorage.setItem("funnel-map-view", JSON.stringify(firstView));
    localStorage.setItem("funnel-map-positions", JSON.stringify({ product: firstNode }));
    funnelMapLayout().saveView(firstView);
    expect(localStorage.length).toBe(2);
    expect(funnelMapLayout("first").view()).toBeNull();
    expect(funnelMapLayout("first").positions()).toEqual({});
  });

  it("recovers from malformed and obsolete preferences", () => {
    const layout = funnelMapLayout("first");
    localStorage.setItem("funnel-map:first:view", "{");
    expect(layout.view()).toBeNull();
    localStorage.setItem("funnel-map:first:view", JSON.stringify({ pan: firstView.pan, zoom: 10 }));
    expect(layout.view()?.zoom).toBe(2.5);
    localStorage.setItem("funnel-map:first:positions", JSON.stringify({ valid: firstView.pan, bad: { x: "5" } }));
    expect(layout.positions()).toEqual({ valid: firstView.pan });
  });

  it("keeps the map usable when browser storage is disabled", () => {
    const unavailable = () => { throw new Error("unavailable"); };
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(unavailable);
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(unavailable);
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(unavailable);
    const layout = funnelMapLayout("first");
    expect(layout.view()).toBeNull();
    expect(() => layout.saveView(firstView)).not.toThrow();
    expect(() => layout.savePositions([firstNode])).not.toThrow();
    expect(() => layout.reset()).not.toThrow();
  });
});
