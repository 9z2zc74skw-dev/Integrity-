# Vector trap log — studio32 side scrap fix; Front clickPlace unchanged

Self-test owned by this pass. Valentine trap-scores after. This file does **not** certify buyer-ready.

- Ran: `node visualizer/_src/run-traps.mjs` (local Chrome, not Rusty’s live preview)
- ASSET_V: studio32 · FX_V: max12
- Signed Durango plate bytes: T-PLATE-HASHES (Front/Right/Rear/Hatch/Left not recut)
- studio32: Left/Right bare + GhostBar on roof, not B-pillar glass. Front clickPlace / defaultFor `_` unchanged (Rusty: Front looked good). ILS from side stays Front. Plates unchanged.

| Trap | Result | Detail |
|---|---|---|
| T-NO-CLICK-PAIRS | PASS | duplicate click maps absent |
| T-PRINT-LABEL | PASS | chrome says Print, not Sign-off |
| T-LOAD-WIRED | PASS | Load SKUs present, no soon |
| T-RBW-VISIBLE | PASS | R/B/W control not CSS-hidden |
| T-ONE-ROOF-SKU | PASS | one roof SKU row |
| T-TRUCKS-DROPDOWN | PASS | Silverado and F-150 in select |
| T-ASSET-V | PASS | ASSET_V=studio32 |
| T-NO-HOME-YANK | PASS | clickPlace never assigns camera from HOME_VIEW |
| T-FIRST-PAINT-SRC | PASS | first-paint plate uses ?v=studio32 |
| T-PACK-STAMP | PASS | header pack stamp present |
| T-NO-SIDE-FALLBACK-STAMP | PASS | defaultFor _ stays on Front/Rear/Hero; Left/Right do not invent scraps |
| T-MPSW9-NOT-WIDE-BAR | PASS | MPSW9 is compact fx_mpsw9 w~2.2, not fx_mps_wide 12-LED bar |
| T-OEM-HIDE-FILE | PASS | Front OEM-hide overlay present |
| T-URL-NO-SEED | PASS | no URL/hash auto-place |
| T-NO-RESTORE-NODES | PASS | loadState does not rehydrate placements; v1 wiped; empty boot strips sprites |
| T-BARE-PLATE-PIXELS | PASS | signed+black plates LED/amber pixels=0 durango_front.png=0 durango_front_black.png=0 durango_hero.png=0 durango_hero_black.png=0 |
| T-BARE-SIDE-GLASS | PASS | side B-pillar/glass LED pixels=0 durango_left.png=0 durango_left_black.png=0 durango_right.png=0 durango_right_black.png=0 |
| T-ARCHIVE-TREE | PASS | leftovers parked under archive/ |
| T-PAGES-HONEST | PASS | root README does not promise Pages URL |
| T-PLATE-HASHES | PASS | durango_front.png unchanged; durango_right.png unchanged; durango_rear.png unchanged; durango_rear_open.png unchanged; durango_left.png unchanged; durango_hero.png unchanged |
| T-FX-LOOK | PASS | {"ok":true,"n":21,"fail":[],"minBytes":22147,"maxH":72} |
| T-CATALOG-FX-LOOK | PASS | {"ok":true,"fail":[],"n":9} |
| T-FX-HEAD | PASS | 63 fx 200 |
| T-DYNA-HEAD | PASS | 21 dyna fx 200 |
| T-DEMO-QUOTE-FILE | PASS | quotes/demo-1236.json 200 |
| T-CHROME-RUNTIME | PASS | evaluated |
| T-BARE-DEFAULT | PASS | {"cold":{"placements":0,"lights":0,"ghosts":0,"overlays":0,"push":false,"dash":false,"hatch":false,"pushSw":false,"pack":"pack studio32","plateSrc":"durango_front.png?v=studio32","asset":"studio32","patchOn":true},"afterPoison":{"placements":0,"lights":0,"ghosts":0,"overlays":0,"push":false,"dash":false,"hatch":false,"pushSw":false,"pack":"pack studio32","plateSrc":"durango_front.png?v=studio32","asset":"studio32","patchOn":true}} |
| T-COLD-NO-SPRITE | PASS | {"pack":"pack studio32","src":"durango_front.png?v=studio32","asset":"studio32"} |
| T-OEM-HIDE-ON | PASS | {"patchOn":true} |
| T-BARE-EVERY-VIEW | PASS | front,rear,rear_open,left,right,hero |
| T-CLEAR-EVERY-VIEW | PASS | front/left/right/hero empty after Clear All |
| T-BARE-SIDE-LOOK | PASS | {"left":{"ok":true,"n":0},"right":{"ok":true,"n":0},"leftClear":{"ok":true,"n":0}} |
| T-GHOST-NOT-IN-GLASS | PASS | {"left":{"ok":true,"n":0},"right":{"ok":true,"n":0}} |
| T-GHOST-SIDE-SIT | PASS | {"left":{"ghosts":1,"box":{"topPct":31.148648648648646,"botPct":33.04054054054054,"midX":48.9991554054054,"spec":{"kind":"endcap","x":49,"y":33,"sit":"bottom"},"origin":"50% 100%"},"audit":{"lights":[],"ghosts":[{"cls":"ghost-bar endcap","left":"49%","top":"33%","origin":"50% 100%","transform":"translate(-50%, 0px)"}]}},"right":{"ghosts":1,"box":{"topPct":32.658361486486484,"botPct":34.55025337837838,"midX":50.998733108108105,"spec":{"kind":"endcap","x":51,"y":34.6,"sit":"bottom"},"origin":"50% 100%"},"audit":{"lights":[],"ghosts":[{"cls":"ghost-bar endcap","left":"51%","top":"34.6%","origin":"50% 100%","transform":"translate(-50%, 0px)"}]}}} |
| T-CLICKPLACE-ALL | PASS | durango/front=35 durango/left=7 durango/rear=36 silverado/front=35 silverado/left=7 silverado/rear=36 f150/front=35 f150/left=7 f150/rear=36 |
| T-ROOF-FRONT-ONLY | PASS | roof nodes only on front after clickPlace from Front/Left/Rear |
| T-HERO-GHOST-SIT | PASS | {"spec":{"kind":"full","x":48.5,"y":28.6,"rot":-6,"wScale":0.62,"sit":"bottom"},"origin":"50% 100%"} |
| T-TRUCK-NO-DURANGO-LEAK | PASS | {"d":{"roofY":0.248,"frontBarW":42.4,"clickRoofY":0.248,"skuCount":31,"pushBar":{"cx":50,"cy":56,"w":34,"hs":0.88,"ty":0.45}},"s":{"roofY":0.18,"frontBarW":48,"clickRoofY":0.18,"skuCount":31,"pushBar":{"cx":50,"cy":58,"w":42,"hs":0.88,"ty":0.45}},"f":{"roofY":0.162,"frontBarW":50,"clickRoofY":0.162,"skuCount":31,"pushBar":{"cx":50,"cy":59,"w":44,"hs":0.88,"ty":0.45}}} |
| T-TRUCK-FULL-MAP | PASS | silverado 31/31 f150 31/31 |
| T-PUSHBAR-PER-PLATE | PASS | {"d":{"cx":50,"cy":56,"w":34,"hs":0.88,"ty":0.45},"s":{"cx":50,"cy":58,"w":42,"hs":0.88,"ty":0.45},"f":{"cx":50,"cy":59,"w":44,"hs":0.88,"ty":0.45}} |
| T-SCHEME-FILES | PASS | rb/bw/rw/rbw sprites HEAD 200 |
| T-SCHEME-PIXEL-OWNER | PASS | each scheme requests different sprite set |
| T-RBW-CONTROL | PASS | btn=true hidden=false |
| T-LOAD-SKUS | PASS | [["ALGT53JX-P3LB",true],["SIFMJS",true],["MPS63U-RBW",true],["MPS123U-RBW",true]] |
| T-VISOR-W | PASS | SIFMJS w=14 (per shroud) |
| T-VISOR-SPLIT | PASS | {"count":2,"xs":[0.37,0.61],"w":14,"gap":0.10000000000000003,"sides":["L","R"],"lights":["light ils-half ils-L","light ils-half ils-R"],"dashWhileParts":true,"afterOwnOn":2,"afterOwnOff":0,"afterDashOn":2,"afterDashOff":0,"centered":false} |
| T-TOGGLES-ONE-OWNER | PASS | {"dashOn":true,"dashOnCount":2,"dashOff":false,"hatchOn":true,"hatchOff":false} |
| T-PRINT-RUNTIME | PASS | button=Print |
| T-LOAD-LABEL | PASS | button=Load SKUs |
| T-ONE-PARTS-CLICK | PASS | {"one":{"unique":["ALGT53JX-P3LB"],"placements":1,"lights":1},"left":1,"hero":1} |
| T-CLEAR-ALL-BARE | PASS | {"placements":0,"lights":0,"ghosts":0,"overlays":0,"dash":false,"hatch":false,"push":false} |
| T-DYNA-CLICKPLACE | PASS | DYNA-1=1 DYNA-2=1 DYNA-S=1 DYNA-X=1 DR1-RBK-SMK=1 DR6-RBW=1 |
| T-DYNA-LOOK | PASS | slim alpha stick, not a 623-byte/thumbnail product card; dyna-stick + fx_dyna src; on-vehicle module aspect |
| T-DOCK-FOLLOWS-SELECTION | PASS | {"before":{"on":true,"gapAbove":6.01092529296875,"gapBelow":-79.91717529296875,"dx":0,"dockTop":265.765625,"lightTop":333.77655029296875,"lightBottom":345.68280029296875,"visor":true},"moved":{"lightDx":0.07999999999999996,"lightDy":0.10000000000000003,"visualLightDy":69.859375,"dockDy":69.859375,"after":{"on":true,"gapAbove":6.01092529296875,"gapBelow":-79.91717529296875,"dx":0,"dockTop":335.625,"lightTop":403.63592529296875,"lightBottom":415.54217529296875,"visor":true}},"afterClear":{"on":false,"gapAbove":null,"gapBelow":null,"dx":null,"dockTop":null,"lightTop":null,"lightBottom":null,"visor":false},"adjacent":true,"followed":true} |
| T-DOCK-RELEASES-AFTER-DROP | PASS | {"afterClickPlace":{"lights":1,"selected":0,"dockOn":false,"sel":null},"afterClickLight":{"lights":1,"selected":1,"dockOn":true,"sel":1},"afterEmpty":{"lights":1,"selected":0,"dockOn":false,"sel":null},"afterClearView":{"lights":0,"selected":0,"dockOn":false,"sel":null},"afterClearAll":{"lights":0,"selected":0,"dockOn":false,"sel":null},"afterDrop":{"lights":1,"selected":0,"dockOn":false,"sel":null,"dropOk":true}} |
| T-CLICKPLACE-STAY-VIEW | PASS | {"stay":{"mpsw9Left":{"from":"left","after":"left","on":{"front":0,"rear":0,"rear_open":0,"left":1,"right":0,"hero":0},"total":1,"sku":"MPSW9-BW"},"mpsw9Hero":{"from":"hero","after":"hero","on":{"front":0,"rear":0,"rear_open":0,"left":0,"right":0,"hero":1},"total":1,"sku":"MPSW9-BW"},"mpsw9Front":{"from":"front","after":"front","on":{"front":1,"rear":0,"rear_open":0,"left":0,"right":0,"hero":0},"total":1,"sku":"MPSW9-BW"},"mpsw9Right":{"from":"right","after":"right","on":{"front":0,"rear":0,"rear_open":0,"left":0,"right":1,"hero":0},"total":1,"sku":"MPSW9-BW"},"mps63Front":{"from":"front","after":"front","on":{"front":1,"rear":0,"rear_open":0,"left":0,"right":0,"hero":0},"total":1,"sku":"MPS63U-RBW"},"xsm2Rear":{"from":"rear","after":"rear","on":{"front":0,"rear":1,"rear_open":0,"left":0,"right":0,"hero":0},"total":1,"sku":"XSM2-BRW-US"},"bumperFront":{"from":"front","after":"front","on":{"front":4,"rear":0,"rear_open":0,"left":0,"right":0,"hero":0},"total":4,"sku":"416309-RBW-SMK"},"algtLeft":{"from":"left","after":"left","on":{"front":1,"rear":0,"rear_open":0,"left":0,"right":0,"hero":0},"total":1,"sku":"ALGT53JX-P3LB"},"sifLeft":{"from":"left","after":"left","on":{"front":2,"rear":0,"rear_open":0,"left":0,"right":0,"hero":0},"total":2,"sku":"SIFMJS"},"sifFront":{"from":"front","after":"front","on":{"front":2,"rear":0,"rear_open":0,"left":0,"right":0,"hero":0},"total":2,"sku":"SIFMJS"},"homeMpsw9":"left","homeMir":"left","mpsw9Fx":"fx_mpsw9_rb.png"}} |
| T-ILS-FRONT-ONLY | PASS | {"sifLeft":{"from":"left","after":"left","on":{"front":2,"rear":0,"rear_open":0,"left":0,"right":0,"hero":0},"total":2,"sku":"SIFMJS"},"sifFront":{"from":"front","after":"front","on":{"front":2,"rear":0,"rear_open":0,"left":0,"right":0,"hero":0},"total":2,"sku":"SIFMJS"}} |
| T-FRONT-FALLBACK-ON-FRONT | PASS | {"algt":{"after":"front","onFront":1,"lights":1},"sif":{"after":"front","onFront":2,"lights":2},"mps63":{"after":"front","onFront":1,"lights":1},"bumper":{"after":"front","onFront":4,"lights":4},"xsm2":{"after":"front","onFront":1,"lights":1},"dr6":{"after":"front","onFront":1,"lights":1},"stick":{"after":"front","onFront":1,"lights":1}} |
| T-MPSW9-POD | PASS | {"w":2.2,"fx":"fx_mpsw9_rb.png","boxW":16,"boxH":19,"nw":203,"nh":231,"src":"fx/fx_mpsw9_rbw.png?v=max12"} |

All named traps PASS.
