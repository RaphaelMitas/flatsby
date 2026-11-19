import { expect, test } from "../fixtures/auth";
import { waitForHydration } from "../helpers/hydration";
import { refetched } from "../helpers/refetched";

test.describe("Pinboard", () => {
  test("a WiFi entry is pinned, its QR code scans back in, and it is deleted", async ({
    authPage,
  }) => {
    const settled = () => refetched(authPage, "pinboard.list");
    const save = authPage.getByTestId("pin-form-save");
    const ssid = authPage.getByTestId("pin-form-ssid");
    const password = authPage.getByTestId("pin-form-password");
    const scanFile = authPage.getByTestId("pin-form-scan-file");
    const pin = authPage.getByTestId("pin-WiFi");
    const edit = authPage.getByTestId("pin-edit-WiFi");
    const empty = authPage.getByTestId("pinboard-empty");
    const network = "WG Darmstadt 5G";
    const key = 'hafer;flocken:"42"';

    await authPage.goto("/home");
    await authPage.getByTestId("home-card-pinboard").click();
    await expect(empty).toBeVisible();

    const starter = authPage.getByTestId("pinboard-starter-wifi");
    await waitForHydration(starter);
    await starter.click();
    await expect(authPage.getByTestId("pin-form-title")).toHaveValue("WiFi");
    await ssid.fill(network);
    await password.fill(key);
    const created = settled();
    await save.click();
    await expect(pin).toContainText(network);
    await expect(pin).toContainText(key);
    await created;

    await authPage.reload();
    const openCode = authPage.getByTestId("pin-qr-WiFi");
    await waitForHydration(openCode);
    await openCode.click();
    const code = await authPage.getByTestId("pin-qr-code").screenshot();
    await authPage.getByTestId("pin-qr-done").click();

    await edit.click();
    await ssid.fill("");
    await password.fill("");
    await scanFile.setInputFiles({
      name: "header.png",
      mimeType: "image/png",
      buffer: await authPage.getByRole("heading").first().screenshot(),
    });
    await expect(authPage.getByTestId("pin-form-scan-problem")).toBeVisible();
    await scanFile.setInputFiles({
      name: "code.png",
      mimeType: "image/png",
      buffer: code,
    });
    await expect(ssid).toHaveValue(network);
    await expect(password).toHaveValue(key);
    await expect(authPage.getByTestId("pin-form-scan-problem")).toBeHidden();
    await authPage
      .getByTestId("pin-form-body")
      .fill("Router is in the hallway");
    const updated = settled();
    await save.click();
    await expect(pin).toContainText("Router is in the hallway");
    await updated;

    await edit.click();
    await authPage.getByTestId("pin-form-delete").click();
    const deleted = settled();
    await authPage.getByTestId("pin-delete-confirm").click();
    await expect(empty).toBeVisible();
    await deleted;

    await authPage.reload();
    await expect(empty).toBeVisible();
  });

  test("a plain entry needs a text", async ({ authPage }) => {
    await authPage.goto("/home/pinboard");
    const add = authPage.getByTestId("pinboard-add");
    await waitForHydration(add);
    await add.click();
    await authPage.getByTestId("pin-form-title").fill("Bins");
    await authPage.getByTestId("pin-form-save").click();
    await expect(authPage.getByText("Write what to pin")).toBeVisible();
    await authPage.getByTestId("pin-form-body").fill("Paper on Tuesday");
    await authPage.getByTestId("pin-form-save").click();
    await expect(authPage.getByTestId("pin-Bins")).toContainText(
      "Paper on Tuesday",
    );
  });
});
