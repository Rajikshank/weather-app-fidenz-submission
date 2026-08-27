import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /continue with auth0/i }).click();
  await expect(page.getByRole("heading", { name: /ocular climate, ranked/i })).toBeVisible();
});

test("user can inspect rankings, charts and score logic", async ({ page }) => {
  await expect(page.getByRole("list", { name: /cities ranked/i }).getByRole("listitem")).toHaveCount(12);
  await page.getByRole("button", { name: /Dubai/ }).click();
  await expect(page.getByRole("heading", { name: "Dubai" })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Why \d+/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Comfort landscape" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Methodology/ })).toHaveCount(0);
});

test("user can log out and return through the protected entry flow", async ({ page }) => {
  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page.getByRole("heading", { name: "Secure sign in" })).toBeVisible();
  await expect(page.getByRole("button", { name: /continue with auth0/i })).toBeVisible();

  await page.getByRole("button", { name: /continue with auth0/i }).click();
  await expect(page.getByRole("heading", { name: /ocular climate, ranked/i })).toBeVisible();
});

test("theme choice survives a normal refresh", async ({ page }) => {
  await page.getByRole("button", { name: "Use dark theme" }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.reload();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await expect(page.getByRole("button", { name: "Use light theme" })).toBeVisible();
});

test("an empty upstream result has a clear recovery state", async ({ page }) => {
  await page.route("**/api/rankings", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      cities: [],
      failures: Array.from({ length: 12 }, (_, index) => ({ cityId: String(index), cityName: `City ${index}`, message: "upstream unavailable" })),
      partial: true,
      generatedAt: new Date().toISOString(),
      algorithmVersion: "ocular-baseline",
      metadata: { requested: 12, returned: 0, cacheTtlSeconds: 300 },
    }),
  }));
  await page.reload();

  await expect(page.getByRole("heading", { name: "Weather observations unavailable." })).toBeVisible();
  await expect(page.getByText("All 12 configured city requests failed upstream.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
});

test("location action is grouped with the observation it changes", async ({ page }) => {
  const locationControl = page.locator(".location-control");
  await expect(locationControl).toBeVisible();
  expect(await locationControl.evaluate((element) => Boolean(element.closest(".hero-card")))).toBe(true);
  expect(await page.locator(".dashboard-intro .location-control").count()).toBe(0);
});

test("city field notes scroll without exposing a scrollbar", async ({ page }) => {
  const list = page.getByRole("list", { name: /cities ranked/i });
  const metrics = await list.evaluate((element) => {
    const style = getComputedStyle(element);
    element.scrollTop = 80;
    return {
      clientHeight: element.clientHeight,
      scrollHeight: element.scrollHeight,
      scrollTop: element.scrollTop,
      overflowY: style.overflowY,
      scrollbarWidth: style.scrollbarWidth,
    };
  });

  expect(metrics.scrollHeight).toBeGreaterThan(metrics.clientHeight);
  expect(metrics.scrollTop).toBeGreaterThan(0);
  expect(metrics.overflowY).toBe("auto");
  expect(metrics.scrollbarWidth).toBe("none");
});

test("zero moisture stress still has a visible chart marker and value", async ({ page }) => {
  await page.getByRole("button", { name: /Boston/ }).click();
  await expect(page.locator(".factor-chart")).toContainText("0%");
  const moistureBar = page.locator(".factor-bar--moisture");
  await expect(moistureBar).toBeVisible();
  const bounds = await moistureBar.boundingBox();
  expect(bounds?.width ?? 0).toBeGreaterThanOrEqual(3);
});

test("user can opt into an unranked nearby observation", async ({ page, context }) => {
  await context.grantPermissions(["geolocation"], { origin: "http://127.0.0.1:5173" });
  await context.setGeolocation({ latitude: 6.9271, longitude: 79.8612 });

  await page.getByRole("button", { name: "Use my location" }).click();

  await expect(page.getByText("Near you · unranked")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Colombo" })).toBeVisible();
  await expect(page.getByRole("list", { name: /cities ranked/i }).getByRole("listitem")).toHaveCount(12);

  await page.getByRole("button", { name: /Boston/ }).click();
  await expect(page.getByRole("button", { name: "Near Colombo" })).toHaveAttribute("aria-pressed", "false");
  await page.getByRole("button", { name: "Near Colombo" }).click();
  await expect(page.getByText("Near you · unranked")).toBeVisible();
});

test("declining location leaves the ranked dashboard usable", async ({ page }) => {
  await page.evaluate(() => {
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: { getCurrentPosition: (_success: PositionCallback, error: PositionErrorCallback) => error({ code: 1, PERMISSION_DENIED: 1 } as GeolocationPositionError) },
    });
  });

  await page.getByRole("button", { name: "Use my location" }).click();

  await expect(page.getByText(/permission was not granted/i)).toBeVisible();
  await expect(page.getByRole("list", { name: /cities ranked/i }).getByRole("listitem")).toHaveCount(12);
});

test("unsupported geolocation explains the limitation without blocking comparison", async ({ page }) => {
  await page.evaluate(() => Object.defineProperty(navigator, "geolocation", { configurable: true, value: undefined }));

  await page.getByRole("button", { name: "Use my location" }).click();

  await expect(page.getByText(/not supported by this browser/i)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Comfort landscape" })).toBeVisible();
});

test("reduced-motion preference removes decorative dashboard animation", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.reload();
  await expect(page.getByRole("heading", { name: /ocular climate, ranked/i })).toBeVisible();

  const animationDuration = await page.locator(".eye-visual > img").evaluate((element) => getComputedStyle(element).animationDuration);
  expect(parseFloat(animationDuration)).toBeLessThanOrEqual(0.01);
  await page.getByRole("button", { name: /Dubai/ }).click();
  await expect(page.getByRole("heading", { name: /Why \d+/ })).toBeVisible();
});

test("chart marks transition when motion is allowed", async ({ page }) => {
  const transitionDuration = await page.locator(".recharts-rectangle").first().evaluate((element) => getComputedStyle(element).transitionDuration);
  expect(parseFloat(transitionDuration)).toBeGreaterThanOrEqual(0.2);
});

test("slow observations show the lightweight sensor loader", async ({ page }) => {
  await page.route("**/api/rankings", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 700));
    await route.continue();
  });
  await page.reload();

  await expect(page.getByRole("status")).toContainText(/reading the atmosphere|verifying your secure session/i);
  await expect(page.locator(".ocu-loader__sensor")).toBeVisible();
  const progress = page.getByRole("progressbar", { name: "Loading observations" });
  const firstValue = Number(await progress.getAttribute("aria-valuenow"));
  await page.waitForTimeout(500);
  const secondValue = Number(await progress.getAttribute("aria-valuenow"));
  expect(secondValue).toBeGreaterThan(firstValue);
  await expect(page.locator(".ocu-loader img")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: /ocular climate, ranked/i })).toBeVisible();
});

test("eye state changes naturally while the score pod keeps only its sheen", async ({ page }) => {
  await expect(page.locator(".eye-visual")).toHaveAttribute("data-eye-state", "calm");
  const spectrum = page.locator(".score-pod__spectrum");
  await expect(spectrum).toBeVisible();
  await expect(spectrum.locator("i")).toHaveCount(5);
  const calmColor = await spectrum.evaluate((element) => getComputedStyle(element).color);
  await page.getByRole("button", { name: /Dubai/ }).click();
  await expect(page.locator(".eye-visual")).toHaveAttribute("data-eye-state", "severe");
  const severeColor = await spectrum.evaluate((element) => getComputedStyle(element).color);
  expect(severeColor).not.toBe(calmColor);

  const motion = await page.locator(".score-pod").evaluate((element) => ({
    pod: getComputedStyle(element).animationName,
    sheen: getComputedStyle(element, "::after").animationName,
    containsSignal: (() => {
      const pod = element.getBoundingClientRect();
      const glyph = element.querySelector(".score-pod__spectrum")?.getBoundingClientRect();
      return Boolean(glyph && glyph.left >= pod.left && glyph.right <= pod.right && glyph.top >= pod.top && glyph.bottom <= pod.bottom);
    })(),
  }));
  expect(motion.pod).toBe("none");
  expect(motion.sheen).toContain("score-sheen");
  expect(motion.containsSignal).toBe(true);
});

test("city search and reverse sorting remain interactive", async ({ page }) => {
  await page.getByRole("textbox", { name: "Search cities" }).fill("melb");
  await expect(page.getByRole("button", { name: /Melbourne/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Paris/ })).toHaveCount(0);
  await page.getByRole("textbox", { name: "Search cities" }).fill("");
  await page.getByRole("button", { name: "Best first" }).click();
  await expect(page.getByRole("button", { name: "Lowest first" })).toBeVisible();
});

test("dashboard has no automatically detectable serious accessibility violations", async ({ page }) => {
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter((violation) => ["serious", "critical"].includes(violation.impact ?? ""))).toEqual([]);
});

test("layout does not overflow its viewport", async ({ page }) => {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});

test("refresh preserves the authenticated dashboard", async ({ page }) => {
  await page.reload();
  await expect(page.getByRole("heading", { name: /ocular climate, ranked/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /continue with auth0/i })).toHaveCount(0);
});

test("long city names never overlap the ocular visualization or score", async ({ page }) => {
  const hasOverlap = await page.evaluate(() => {
    const title = document.querySelector(".hero-copy h2");
    const pulse = document.querySelector(".ocular-pulse");
    const rowName = document.querySelector(".city-row .city-name strong");
    const rowScore = document.querySelector(".city-row .score-chip");
    if (!title || !pulse || !rowName || !rowScore) return true;
    title.textContent = "San Fernando del Valle de Catamarca";
    rowName.textContent = "San Fernando del Valle de Catamarca";
    const titleBox = title.getBoundingClientRect();
    const pulseBox = pulse.getBoundingClientRect();
    const nameBox = rowName.getBoundingClientRect();
    const scoreBox = rowScore.getBoundingClientRect();
    const titlePulseOverlap = titleBox.left < pulseBox.right && titleBox.right > pulseBox.left && titleBox.top < pulseBox.bottom && titleBox.bottom > pulseBox.top;
    const nameScoreOverlap = nameBox.right > scoreBox.left;
    return titlePulseOverlap || nameScoreOverlap;
  });
  expect(hasOverlap).toBe(false);
});

test("city changes keep the primary card stable and preserve whole words", async ({ page }) => {
  const cityButtons = page.getByRole("list", { name: /cities ranked/i }).getByRole("button");
  const geometries: Array<{ width: number; height: number }> = [];

  for (let index = 0; index < await cityButtons.count(); index += 1) {
    await cityButtons.nth(index).click();
    geometries.push(await page.locator(".hero-card").evaluate((card) => {
      const title = card.querySelector<HTMLElement>("#city-summary-title");
      if (!title) throw new Error("Missing selected-city heading");
      const style = getComputedStyle(title);
      if (style.wordBreak !== "normal" || style.overflowWrap !== "normal") {
        throw new Error(`Unsafe city wrapping: ${style.wordBreak}/${style.overflowWrap}`);
      }
      const bounds = card.getBoundingClientRect();
      return { width: bounds.width, height: bounds.height };
    }));
  }

  expect(Math.max(...geometries.map((item) => item.width)) - Math.min(...geometries.map((item) => item.width))).toBeLessThanOrEqual(2);
  expect(Math.max(...geometries.map((item) => item.height)) - Math.min(...geometries.map((item) => item.height))).toBeLessThanOrEqual(2);
});

test("visible application chrome does not expose the internal algorithm identifier", async ({ page }) => {
  await expect(page.getByText(/ocular-baseline/i)).toHaveCount(0);
});
