import { describe, expect, it } from "vitest";
import {
  detectMarkdownOrCliTable,
  extractTablesFromMarkdownBlock,
} from "./markdownTable";

describe("detectMarkdownOrCliTable (AC-14 / D13)", () => {
  it("detects and normalizes a GitHub / ChatGPT Markdown pipe table with outer pipes and alignment colons", () => {
    const md = [
      "| id | album | year |",
      "| :--- | :---: | ---: |",
      "| 1 | Elephant | 2003 |",
      "| 2 | De Stijl | 2000 |",
    ].join("\n");

    const detected = detectMarkdownOrCliTable(md);
    expect(detected).toEqual({
      cleanedCsv: "id,album,year\n1,Elephant,2003\n2,De Stijl,2000",
      rows: 2,
      cols: 3,
      kind: "markdown",
    });
  });

  it("detects Markdown pipe tables without outer pipes and unescapes \\| inside cells", () => {
    const md = [
      "cmd | description | notes",
      "--- | --- | ---",
      "a \\| b | Pipe expression, with comma | ok",
      "c \\| d | Second \"quoted\" item | done",
    ].join("\r\n");

    const detected = detectMarkdownOrCliTable(md);
    expect(detected).toEqual({
      cleanedCsv:
        'cmd,description,notes\na | b,"Pipe expression, with comma",ok\nc | d,"Second ""quoted"" item",done',
      rows: 2,
      cols: 3,
      kind: "markdown",
    });
  });

  it("supports header-only Markdown pipe tables (0 data rows)", () => {
    const md = "| col1 | col2 |\n| --- | --- |";
    const detected = detectMarkdownOrCliTable(md);
    expect(detected).toEqual({
      cleanedCsv: "col1,col2",
      rows: 0,
      cols: 2,
      kind: "markdown",
    });
  });

  it("detects and normalizes psql ASCII tables with ----+---- separator and (N rows) footer", () => {
    const psql = [
      " id |  album   | year ",
      "----+----------+------",
      "  1 | Elephant | 2003",
      "  2 | De Stijl | 2000",
      "(2 rows)",
    ].join("\n");

    const detected = detectMarkdownOrCliTable(psql);
    expect(detected).toEqual({
      cleanedCsv: "id,album,year\n1,Elephant,2003\n2,De Stijl,2000",
      rows: 2,
      cols: 3,
      kind: "box",
    });
  });

  it("detects psql 1-row singular footer (1 row) and tables without a footer", () => {
    const psqlSingle = [
      " id | name ",
      "----+------",
      "  1 | Ada  ",
      "(1 row)",
    ].join("\n");

    expect(detectMarkdownOrCliTable(psqlSingle)).toEqual({
      cleanedCsv: "id,name\n1,Ada",
      rows: 1,
      cols: 2,
      kind: "box",
    });

    const psqlNoFooter = [
      " id | name ",
      "----+------",
      "  1 | Ada  ",
    ].join("\n");

    expect(detectMarkdownOrCliTable(psqlNoFooter)).toEqual({
      cleanedCsv: "id,name\n1,Ada",
      rows: 1,
      cols: 2,
      kind: "box",
    });
  });

  it("detects and normalizes MySQL / bordered +----+----+ ASCII box tables", () => {
    const mysql = [
      "+----+----------+------+",
      "| id | album    | year |",
      "+----+----------+------+",
      "|  1 | Elephant | 2003 |",
      "|  2 | De Stijl | 2000 |",
      "+----+----------+------+",
    ].join("\n");

    const detected = detectMarkdownOrCliTable(mysql);
    expect(detected).toEqual({
      cleanedCsv: "id,album,year\n1,Elephant,2003\n2,De Stijl,2000",
      rows: 2,
      cols: 3,
      kind: "box",
    });
  });

  it("returns null for regular comma CSV, TSV, JSON, and plain pipe-separated CSV without separator rule lines", () => {
    expect(detectMarkdownOrCliTable("")).toBeNull();
    expect(detectMarkdownOrCliTable("id,album,year\n1,Elephant,2003")).toBeNull();
    expect(detectMarkdownOrCliTable("id\talbum\tyear\n1\tElephant\t2003")).toBeNull();
    expect(detectMarkdownOrCliTable('[{"id":1,"album":"Elephant"}]')).toBeNull();
    // Plain pipe-separated CSV without |---|---| or ----+---- or +---+---+ must NOT match
    expect(
      detectMarkdownOrCliTable("id|album|year\n1|Elephant|2003\n2|De Stijl|2000")
    ).toBeNull();
    expect(
      extractTablesFromMarkdownBlock(
        "id|album|year\n1|Elephant|2003\n2|De Stijl|2000"
      )
    ).toEqual([]);
  });
});

describe("extractTablesFromMarkdownBlock (AC-18 / D17)", () => {
  it("extracts a single Markdown table embedded in ChatGPT prose and code fences", () => {
    const doc = [
      "Sure! Here is the summary table you requested:",
      "",
      "### Active Regions",
      "",
      "```markdown",
      "| region | revenue | active |",
      "| :--- | ---: | :---: |",
      "| NA | 1200 | true |",
      "| EU | 950 | true |",
      "```",
      "",
      "Let me know if you would like to filter by quarter.",
    ].join("\n");

    const tables = extractTablesFromMarkdownBlock(doc);
    expect(tables).toEqual([
      {
        index: 0,
        title: "Active Regions",
        label: "Active Regions",
        headers: ["region", "revenue", "active"],
        cleanedCsv: "region,revenue,active\nNA,1200,true\nEU,950,true",
        rows: 2,
        cols: 3,
        kind: "markdown",
      },
    ]);

    expect(detectMarkdownOrCliTable(doc)).toEqual({
      cleanedCsv: "region,revenue,active\nNA,1200,true\nEU,950,true",
      rows: 2,
      cols: 3,
      kind: "markdown",
    });
  });

  it("extracts multiple Markdown tables in document order with # headings and **bold** titles", () => {
    const doc = [
      "# Q3 Performance Report",
      "Overview of regional and product metrics.",
      "",
      "## By Region",
      "Regional breakdown for Q3:",
      "",
      "| region | revenue |",
      "| --- | ---: |",
      "| NA | 1200 |",
      "| EU | 950 |",
      "",
      "**Top Products:**",
      "| sku | name | units |",
      "| --- | --- | ---: |",
      "| A-1 | Widget | 40 |",
      "| B-2 | Gadget | 25 |",
      "| C-3 | Gizmo | 15 |",
      "",
      "End of report.",
    ].join("\n");

    const tables = extractTablesFromMarkdownBlock(doc);
    expect(tables).toHaveLength(2);
    expect(tables[0]).toEqual({
      index: 0,
      title: "By Region",
      label: "By Region",
      headers: ["region", "revenue"],
      cleanedCsv: "region,revenue\nNA,1200\nEU,950",
      rows: 2,
      cols: 2,
      kind: "markdown",
    });
    expect(tables[1]).toEqual({
      index: 1,
      title: "Top Products",
      label: "Top Products",
      headers: ["sku", "name", "units"],
      cleanedCsv:
        "sku,name,units\nA-1,Widget,40\nB-2,Gadget,25\nC-3,Gizmo,15",
      rows: 3,
      cols: 3,
      kind: "markdown",
    });

    expect(detectMarkdownOrCliTable(doc, 0)?.cleanedCsv).toBe(
      "region,revenue\nNA,1200\nEU,950"
    );
    expect(detectMarkdownOrCliTable(doc, 1)?.cleanedCsv).toBe(
      "sku,name,units\nA-1,Widget,40\nB-2,Gadget,25\nC-3,Gizmo,15"
    );
    // Out-of-range tableIndex clamps safely
    expect(detectMarkdownOrCliTable(doc, 99)?.cleanedCsv).toBe(
      "sku,name,units\nA-1,Widget,40\nB-2,Gadget,25\nC-3,Gizmo,15"
    );
  });

  it("extracts mixed Markdown pipe tables and psql / MySQL ASCII box tables, falling back to Table N (col preview) when untitled", () => {
    const doc = [
      "| user_id | handle |",
      "| --- | --- |",
      "| 1 | ada |",
      "",
      "Database query result:",
      "",
      " host      | port | primary ",
      "-----------+------+---------",
      " db-main-1 | 5432 | t       ",
      " db-read-1 | 5433 | f       ",
      "(2 rows)",
      "",
      "+------+-------+",
      "| code | count |",
      "+------+-------+",
      "| 200  | 1420  |",
      "+------+-------+",
    ].join("\n");

    const tables = extractTablesFromMarkdownBlock(doc);
    expect(tables).toHaveLength(3);
    expect(tables[0]).toMatchObject({
      index: 0,
      title: null,
      label: "Table 1 (user_id, handle)",
      rows: 1,
      cols: 2,
      kind: "markdown",
    });
    expect(tables[1]).toMatchObject({
      index: 1,
      title: null,
      label: "Table 2 (host, port, primary)",
      cleanedCsv: "host,port,primary\ndb-main-1,5432,t\ndb-read-1,5433,f",
      rows: 2,
      cols: 3,
      kind: "box",
    });
    expect(tables[2]).toMatchObject({
      index: 2,
      title: null,
      label: "Table 3 (code, count)",
      cleanedCsv: "code,count\n200,1420",
      rows: 1,
      cols: 2,
      kind: "box",
    });
  });
});
