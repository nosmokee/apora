const { chromium } = require("playwright"),
  http = require("http"),
  fs = require("fs"),
  path = require("path"),
  assert = require("assert/strict");
(async () => {
  const root = path.resolve(__dirname, "..");
  const server = http.createServer((req, res) => {
    const file = path.join(
      root,
      new URL(req.url, "http://localhost").pathname === "/"
        ? "index.html"
        : new URL(req.url, "http://localhost").pathname,
    );
    if (!file.startsWith(root + path.sep)) {
      res.writeHead(403);
      return res.end();
    }
    fs.readFile(file, (err, data) => {
      if (err) {
        res.writeHead(404);
        return res.end();
      }
      res.setHeader(
        "Content-Type",
        file.endsWith(".js")
          ? "application/javascript"
          : file.endsWith(".png")
            ? "image/png"
            : file.endsWith(".webmanifest")
              ? "application/manifest+json"
              : "text/html",
      );
      res.end(data);
    });
  });
  await new Promise((r) => server.listen(8765, "127.0.0.1", r));
  const b = await chromium.launch({
      executablePath: process.env.OPORA_CHROMIUM || "/usr/local/bin/chromium",
      args: ["--no-sandbox"],
    }),
    ctx = await b.newContext(),
    p = await ctx.newPage();
  await p.goto("http://127.0.0.1:8765/");
  await p.waitForFunction(() => navigator.serviceWorker.controller);
  let checks = 0;
  const ok = (x, m) => {
    assert.ok(x, m);
    checks++;
  };
  let cache = await p.evaluate(async () => ({
    names: await caches.keys(),
    urls: (await (await caches.open("opora-2.0.0-nav3")).keys()).map(
      (r) => r.url,
    ),
  }));
  ok(cache.urls.length === 4, "four bounded assets");
  ok(
    cache.urls.filter((u) => u.endsWith("index.html")).length === 1,
    "one HTML",
  );
  ok(!cache.urls.includes("http://127.0.0.1:8765/"), "no duplicate root HTML");
  await p.evaluate(async () => {
    localStorage.setItem("opora-favorites", '["work-war"]');
    await caches.open("opora-0.6");
    setView("about");
  });
  await p.locator("#cache-clean").click();
  await p.waitForFunction(
    async () => !(await caches.keys()).includes("opora-0.6"),
  );
  ok(
    await p.evaluate(
      () => localStorage.getItem("opora-favorites") === '["work-war"]',
    ),
    "favorites kept",
  );
  ok(
    await p.evaluate(async () =>
      (await caches.keys()).includes("opora-2.0.0-nav3"),
    ),
    "offline kept",
  );
  await ctx.setOffline(true);
  await p.reload();
  await p.waitForSelector("#subject-search");
  await p.evaluate(() => openCard("work-war"));
  ok(
    (await p.locator("#dialog-body").textContent()).includes(
      "Платоном Каратаевым",
    ),
    "literature offline",
  );
  await p.locator("#close-dialog").click();
  await p.goto("http://127.0.0.1:8765/?from=installed");
  await p.waitForSelector("#subject-search");
  ok(true, "query navigation offline");
  await p.evaluate(() => setView("translate"));
  ok(
    await p.locator("#translation-submit").isDisabled(),
    "web translation explicitly unavailable",
  );
  ok(
    (await p.locator("#translation-mode option[value=online]").count()) === 0,
    "online service absent",
  );
  await p.locator("#translation-source").fill("Hello ,world !\n\nNext .");
  await p.locator("#translation-format-source").click();
  ok(
    (await p.locator("#translation-source").inputValue()) ===
      "Hello, world!\n\nNext.",
    "formatting offline",
  );
  await p.evaluate(() => setView("schedule"));
  await p.locator("#schedule-subject").fill("Офлайн-урок");
  await p.locator("#schedule-form button[type=submit]").click();
  ok(
    (await p.evaluate(() => OporaV2.schedule.get().length)) === 1,
    "schedule offline",
  );
  await p.evaluate(() => OporaV2.reader.open("work-captain"));
  ok(
    (await p.locator(".reader-page").textContent()).includes("Глава"),
    "book offline",
  );
  await p.reload();
  await p.waitForSelector("#subject-search");
  ok((await p.evaluate(() => DB.version)) === "2.0.0", "v2 reload offline");
  ok(
    (await p.evaluate(() => OporaV2.schedule.get().length)) === 1,
    "offline schedule survives reload",
  );
  const out = process.env.OPORA_QA_OUTPUT || "/data/opora-v2-qa";
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(
    path.join(out, "pwa-results.json"),
    JSON.stringify({ checks, cache }, null, 2),
  );
  console.log(JSON.stringify({ checks, cache }, null, 2));
  await b.close();
  await new Promise((r) => server.close(r));
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
