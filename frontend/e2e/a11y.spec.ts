/**
 * Accessibility audit with @axe-core/playwright.
 *
 * Runs Axe on key views. Fails on critical or serious violations.
 * Run: npx playwright test e2e/a11y.spec.ts
 */
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const PAGES = [
  { name: "home", path: "/" },
  { name: "login", path: "/login" },
  { name: "register", path: "/register" },
] as const;

for (const page of PAGES) {
  test(`a11y: ${page.name} — no critical/serious violations`, async ({ page }) => {
    await page.goto(page.path);

    // Wait for the page to settle
    await page.waitForLoadState("networkidle");

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    const violations = results.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious"
    );

    if (violations.length > 0) {
      console.log(
        `A11y violations on ${page.name}:\n`,
        violations
          .map(
            (v) =>
              `  [${v.impact}] ${v.id}: ${v.help} (${v.nodes.length} nodes)`
          )
          .join("\n")
      );
    }

    expect(violations.length).toBe(0);
  });
}
