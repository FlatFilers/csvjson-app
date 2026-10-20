import { describe, expect, it } from "vitest";
import { outputFilenameFor, outputMimeFor } from "@/lib/download";

describe("outputFilenameFor", () => {
  it("swaps the extension of a known source name", () => {
    expect(outputFilenameFor("aaa.csv", "csv2json")).toBe("aaa.json");
    expect(outputFilenameFor("ddd.json", "json2csv")).toBe("ddd.csv");
  });

  it("maps .tsv sources to the target extension too", () => {
    expect(outputFilenameFor("ccc.tsv", "csv2json")).toBe("ccc.json");
  });

  it("falls back to data.json / data.csv when pasting (no source)", () => {
    expect(outputFilenameFor(null, "csv2json")).toBe("data.json");
    expect(outputFilenameFor(null, "json2csv")).toBe("data.csv");
    expect(outputFilenameFor("", "csv2json")).toBe("data.json");
  });

  it("supports developer egress extensions (.jsonl, .sql, .ts) in csv2json mode", () => {
    expect(outputFilenameFor("users.csv", "csv2json", "json")).toBe(
      "users.json"
    );
    expect(outputFilenameFor("users.csv", "csv2json", "jsonl")).toBe(
      "users.jsonl"
    );
    expect(outputFilenameFor("users.csv", "csv2json", "sql")).toBe("users.sql");
    expect(outputFilenameFor("users.csv", "csv2json", "ts")).toBe("users.ts");
    expect(outputFilenameFor(null, "csv2json", "jsonl")).toBe("data.jsonl");
    expect(outputFilenameFor(null, "csv2json", "sql")).toBe("data.sql");
    expect(outputFilenameFor(null, "csv2json", "ts")).toBe("data.ts");
    // json2csv always emits .csv regardless of egressFormat
    expect(outputFilenameFor("users.json", "json2csv", "sql")).toBe(
      "users.csv"
    );
  });

  it("resolves MIME types for CSV and all developer egress formats", () => {
    expect(outputMimeFor("json2csv", "json")).toBe("text/csv");
    expect(outputMimeFor("csv2json", "json")).toBe("application/json");
    expect(outputMimeFor("csv2json", "jsonl")).toBe("application/x-ndjson");
    expect(outputMimeFor("csv2json", "sql")).toBe("application/sql");
    expect(outputMimeFor("csv2json", "ts")).toBe("text/typescript");
  });

  it("keeps dotfiles whole — the leading dot is a name, not an extension", () => {
    expect(outputFilenameFor(".env", "csv2json")).toBe(".env.json");
    expect(outputFilenameFor(".env", "json2csv")).toBe(".env.csv");
    // A dotfile carrying a data extension keeps its base too.
    expect(outputFilenameFor(".eslintrc.json", "json2csv")).toBe(
      ".eslintrc.csv"
    );
  });

  it("strips mismatched double extensions", () => {
    expect(outputFilenameFor("report.csv.json", "csv2json")).toBe(
      "report.json"
    );
    expect(outputFilenameFor("report.csv.json", "json2csv")).toBe(
      "report.csv"
    );
  });

  it("never doubles the target extension", () => {
    expect(outputFilenameFor("aaa.csv", "json2csv")).toBe("aaa.csv");
    expect(outputFilenameFor("ddd.json", "csv2json")).toBe("ddd.json");
  });

  it("keeps non-data interior extensions", () => {
    expect(outputFilenameFor("archive.tar.csv", "csv2json")).toBe(
      "archive.tar.json"
    );
  });

  it("is case-insensitive on the extension", () => {
    expect(outputFilenameFor("AAA.CSV", "csv2json")).toBe("AAA.json");
  });

  it("drops a trailing bare dot instead of doubling it", () => {
    expect(outputFilenameFor("data.", "csv2json")).toBe("data.json");
    expect(outputFilenameFor("export.csv.", "json2csv")).toBe("export.csv");
  });
});
