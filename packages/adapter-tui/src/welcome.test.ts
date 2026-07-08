import { describe, it, expect } from "bun:test";
import { createWelcomeComponent } from "./welcome.js";

describe("createWelcomeComponent", () => {
  it("returns object with render, handleInput, and dismissed", () => {
    const component = createWelcomeComponent();

    expect(typeof component.render).toBe("function");
    expect(typeof component.handleInput).toBe("function");
    expect(typeof component.dismissed).toBe("boolean");
  });

  it("rendered output contains 'Kleptowriter — Novel Writing Studio'", () => {
    const component = createWelcomeComponent();
    const output = component.render();

    expect(output.some((line) => line.includes("Kleptowriter — Novel Writing Studio"))).toBe(true);
  });

  it("rendered output contains '/interview'", () => {
    const component = createWelcomeComponent();
    const output = component.render();

    expect(output.some((line) => line.includes("/interview"))).toBe(true);
  });

  it("handleInput() sets dismissed = true", () => {
    const component = createWelcomeComponent();

    expect(component.dismissed).toBe(false);

    const result = component.handleInput("any key");

    expect(result).toBe(true);
    expect(component.dismissed).toBe(true);
  });

  it("render() returns [] after dismissed", () => {
    const component = createWelcomeComponent();

    component.handleInput("x");
    const output = component.render();

    expect(output).toEqual([]);
  });

  it("subsequent handleInput() calls return false after dismissed", () => {
    const component = createWelcomeComponent();

    component.handleInput("first");
    const result = component.handleInput("second");

    expect(result).toBe(false);
  });

  it("renders all 6 slash commands", () => {
    const component = createWelcomeComponent();
    const output = component.render();
    const outputText = output.join("\n");

    expect(outputText).toContain("/interview");
    expect(outputText).toContain("/ingest");
    expect(outputText).toContain("/write");
    expect(outputText).toContain("/bible");
    expect(outputText).toContain("/scenes");
    expect(outputText).toContain("/project");
  });

  it("accepts options parameter", () => {
    const component = createWelcomeComponent({ customOption: "value" });

    expect(component.render().length).toBeGreaterThan(0);
  });
});