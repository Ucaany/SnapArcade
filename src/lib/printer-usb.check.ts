import { strict as assert } from "node:assert";
import { defaultPrinterSettings, printerSettingsSchema } from "@/lib/printer-settings";
import { frameEscPosRaster } from "@/lib/printer-usb";

assert.equal(printerSettingsSchema.safeParse(defaultPrinterSettings).success, true);
assert.equal(printerSettingsSchema.safeParse({ ...defaultPrinterSettings, dpi: 1 }).success, false);
const framed = frameEscPosRaster(new Uint8Array([0xaa, 0x55]), 8, 2);
assert.deepEqual([...framed.slice(0, 4)], [0x1b, 0x40, 0x1b, 0x61]);
assert.deepEqual([...framed.slice(-3)], [0x1d, 0x56, 0x00]);
assert.equal(framed.length, 18);
console.log("printer-usb.check passed");
