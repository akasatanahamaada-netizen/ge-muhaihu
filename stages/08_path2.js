/* ============================================================================
   ステージ：第一章 ── 近道  id = 'path2'
   種類：play　分かれ道で「近道」を選んだときだけ遊ぶ（遠回りのときは飛ばす）。
         床の壁→天井へ、天井の壁→床へ、のつづら折り（右ページで2回反転）
   担当：
   ========================================================================== */

/* stages/XX_path2.js  ── ステージエディタで作成 */
(function(){
  const isP2=()=>GT.scene&&GT.scene.id==='path2'; let given=false;
  GT.registerSceneReset(()=>{ if(isP2()) given=false; });
  GT.registerUpdate(()=>{ if(!isP2()||given||!GT.enemies.length||GT.enemies.some(e=>e.alive)) return;
    given=true; const e=GT.enemies[GT.enemies.length-1]; GT.addPagePiece('wolf','wolf:road',{x:e.x,y:e.y-10,w:e.w,h:e.h}); });   // 狼の手下を全部倒すと、お話のかけら（遠回りの「お花を全部摘む」と同じかけら）
})();
GT.defineStage('path2', {
  // お話のかけら（光の玉）：拾わなくても先へ進める（itemsOptional）。拾うと、本の「wolf」のページが埋まっていく
  items:[
    {page:'left', x:60, y:18, w:32, h:32},
    {page:'right', x:470, y:428, w:32, h:32},
    {page:'right', x:805, y:152, w:32, h:32},
  ],
  itemsOptional:true,
  bookPage:'wolf',
  pieceKey:'wolfroad1',   // 近道と遠回りで、同じかけらを数える（どちらの道を通っても、ページを埋められる）
  platforms:[
    {page:'left', x:375, y:185, w:20, h:280, kind:'ledge'},
    {page:'right', x:545, y:125, w:150, h:20, kind:'ledge'},
    {page:'left', x:325, y:145, w:120, h:90, kind:'ledge'},
    {page:'left', x:360, y:110, w:65, h:50, kind:'ledge'},
    {page:'right', x:735, y:190, w:115, h:20, kind:'ledge'},
    {page:'right', x:865, y:15, w:20, h:405, kind:'ledge'},
  ],
  boxes:[
    {x:750, y:160, w:32, h:32},
    {x:645, y:80, w:45, h:43},
    {x:558, y:93, w:32, h:32},       // 3つ目（敵3体に、木箱3つ）
  ],
  enemies:[
    {page:'right', x:680, y:430, w:36, h:32, dir:-1},
    {page:'right', x:515, y:425, w:41, h:37, dir:-1},
    {page:'right', x:810, y:415, w:30, h:50, dir:-1},
  ],
  decor:[
    {layer:'back', kind:'ledgeBack', x:80, y:270, w:20, h:195},
    {layer:'back', kind:'ledgeBack', x:40, y:230, w:100, h:80},
    {layer:'back', kind:'ledgeBack', x:55, y:200, w:70, h:50},
    {layer:'front', kind:'ledgeFront', x:200, y:155, w:25, h:310},
    {layer:'front', kind:'ledgeFront', x:135, y:70, w:160, h:120},
    {layer:'front', kind:'ledgeFront', x:175, y:30, w:105, h:65},
    {layer:'front', kind:'fern', x:95, y:420, w:50, h:45},
    {layer:'front', kind:'fern', x:140, y:410, w:80, h:55},
    {layer:'front', kind:'fern', x:325, y:415, w:55, h:45},
    {layer:'front', kind:'fern', x:630, y:355, w:130, h:110},
    {layer:'front', kind:'grass', x:585, y:400, w:45, h:59},
    {layer:'front', kind:'fern', x:475, y:385, w:100, h:80},
    {layer:'front', kind:'fern', x:790, y:400, w:75, h:70},
    {layer:'front', kind:'grass', x:745, y:385, w:60, h:79},
  ],
  mission:['enemies','items'],   // かけらは拾わなくてもよい（itemsOptional）   // 狼の手下を全部倒すまで、右の端は閉じている（木箱を上から落として倒す）
});

GT.registerScene({
  id:'path2', type:'play', stage:'path2', clear:'exit',
  label:'第一章 ── 近道',
  dynamic:'shortcutOnly',   // 近道のときだけ遊ぶ（07_crossroads.js）
});

/* ============================================================================
   見た目（森の小道①と同じ森の絵。地形・箱・敵は上の defineStage のまま。絵を重ねるだけ）
     ・左の細い柱と上の足場（0,2,3） → 木（幹＋葉の茂み）
     ・宙に浮いた細い足場（1,4）      → 丸太
     ・右の天井から下がる柱（5）      → 垂れさがる太いつる
     ・奥の木（decor[0]〜[2]）・手前の木（decor[3]〜[5]） → 幹＋葉の茂み（手前の木はプレイヤーより前）
     ・木箱 → 木目のある木箱 / 床の花ときのこ・木漏れ日・ちょうちょ・舞う葉
   足場の形を変えたら、下の番号（platforms / decor の何番目か）も合わせて直すこと。
   ========================================================================== */
(function(){
const isHere=()=>GT.scene&&GT.scene.id==='path2';
const D=()=>GT.STAGE_DEFS.path2;
const P=i=>D().platforms[i], Dc=i=>D().decor[i];
const F=GTDecor.forest;   // 森の絵（stages/_decor.js）
const FLOWERS=[[30,0],[58,2],[250,1],[292,3],[432,0],[600,2],[722,1]];
const MUSHROOMS=[[270,1],[445,0.9]];
GT.registerDraw(()=>{ if(!isHere()) return;
  F.ground({flowers:FLOWERS, mushrooms:MUSHROOMS, lights:[[110,0.4],[440,1.8],[700,3.0]]});
  F.trunk(Dc(0)); F.crown([Dc(2),Dc(1)],41);                                       // 奥の木
}, 'back');
GT.registerDraw(()=>{ if(!isHere()) return;
  F.trunk(P(0)); F.crown([P(3),P(2)],11);                                           // 木
  F.log(P(1),5); F.log(P(4),9);                                                     // 丸太
  F.vine(P(5));                                                                     // つる
  for(const box of GT.boxes) F.crate(box);
}, 'world');
GT.registerDraw(()=>{ if(!isHere()) return;
  F.trunk(Dc(3)); F.crown([Dc(5),Dc(4)],27);                                       // 手前の木
  F.air();
}, 'overlay');
})();
