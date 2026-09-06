#!/usr/bin/env node
/**
 * Valentine self-test. Not the shop tool. Run from repo:
 *   node visualizer/_src/run-traps.mjs
 * Uses system Chrome against a local static server of visualizer/.
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import crypto from "node:crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const VIZ = path.resolve(__dirname, "..");
const ROOT = path.resolve(VIZ, "..");
const results = [];
function rec(id, ok, detail) {
  results.push({ id, ok, detail: String(detail || "") });
  console.log(`${ok ? "PASS" : "FAIL"}  ${id}  ${detail || ""}`);
}

const PLATES = {
  "durango_front.png": "01bddafae607ecb12221e7b1b4fe2fed72bd0eae99b23abc2e04fdf4339fecc3",
  "durango_right.png": "413b56eb4e909d21d832d7aae46499b9f9ef4ba0dcb33ba416de2d7400c58a07",
  "durango_rear.png": "c4eabbf1e566689b92ec8779a6004136882c8128636fffa9ca6905e8b2eb9177",
  "durango_rear_open.png": "36b21bda34aaf842bbb3a47387665a1e9ff6999e2a34f4e837686311938719d2",
  "durango_left.png": "8abc54e8d007fa3096acac73a6b6c81884e5edd9688ca6f2da01a5848c798acd",
  "durango_hero.png": "a06b6bda7638ea2bbacda566d3b45a34482e3a07e4645baa0fab7a050c22c31d",
};

function sha256(p) {
  return crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");
}

function mime(p) {
  if (p.endsWith(".html")) return "text/html; charset=utf-8";
  if (p.endsWith(".json")) return "application/json";
  if (p.endsWith(".png")) return "image/png";
  if (p.endsWith(".js") || p.endsWith(".mjs")) return "text/javascript";
  if (p.endsWith(".css")) return "text/css";
  return "application/octet-stream";
}

function startServer() {
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      const u = decodeURIComponent((req.url || "/").split("?")[0]);
      let rel = u === "/" ? "/index.html" : u;
      const fp = path.normalize(path.join(VIZ, rel));
      if (!fp.startsWith(VIZ)) { res.writeHead(403); res.end(); return; }
      fs.readFile(fp, (err, buf) => {
        if (err) { res.writeHead(404); res.end("404 " + rel); return; }
        res.writeHead(200, { "content-type": mime(fp), "cache-control": "no-store" });
        res.end(buf);
      });
    });
    srv.listen(0, "127.0.0.1", () => resolve(srv));
  });
}

function plateLedCounts() {
  const plates = [
    "durango_front.png", "durango_front_black.png",
    "durango_hero.png", "durango_hero_black.png",
    "durango_left.png", "durango_right.png",
    "durango_rear.png", "durango_rear_open.png",
  ].map((n) => path.join(VIZ, n)).filter((p) => fs.existsSync(p));
  const py = [
    "from PIL import Image",
    "import json, sys",
    "out=[]",
    "for p in sys.argv[1:]:",
    "    im=Image.open(p).convert('RGB'); w,h=im.size; px=im.load(); n=0",
    "    for y in range(int(h*0.16), int(h*0.34)):",
    "        for x in range(int(w*0.16), int(w*0.84)):",
    "            r,g,b=px[x,y]; mx=max(r,g,b); mn=min(r,g,b)",
    "            if mx<90 or mx-mn<70: continue",
    "            if (r>140 and r>b+50 and r>g+20) or (b>140 and b>r+50) or (r>140 and g>90 and b<80 and r>b+40):",
    "                n+=1",
    "    out.append({'file':p.rsplit('/',1)[-1],'led':n,'w':w,'h':h})",
    "print(json.dumps(out))",
  ].join("\n");
  const r = spawnSync("python3", ["-c", py, ...plates], { encoding: "utf8", maxBuffer: 4 * 1024 * 1024 });
  if (r.status !== 0) return { ok: false, err: (r.stderr || r.stdout || "python fail").slice(0, 240) };
  try {
    const rows = JSON.parse(r.stdout || "[]");
    const maxLed = rows.reduce((m, x) => Math.max(m, x.led || 0), 0);
    return { ok: true, maxLed, detail: rows.map((x) => x.file + "=" + x.led).join(" ") };
  } catch (e) {
    return { ok: false, err: String(e.message || e) };
  }
}

function staticTraps() {
  const html = fs.readFileSync(path.join(VIZ, "index.html"), "utf8");
  rec("T-NO-CLICK-PAIRS", !/CLICK_PAIRS|CLICK_MULTI|TRUCK_CLICKS|TRUCK_MULTI/.test(html), "duplicate click maps absent");
  rec("T-PRINT-LABEL", /id="pdfBtn"[^>]*>Print<\/button>/.test(html) && !/Sign-off/.test(html), "chrome says Print, not Sign-off");
  rec("T-LOAD-WIRED", /id="loadBtn"[^>]*>Load SKUs<\/button>/.test(html) && !/not available|coming soon|disabled title="soon"/i.test(html), "Load SKUs present, no soon");
  rec("T-RBW-VISIBLE", /data-s="rbw"/.test(html) && !/#colorScheme \[data-s="rbw"\]\{display:none/.test(html), "R/B/W control not CSS-hidden");
  rec("T-ONE-ROOF-SKU", (html.match(/ALGT53JX-P3LB/g) || []).length > 0 && !/{sku:"ALGT",/.test(html), "one roof SKU row");
  rec("T-TRUCKS-DROPDOWN", /value="silverado"/.test(html) && /value="f150"/.test(html), "Silverado and F-150 in select");
  rec("T-ASSET-V", /ASSET_V="studio18"/.test(html), "ASSET_V=studio18");
  rec("T-FIRST-PAINT-SRC", /src="durango_front\.png\?v=studio18"/.test(html) && !/ac5173e/.test(html), "first-paint plate uses ?v=studio18");
  rec("T-PACK-STAMP", /id="packStamp"/.test(html) && /pack studio18/.test(html), "header pack stamp present");
  rec("T-URL-NO-SEED", !/URLSearchParams/.test(html) && !/location\.search\s*[=.\[]/.test(html), "no URL/hash auto-place");
  rec("T-NO-RESTORE-NODES",
    /Never restore placements/.test(html) && !/nodesByVehicle=s\.nodesByVehicle/.test(html)
    && /removeItem\("iu-visualizer-v1"\)/.test(html) && /assertBareIfEmpty/.test(html),
    "loadState does not rehydrate placements; v1 wiped; empty boot strips sprites");
  const led = plateLedCounts();
  rec("T-BARE-PLATE-PIXELS", !!(led && led.ok && led.maxLed === 0),
    led && led.ok ? ("signed+black plates LED/amber pixels=" + led.maxLed + " " + led.detail) : (led && led.err) || "scan failed");
  rec("T-ARCHIVE-TREE", fs.existsSync(path.join(ROOT, "archive", "README.md"))
    && !fs.existsSync(path.join(ROOT, "compiled-app"))
    && !fs.existsSync(path.join(ROOT, "GitHub-Upload-Small"))
    && !fs.existsSync(path.join(ROOT, "prototypes")), "leftovers parked under archive/");
  rec("T-PAGES-HONEST", !/https:\/\/9z2zc74skw-dev\.github\.io\/Integrity-\//.test(fs.readFileSync(path.join(ROOT, "README.md"), "utf8")), "root README does not promise Pages URL");
  let platesOk = true;
  const plateDetail = [];
  for (const [name, expect] of Object.entries(PLATES)) {
    const got = sha256(path.join(VIZ, name));
    const ok = got === expect;
    if (!ok) platesOk = false;
    plateDetail.push(`${name} ${ok ? "unchanged" : "MOVED " + got}`);
  }
  rec("T-PLATE-HASHES", platesOk, plateDetail.join("; "));
}

async function fetchOk(base, rel) {
  const r = await fetch(base + rel);
  return { rel, status: r.status, ok: r.status === 200 };
}

async function chromeEval(base, fnBody) {
  let puppeteer;
  const candidates = [
    "puppeteer-core",
    "/tmp/iu-traps/node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js",
    "/tmp/iu-traps/node_modules/puppeteer-core/lib/cjs/puppeteer/puppeteer-core.js",
  ];
  for (const spec of candidates) {
    try {
      const mod = await import(spec);
      puppeteer = mod.default || mod;
      break;
    } catch {}
  }
  if (!puppeteer) {
    rec("T-CHROME-RUNTIME", false, "puppeteer-core not installed");
    return null;
  }
  const browser = await puppeteer.launch({
    executablePath: process.env.CHROME || (fs.existsSync("/usr/bin/google-chrome") ? "/usr/bin/google-chrome" : "/usr/local/bin/google-chrome"),
    headless: "new",
    args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
  });
  try {
    const page = await browser.newPage();
    await page.goto(base + "/", { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForFunction(() => window.__IU_TEST__, { timeout: 10000 });
    const snap = () => page.evaluate(() => {
      const T = window.__IU_TEST__;
      return {
        placements: T.placementCount(),
        lights: T.stageLightCount(),
        ghosts: T.ghostCount(),
        overlays: T.overlayCount(),
        push: T.pushBarOn(),
        dash: T.toggleOn("dashToggle"),
        hatch: T.toggleOn("hatchToggle"),
        pushSw: T.toggleOn("pushBarToggle"),
        pack: T.packStamp(),
        plateSrc: T.plateSrc(),
        asset: T.ASSET_V,
      };
    });
    const bareCold = await snap();
    await page.evaluate(() => {
      const poison = JSON.stringify({
        vehicleId: "durango",
        nodesByVehicle: {
          durango: {
            front: [{ id: 99, sku: "ALGT53JX-P3LB", x: 0.5, y: 0.25, scale: 1, rot: 0 }],
            hero: [{ id: 100, sku: "ALGT53JX-P3LB", x: 0.47, y: 0.26, scale: 1, rot: 0 }],
          },
        },
        pushBar: true,
        dashLighting: true,
        rearHatchLights: true,
      });
      localStorage.setItem("iu-visualizer-v1", poison);
      localStorage.setItem("iu-visualizer-v2", poison);
    });
    await page.reload({ waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForFunction(() => window.__IU_TEST__, { timeout: 10000 });
    const afterPoison = await snap();
    const runtime = await page.evaluate(fnBody);
    return { bareCold, afterPoison, runtime };
  } finally {
    await browser.close();
  }
}

async function main() {
  staticTraps();
  const srv = await startServer();
  const { port } = srv.address();
  const base = `http://127.0.0.1:${port}`;

  const html = fs.readFileSync(path.join(VIZ, "index.html"), "utf8");
  const fxFiles = fs.readdirSync(path.join(VIZ, "fx")).filter((f) => f.endsWith(".png"));
  const heads = [];
  for (const f of fxFiles) heads.push(await fetchOk(base, "/fx/" + f));
  const miss = heads.filter((h) => !h.ok);
  rec("T-FX-HEAD", miss.length === 0, miss.length ? miss.map((m) => m.rel + ":" + m.status).join(",") : heads.length + " fx 200");

  const demo = await fetchOk(base, "/quotes/demo-1236.json");
  rec("T-DEMO-QUOTE-FILE", demo.ok, "quotes/demo-1236.json " + demo.status);

  let runtime;
  try {
    runtime = await chromeEval(base, () => {
      const T = window.__IU_TEST__;
      const out = {
        asset: T.ASSET_V,
        skus: T.CATALOG.map((c) => c.sku),
        clickPlace: [],
        roof: {},
        schemes: {},
        trucks: {},
        load: {},
        visor: {},
        toggles: {},
        print: document.getElementById("pdfBtn") && document.getElementById("pdfBtn").textContent.trim(),
        loadLabel: document.getElementById("loadBtn") && document.getElementById("loadBtn").textContent.trim(),
        rbwBtn: !!(document.querySelector('#colorScheme [data-s="rbw"]')),
        rbwHidden: false,
      };
      const rbw = document.querySelector('#colorScheme [data-s="rbw"]');
      if (rbw) out.rbwHidden = getComputedStyle(rbw).display === "none";

      const vehicles = ["durango", "silverado", "f150"];
      const fromViews = ["front", "left", "rear"];
      vehicles.forEach((vid) => {
        T.setVehicle(vid);
        const clicks = T.clickMap();
        const roofY = (T.VEHICLES[vid].defaults && T.VEHICLES[vid].defaults["ALGT53JX-P3LB"] && T.VEHICLES[vid].defaults["ALGT53JX-P3LB"].front[1])
          || (T.DEFAULTS["ALGT53JX-P3LB"].front[1]);
        out.trucks[vid] = {
          roofY,
          frontBarW: T.VEHICLES[vid].frontRoofBarW,
          clickRoofY: clicks["ALGT53JX-P3LB"].front[0][1],
          skuCount: T.CATALOG.filter((c) => clicks[c.sku]).length,
          pushBar: T.VEHICLES[vid].pushBar && T.VEHICLES[vid].pushBar.front,
        };
        fromViews.forEach((v) => {
          T.resetNodes();
          T.setVehicle(vid);
          T.setView(v);
          T.CATALOG.forEach((c) => T.clickPlace(c.sku));
          const bag = T.nodes();
          const counts = {};
          Object.keys(bag).forEach((k) => { counts[k] = bag[k].length; });
          const roof = {};
          Object.keys(bag).forEach((k) => {
            roof[k] = bag[k].filter((n) => T.isRoofBar(n.sku)).map((n) => n.sku);
          });
          out.clickPlace.push({ vid, from: v, counts, roof, total: Object.values(counts).reduce((a, b) => a + b, 0) });
        });
      });
      out.roof = T.roofBarNodes();

      T.resetNodes();
      T.setVehicle("durango");
      T.setView("front");
      T.clickPlace("ALGT53JX-P3LB");
      T.clickPlace("SIFMJS");
      ["rb", "bw", "rw", "rbw"].forEach((s) => {
        T.setScheme(s);
        const files = T.CATALOG.map((c) => T.fxFor(c)).filter(Boolean);
        out.schemes[s] = files;
      });

      T.resetNodes();
      T.setVehicle("durango");
      T.loadSkuList(["ALGT", "SIFMJS", "MPS63", "LIGHTS:MPS123U-RBW-SMK"], "1236");
      out.load = { present: ["ALGT53JX-P3LB", "SIFMJS", "MPS63U-RBW", "MPS123U-RBW"].map((s) => [s, T.skuPresent(s)]), roof: T.roofBarNodes() };

      const sif = T.CATALOG.find((c) => c.sku === "SIFMJS");
      out.visor = { w: sif && sif.w, fx: sif && sif.fx };

      T.resetNodes();
      T.setVehicle("durango");
      T.setView("front");
      document.getElementById("dashToggle").click();
      out.toggles.dashOn = T.skuPresent("SIFMJS");
      document.getElementById("dashToggle").click();
      out.toggles.dashOff = T.skuPresent("SIFMJS");
      T.setView("rear");
      document.getElementById("hatchToggle").click();
      out.toggles.hatchOn = T.skuPresent("STICK-RB");
      document.getElementById("hatchToggle").click();
      out.toggles.hatchOff = T.skuPresent("STICK-RB");

      T.resetNodes();
      T.setVehicle("durango");
      T.setView("front");
      T.clickPlace("ALGT53JX-P3LB");
      T.setView("hero");
      var img=document.getElementById("vehicleImg");
      var ghost=document.querySelector(".ghost-bar");
      var ir=img&&img.getBoundingClientRect();
      var gr=ghost&&ghost.getBoundingClientRect();
      out.heroSit={
        spec: T.ghostSpecForView && T.ghostSpecForView(),
        origin: ghost&&ghost.style.transformOrigin,
        topPct: ir&&gr? (gr.top-ir.top)/ir.height*100 : null,
        botPct: ir&&gr? (gr.bottom-ir.top)/ir.height*100 : null
      };

      T.resetNodes();
      T.setVehicle("durango");
      T.setView("front");
      T.clickPlace("ALGT53JX-P3LB");
      out.oneSku={
        unique:[...new Set(Object.values(T.nodes()).flat().map(function(n){return n.sku;}))],
        placements:T.placementCount(),
        lights:T.stageLightCount()
      };
      T.setView("left");
      out.oneSkuGhostLeft=T.ghostCount();
      T.setView("hero");
      out.oneSkuGhostHero=T.ghostCount();
      T.clearAll();
      T.setView("front");
      out.afterClear={
        placements:T.placementCount(),
        lights:T.stageLightCount(),
        ghosts:T.ghostCount(),
        overlays:T.overlayCount(),
        dash:T.toggleOn("dashToggle"),
        hatch:T.toggleOn("hatchToggle"),
        push:T.pushBarOn()
      };
      return out;
    });
    rec("T-CHROME-RUNTIME", !!(runtime && runtime.runtime), runtime ? "evaluated" : "no runtime");
  } catch (e) {
    rec("T-CHROME-RUNTIME", false, e && e.message);
    finish(srv);
    return;
  }

  if (runtime && runtime.bareCold) {
    var bareOk = function(s){
      return s && s.placements===0 && s.lights===0 && s.ghosts===0 && s.overlays===0
        && !s.push && !s.dash && !s.hatch && !s.pushSw;
    };
    rec("T-BARE-DEFAULT", bareOk(runtime.bareCold) && bareOk(runtime.afterPoison),
      JSON.stringify({cold:runtime.bareCold, afterPoison:runtime.afterPoison}));
    rec("T-COLD-NO-SPRITE",
      bareOk(runtime.bareCold) && runtime.bareCold.asset==="studio18"
        && /pack studio18/.test(runtime.bareCold.pack||"")
        && /studio18/.test(runtime.bareCold.plateSrc||""),
      JSON.stringify({pack:runtime.bareCold.pack, src:runtime.bareCold.plateSrc, asset:runtime.bareCold.asset}));
  }

  runtime = runtime && runtime.runtime;
  if (runtime) {
    rec("T-CLICKPLACE-ALL", runtime.clickPlace.every((row) => row.total > 0), runtime.clickPlace.map((r) => `${r.vid}/${r.from}=${r.total}`).join(" "));
    const roofLeak = runtime.clickPlace.filter((r) => Object.entries(r.roof).some(([v, list]) => v !== "front" && list.length));
    rec("T-ROOF-FRONT-ONLY", roofLeak.length === 0, roofLeak.length ? JSON.stringify(roofLeak) : "roof nodes only on front after clickPlace from Front/Left/Rear");
    var hs=runtime.heroSit||{};
    var spec=hs.spec||{};
    rec("T-HERO-GHOST-SIT",
      spec.y>=27.5 && spec.sit==="bottom" && spec.rot<=-5 && spec.rot>=-8 && /100%/.test(hs.origin||""),
      JSON.stringify({spec:hs.spec, origin:hs.origin}));
    rec("T-TRUCK-NO-DURANGO-LEAK",
      runtime.trucks.durango.roofY !== runtime.trucks.silverado.roofY
      && runtime.trucks.durango.roofY !== runtime.trucks.f150.roofY
      && runtime.trucks.silverado.frontBarW !== runtime.trucks.durango.frontBarW
      && runtime.trucks.f150.frontBarW !== runtime.trucks.durango.frontBarW,
      JSON.stringify({ d: runtime.trucks.durango, s: runtime.trucks.silverado, f: runtime.trucks.f150 }));
    rec("T-TRUCK-FULL-MAP",
      runtime.trucks.silverado.skuCount === runtime.skus.length && runtime.trucks.f150.skuCount === runtime.skus.length,
      `silverado ${runtime.trucks.silverado.skuCount}/${runtime.skus.length} f150 ${runtime.trucks.f150.skuCount}/${runtime.skus.length}`);
    rec("T-PUSHBAR-PER-PLATE",
      runtime.trucks.durango.pushBar.w !== runtime.trucks.silverado.pushBar.w
      && runtime.trucks.silverado.pushBar.w !== runtime.trucks.f150.pushBar.w,
      JSON.stringify({ d: runtime.trucks.durango.pushBar, s: runtime.trucks.silverado.pushBar, f: runtime.trucks.f150.pushBar }));

    const schemeFiles = {};
    let schemeOk = true;
    const scheme404 = [];
    for (const [s, files] of Object.entries(runtime.schemes)) {
      const uniq = [...new Set(files.map((f) => f.split("?")[0]))];
      schemeFiles[s] = uniq;
      for (const f of uniq) {
        const h = await fetchOk(base, "/" + f);
        if (!h.ok) { schemeOk = false; scheme404.push(s + ":" + f + ":" + h.status); }
      }
    }
    rec("T-SCHEME-FILES", schemeOk, scheme404.length ? scheme404.join(",") : "rb/bw/rw/rbw sprites HEAD 200");
    const rbSet = new Set(schemeFiles.rb || []);
    const changed = ["bw", "rw", "rbw"].every((s) => (schemeFiles[s] || []).some((f) => !rbSet.has(f)));
    rec("T-SCHEME-PIXEL-OWNER", changed, "each scheme requests different sprite set");
    rec("T-RBW-CONTROL", runtime.rbwBtn && !runtime.rbwHidden, `btn=${runtime.rbwBtn} hidden=${runtime.rbwHidden}`);
    rec("T-LOAD-SKUS", runtime.load.present.every(([, ok]) => ok), JSON.stringify(runtime.load.present));
    rec("T-VISOR-W", runtime.visor.w >= 30, `SIFMJS w=${runtime.visor.w}`);
    rec("T-TOGGLES-ONE-OWNER", runtime.toggles.dashOn && !runtime.toggles.dashOff && runtime.toggles.hatchOn && !runtime.toggles.hatchOff, JSON.stringify(runtime.toggles));
    rec("T-PRINT-RUNTIME", runtime.print === "Print", "button=" + runtime.print);
    rec("T-LOAD-LABEL", runtime.loadLabel === "Load SKUs", "button=" + runtime.loadLabel);
    rec("T-ONE-PARTS-CLICK",
      runtime.oneSku && runtime.oneSku.unique.length===1 && runtime.oneSku.unique[0]==="ALGT53JX-P3LB"
      && runtime.oneSku.placements>=1 && runtime.oneSkuGhostHero>=1 && runtime.oneSkuGhostLeft>=1,
      JSON.stringify({one:runtime.oneSku, left:runtime.oneSkuGhostLeft, hero:runtime.oneSkuGhostHero}));
    rec("T-CLEAR-ALL-BARE",
      runtime.afterClear && runtime.afterClear.placements===0 && runtime.afterClear.lights===0
      && runtime.afterClear.ghosts===0 && runtime.afterClear.overlays===0
      && !runtime.afterClear.dash && !runtime.afterClear.hatch && !runtime.afterClear.push,
      JSON.stringify(runtime.afterClear));
  }

  finish(srv);
}

function finish(srv) {
  srv.close();
  const fail = results.filter((r) => !r.ok);
  const md = [
    "# Vector trap log — studio18 cold-load / OEM ridge",
    "",
    "Self-test owned by this pass. Valentine trap-scores after. This file does **not** certify buyer-ready.",
    "",
    `- Ran: \`node visualizer/_src/run-traps.mjs\` (local Chrome, not Rusty’s live preview)`,
    `- ASSET_V: studio18 · FX_V: max6`,
    `- Signed Durango plate bytes: T-PLATE-HASHES (Front/Right/Rear/Hatch not recut)`,
    `- studio18: cold load draws zero overlay sprites. The grey Front windshield-header is OEM plate pixels, not ALGT.`,
    "",
    "| Trap | Result | Detail |",
    "|---|---|---|",
    ...results.map((r) => `| ${r.id} | ${r.ok ? "PASS" : "FAIL"} | ${r.detail.replace(/\|/g, "/")} |`),
    "",
    fail.length ? `**${fail.length} FAIL** — named above. Not “soon.”` : "All named traps PASS.",
    "",
  ].join("\n");
  fs.writeFileSync(path.join(VIZ, "TRAP-LOG.md"), md);
  const outp = path.join("/tmp", "iu-trap-results.json");
  fs.writeFileSync(outp, JSON.stringify({ results, fail: fail.length }, null, 2));
  console.log("\nWrote visualizer/TRAP-LOG.md");
  process.exit(fail.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
