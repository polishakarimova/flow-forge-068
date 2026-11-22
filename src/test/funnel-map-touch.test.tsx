import { cleanup, createEvent, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, expect, it, vi } from "vitest";
import FunnelMapPage from "@/pages/FunnelMapPage";

const data = vi.hoisted(() => ({
  funnels: [{ id: "f", keyword: "карта", contentItemIds: [], leadMagnetId: 4, badgeColor: "violet" }],
  products: [{ id: 4, name: "План" }],
  topics: [], allContentItems: [], formats: [], productTypes: [],
}));
vi.mock("@/lib/dataStore", () => ({ useDataStore: () => data }));
vi.mock("@/lib/authContext", () => ({ useAuth: () => ({ user: { id: "fixture" } }) }));
vi.mock("@/components/AppSidebar", () => ({ AppSidebar: () => null }));
vi.mock("@/components/MobileNav", () => ({ MobileNav: () => null }));
vi.mock("@/components/products/EditProductModal", () => ({
  EditProductModal: ({ product }: { product: { name: string } }) => <div role="dialog">{product.name}</div>,
}));

afterEach(cleanup);

it("opens the product on a second tap and cancels its follow-up click into the editor", () => {
  render(<MemoryRouter><FunnelMapPage /></MemoryRouter>);
  const label = screen.getByText("План");
  const touch = { touches: [{ clientX: 10, clientY: 20 }] };
  fireEvent.touchStart(label, touch);
  expect(fireEvent.touchEnd(label)).toBe(true);
  expect(screen.queryByRole("dialog")).toBeNull();
  fireEvent.touchStart(label, touch);
  const secondTap = createEvent.touchEnd(label, { cancelable: true });
  fireEvent(label, secondTap);
  expect(secondTap.defaultPrevented).toBe(true);
  expect(screen.getByRole("dialog")).toHaveTextContent("План");
});
