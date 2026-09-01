declare module "csvjson-csv2json" {
  export default function csv2json(
    csv: string,
    options?: {
      separator?: string;
      parseNumbers?: boolean;
      parseJSON?: boolean;
      transpose?: boolean;
      hash?: boolean;
    }
  ): unknown;
}
