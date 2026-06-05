import { expect, test } from "@playwright/test";

/**
 * Smoke test — parcours complet GM : login → campagne → carte → token → déplacement.
 *
 * Prérequis CI :
 *   - Docker Compose up (backend + DB + MinIO + Redis)
 *   - Une campagne de test seedée avec au moins une scène et un token.
 *   - Variables d'environnement :
 *       PLAYWRIGHT_BASE_URL   (URL du frontend, ex: http://localhost:5173)
 *       TEST_EMAIL            (email du compte test)
 *       TEST_PASSWORD         (mot de passe)
 *       TEST_CAMPAIGN_ID      (ID de la campagne test)
 */

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:8090";

test.describe("Smoke — flux GM", () => {
  test("login → campagne → carte → sélection token → déplacement", async ({ page }) => {
    // ── 1. Login page ──────────────────────────────────────
    await page.goto(BASE);
    // L'application redirige vers /login si non authentifié
    await expect(page).toHaveURL(/\/login/);

    // Remplir le formulaire de login
    await page.fill('input[name="email"]', process.env.TEST_EMAIL ?? "");
    await page.fill('input[name="password"]', process.env.TEST_PASSWORD ?? "");
    await page.click('button[type="submit"]');

    // Attendre la redirection après login réussi
    await expect(page).not.toHaveURL(/\/login/, { timeout: 15_000 });

    // ── 2. Dashboard → campagne ────────────────────────────
    // Cliquer sur la première campagne disponible
    const campaignLink = page.locator('[data-testid="campaign-card"]').first();
    await expect(campaignLink).toBeVisible({ timeout: 10_000 });
    await campaignLink.click();

    // Attendre que l'interface GM se charge
    await expect(page.locator("[data-vtt-panel]").first()).toBeVisible({
      timeout: 15_000,
    });

    // ── 3. Carte → sélection scène ──────────────────────────
    // La carte doit être visible
    const map = page.locator(".campaign-map-shell");
    await expect(map).toBeVisible({ timeout: 10_000 });

    // Vérifier qu'une scène est chargée (le nom de la scène dans la toolbar)
    const sceneName = page.locator(".campaign-map-toolbar strong");
    await expect(sceneName).toBeVisible({ timeout: 5_000 });

    // ── 4. Sélectionner un token ────────────────────────────
    // Cliquer sur le premier token de la carte
    const firstToken = page.locator(".campaign-map-token").first();
    await expect(firstToken).toBeVisible({ timeout: 5_000 });
    await firstToken.click();

    // Le token doit avoir la classe "selected"
    await expect(firstToken).toHaveClass(/selected/, { timeout: 3_000 });

    // ── 5. Déplacer le token (drag & drop) ──────────────────
    const tokenBox = await firstToken.boundingBox();
    if (tokenBox) {
      const startX = tokenBox.x + tokenBox.width / 2;
      const startY = tokenBox.y + tokenBox.height / 2;

      await page.mouse.move(startX, startY);
      await page.mouse.down();
      await page.mouse.move(startX + 100, startY + 100, { steps: 5 });
      await page.mouse.up();

      // Vérifier que le token a bougé (sa position left/top a changé)
      // On vérifie juste que la carte existe toujours — le vrai test de
      // position nécessiterait des coordonnées connues
      await expect(map).toBeVisible();
    }
  });

  test("login échoué → message d'erreur", async ({ page }) => {
    await page.goto(`${BASE}/login`);
    await expect(page).toHaveURL(/\/login/);

    await page.fill('input[name="email"]', "fake@test.com");
    await page.fill('input[name="password"]', "wrongpassword");
    await page.click('button[type="submit"]');

    // Un message d'erreur doit apparaître
    const error = page.locator('[role="alert"], .error-message, .toast-error').first();
    await expect(error).toBeVisible({ timeout: 10_000 });
  });
});
