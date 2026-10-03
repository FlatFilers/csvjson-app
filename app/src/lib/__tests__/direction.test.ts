import { describe, expect, it } from "vitest";
import { directionFromSearch } from "@/lib/direction";

/**
 * Entry-point direction init matrix (?direction=). Only the two known
 * values are honored; anything else keeps the csv2json default.
 */
describe("directionFromSearch", () => {
  it("honors direction=json2csv", () => {
    expect(directionFromSearch("?direction=json2csv")).toBe("json2csv");
  });

  it("honors direction=csv2json explicitly", () => {
    expect(directionFromSearch("?direction=csv2json")).toBe("csv2json");
  });

  it("keeps the default for an unknown value", () => {
    expect(directionFromSearch("?direction=bogus")).toBe("csv2json");
    expect(directionFromSearch("?direction=JSON2CSV")).toBe("csv2json");
  });

  it("keeps the default when the param is absent or empty", () => {
    expect(directionFromSearch("")).toBe("csv2json");
    expect(directionFromSearch("?")).toBe("csv2json");
    expect(directionFromSearch("?other=1")).toBe("csv2json");
  });

  it("reads only the direction param among others", () => {
    expect(
      directionFromSearch("?utm_source=newsletter&direction=json2csv")
    ).toBe("json2csv");
  });
});
