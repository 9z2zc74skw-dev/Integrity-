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
  /* Front + Hero roof-contact band only. Rear CHMSL / taillights are OEM red, not ALGT. */
  const plates = [
    "durango_front.png", "durango_front_black.png",
    "durango_hero.png", "durango_hero_black.png",
  ].map((n) => path.join(VIZ, n)).filter((p) => fs.existsSync(p));
  const py = [
    "from PIL import Image",
    "import json, sys",
    "out=[]",
    "for p in sys.argv[1:]:",
    "    im=Image.open(p).convert('RGB'); w,h=im.size; px=im.load(); n=0",
    "    y0,y1,x0,x1=(int(h*0.228), int(h*0.268), int(w*0.22), int(w*0.78))",
    "    for y in range(y0, y1):",
    "        for x in range(x0, x1):",
    "            r,g,b=px[x,y]; mx=max(r,g,b); mn=min(r,g,b)",
    "            if mx<110 or mx-mn<80: continue",
    "            red=r>150 and r>b+55 and r>g+35",
    "            blu=b>150 and b>r+55 and b>g+20",
    "            if red or blu: n+=1",
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

function fxLookScan() {
  /* HEAD 200 is not a look check. Fail 623-byte / square product-card thumbs. */
  const py = [
    "from PIL import Image",
    "import os, json, sys",
    "fx=sys.argv[1]",
    "rows=[]; fail=[]",
    "for n in sorted(os.listdir(fx)):",
    "    if not n.startswith('fx_dyna') or not n.endswith('.png'): continue",
    "    p=os.path.join(fx,n); sz=os.path.getsize(p)",
    "    im=Image.open(p).convert('RGBA'); w,h=im.size; px=im.load()",
    "    corners=[px[0,0][3], px[w-1,0][3], px[0,h-1][3], px[w-1,h-1][3]]",
    "    asp=w/max(h,1.0)",
    "    yellow=0; opaque=0",
    "    for y in range(h):",
    "        for x in range(w):",
    "            r,g,b,a=px[x,y]",
    "            if a>200: opaque+=1",
    "            if a>200 and r>180 and g>150 and b<110: yellow+=1",
    "    yf=yellow/max(opaque,1)",
    "    ok=(sz>623 and asp>=3.0 and h<=80 and w>=120 and max(corners)<16 and yf<0.12)",
    "    rows.append({'file':n,'bytes':sz,'w':w,'h':h,'asp':round(asp,2),'cornerA':corners,'yellow':yellow,'yf':round(yf,4),'ok':ok})",
    "    if not ok: fail.append(n+' sz='+str(sz)+' '+str(w)+'x'+str(h)+' yf='+str(round(yf,4))+' cA='+str(max(corners)))",
    "print(json.dumps({'ok':len(fail)==0 and len(rows)>=8,'n':len(rows),'fail':fail,'minBytes':min((r['bytes'] for r in rows), default=0),'maxH':max((r['h'] for r in rows), default=0)}))",
  ].join("\n");
  const r = spawnSync("python3", ["-c", py, path.join(VIZ, "fx")], { encoding: "utf8", maxBuffer: 2 * 1024 * 1024 });
  if (r.status !== 0) return { ok: false, detail: (r.stderr || r.stdout || "python fail").slice(0, 240) };
  try {
    const j = JSON.parse(r.stdout || "{}");
    return { ok: !!j.ok, detail: JSON.stringify(j) };
  } catch (e) {
    return { ok: false, detail: String(e.message || e) };
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
  rec("T-ASSET-V", /ASSET_V="studio26"/.test(html), "ASSET_V=studio26");
  rec("T-NO-HOME-YANK", !/view\s*=\s*preferView\(/.test(html) && !/view\s*=\s*HOME_VIEW/.test(html) && /Camera stays/.test(html), "clickPlace never assigns camera from HOME_VIEW");
  rec("T-FIRST-PAINT-SRC", /src="durango_front\.png\?v=studio26"/.test(html) && !/ac5173e/.test(html), "first-paint plate uses ?v=studio26");
  rec("T-PACK-STAMP", /id="packStamp"/.test(html) && /pack studio26/.test(html), "header pack stamp present");
  rec("T-OEM-HIDE-FILE", fs.existsSync(path.join(VIZ, "fx", "oem_hide_durango_front.png")), "Front OEM-hide overlay present");
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
  const fxLook = fxLookScan();
  rec("T-FX-LOOK", fxLook.ok, fxLook.detail);
}

async function fetchOk(base, rel) {
  const r = await fetch(base + rel);
  return { rel, status: r.status, ok: r.status === 200 };
}

async function chromeEval(base, fnBody) {
  let puppeteer;
  const candidates = [
    "puppeteer-core",
    "/tmp/iu-traps/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js",
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
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
    await page.goto(base + "/", { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForFunction(() => window.__IU_TEST__, { timeout: 10000 });
    await page.waitForFunction(() => {
      const img = document.getElementById("vehicleImg");
      return !!(img && img.complete && img.naturalHeight > 50 && img.getBoundingClientRect().height > 80);
    }, { timeout: 15000 });
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
        patchOn: T.platePatchOn(),
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
  const dynaHeads = heads.filter((h) => /\/fx_dyna/.test(h.rel));
  rec("T-DYNA-HEAD", dynaHeads.length > 0 && dynaHeads.every((h) => h.ok),
    dynaHeads.length === 0 ? "no fx_dyna files" : (dynaHeads.every((h) => h.ok) ? dynaHeads.length + " dyna fx 200" : dynaHeads.filter((h) => !h.ok).map((m) => m.rel + ":" + m.status).join(",")));

  const demo = await fetchOk(base, "/quotes/demo-1236.json");
  rec("T-DEMO-QUOTE-FILE", demo.ok, "quotes/demo-1236.json " + demo.status);

  let runtime;
  try {
    runtime = await chromeEval(base, async () => {
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
        visorSplit: {},
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
      T.clickPlace("SIFMJS");
      var sifFront = (T.nodes().front || []).filter(function(n){ return n.sku === "SIFMJS"; });
      var xs = sifFront.map(function(n){ return n.x; }).sort(function(a,b){ return a-b; });
      var vw = (sifFront[0] && sifFront[0].w) || (sif && sif.w) || 0;
      var hw = vw / 200;
      var leftN = sifFront.reduce(function(a,n){ return n.x < a.x ? n : a; }, sifFront[0] || {x:0.5});
      var rightN = sifFront.reduce(function(a,n){ return n.x > a.x ? n : a; }, sifFront[0] || {x:0.5});
      var gap = (sifFront.length >= 2) ? ((rightN.x - hw) - (leftN.x + hw)) : null;
      var sides = sifFront.map(function(n){ return n.side || T.visorSide(n); }).sort();
      var lightCls = Array.prototype.map.call(document.querySelectorAll("#stage .light"), function(el){ return el.className; });
      var partsCount = sifFront.length;
      var dashWhileParts = T.toggleOn("dashToggle");
      T.setOwnedSku("SIFMJS", true);
      var afterOwnOn = (T.nodes().front || []).filter(function(n){ return n.sku === "SIFMJS"; }).length;
      T.setOwnedSku("SIFMJS", false);
      var afterOwnOff = (T.nodes().front || []).filter(function(n){ return n.sku === "SIFMJS"; }).length;
      document.getElementById("dashToggle").click();
      var afterDashOn = (T.nodes().front || []).filter(function(n){ return n.sku === "SIFMJS"; }).length;
      document.getElementById("dashToggle").click();
      var afterDashOff = (T.nodes().front || []).filter(function(n){ return n.sku === "SIFMJS"; }).length;
      out.visorSplit = {
        count: partsCount,
        xs: xs,
        w: vw,
        gap: gap,
        sides: sides,
        lights: lightCls,
        dashWhileParts: dashWhileParts,
        afterOwnOn: afterOwnOn,
        afterOwnOff: afterOwnOff,
        afterDashOn: afterDashOn,
        afterDashOff: afterDashOff,
        centered: xs.length === 1 && Math.abs(xs[0] - 0.5) < 0.04
      };

      T.resetNodes();
      T.setVehicle("durango");
      T.setView("front");
      document.getElementById("dashToggle").click();
      out.toggles.dashOn = T.skuPresent("SIFMJS");
      out.toggles.dashOnCount = (T.nodes().front || []).filter(function(n){ return n.sku === "SIFMJS"; }).length;
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

      const dynaSkus = ["DYNA-1","DYNA-2","DYNA-S","DYNA-X","DR1-RBK-SMK","DR6-RBW"];
      const dynaPlace = {};
      for (const sku of dynaSkus) {
        T.resetNodes();
        T.setVehicle("durango");
        T.setView("front");
        T.clickPlace(sku);
        await new Promise(function(resolve){
          var imgs=[].slice.call(document.querySelectorAll("#stage .light img"));
          var pending=imgs.filter(function(i){ return !i.complete; }).length;
          if(!pending){ resolve(); return; }
          var done=function(){ pending--; if(pending<=0) resolve(); };
          imgs.forEach(function(i){ if(!i.complete){ i.addEventListener("load", done); i.addEventListener("error", done); } });
          setTimeout(resolve, 800);
        });
        const bag = T.nodes();
        const counts = {};
        Object.keys(bag).forEach(function(k){
          counts[k] = (bag[k] || []).filter(function(n){ return n.sku === sku; }).length;
        });
        const total = Object.values(counts).reduce(function(a,b){ return a+b; }, 0);
        const imgs = Array.prototype.map.call(document.querySelectorAll("#stage .light img"), function(img){
          return { src: (img.getAttribute("src")||""), w: img.naturalWidth||0, h: img.naturalHeight||0, complete: !!img.complete, alt: img.alt||"" };
        });
        const light = document.querySelector("#stage .light");
        const lr = light && light.getBoundingClientRect();
        dynaPlace[sku] = {
          counts: counts,
          total: total,
          dynaClass: !!document.querySelector("#stage .light.dyna-stick"),
          imgs: imgs,
          box: lr ? { w: lr.width, h: lr.height, asp: lr.height ? lr.width / lr.height : 0 } : null
        };
      }
      out.dyna = {
        catalog: T.CATALOG.filter(function(c){ return c.dyna || (T.isDyna && T.isDyna(c.sku)); }).map(function(c){ return {sku:c.sku, fx:c.fx, w:c.w}; }),
        place: dynaPlace
      };

      function dockSnap(){
        var dock=document.getElementById("selDock");
        var light=document.querySelector("#stage .light.selected");
        var dr=dock && dock.classList.contains("on") ? dock.getBoundingClientRect() : null;
        var lr=light ? light.getBoundingClientRect() : null;
        var gapAbove = (dr && lr) ? (lr.top - dr.bottom) : null;
        var gapBelow = (dr && lr) ? (dr.top - lr.bottom) : null;
        var dx = (dr && lr) ? Math.abs((dr.left+dr.right)/2 - (lr.left+lr.right)/2) : null;
        return {
          on: !!(dock && dock.classList.contains("on")),
          gapAbove: gapAbove,
          gapBelow: gapBelow,
          dx: dx,
          dockTop: dr && dr.top,
          lightTop: lr && lr.top,
          lightBottom: lr && lr.bottom,
          visor: !!(light && /ils-/.test(light.className))
        };
      }
      T.resetNodes();
      T.setVehicle("durango");
      T.setView("front");
      await new Promise(function(resolve){
        var vimg=document.getElementById("vehicleImg");
        if(vimg && vimg.complete && vimg.naturalHeight>50){ resolve(); return; }
        if(vimg) vimg.addEventListener("load", function(){ resolve(); }, {once:true});
        setTimeout(resolve, 2000);
      });
      T.clickPlace("SIFMJS");
      await new Promise(function(resolve){
        var imgs=[].slice.call(document.querySelectorAll("#stage .light img"));
        var pending=imgs.filter(function(i){ return !i.complete; }).length;
        if(!pending){ resolve(); return; }
        var done=function(){ pending--; if(pending<=0) resolve(); };
        imgs.forEach(function(i){ if(!i.complete) i.addEventListener("load", done); i.addEventListener("error", done); });
        setTimeout(resolve, 1200);
      });
      await new Promise(function(r){ requestAnimationFrame(function(){ requestAnimationFrame(r); }); });
      T.syncSelDock && T.syncSelDock();
      var afterPlaceDock = {
        lights: T.stageLightCount(),
        selected: document.querySelectorAll("#stage .light.selected").length,
        dockOn: !!(document.getElementById("selDock") && document.getElementById("selDock").classList.contains("on")),
        sel: T.getSel ? T.getSel() : null
      };
      var visorEl = document.querySelector("#stage .light.ils-R") || document.querySelector("#stage .light");
      if(visorEl && T.selectById) T.selectById(Number(visorEl.dataset.id));
      T.syncSelDock && T.syncSelDock();
      var before = dockSnap();
      var selEl = document.querySelector("#stage .light.selected");
      var p = (T.nodes().front || []).filter(function(n){ return n.sku==="SIFMJS"; }).pop();
      var moved = { dx:0, dy:0 };
      if(p && selEl){
        var x0=p.x, y0=p.y, dt0=before.dockTop, lt0=before.lightTop;
        p.x=Math.min(0.9, p.x+0.08);
        p.y=Math.min(0.7, p.y+0.10);
        selEl.style.left=(p.x*100)+"%";
        selEl.style.top=(p.y*100)+"%";
        selEl.offsetWidth;
        T.syncSelDock && T.syncSelDock();
        var afterMove = dockSnap();
        moved = {
          lightDx: p.x-x0,
          lightDy: p.y-y0,
          visualLightDy: (afterMove.lightTop!=null && lt0!=null) ? (afterMove.lightTop-lt0) : null,
          dockDy: (afterMove.dockTop!=null && dt0!=null) ? (afterMove.dockTop-dt0) : null,
          after: afterMove
        };
      }
      T.clearAll();
      T.syncSelDock && T.syncSelDock();
      var afterClear = dockSnap();
      out.dock = { before: before, moved: moved, afterClear: afterClear, afterPlace: afterPlaceDock };

      function dockChrome(){
        var dock=document.getElementById("selDock");
        return {
          lights: T.stageLightCount(),
          selected: document.querySelectorAll("#stage .light.selected").length,
          dockOn: !!(dock && dock.classList.contains("on")),
          sel: T.getSel ? T.getSel() : null
        };
      }
      T.resetNodes();
      T.setVehicle("durango");
      T.setView("front");
      T.clickPlace("MPS63U-RBW");
      T.syncSelDock && T.syncSelDock();
      var afterMpsPlace = dockChrome();
      var mpsEl = document.querySelector("#stage .light");
      if(mpsEl && T.selectById) T.selectById(Number(mpsEl.dataset.id));
      T.syncSelDock && T.syncSelDock();
      var afterMpsClick = dockChrome();
      var plate = document.getElementById("plateStack") || document.getElementById("vehicleImg") || document.getElementById("stage");
      plate.dispatchEvent(new MouseEvent("mousedown", { bubbles:true, cancelable:true, view:window }));
      T.syncSelDock && T.syncSelDock();
      var afterMpsEmpty = dockChrome();
      if(mpsEl && T.selectById) T.selectById(Number(mpsEl.dataset.id));
      document.getElementById("clearView").click();
      T.syncSelDock && T.syncSelDock();
      var afterClearView = dockChrome();
      T.clickPlace("MPS63U-RBW");
      if(document.querySelector("#stage .light") && T.selectById){
        T.selectById(Number(document.querySelector("#stage .light").dataset.id));
      }
      T.clearAll();
      T.syncSelDock && T.syncSelDock();
      var afterClearAllDock = dockChrome();
      T.resetNodes();
      T.setVehicle("durango");
      T.setView("front");
      var dropOk = false;
      try{
        var img = document.getElementById("vehicleImg");
        var r = img.getBoundingClientRect();
        var dt = new DataTransfer();
        dt.setData("text/plain", "MPS63U-RBW");
        if(T.setDragSku) T.setDragSku("MPS63U-RBW");
        var dropEv = new DragEvent("drop", {
          bubbles: true,
          cancelable: true,
          clientX: r.left + r.width * 0.50,
          clientY: r.top + r.height * 0.56,
          dataTransfer: dt
        });
        document.getElementById("stage").dispatchEvent(dropEv);
        dropOk = true;
      }catch(err){
        T.clickPlace("MPS63U-RBW");
      }
      T.syncSelDock && T.syncSelDock();
      var afterDrop = dockChrome();
      afterDrop.dropOk = dropOk;
      out.dockRelease = {
        afterClickPlace: afterMpsPlace,
        afterClickLight: afterMpsClick,
        afterEmpty: afterMpsEmpty,
        afterClearView: afterClearView,
        afterClearAll: afterClearAllDock,
        afterDrop: afterDrop
      };

      function stayProbe(from, sku){
        T.resetNodes();
        T.setVehicle("durango");
        T.setView(from);
        T.clickPlace(sku);
        var bag = T.nodes();
        var on = {};
        Object.keys(bag).forEach(function(k){
          on[k] = (bag[k]||[]).filter(function(n){ return n.sku===sku; }).length;
        });
        var total = Object.keys(on).reduce(function(a,k){ return a+(on[k]||0); }, 0);
        return { from: from, after: T.getView(), on: on, total: total, sku: sku };
      }
      out.stayView = {
        mpsw9Left: stayProbe("left", "MPSW9-BW"),
        mpsw9Hero: stayProbe("hero", "MPSW9-BW"),
        mpsw9Front: stayProbe("front", "MPSW9-BW"),
        mpsw9Right: stayProbe("right", "MPSW9-BW"),
        algtLeft: stayProbe("left", "ALGT53JX-P3LB"),
        sifLeft: stayProbe("left", "SIFMJS"),
        sifFront: stayProbe("front", "SIFMJS"),
        homeMpsw9: T.HOME_VIEW && T.HOME_VIEW["MPSW9-BW"],
        homeMir: T.HOME_VIEW && T.HOME_VIEW["BRACKETS:FPIU20MIR"],
        mpsw9Fx: (T.CATALOG.find(function(c){ return c.sku==="MPSW9-BW"; })||{}).fx
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
      bareOk(runtime.bareCold) && runtime.bareCold.asset==="studio26"
        && /pack studio26/.test(runtime.bareCold.pack||"")
        && /studio26/.test(runtime.bareCold.plateSrc||""),
      JSON.stringify({pack:runtime.bareCold.pack, src:runtime.bareCold.plateSrc, asset:runtime.bareCold.asset}));
    rec("T-OEM-HIDE-ON", !!(runtime.bareCold && runtime.bareCold.patchOn),
      JSON.stringify({patchOn:runtime.bareCold && runtime.bareCold.patchOn}));
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
    rec("T-VISOR-W", runtime.visor.w >= 10 && runtime.visor.w <= 16, `SIFMJS w=${runtime.visor.w} (per shroud)`);
    var vs = runtime.visorSplit || {};
    var splitOk = vs.count === 2
      && vs.xs && vs.xs[0] < 0.45 && vs.xs[1] > 0.55
      && vs.gap != null && vs.gap >= 0.06
      && vs.sides && vs.sides.indexOf("L") >= 0 && vs.sides.indexOf("R") >= 0
      && vs.afterOwnOn === 2 && vs.afterOwnOff === 0
      && vs.afterDashOn === 2 && vs.afterDashOff === 0
      && vs.dashWhileParts === true
      && !vs.centered
      && (vs.lights || []).some((c) => /\bils-L\b/.test(c))
      && (vs.lights || []).some((c) => /\bils-R\b/.test(c));
    rec("T-VISOR-SPLIT", splitOk, JSON.stringify(vs));
    rec("T-TOGGLES-ONE-OWNER", runtime.toggles.dashOn && runtime.toggles.dashOnCount===2 && !runtime.toggles.dashOff && runtime.toggles.hatchOn && !runtime.toggles.hatchOff, JSON.stringify(runtime.toggles));
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
    var dyna = runtime.dyna || {};
    var dynaPlace = dyna.place || {};
    var dynaNeed = ["DYNA-1","DYNA-2","DYNA-S","DYNA-X","DR1-RBK-SMK","DR6-RBW"];
    var dynaOk = dynaNeed.every(function(s){ return dynaPlace[s] && dynaPlace[s].total > 0; });
    rec("T-DYNA-CLICKPLACE", dynaOk,
      dynaNeed.map(function(s){ var p=dynaPlace[s]||{}; return s+"="+ (p.total||0); }).join(" "));
    rec("T-DYNA-LOOK", dynaOk && dynaNeed.every(function(s){
        var p=dynaPlace[s]||{};
        var im=(p.imgs||[])[0]||{};
        var box=p.box||{};
        return p.dynaClass && /fx_dyna/.test(im.src||"")
          && im.w >= 120 && im.h <= 80 && im.w / Math.max(im.h, 1) >= 3
          && box.asp >= 2.8 && box.w > 24 && box.h > 4 && box.h < 48;
      }),
      "slim alpha stick, not a 623-byte/thumbnail product card; dyna-stick + fx_dyna src; on-vehicle module aspect");
    var dock = runtime.dock || {};
    var b = dock.before || {};
    var m = dock.moved || {};
    var ac = dock.afterClear || {};
    var adjacent = (b.gapAbove != null && b.gapAbove >= -2 && b.gapAbove <= 16)
      || (b.gapBelow != null && b.gapBelow >= 0 && b.gapBelow <= 16);
    var centered = b.dx != null && b.dx <= 80;
    var followed = m.dockDy != null && ((m.visualLightDy != null && m.visualLightDy > 4) ? m.dockDy > 4 : m.lightDy > 0 && m.dockDy > 4);
    rec("T-DOCK-FOLLOWS-SELECTION",
      !!(b.on && b.visor && adjacent && centered && followed && ac && ac.on === false),
      JSON.stringify({before:b, moved:m, afterClear:ac, adjacent:adjacent, followed:followed}));
    var rel = runtime.dockRelease || {};
    var placed = rel.afterClickPlace || {};
    var clicked = rel.afterClickLight || {};
    var emptied = rel.afterEmpty || {};
    var cv = rel.afterClearView || {};
    var ca = rel.afterClearAll || {};
    var dropped = rel.afterDrop || {};
    rec("T-DOCK-RELEASES-AFTER-DROP",
      placed.lights > 0 && placed.selected === 0 && placed.dockOn === false && (placed.sel == null)
      && clicked.lights > 0 && clicked.selected === 1 && clicked.dockOn === true
      && emptied.selected === 0 && emptied.dockOn === false && emptied.lights > 0
      && cv.dockOn === false && cv.selected === 0
      && ca.dockOn === false && ca.selected === 0 && ca.lights === 0
      && dropped.lights > 0 && dropped.selected === 0 && dropped.dockOn === false,
      JSON.stringify(rel));
    var sv = runtime.stayView || {};
    var mL = sv.mpsw9Left || {}, mH = sv.mpsw9Hero || {}, mF = sv.mpsw9Front || {}, mR = sv.mpsw9Right || {};
    var aL = sv.algtLeft || {}, sL = sv.sifLeft || {}, sF = sv.sifFront || {};
    rec("T-CLICKPLACE-STAY-VIEW",
      mL.after === "left" && mL.on && mL.on.left === 1 && mL.total === 1 && !mL.on.right && !mL.on.front
      && mH.after === "hero" && mH.on && mH.on.hero === 1 && mH.total === 1
      && mF.after === "front" && mF.on && mF.on.front === 1 && mF.total === 1 && !mF.on.left && !mF.on.right
      && mR.after === "right" && mR.on && mR.on.right === 1 && mR.total === 1 && !mR.on.left
      && aL.after === "left" && (aL.on && aL.on.front > 0) && !(aL.on.left)
      && sL.after === "left"
      && sF.after === "front" && (sF.on && sF.on.front === 2)
      && sv.homeMpsw9 === "left" && sv.homeMir === "left"
      && /fx_mps_wide/.test(sv.mpsw9Fx || ""),
      JSON.stringify(sv));
  }

  finish(srv);
}

function finish(srv) {
  srv.close();
  const fail = results.filter((r) => !r.ok);
  const md = [
    "# Vector trap log — studio26 clickPlace stays on the current view",
    "",
    "Self-test owned by this pass. Valentine trap-scores after. This file does **not** certify buyer-ready.",
    "",
    `- Ran: \`node visualizer/_src/run-traps.mjs\` (local Chrome, not Rusty’s live preview)`,
    `- ASSET_V: studio26 · FX_V: max9`,
    `- Signed Durango plate bytes: T-PLATE-HASHES (Front/Right/Rear/Hatch not recut)`,
    `- studio26: clickPlace stays on the current view (HOME_VIEW is a mount, never a camera yank). MPSW9 is a side-mirror, one node, HOME_VIEW=left. Piu photographic fx (DynaFlare slices, MPS wide, ALGT, hatch sticks). Dock still hides after drop. ILS L/R split unchanged. Signed plates unchanged.`,
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
