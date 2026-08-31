declare module "csvjson-json2csv" {
  export default function json2csv(
    data: unknown,
    options?: { separator?: string; flatten?: boolean; output_csvjson_variant?: boolean }
  ): string;
}
