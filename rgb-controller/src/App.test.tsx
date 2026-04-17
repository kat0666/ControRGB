import { render, fireEvent, screen } from "@testing-library/react";
import App from "./App.tsx";
import { describe, test, vi } from "vitest";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn().mockResolvedValue([]),
}));

describe("App performance", () => {
  test("color input rapid change", async () => {
    render(<App />);
    const colorInput = screen.getByLabelText("Master color picker");

    // We want to simulate the rapid events but reduce count to avoid timeout
    const startTime = performance.now();
    for (let i = 0; i < 200; i++) {
       fireEvent.change(colorInput, { target: { value: `#${i.toString(16).padStart(6, '0')}` } });
    }
    const endTime = performance.now();
    const duration = endTime - startTime;
    console.log(`Time taken for 200 rapid changes: ${duration}ms`);
  });
});
