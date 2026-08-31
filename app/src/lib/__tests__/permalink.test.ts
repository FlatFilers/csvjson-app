import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  fetchLegacyPermalink,
  hydrateConverter,
  parsePermalinkPath,
  PermalinkFetchError,
  PermalinkNotFoundError,
  S3_DATA_URL,
} from "@/lib/permalink";

/**
 * Legacy permalink hydration (spec: Old share links keep resolving —
 * read-only). The mapping table is pinned to the element ids the legacy
 * save path wrote (js/src/main.js APP.save + each view's .save inputs).
 */

const ID = "000c44f43e2f62cc15c48d9d7c5a4582";

const REAL_CSV2JSON_PAYLOAD = {
  csv: "album,year\nDe Stijl,2000",
  parseNumbers: false,
  parseJSON: true,
  transpose: false,
  "output-array": true,
  "output-hash": false,
  result: '[{"album":"De Stijl","year":"2000"}]',
};

describe("parsePermalinkPath", () => {
  it("extracts the id from a legacy permalink path", () => {
    expect(parsePermalinkPath(`/csv2json/${ID}`)).toBe(ID);
    expect(parsePermalinkPath(`/json2csv/${ID}/`)).toBe(ID);
    expect(parsePermalinkPath(`/datajanitor/${ID}`)).toBe(ID);
  });

  it("accepts every tool that issued legacy permalinks", () => {
    for (const tool of [
      "csv2json",
      "json2csv",
      "json_validator",
      "json_beautifier",
      "sql2json",
      "csvjson2json",
      "datajanitor",
    ]) {
      expect(parsePermalinkPath(`/${tool}/${ID}`)).toBe(ID);
    }
  });

  it("rejects everything that is not a permalink", () => {
    expect(parsePermalinkPath("/")).toBeNull();
    expect(parsePermalinkPath("/csv2json")).toBeNull();
    expect(parsePermalinkPath("/csv2json/sub/route")).toBeNull();
    expect(parsePermalinkPath("/csv2json/0123")).toBeNull();
    expect(parsePermalinkPath(`/dataclean/${ID}`)).toBeNull();
    expect(parsePermalinkPath(`/nope/${ID}`)).toBeNull();
  });
});

describe("hydrateConverter", () => {
  it("maps a real csv2json save onto the csv2json direction", () => {
    const state = hydrateConverter(REAL_CSV2JSON_PAYLOAD);
    expect(state).not.toBeNull();
    expect(state!.direction).toBe("csv2json");
    expect(state!.input).toBe(REAL_CSV2JSON_PAYLOAD.csv);
    // parseNumbers false + parseJSON true were saved explicitly.
    expect(state!.options).toEqual({
      parseNumbers: false,
      parseJSON: true,
      transpose: false,
      hash: false, // output-array checked
    });
  });

  it("maps a json2csv save onto the json2csv direction", () => {
    const state = hydrateConverter({
      json: '[{"a":1}]',
      flatten: true,
      output_csvjson_variant: true, // no equivalent — tolerated, ignored
      result: "json,csv",
    });
    expect(state).not.toBeNull();
    expect(state!.direction).toBe("json2csv");
    expect(state!.input).toBe('[{"a":1}]');
    expect(state!.options).toEqual({ flatten: true });
  });

  it("lets an explicit output-hash choice set the hash option", () => {
    const state = hydrateConverter({
      csv: "k,v\na,1",
      "output-hash": true,
    });
    expect(state!.options.hash).toBe(true);
  });

  it("returns null for payloads that no longer map onto the converter", () => {
    // A Data Janitor session: exists, but not a converter shape.
    expect(hydrateConverter({ id: ID, date: "Mon", text: "a,b" })).toBeNull();
    // Legacy validator saves store their input under `result` only.
    expect(hydrateConverter({ result: "{}" })).toBeNull();
    // Not a flat {elementId: string | boolean} bag.
    expect(hydrateConverter([{ csv: "a,b" }])).toBeNull();
    expect(hydrateConverter(null)).toBeNull();
    expect(hydrateConverter("album,year")).toBeNull();
    expect(hydrateConverter({ csv: { nested: true } })).toBeNull();
  });
});

describe("fetchLegacyPermalink", () => {
  beforeEach(() => {
    vi.spyOn(globalThis, "fetch");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("GETs the object from the S3 data prefix in cors mode", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(
      new Response(JSON.stringify({ csv: "a,b" }), { status: 200 })
    );
    const data = await fetchLegacyPermalink(ID);
    expect(data).toEqual({ csv: "a,b" });
    expect(globalThis.fetch).toHaveBeenCalledWith(`${S3_DATA_URL}${ID}`, {
      mode: "cors",
    });
  });

  it("throws PermalinkNotFoundError without hitting S3 for a bad id", async () => {
    await expect(fetchLegacyPermalink("not-a-permalink")).rejects.toBeInstanceOf(
      PermalinkNotFoundError
    );
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("maps 403 and 404 to PermalinkNotFoundError", async () => {
    for (const status of [403, 404]) {
      vi.mocked(globalThis.fetch).mockResolvedValue(
        new Response("", { status })
      );
      await expect(fetchLegacyPermalink(ID)).rejects.toBeInstanceOf(
        PermalinkNotFoundError
      );
    }
  });

  it("maps 500s to PermalinkFetchError", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(
      new Response("boom", { status: 500 })
    );
    await expect(fetchLegacyPermalink(ID)).rejects.toBeInstanceOf(
      PermalinkFetchError
    );
  });

  it("maps network failure and malformed bodies to PermalinkFetchError", async () => {
    vi.mocked(globalThis.fetch).mockRejectedValue(new TypeError("offline"));
    await expect(fetchLegacyPermalink(ID)).rejects.toMatchObject({
      name: "PermalinkFetchError",
    });

    vi.mocked(globalThis.fetch).mockResolvedValue(
      new Response("{not json", { status: 200 })
    );
    await expect(fetchLegacyPermalink(ID)).rejects.toMatchObject({
      name: "PermalinkFetchError",
    });
  });
});
