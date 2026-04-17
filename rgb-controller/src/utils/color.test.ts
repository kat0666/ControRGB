import { expect, test, describe } from "bun:test";
import { hexToRgb } from "./color";

describe("hexToRgb", () => {
  test("converts 6-digit hex colors", () => {
    expect(hexToRgb("#ffffff")).toEqual([255, 255, 255]);
    expect(hexToRgb("#000000")).toEqual([0, 0, 0]);
    expect(hexToRgb("#ff0000")).toEqual([255, 0, 0]);
    expect(hexToRgb("#00ff00")).toEqual([0, 255, 0]);
    expect(hexToRgb("#0000ff")).toEqual([0, 0, 255]);
    expect(hexToRgb("#14f1ff")).toEqual([20, 241, 255]);
    expect(hexToRgb("#ff6a3d")).toEqual([255, 106, 61]);
  });

  test("converts 3-digit hex colors", () => {
    expect(hexToRgb("#fff")).toEqual([255, 255, 255]);
    expect(hexToRgb("#000")).toEqual([0, 0, 0]);
    expect(hexToRgb("#f00")).toEqual([255, 0, 0]);
    expect(hexToRgb("#0f0")).toEqual([0, 255, 0]);
    expect(hexToRgb("#00f")).toEqual([0, 0, 255]);
  });

  test("handles hex without # prefix", () => {
    expect(hexToRgb("ffffff")).toEqual([255, 255, 255]);
    expect(hexToRgb("ff0000")).toEqual([255, 0, 0]);
    expect(hexToRgb("f00")).toEqual([255, 0, 0]);
  });

  test("returns [0, 0, 0] for invalid input length", () => {
    expect(hexToRgb("#ff")).toEqual([0, 0, 0]);
    expect(hexToRgb("#fffff")).toEqual([0, 0, 0]);
    expect(hexToRgb("")).toEqual([0, 0, 0]);
  });
});
