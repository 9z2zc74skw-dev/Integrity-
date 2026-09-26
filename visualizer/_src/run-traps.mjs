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

function sideGlassLedCounts() {
  /* Mid-cabin upper glass / B-pillar. OEM tail is outboard; this band must stay 0. */
  const plates = [
    "durango_left.png", "durango_left_black.png",
    "durango_right.png", "durango_right_black.png",
  ].map((n) => path.join(VIZ, n)).filter((p) => fs.existsSync(p));
  const py = [
    "from PIL import Image",
    "import json, sys",
    "out=[]",
    "for p in sys.argv[1:]:",
    "    im=Image.open(p).convert('RGBA'); w,h=im.size; px=im.load(); n=0",
    "    y0,y1,x0,x1=(int(h*0.325), int(h*0.420), int(w*0.32), int(w*0.62))",
    "    for y in range(y0, y1):",
    "        for x in range(x0, x1):",
    "            r,g,b,a=px[x,y]",
    "            if a<40: continue",
    "            mx=max(r,g,b); mn=min(r,g,b)",
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

function bPillarRedCount(imgPath) {
  /* Screenshot of #stage. Fail a compact red scrap in the side-glass / B-pillar band. */
  if (!imgPath || !fs.existsSync(imgPath)) return { ok: false, n: -1, err: "missing " + imgPath };
  const py = [
    "from PIL import Image",
    "import sys",
    "im=Image.open(sys.argv[1]).convert('RGB')",
    "w,h=im.size; px=im.load(); n=0",
    "x0,x1,y0,y1=int(w*0.32),int(w*0.62),int(h*0.375),int(h*0.430)",
    "for y in range(y0,y1):",
    "    for x in range(x0,x1):",
    "        r,g,b=px[x,y]; mx=max(r,g,b); mn=min(r,g,b)",
    "        if mx<110 or mx-mn<80: continue",
    "        if r>150 and r>b+55 and r>g+35: n+=1",
    "print(n)",
  ].join("\n");
  const r = spawnSync("python3", ["-c", py, imgPath], { encoding: "utf8" });
  if (r.status !== 0) return { ok: false, n: -1, err: (r.stderr || r.stdout || "python fail").slice(0, 200) };
  const n = Number.parseInt(String(r.stdout || "").trim(), 10);
  if (Number.isNaN(n)) return { ok: false, n: -1, err: "parse " + String(r.stdout).slice(0, 80) };
  return { ok: n <= 15, n };
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

function catalogFxLookScan() {
  /* Catalog lighting SKUs must wire photographic piu art, not CGI thumbs. */
  const html = fs.readFileSync(path.join(VIZ, "index.html"), "utf8");
  const py = [
    "from PIL import Image",
    "import os, json, sys, re",
    "fx, html_path = sys.argv[1], sys.argv[2]",
    "html=open(html_path).read()",
    "need=[('MPS63U-RBW','fx_mps63_rb.png'),('MPS123U-RBW','fx_mps123_rb.png'),",
    "      ('SIFMJS','fx_ils_rb.png'),('XSM2-BRW-US','fx_xsm2_rb.png'),",
    "      ('416309-RBW-SMK','fx_round_smk_rb.png'),('MPSW9-BW','fx_mpsw9_rb.png'),",
    "      ('DYNA-1','fx_dyna_1ft_rb.png'),('STICK-RB','fx_stick_rb.png'),",
    "      ('ALGT53JX-P3LB','fx_algt_max.png')]",
    "fail=[]; rows=[]",
    "banned=['fx_mps_wide','fx_mps_small','fx_round_smk.png']",
    "for b in banned:",
    "    if b=='fx_round_smk.png':",
    "        if re.search(r'fx:\"fx_round_smk\\.png\"', html): fail.append('catalog still wires CGI fx_round_smk.png')",
    "    elif b in html: fail.append('catalog still mentions '+b)",
    "for sku, name in need:",
    "    if 'fx:\"'+name+'\"' not in html and \"fx:'\"+name+\"'\" not in html:",
    "        fail.append(sku+' not wired to '+name); continue",
    "    p=os.path.join(fx,name)",
    "    if not os.path.exists(p): fail.append('missing '+name); continue",
    "    sz=os.path.getsize(p); im=Image.open(p).convert('RGBA'); w,h=im.size; px=im.load()",
    "    corners=[px[0,0][3], px[w-1,0][3], px[0,h-1][3], px[w-1,h-1][3]]",
    "    ok=sz>8000 and w>=120 and h>=40 and max(corners)<16",
    "    rows.append({'file':name,'bytes':sz,'w':w,'h':h,'ok':ok})",
    "    if not ok: fail.append(name+' sz='+str(sz)+' '+str(w)+'x'+str(h)+' cA='+str(max(corners)))",
    "print(json.dumps({'ok':len(fail)==0,'fail':fail,'n':len(rows)}))",
  ].join("\n");
  const r = spawnSync("python3", ["-c", py, path.join(VIZ, "fx"), path.join(VIZ, "index.html")], {
    encoding: "utf8",
    maxBuffer: 2 * 1024 * 1024,
  });
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
  rec("T-ASSET-V", /ASSET_V="studio34"/.test(html), "ASSET_V=studio34");
  rec("T-NO-HOME-YANK", !/view\s*=\s*preferView\(/.test(html) && !/view\s*=\s*HOME_VIEW/.test(html) && /Camera stays/.test(html), "clickPlace never assigns camera from HOME_VIEW");
  rec("T-FIRST-PAINT-SRC", /src="durango_front\.png\?v=studio34"/.test(html) && !/ac5173e/.test(html), "first-paint plate uses ?v=studio34");
  rec("T-PACK-STAMP", /id="packStamp"/.test(html) && /pack studio34/.test(html), "header pack stamp present");
  rec("T-NO-SIDE-FALLBACK-STAMP",
    /stay==="left" \|\| stay==="right"/.test(html) && /var d=defaultFor\(sku\)/.test(html),
    "defaultFor _ stays on Front/Rear/Hero; Left/Right do not invent scraps");
  rec("T-MPSW9-NOT-WIDE-BAR",
    /sku:"MPSW9-BW"[^}]*fx:"fx_mpsw9_rb\.png",w:2\./.test(html) && !/fx_mps_wide/.test(html),
    "MPSW9 is compact fx_mpsw9 w~2.2, not fx_mps_wide 12-LED bar");
  rec("T-OEM-HIDE-FILE", fs.existsSync(path.join(VIZ, "fx", "oem_hide_durango_front.png")), "Front OEM-hide overlay present");
  rec("T-URL-NO-SEED", !/URLSearchParams/.test(html) && !/location\.search\s*[=.\[]/.test(html), "no URL/hash auto-place");
  rec("T-NO-RESTORE-NODES",
    /Never restore placements/.test(html) && !/nodesByVehicle=s\.nodesByVehicle/.test(html)
    && /removeItem\("iu-visualizer-v1"\)/.test(html) && /assertBareIfEmpty/.test(html),
    "loadState does not rehydrate placements; v1 wiped; empty boot strips sprites");
  const led = plateLedCounts();
  rec("T-BARE-PLATE-PIXELS", !!(led && led.ok && led.maxLed === 0),
    led && led.ok ? ("signed+black plates LED/amber pixels=" + led.maxLed + " " + led.detail) : (led && led.err) || "scan failed");
  const sideGlass = sideGlassLedCounts();
  rec("T-BARE-SIDE-GLASS", !!(sideGlass && sideGlass.ok && sideGlass.maxLed === 0),
    sideGlass && sideGlass.ok ? ("side B-pillar/glass LED pixels=" + sideGlass.maxLed + " " + sideGlass.detail) : (sideGlass && sideGlass.err) || "scan failed");
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
  const catLook = catalogFxLookScan();
  rec("T-CATALOG-FX-LOOK", catLook.ok, catLook.detail);
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

    async function waitPlate() {
      await page.waitForFunction(() => {
        const img = document.getElementById("vehicleImg");
        return !!(img && img.complete && img.naturalHeight > 50 && img.getBoundingClientRect().height > 80);
      }, { timeout: 15000 });
    }
    async function shotStage(tag) {
      const clip = await page.evaluate(() => {
        const r = document.getElementById("stage").getBoundingClientRect();
        return { x: Math.max(0, r.x), y: Math.max(0, r.y), width: Math.max(1, r.width), height: Math.max(1, r.height) };
      });
      const dest = path.join("/tmp", "iu-" + tag + ".png");
      await page.screenshot({ path: dest, clip, type: "png" });
      return dest;
    }
    const DURANGO_VIEWS = ["front", "rear", "rear_open", "left", "right", "hero"];
    const bareViews = {};
    const bareShots = {};
    for (const v of DURANGO_VIEWS) {
      await page.evaluate((v) => {
        const T = window.__IU_TEST__;
        T.resetNodes();
        T.setVehicle("durango");
        T.setView(v);
      }, v);
      await waitPlate();
      bareViews[v] = await page.evaluate(() => {
        const T = window.__IU_TEST__;
        return {
          placements: T.placementCount(),
          lights: T.stageLightCount(),
          ghosts: T.ghostCount(),
          overlays: T.overlayCount(),
          dash: T.toggleOn("dashToggle"),
          hatch: T.toggleOn("hatchToggle"),
          push: T.pushBarOn(),
          audit: T.stageSpriteAudit(),
          view: T.getView(),
        };
      });
      if (v === "left" || v === "right") bareShots[v] = await shotStage("bare-" + v);
    }
    await page.evaluate(() => {
      const T = window.__IU_TEST__;
      T.resetNodes();
      T.setVehicle("durango");
      T.setView("front");
      T.clickPlace("ALGT53JX-P3LB");
      T.setView("left");
    });
    await waitPlate();
    await page.waitForFunction(() => {
      const housing = document.querySelector(".ghost-bar.endcap .endcap-housing");
      const sprite = document.querySelector(".ghost-bar img");
      return !!housing && !sprite;
    }, { timeout: 10000 });
    const leftGhostSit = await page.evaluate(async () => {
      const T = window.__IU_TEST__;
      const edge = T.endcapEdge ? await T.endcapEdge() : null;
      return { ghosts: T.ghostCount(), box: T.ghostPlateBox && T.ghostPlateBox(), audit: T.stageSpriteAudit(), edge };
    });
    const leftGhostShot = await shotStage("algt-left");
    await page.evaluate(() => {
      const T = window.__IU_TEST__;
      T.setView("right");
    });
    await waitPlate();
    await page.waitForFunction(() => {
      const housing = document.querySelector(".ghost-bar.endcap .endcap-housing");
      const sprite = document.querySelector(".ghost-bar img");
      return !!housing && !sprite;
    }, { timeout: 10000 });
    const rightGhostSit = await page.evaluate(async () => {
      const T = window.__IU_TEST__;
      const edge = T.endcapEdge ? await T.endcapEdge() : null;
      return { ghosts: T.ghostCount(), box: T.ghostPlateBox && T.ghostPlateBox(), audit: T.stageSpriteAudit(), edge };
    });
    const rightGhostShot = await shotStage("algt-right");
    await page.evaluate(() => { window.__IU_TEST__.clearAll(); });
    const afterClearViews = {};
    for (const v of ["left", "right", "front", "hero"]) {
      await page.evaluate((v) => { window.__IU_TEST__.setView(v); }, v);
      await waitPlate();
      afterClearViews[v] = await page.evaluate(() => {
        const T = window.__IU_TEST__;
        return { placements: T.placementCount(), lights: T.stageLightCount(), ghosts: T.ghostCount(), overlays: T.overlayCount(), audit: T.stageSpriteAudit() };
      });
    }
    if (afterClearViews.left) bareShots.leftClear = await shotStage("clear-left");

    const runtime = await page.evaluate(fnBody);
    return {
      bareCold, afterPoison, runtime,
      bareViews, bareShots, leftGhostSit, rightGhostSit,
      leftGhostShot, rightGhostShot, afterClearViews,
    };
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
        var bag0 = T.nodes();
        var dest = Object.keys(bag0).find(function(k){
          return (bag0[k] || []).some(function(n){ return n.sku === sku; });
        });
        if(dest) T.setView(dest);
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
        mps63Front: stayProbe("front", "MPS63U-RBW"),
        xsm2Rear: stayProbe("rear", "XSM2-BRW-US"),
        bumperFront: stayProbe("front", "416309-RBW-SMK"),
        algtLeft: stayProbe("left", "ALGT53JX-P3LB"),
        sifLeft: stayProbe("left", "SIFMJS"),
        sifFront: stayProbe("front", "SIFMJS"),
        homeMpsw9: T.HOME_VIEW && T.HOME_VIEW["MPSW9-BW"],
        homeMir: T.HOME_VIEW && T.HOME_VIEW["BRACKETS:FPIU20MIR"],
        mpsw9Fx: (T.CATALOG.find(function(c){ return c.sku==="MPSW9-BW"; })||{}).fx
      };
      T.resetNodes();
      T.setVehicle("durango");
      T.setView("left");
      T.clickPlace("MPSW9-BW");
      await new Promise(function(resolve){
        var imgs=[].slice.call(document.querySelectorAll("#stage .light img"));
        var pending=imgs.filter(function(i){ return !i.complete; }).length;
        if(!pending){ resolve(); return; }
        var done=function(){ pending--; if(pending<=0) resolve(); };
        imgs.forEach(function(i){ if(!i.complete){ i.addEventListener("load", done); i.addEventListener("error", done); } });
        setTimeout(resolve, 800);
      });
      var part = T.CATALOG.find(function(c){ return c.sku==="MPSW9-BW"; }) || {};
      var el = document.querySelector("#stage .light");
      var img = el && el.querySelector("img");
      var br = el && el.getBoundingClientRect();
      out.stayView.mpsw9Pod = {
        w: part.w,
        fx: part.fx,
        boxW: br && Math.round(br.width),
        boxH: br && Math.round(br.height),
        nw: img && img.naturalWidth,
        nh: img && img.naturalHeight,
        src: img && (img.getAttribute("src")||"")
      };
      function frontFallback(sku){
        T.resetNodes();
        T.setVehicle("durango");
        T.setView("front");
        T.clickPlace(sku);
        var bag = T.nodes();
        return {
          after: T.getView(),
          onFront: (bag.front || []).filter(function(n){ return n.sku === sku; }).length,
          lights: T.stageLightCount()
        };
      }
      out.frontFallback = {
        algt: frontFallback("ALGT53JX-P3LB"),
        sif: frontFallback("SIFMJS"),
        mps63: frontFallback("MPS63U-RBW"),
        bumper: frontFallback("416309-RBW-SMK"),
        xsm2: frontFallback("XSM2-BRW-US"),
        dr6: frontFallback("DR6-RBW"),
        stick: frontFallback("STICK-RB")
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
      bareOk(runtime.bareCold) && runtime.bareCold.asset==="studio34"
        && /pack studio34/.test(runtime.bareCold.pack||"")
        && /studio34/.test(runtime.bareCold.plateSrc||""),
      JSON.stringify({pack:runtime.bareCold.pack, src:runtime.bareCold.plateSrc, asset:runtime.bareCold.asset}));
    rec("T-OEM-HIDE-ON", !!(runtime.bareCold && runtime.bareCold.patchOn),
      JSON.stringify({patchOn:runtime.bareCold && runtime.bareCold.patchOn}));
  }

  if (runtime && runtime.bareViews) {
    const views = Object.keys(runtime.bareViews);
    const leak = views.filter((v) => {
      const s = runtime.bareViews[v];
      return !s || s.placements !== 0 || s.lights !== 0 || s.ghosts !== 0 || s.overlays !== 0
        || s.dash || s.hatch || s.push
        || (s.audit && ((s.audit.lights || []).length || (s.audit.ghosts || []).length));
    });
    rec("T-BARE-EVERY-VIEW", leak.length === 0,
      leak.length ? JSON.stringify(leak.map((v) => [v, runtime.bareViews[v]])) : views.join(","));
  }
  if (runtime && runtime.afterClearViews) {
    const leak = Object.keys(runtime.afterClearViews).filter((v) => {
      const s = runtime.afterClearViews[v];
      return !s || s.placements !== 0 || s.lights !== 0 || s.ghosts !== 0 || s.overlays !== 0
        || (s.audit && ((s.audit.lights || []).length || (s.audit.ghosts || []).length));
    });
    rec("T-CLEAR-EVERY-VIEW", leak.length === 0,
      leak.length ? JSON.stringify(runtime.afterClearViews) : "front/left/right/hero empty after Clear All");
  }
  if (runtime && runtime.bareShots) {
    const leftBare = bPillarRedCount(runtime.bareShots.left);
    const rightBare = bPillarRedCount(runtime.bareShots.right);
    const leftClear = bPillarRedCount(runtime.bareShots.leftClear);
    rec("T-BARE-SIDE-LOOK",
      !!(leftBare.ok && rightBare.ok && leftClear.ok),
      JSON.stringify({ left: leftBare, right: rightBare, leftClear: leftClear }));
    const leftGhostPx = bPillarRedCount(runtime.leftGhostShot);
    const rightGhostPx = bPillarRedCount(runtime.rightGhostShot);
    rec("T-GHOST-NOT-IN-GLASS",
      !!(leftGhostPx.ok && rightGhostPx.ok),
      JSON.stringify({ left: leftGhostPx, right: rightGhostPx }));
  }
  if (runtime && runtime.leftGhostSit) {
    const lg = runtime.leftGhostSit.box || {};
    const rg = (runtime.rightGhostSit && runtime.rightGhostSit.box) || {};
    rec("T-GHOST-SIDE-SIT",
      runtime.leftGhostSit.ghosts >= 1 && runtime.rightGhostSit && runtime.rightGhostSit.ghosts >= 1
      && lg.spec && lg.spec.sit === "bottom" && lg.spec.y <= 34.2 && lg.spec.y >= 31.5
      && /100%/.test(lg.origin || "")
      && lg.botPct != null && Math.abs(lg.botPct - lg.spec.y) <= 2.5
      && lg.botPct <= 35 && lg.botPct >= 31
      && rg.spec && rg.spec.sit === "bottom" && rg.spec.y <= 36 && rg.spec.y >= 33
      && rg.botPct != null && Math.abs(rg.botPct - rg.spec.y) <= 2.5
      && rg.botPct <= 37 && rg.botPct >= 32,
      JSON.stringify({ left: runtime.leftGhostSit, right: runtime.rightGhostSit }));
    /* Drawn end-on housing. Width tracks bar depth, not the 53" run.
       Not a crop: no bar-sprite image, rounded shell, no hard outer wall. */
    const hexRgb = (hex) => {
      const m = /^#([0-9a-f]{6})$/i.exec(hex || "");
      if (!m) return null;
      const n = parseInt(m[1], 16);
      return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
    };
    const endFacts = (sit, end) => {
      const box = (sit && sit.box) || {};
      const spec = box.spec || {};
      const dom = box.dom || {};
      const edge = (sit && sit.edge) || {};
      const boxIn = (spec.tallIn || 0) + (spec.feetIn || 0);
      const depthRatio = boxIn ? spec.depthIn / boxIn : 0;
      const lenRatio = boxIn ? spec.lenIn / boxIn : 0;
      const px = box.pxRatio || 0;
      const rgb = hexRgb(dom.lens);
      const colorOk = !!(rgb && (end === "L"
        ? rgb.r > 180 && rgb.r > rgb.b + 40
        : rgb.b > 180 && rgb.b > rgb.r + 40));
      const depthOk = spec.depthIn >= 9 && spec.depthIn <= 13
        && spec.lenIn >= 48 && spec.lenIn <= 60
        && spec.tallIn >= 2.2 && spec.tallIn <= 3.4
        && depthRatio > 2.2 && depthRatio < 6
        && lenRatio > 12
        && px > 0
        && Math.abs(px - depthRatio) / depthRatio < 0.18
        && px < lenRatio * 0.45
        && Math.abs((box.wPct || 0) - (spec.w || 0)) < 0.5;
      const notSprite = !!(dom.drawn && !dom.sprite
        && (dom.bg === "none" || dom.bg === "")
        && (!dom.imgs || dom.imgs.length === 0)
        && dom.overflow !== "hidden"
        && !(box.sample && box.sample.imgW > (box.sample.boxW || 1) * 2));
      const rounded = dom.rxRatio >= 0.45
        && edge.ok === true && edge.hard === false
        && edge.outerL <= 12 && edge.outerR <= 12
        && edge.innerL > edge.outerL + 6
        && edge.innerR > edge.outerR + 6;
      return {
        end: spec.end, kind: spec.kind,
        wPct: box.wPct, hPct: box.hPct, px: +px.toFixed(3),
        depthRatio: +depthRatio.toFixed(3), lenRatio: +lenRatio.toFixed(3),
        lens: dom.lens, bg: dom.bg, sprite: dom.sprite, imgs: dom.imgs,
        overflow: dom.overflow, rxRatio: dom.rxRatio, drawn: dom.drawn,
        edge, colorOk, depthOk, notSprite, rounded,
        placed: !!(spec.kind === "endcap" && spec.end === end && /endcap/.test(box.cls || "")),
      };
    };
    const leftFacts = endFacts(runtime.leftGhostSit, "L");
    const rightFacts = endFacts(runtime.rightGhostSit, "R");
    rec("T-SIDE-ENDCAP-LOOK",
      leftFacts.placed && rightFacts.placed
      && leftFacts.colorOk && rightFacts.colorOk
      && leftFacts.depthOk && rightFacts.depthOk
      && leftFacts.wPct > 3 && leftFacts.wPct < 9
      && leftFacts.hPct > 1 && leftFacts.hPct < 3.2,
      JSON.stringify({ left: leftFacts, right: rightFacts }));
    rec("T-SIDE-ENDCAP-NOT-CROP",
      leftFacts.notSprite && rightFacts.notSprite
      && leftFacts.rounded && rightFacts.rounded
      && leftFacts.depthOk && rightFacts.depthOk,
      JSON.stringify({
        left: { sprite: leftFacts.sprite, bg: leftFacts.bg, imgs: leftFacts.imgs, overflow: leftFacts.overflow, rxRatio: leftFacts.rxRatio, px: leftFacts.px, depthRatio: leftFacts.depthRatio, lenRatio: leftFacts.lenRatio, edge: leftFacts.edge },
        right: { sprite: rightFacts.sprite, bg: rightFacts.bg, imgs: rightFacts.imgs, overflow: rightFacts.overflow, rxRatio: rightFacts.rxRatio, px: rightFacts.px, depthRatio: rightFacts.depthRatio, lenRatio: rightFacts.lenRatio, edge: rightFacts.edge },
      }));
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
    var dynaLookFail = dynaNeed.filter(function(s){
      var p=dynaPlace[s]||{};
      var im=(p.imgs||[])[0]||{};
      var box=p.box||{};
      return !(p.dynaClass && /fx_dyna/.test(im.src||"")
        && im.w >= 120 && im.h <= 80 && im.w / Math.max(im.h, 1) >= 3
        && box.asp >= 2.8 && box.w > 24 && box.h > 4 && box.h < 48);
    });
    rec("T-DYNA-LOOK", dynaOk && dynaLookFail.length === 0,
      dynaLookFail.length
        ? JSON.stringify(dynaLookFail.map(function(s){ return {sku:s, place:dynaPlace[s]}; }))
        : "slim alpha stick, not a 623-byte/thumbnail product card; dyna-stick + fx_dyna src; on-vehicle module aspect");
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
    var gF = sv.mps63Front || {}, xR = sv.xsm2Rear || {}, bF = sv.bumperFront || {};
    rec("T-CLICKPLACE-STAY-VIEW",
      mL.after === "left" && mL.on && mL.on.left === 1 && mL.total === 1 && !mL.on.right && !mL.on.front
      && mH.after === "hero" && mH.on && mH.on.hero === 1 && mH.total === 1
      && mF.after === "front" && mF.on && mF.on.front === 1 && mF.total === 1 && !mF.on.left && !mF.on.right
      && mR.after === "right" && mR.on && mR.on.right === 1 && mR.total === 1 && !mR.on.left
      && gF.after === "front" && gF.total === 1 && gF.on && gF.on.front === 1
      && xR.after === "rear" && xR.total === 1
      && bF.after === "front" && bF.on && bF.on.front === 4
      && aL.after === "left" && (aL.on && aL.on.front > 0) && !(aL.on.left)
      && sL.after === "left" && sL.on && (sL.on.left || 0) === 0 && sL.on.front === 2
      && sF.after === "front" && (sF.on && sF.on.front === 2)
      && sv.homeMpsw9 === "left" && sv.homeMir === "left"
      && /fx_mpsw9/.test(sv.mpsw9Fx || ""),
      JSON.stringify({stay: {mpsw9Left: mL, mpsw9Hero: mH, mpsw9Front: mF, mpsw9Right: mR, mps63Front: gF, xsm2Rear: xR, bumperFront: bF, algtLeft: aL, sifLeft: sL, sifFront: sF, homeMpsw9: sv.homeMpsw9, homeMir: sv.homeMir, mpsw9Fx: sv.mpsw9Fx}}));
    rec("T-ILS-FRONT-ONLY",
      sL.after === "left" && sL.on && (sL.on.left || 0) === 0 && sL.on.front === 2
      && !sL.on.right && !sL.on.hero
      && sF.after === "front" && sF.on && sF.on.front === 2,
      JSON.stringify({sifLeft: sL, sifFront: sF}));
    var ff = runtime.frontFallback || {};
    rec("T-FRONT-FALLBACK-ON-FRONT",
      ["algt","sif","mps63","bumper","xsm2","dr6","stick"].every(function(k){
        var r = ff[k] || {};
        return r.after === "front" && r.onFront > 0 && r.lights > 0;
      })
      && ff.sif && ff.sif.onFront === 2 && ff.bumper && ff.bumper.onFront === 4,
      JSON.stringify(ff));
    var pod = sv.mpsw9Pod || {};
    var podAsp = (pod.nw && pod.nh) ? pod.nw / pod.nh : 0;
    rec("T-MPSW9-POD",
      pod.w <= 2.5 && /fx_mpsw9/.test(pod.fx || "") && /fx_mpsw9/.test(pod.src || "")
      && !/fx_mps_wide|fx_wide_/.test(pod.src || "") && !/fx_mps_wide/.test(sv.mpsw9Fx || "")
      && pod.nw >= 80 && pod.nh >= 80 && pod.nw < 420
      && podAsp >= 0.65 && podAsp <= 1.7
      && pod.boxW > 8 && pod.boxW < 26 && pod.boxH > 8 && pod.boxH < 28
      && (pod.boxH ? pod.boxW / pod.boxH : 99) <= 2.1
      && sv.homeMpsw9 === "left" && sv.homeMpsw9 !== "front",
      JSON.stringify(pod));
  }

  finish(srv);
}

function finish(srv) {
  srv.close();
  const fail = results.filter((r) => !r.ok);
  const md = [
    "# Vector trap log — studio34 drawn side end-cap; Front clickPlace unchanged",
    "",
    "Self-test owned by this pass. Valentine trap-scores after. This file does **not** certify buyer-ready.",
    "",
    `- Ran: \`node visualizer/_src/run-traps.mjs\` (local Chrome, not Rusty’s live preview)`,
    `- ASSET_V: studio34 · FX_V: max12`,
    `- Signed Durango plate bytes: T-PLATE-HASHES (Front/Right/Rear/Hatch/Left not recut)`,
    `- studio34: Left/Right roof bar is a drawn end-on housing (depth along the car, rounded shell, scheme lens, feet on the roof). Not a crop of the front sprite and not the 53" run. Front clickPlace / defaultFor \`_\` unchanged. Plates unchanged.`,
    `- Look trap: T-SIDE-ENDCAP-LOOK — side bar = drawn end-cap. T-SIDE-ENDCAP-NOT-CROP — no bar-sprite background, width tracks depth not length, no hard cut.`,
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
