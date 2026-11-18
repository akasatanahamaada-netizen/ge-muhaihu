/* ============================================================================
   ステージ：第一章 ── 近道 ②（いばらのトンネル）  id = 'path2b'
   種類：play　分かれ道で「近道」を選んだときだけ遊ぶ（遠回りのときは飛ばす）。近道 ①（08_path2.js）のつぎ
   担当：
   ----------------------------------------------------------------------------
   ◆ ねらい：床からのびる岩と、天井から垂れるいばらが、交互に道をふさぐ。
     左右のページで、それぞれ「天井へ → 床へ」と裏返して、すきまを縫って進む。
     狼の手下は、ページを裏返すと一緒に天井へ落ちる。倒さなくても進めるが、ぶつかるとハートが減る。

   ◆ 想定ルート（★＝本を裏返す）
     左ページ：床の岩A（高さ164・ジャンプでは越えられない）の手前で ★天井へ → 岩Aの上を越える
              → 天井のいばらB（下の端 y=250）の手前で ★床へ → いばらBの下をくぐって、背表紙を越える
     右ページ：いばらCの下をくぐる → 床の岩D（高さ264）の手前で ★天井へ → 岩Dの上を越える
              → いばらE の手前で ★床へ → いばらEの下をくぐって、右の端へ
     （天井のまま進もうとしても、いばらB・Eが天井から床近くまで垂れていてふさいでいる）

   ◆ 座標メモ　画面 900×480 / 背表紙 x=450 / 床の上面 y=464 / 天井 y=16 / ジャンプ到達 約93px
   ========================================================================== */

GT.defineStage('path2b', {
  // お話のかけら（光の玉）：拾わなくても先へ進める（itemsOptional）。拾うと、本の「front」のページが埋まっていく
  items:[
    {page:'left', x:264, y:428, w:32, h:32},    // 岩Aといばらのあいだ（敵が歩いているところ）
    {page:'right', x:704, y:428, w:32, h:32},   // 岩Dといばらのあいだ（敵が歩いているところ）
    {page:'left', x:420, y:18, w:32, h:32},
  ],
  itemsOptional:true,
  bookPage:'front',
  pieceKey:'wolfroad2',   // 近道と遠回りで、同じかけらを数える（どちらの道を通っても、ページを埋められる）
  mission:['items'],
  platforms:[
    {page:'left',  x:200, y:300, w:30, h:164, kind:'ledge'},   // 0 岩A（床から）
    {page:'left',  x:330, y:16,  w:30, h:234, kind:'ledge'},   // 1 いばらB（天井から）
    {page:'right', x:520, y:16,  w:30, h:284, kind:'ledge'},   // 2 いばらC（天井から）
    {page:'right', x:650, y:200, w:30, h:264, kind:'ledge'},   // 3 岩D（床から）
    {page:'right', x:780, y:16,  w:30, h:284, kind:'ledge'},   // 4 いばらE（天井から）
  ],
  boxes:[],
  enemies:[
    {page:'left',  x:250, y:432, w:36, h:32, dir:1},            // 岩Aといばらのあいだ
    {page:'right', x:700, y:432, w:36, h:32, dir:-1},           // 岩Dといばらのあいだ
  ],
});

GT.registerScene({
  id:'path2b', type:'play', stage:'path2b', clear:'exit',
  label:'第一章 ── 近道 ②',
  dynamic:'shortcutOnly',   // 近道のときだけ遊ぶ（07_crossroads.js）
});

/* ============================================================================
   見た目（地形・敵は上の defineStage のまま。絵を重ねるだけ）
     ・床からの岩（0,3）→ 苔むした岩 ／ 天井からのいばら（1,2,4）→ 垂れさがる太いつる＋とげ
   足場の形を変えたら、下の番号（platforms の何番目か）も合わせて直すこと。
   ========================================================================== */
(function(){
const ctx=GT.ctx;
const isHere=()=>GT.scene&&GT.scene.id==='path2b';
const P=i=>GT.STAGE_DEFS.path2b.platforms[i];
const F=GTDecor.forest;
const FLOWERS=[[40,2],[120,0],[300,1],[470,3],[600,2],[850,0]];
// いばらのとげ（つるの両がわに、とがった小さな三角）
function thorns(p){
  ctx.save(); ctx.fillStyle='#3e2a1c';
  for(let y=p.y+18;y<p.y+p.h-6;y+=16){
    for(const s of [-1,1]){ const x=s<0?p.x:p.x+p.w, oy=(s<0?0:8);
      ctx.beginPath(); ctx.moveTo(x,y+oy); ctx.lineTo(x+s*9,y+oy+4); ctx.lineTo(x,y+oy+8); ctx.closePath(); ctx.fill(); } }
  ctx.restore();
}
GT.registerDraw(()=>{ if(!isHere()) return;
  F.ground({flowers:FLOWERS, mushrooms:[[260,1],[560,1]], lights:[[140,0.4],[600,2.2]]});
}, 'back');
GT.registerDraw(()=>{ if(!isHere()) return;
  F.rock([P(0)],3); F.rock([P(3)],11);
  for(const i of [1,2,4]){ F.vine(P(i)); thorns(P(i)); }
}, 'world');
GT.registerDraw(()=>{ if(!isHere()) return; F.air(); }, 'overlay');
})();
