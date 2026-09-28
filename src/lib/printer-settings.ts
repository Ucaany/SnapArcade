import { z } from "zod";

export const printerSettingsSchema = z.object({
  paperSize: z.enum(["4R", "2x6", "5R"]),
  dpi: z.number().int().min(180).max(600),
  orientation: z.enum(["portrait", "landscape"]),
  maxCopy: z.number().int().min(1).max(10),
  layout: z.string().trim().min(1).max(80),
}).strict();

export type PrinterSettings = z.infer<typeof printerSettingsSchema>;

export const defaultPrinterSettings: PrinterSettings = {
  paperSize: "4R", dpi: 300, orientation: "portrait", maxCopy: 1, layout: "single",
};

export function parsePrinterSettings(value: unknown): PrinterSettings {
  const parsed = printerSettingsSchema.safeParse(value);
  return parsed.success ? parsed.data : defaultPrinterSettings;
}
