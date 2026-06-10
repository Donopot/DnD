/**
 * Accessibility audit with @axe-core/playwright.
 *
 * Runs Axe on key views. Fails on critical or serious violations.
 * Run: npx playwright test e2e/a11y.spec.ts
 */

import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const PAGES = [
  { name: "home", path: "/" },
  { name: "login", path: "/login" },
  { name: "register", path: "/register" },
] as const;

for (const route of PAGES) {
  test(`a11y: ${route.name} — no critical/serious violations`, async ({ page: pwPage }) => {
    await pwPage.goto(route.path);
    await pwPage.waitForLoadState("networkidle");

    const results = await new AxeBuilder({ page: pwPage })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    const violations = results.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious",
    );

    if (violations.length > 0) {
      console.log(
        `A11y violations on ${route.name}:\n`,
        violations
          .map((v) => `  [${v.impact}] ${v.id}: ${v.help} (${v.nodes.length} nodes)`)
          .join("\n"),
      );
    }

    expect(violations.length).toBe(0);
  });
}

/** Smoke: visual regression — key pages render without error. */
test("visual: home page renders without crash", async ({ page: pwPage }) => {
  const response = await pwPage.goto("/");
  expect(response?.status()).toBeLessThan(400);
  await pwPage.waitForLoadState("networkidle");
  // Verify core shell element exists
  await expect(pwPage.locator("body")).toBeVisible();
});

test("visual: login page has auth form", async ({ page: pwPage }) => {
  await pwPage.goto("/login");
  await pwPage.waitForLoadState("networkidle");
  // Auth page should have at least one form or CTA
  const formOrButton = pwPage.locator("form, button, a[href]");
  await expect(formOrButton.first()).toBeVisible();
});

/** Responsive: pages render on tablet/mobile viewports. */
const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "mobile", width: 375, height: 812 },
] as const;

for (const vp of VIEWPORTS) {
  test(`responsive: login at ${vp.name} (${vp.width}x${vp.height})`, async ({ page: pwPage }) => {
    await pwPage.setViewportSize({ width: vp.width, height: vp.height });
    await pwPage.goto("/login");
    await pwPage.waitForLoadState("networkidle");
    await expect(pwPage.locator("body")).toBeVisible();
  });
}
