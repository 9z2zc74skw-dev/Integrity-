# Vector trap log — studio17 bare default

Self-test owned by this pass. Valentine trap-scores after. This file does **not** certify buyer-ready.

- Ran: `node visualizer/_src/run-traps.mjs` (local Chrome, not Rusty’s live preview)
- ASSET_V: studio17 · FX_V: max6
- Signed Durango plate bytes: T-PLATE-HASHES
- studio17 software: cold load is a bare plate. Lights come from Parts (or a user-flipped toggle). No restore of placements.

| Trap | Result | Detail |
|---|---|---|
| T-NO-CLICK-PAIRS | PASS | duplicate click maps absent |
| T-PRINT-LABEL | PASS | chrome says Print, not Sign-off |
| T-LOAD-WIRED | PASS | Load SKUs present, no soon |
| T-RBW-VISIBLE | PASS | R/B/W control not CSS-hidden |
| T-ONE-ROOF-SKU | PASS | one roof SKU row |
| T-TRUCKS-DROPDOWN | PASS | Silverado and F-150 in select |
| T-ASSET-V | PASS | ASSET_V=studio17 |
| T-NO-RESTORE-NODES | PASS | loadState does not rehydrate placements |
| T-ARCHIVE-TREE | PASS | leftovers parked under archive/ |
| T-PAGES-HONEST | PASS | root README does not promise Pages URL |
| T-PLATE-HASHES | PASS | durango_front.png unchanged; durango_right.png unchanged; durango_rear.png unchanged; durango_rear_open.png unchanged; durango_left.png unchanged; durango_hero.png unchanged |
| T-FX-HEAD | PASS | 55 fx 200 |
| T-DEMO-QUOTE-FILE | PASS | quotes/demo-1236.json 200 |
| T-CHROME-RUNTIME | PASS | evaluated |
| T-BARE-DEFAULT | PASS | {"cold":{"placements":0,"lights":0,"ghosts":0,"overlays":0,"push":false,"dash":false,"hatch":false,"pushSw":false},"afterPoison":{"placements":0,"lights":0,"ghosts":0,"overlays":0,"push":false,"dash":false,"hatch":false,"pushSw":false}} |
| T-CLICKPLACE-ALL | PASS | durango/front=57 durango/left=57 durango/rear=57 silverado/front=48 silverado/left=48 silverado/rear=48 f150/front=48 f150/left=48 f150/rear=48 |
| T-ROOF-FRONT-ONLY | PASS | roof nodes only on front after clickPlace from Front/Left/Rear |
| T-HERO-GHOST-SIT | PASS | {"spec":{"kind":"full","x":48.5,"y":28.6,"rot":-6,"wScale":0.62,"sit":"bottom"},"origin":"50% 100%"} |
| T-TRUCK-NO-DURANGO-LEAK | PASS | {"d":{"roofY":0.248,"frontBarW":42.4,"clickRoofY":0.248,"skuCount":29,"pushBar":{"cx":50,"cy":56,"w":34,"hs":0.88,"ty":0.45}},"s":{"roofY":0.18,"frontBarW":48,"clickRoofY":0.18,"skuCount":29,"pushBar":{"cx":50,"cy":58,"w":42,"hs":0.88,"ty":0.45}},"f":{"roofY":0.162,"frontBarW":50,"clickRoofY":0.162,"skuCount":29,"pushBar":{"cx":50,"cy":59,"w":44,"hs":0.88,"ty":0.45}}} |
| T-TRUCK-FULL-MAP | PASS | silverado 29/29 f150 29/29 |
| T-PUSHBAR-PER-PLATE | PASS | {"d":{"cx":50,"cy":56,"w":34,"hs":0.88,"ty":0.45},"s":{"cx":50,"cy":58,"w":42,"hs":0.88,"ty":0.45},"f":{"cx":50,"cy":59,"w":44,"hs":0.88,"ty":0.45}} |
| T-SCHEME-FILES | PASS | rb/bw/rw/rbw sprites HEAD 200 |
| T-SCHEME-PIXEL-OWNER | PASS | each scheme requests different sprite set |
| T-RBW-CONTROL | PASS | btn=true hidden=false |
| T-LOAD-SKUS | PASS | [["ALGT53JX-P3LB",true],["SIFMJS",true],["MPS63U-RBW",true],["MPS123U-RBW",true]] |
| T-VISOR-W | PASS | SIFMJS w=32 |
| T-TOGGLES-ONE-OWNER | PASS | {"dashOn":true,"dashOff":false,"hatchOn":true,"hatchOff":false} |
| T-PRINT-RUNTIME | PASS | button=Print |
| T-LOAD-LABEL | PASS | button=Load SKUs |
| T-ONE-PARTS-CLICK | PASS | {"one":{"unique":["ALGT53JX-P3LB"],"placements":1,"lights":1},"left":1,"hero":1} |
| T-CLEAR-ALL-BARE | PASS | {"placements":0,"lights":0,"ghosts":0,"overlays":0,"dash":false,"hatch":false,"push":false} |

All named traps PASS.
