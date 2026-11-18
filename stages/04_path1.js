/* ============================================================================
   ステージ：第一章 ── 森の道 ①  id = 'path1'
   種類：play
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

   ◆ 座標メモ（engine.js 由来）
     画面 900×480 / 背表紙 x=450 / 床の上面 y≒464 / ジャンプ到達 約93px
   ========================================================================== */

/* stages/XX_path1.js  ── ステージエディタで作成 */
/* stages/XX_path1.js  ── ステージエディタで作成 */
/* stages/XX_path1.js  ── ステージエディタで作成 */
GT.defineStage('path1', {
  // お話のかけら（光の玉）：拾わなくても先へ進める（itemsOptional）。拾うと、本の「window」のページが埋まっていく
  items:[
    {page:'left', x:172, y:322, w:32, h:32},
    {page:'left', x:339, y:242, w:32, h:32},
    {page:'right', x:610, y:18, w:32, h:32},
  ],
  itemsOptional:true,
  bookPage:'window',
  mission:['items'],
  platforms:[
    {page:'left', x:120, y:360, w:140, h:20, kind:'ledge'},
    {page:'left', x:300, y:280, w:110, h:20, kind:'ledge'},
    {page:'right', x:560, y:330, w:150, h:20, kind:'ledge'},
    {page:'right', x:770, y:160, w:50, h:310, kind:'ledge'},
    {page:'right', x:710, y:100, w:170, h:140, kind:'ledge'},
  ],
  boxes:[
    {x:590, y:300, w:32, h:32},
  ],
  enemies:[
    {page:'right', x:600, y:442, w:26, h:22, dir:-1},
    {page:'left', x:340, y:260, w:26, h:22, dir:-1},
  ],
  swamps:[
    {page:'left', x:40, y:440, w:240, h:24},
  ],
  decor:[
    {layer:'back', kind:'', x:240, y:310, w:90, h:150},
    {layer:'back', kind:'', x:490, y:430, w:70, h:34},
    {layer:'back', kind:'', x:660, y:410, w:70, h:34},
    {layer:'front', kind:'ledgeFront', x:490, y:360, w:80, h:100},
    {layer:'back', kind:'ledgeBack', x:620, y:390, w:120, h:70},
    {layer:'back', kind:'ledgeBack', x:740, y:40, w:105, h:70},
  ],
});

GT.registerScene({
  id:'path1', type:'play', stage:'path1', clear:'exit',
  label:'第一章 ── 森の道 ①',
  intro:{s:'',c:'narr',t:'森の道が続いている。'},
});

/* ============================================================================
   見た目（森の小道①と同じ森の絵。地形・箱・敵は上の defineStage のまま。絵を重ねるだけ）
     ・宙に浮いた細い足場（0,1,2）     → 丸太
     ・右の柱と上の大きな足場（3,4）  → 大きな木（幹＋葉の茂み。上の飾り decor[5] も茂みに）
     ・手前／奥の飾りの足場（decor[3],[4]） → 苔むした岩
     ・木箱 → 木目のある木箱 / 床の花ときのこ・木漏れ日・ちょうちょ・舞う葉
   足場の形を変えたら、下の番号（platforms / decor の何番目か）も合わせて直すこと。
   ========================================================================== */
(function(){
const isHere=()=>GT.scene&&GT.scene.id==='path1';
const D=()=>GT.STAGE_DEFS.path1;
const P=i=>D().platforms[i], Dc=i=>D().decor[i];
const F=GTDecor.forest;   // 森の絵（stages/_decor.js）
const FLOWERS=[[300,0],[330,2],[362,1],[402,3],[440,0],[470,2],[585,1],[606,3],[748,0],[862,2]];
const MUSHROOMS=[[318,1],[455,0.9],[850,1.1]];
GT.registerDraw(()=>{ if(!isHere()) return;
  F.ground({flowers:FLOWERS, mushrooms:MUSHROOMS, lights:[[330,0.5],[600,2.1],[850,3.4]]});
  F.rock([Dc(4)],31);                                                               // 奥の岩
}, 'back');
GT.registerDraw(()=>{ if(!isHere()) return;
  F.log(P(0),3); F.log(P(1),8); F.log(P(2),14);                                      // 丸太
  F.trunk(P(3));                                                                    // 大きな木の幹
  F.crown([Dc(5),P(4)],17);                                                         // 葉の茂み
  for(const box of GT.boxes) F.crate(box);
}, 'world');
GT.registerDraw(()=>{ if(!isHere()) return;
  F.rock([Dc(3)],23);                                                               // 手前の岩
  F.air();
}, 'overlay');
})();
