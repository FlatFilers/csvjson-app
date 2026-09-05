declare module "csvjson-csv2json" {
  export default function csv2json(
    csv: string,
    options?: {
      separator?: string;
      parseNumbers?: boolean;
      parseJSON?: boolean;
      transpose?: boolean;
      hash?: boolean;
      /**
       * B5 (#87 #95): false preserves leading/trailing field whitespace
       * (RFC-4180 section 2.4). Default true — the legacy trim.
       */
      trim?: boolean;
    }
  ): unknown;
}
