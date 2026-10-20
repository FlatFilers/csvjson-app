import { describe, expect, it } from "vitest";
import { detectMarkdownOrCliTable } from "./markdownTable";

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
  });
});
