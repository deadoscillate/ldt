import test from "node:test";
import assert from "node:assert/strict";

import { captureElementScreenshot } from "@/lib/studio/screenshot";

test("screenshot capture returns a PNG attachment using the injected renderer", async () => {
  const target = {
    getBoundingClientRect: () => ({
      width: 640,
      height: 360,
    }),
  } as HTMLElement;

  const screenshot = await captureElementScreenshot(target, {
    fileName: "studio-capture.png",
    render: async (_element, options) => {
      assert.equal(options.canvasWidth, 640);
      assert.equal(options.canvasHeight, 360);
      return "data:image/png;base64,capture";
    },
  });

  assert.equal(screenshot.fileName, "studio-capture.png");
  assert.equal(screenshot.mimeType, "image/png");
  assert.equal(screenshot.dataUrl, "data:image/png;base64,capture");
});
