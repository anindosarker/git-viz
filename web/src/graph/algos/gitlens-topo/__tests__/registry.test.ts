import { describe, expect, it } from "vitest";
import { getAlgorithm } from "../../registry";
import { getPreset } from "../../../presets/registry";
// Force side-effect registration via the public graph barrel.
import "../../../index";
import "../../../presets/gitlens-like";

describe("gitlens-topo registry wiring", () => {
  it("is registered under id 'gitlens-topo'", () => {
    const algo = getAlgorithm("gitlens-topo");
    expect(algo).toBeDefined();
    expect(algo?.id).toBe("gitlens-topo");
    expect(algo?.label).toBe("GitLens-like");
  });

  it("the gitlens-like preset resolves to the live algorithm", () => {
    const preset = getPreset("gitlens-like");
    expect(preset).toBeDefined();
    const algo = preset && getAlgorithm(preset.algorithmId);
    expect(algo?.id).toBe("gitlens-topo");
  });
});
