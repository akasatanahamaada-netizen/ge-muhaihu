/* ============================================================================
   ステージ：第一章 ── 遠回りの道 ①  id = 'path3'
   種類：play　分かれ道で「遠回り」を選んだときだけ遊ぶ（近道のときは飛ばす）
   担当：
   ----------------------------------------------------------------------------
   ◆ ねらい：重力反転（本を裏返す）を主役にしたステージ
     床はつねに一枚つづきなので「反転しないと通れない」地形は作れない。
     そこで ── 床は手下（敵）で危険にし、反転で縦に大きく移動しながら
     梢（天井ぎわの足場）を渡るのが正解ルートになるようにしてある。
     ※反転は「上／下へ落ちる」ので、ジャンプ(約93px)では届かない
       縦の段差をタダで越えられる。これを前提に段差を大きくとっている。

   ◆ 想定ルート（★＝本を裏返す）
     左ページ：床の隅から ★反転→ 梢CL_a・CL_bを右へ渡る（手下の頭上）
            → ★反転(戻す)→ 中段のL_landに降りる
            → 背表紙をまたいで R_entry（中段の橋）へ
     右ページ：R_entryで ★反転→ 梢CR_a→CR_b→CR_cを右へ渡る（手下の頭上）
            → そのまま右端へ抜けてクリア
     → 左で2回・右で1回、上向き下向き両方の反転を使う構成。

   ◆ 座標メモ（js/engine/ 由来）
     画面 900×480 / 背表紙 x=450 / 床の上面 y≒464 / ジャンプ到達 約93px
   ========================================================================== */

GT.defineStage('path3', {
  // お話のかけら（光の玉）：拾わなくても先へ進める（itemsOptional）。拾うと、本の「おばあさんの家への道」のページが埋まっていく
  items:[
    {page:'left', x:370, y:322, w:32, h:32},
    {page:'left', x:80, y:18, w:32, h:32},
    {page:'right', x:470, y:428, w:32, h:32},
  ],
  itemsOptional:true,
  bookPage:'road',   // 本の「おばあさんの家への道」のページ
  pieceKey:'wolfroad1',   // 近道と遠回りで、同じかけらを数える（どちらの道を通っても、ページを埋められる）
  mission:['items'],
  platforms:[
    {page:'left', x:70, y:55, w:80, h:75, kind:'ledge'},
    {page:'left', x:295, y:85, w:105, h:60, kind:'ledge'},
    {page:'left', x:105, y:185, w:15, h:275, kind:'ledge'},
    {page:'left', x:355, y:360, w:55, h:100, kind:'ledge'},
    {page:'right', x:790, y:300, w:20, h:160, kind:'ledge'},
    {page:'right', x:570, y:385, w:15, h:80, kind:'ledge'},
    {page:'right', x:535, y:340, w:90, h:55, kind:'ledge'},
    {page:'right', x:555, y:305, w:50, h:40, kind:'ledge'},
    {page:'right', x:740, y:240, w:120, h:85, kind:'ledge'},
    {page:'right', x:750, y:200, w:100, h:50, kind:'ledge'},
    {page:'right', x:630, y:20, w:50, h:170, kind:'ledge'},
    {page:'right', x:620, y:20, w:60, h:140, kind:'ledge'},
  ],
  boxes:[
    {x:135, y:425, w:40, h:37},
  ],
  enemies:[
    {page:'right', x:740, y:430, w:40, h:30, dir:-1},
    {page:'left', x:195, y:440, w:35, h:20, dir:-1},
  ],
  decor:[
    {layer:'front', kind:'ledgeFront', x:250, y:320, w:130, h:140},
    {layer:'front', kind:'ledgeFront', x:40, y:120, w:140, h:85},
  ],
});

GT.registerScene({
  id:'path3', type:'play', stage:'path3', clear:'exit',
  onClear:()=>GT.fillPage('road','――赤ずきんと、お花を摘みながら、水車小屋への道を歩いた。'),
  companion:'hood',         // 遠回り：赤ずきんが、うしろからついてくる
  label:'第一章 ── 遠回りの道 ①',
  dynamic:'detourOnly',     // 遠回りのときだけ遊ぶ（07_crossroads.js）
});

/* ============================================================================
   見た目（森の小道①と同じ森の絵。地形・箱・敵は上の defineStage のまま。絵を重ねるだけ）
     ・左の細い柱と上の足場（0,2）   → 木（幹＋葉の茂み。手前の飾り decor[1] も茂みに）
     ・宙に浮いた足場（1）           → 葉の茂み
     ・左下の段（3）・手前の飾り（decor[0]） → 苔むした岩（手前の岩はプレイヤーより前）
     ・右の2本の柱と上の足場（4,8,9 / 5,6,7） → 大きな木と小さな木
     ・天井から下がる足場（10,11）   → 上から垂れる葉の茂み
     ・木箱 → 木目のある木箱 / 床の花ときのこ・木漏れ日・ちょうちょ・舞う葉
   足場の形を変えたら、下の番号（platforms / decor の何番目か）も合わせて直すこと。
   ========================================================================== */
(function(){
const isHere=()=>GT.scene&&GT.scene.id==='path3';
const D=()=>GT.STAGE_DEFS.path3;
const P=i=>D().platforms[i], Dc=i=>D().decor[i];
const F=GTDecor.forest;   // 森の絵（stages/_decor.js）
const FLOWERS=[[30,1],[62,2],[205,3],[240,0],[460,1],[500,2],[642,3],[700,0],[872,1]];
const MUSHROOMS=[[222,1],[480,1.1],[680,0.9]];
GT.registerDraw(()=>{ if(!isHere()) return;
  F.ground({flowers:FLOWERS, mushrooms:MUSHROOMS, lights:[[200,0.6],[480,2.0],[700,3.2]]});
}, 'back');
GT.registerDraw(()=>{ if(!isHere()) return;
  F.trunk(P(2)); F.crown([P(0)],7);                                                 // 左の木
  F.crown([P(1)],19);                                                               // 宙の茂み
  F.rock([P(3)],5);                                                                 // 左下の岩
  F.trunk(P(5)); F.crown([P(7),P(6)],29);                                           // 小さな木
  F.trunk(P(4)); F.crown([P(9),P(8)],37);                                           // 大きな木
  F.crown([P(11),P(10)],43);                                                        // 上から垂れる茂み
  for(const box of GT.boxes) F.crate(box);
}, 'world');
GT.registerDraw(()=>{ if(!isHere()) return;
  F.rock([Dc(0)],13);                                                               // 手前の岩
  F.crown([Dc(1)],23);                                                              // 手前の茂み
  F.air();
}, 'overlay');
})();
