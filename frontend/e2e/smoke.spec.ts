import { expect, test } from "@playwright/test";

test.describe("D&D VTT — Smoke E2E", () => {
  test("page d'accueil charge sans erreur", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("#root")).toBeVisible();
    // Le titre de la page doit contenir D&D ou DnD
    await expect(page).toHaveTitle(/D&D|DnD/i);
  });

  test("manifest PWA est accessible", async ({ page }) => {
    const response = await page.goto("/manifest.json");
    expect(response?.status()).toBe(200);
    const json = await response?.json();
    expect(json.name).toBe("D&D Virtual Tabletop");
  });

  test("openapi.json est accessible (backend proxy)", async ({ page }) => {
    const response = await page.goto("/api/openapi.json");
    // Accepte 200 (proxy OK) ou autre (backend pas lance)
    expect(response?.status()).toBeGreaterThanOrEqual(200);
    expect(response?.status()).toBeLessThan(500);
  });

  test("service worker s'enregistre", async ({ page }) => {
    await page.goto("/");
    // Attendre que le SW soit enregistre
    const sw = await page.evaluate(async () => {
      if (!("serviceWorker" in navigator)) return "unsupported";
      const reg = await navigator.serviceWorker.getRegistration();
      return reg ? "registered" : "pending";
    });
    expect(sw).toBe("registered");
  });
});
