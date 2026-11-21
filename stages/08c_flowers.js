/* ============================================================================
   ステージ：第一章 ── お花畑  id = 'flowers'
   種類：play　分かれ道で「遠回り」を選んだときだけ遊ぶ（近道のときは飛ばす）。遠回りの道 ①（09_path3.js）の前
   担当：
   ----------------------------------------------------------------------------
   ◆ ねらい：赤ずきんと一緒に、おばあさんへのお花を摘む（寄り道。のちの「お花を摘んでいたら、夢中になっちゃって」）
     お花を 6本ぜんぶ摘むと、右の端が開く。床・高い足場（丸太）・高い崖の上に咲いていて、
     崖の上と丸太の上の花は、本を裏返さないと届かない。敵はいない。

   ◆ 想定ルート（★＝本を裏返す）
     左ページ：崖Aに行く手をふさがれる → ★天井へ → 崖Aの真上で ★床へ（崖の上に降りて花③）→ 床へ（花①）
               丸太Aの花②は、天井から丸太Aの真上で ★床へ
     右ページ：床の花④ → 崖Bに行く手をふさがれる → ★天井へ → 崖Bの真上で ★床へ（花⑤）
               → 天井へもどって、丸太Bの真上で ★床へ（花⑥）→ 右の端へ

   ◆ 座標メモ　画面 900×480 / 背表紙 x=450 / 床の上面 y=464 / 天井 y=16 / ジャンプ到達 約93px
   ========================================================================== */

GT.defineStage('flowers', {
  platforms:[
    {page:'left',  x:120, y:300, w:120, h:20, kind:'ledge'},   // 0 足場A（丸太。床から跳んでは届かない）
    {page:'right', x:740, y:250, w:120, h:20, kind:'ledge'},   // 1 足場B（丸太）
    {page:'left',  x:262, y:250, w:92,  h:214, kind:'ledge'},  // 2 崖A（床から登れない。床までつながっている）
    {page:'right', x:592, y:236, w:96,  h:228, kind:'ledge'},  // 3 崖B
  ],
  boxes:[], enemies:[],
  items:[
    {page:'left',  x:400, y:432, w:30, h:30},   // ① 床（背表紙の手前）
    {page:'left',  x:165, y:268, w:30, h:30},   // ② 足場Aの上
    {page:'left',  x:293, y:218, w:30, h:30},   // ③ 崖Aの上
    {page:'right', x:560, y:432, w:30, h:30},   // ④ 床
    {page:'right', x:625, y:204, w:30, h:30},   // ⑤ 崖Bの上
    {page:'right', x:790, y:218, w:30, h:30},   // ⑥ 足場Bの上
  ],
  itemLook:'flower', itemLabel:'お花',
  mission:['items'],    // お花をぜんぶ摘むまで、右の端は閉じている
});

GT.registerScene({
  id:'flowers', type:'play', stage:'flowers', clear:'exit',
  label:'第一章 ── お花畑',
  dynamic:'detourOnly',     // 遠回りのときだけ遊ぶ（07_crossroads.js）
  companion:'hood',         // 赤ずきんが、うしろからついてくる
  intro:[
    {s:'赤ずきん',c:'hood',f:'smile',get t(){ return GT.flags.warnedHood ? '急がなきゃ……。でも、お花を持っていったら、おばあちゃんきっと喜ぶよね。少しだけ摘んでいこう！' : 'わあ、きれい！　おばあちゃんに、お花を摘んでいってあげよう！'; }},   // 狼のことを伝えていたら、急いで摘む
    {s:'赤ずきん',c:'hood',f:'worried',t:'あっ、あんな高いところにも咲いてる……。'},
  ],
});

/* ============================================================================
   見た目（地形・お花は上の defineStage のまま。絵を重ねるだけ）
     ・足場A・B → 丸太 ／ 崖A・B → 苔むした岩 ／ 床いっぱいの花畑・ちょうちょ
   ========================================================================== */
(function(){
const isHere=()=>GT.scene&&GT.scene.id==='flowers';
const P=i=>GT.STAGE_DEFS.flowers.platforms[i];
const F=GTDecor.forest;
// 摘めない飾りの花を、床いっぱいに（お花畑）
const FLOWERS=[]; for(let x=24;x<880;x+=26) FLOWERS.push([x+((x*7)%11), (x/26|0)%4]);
GT.registerDraw(()=>{ if(!isHere()) return;
  F.ground({flowers:FLOWERS, mushrooms:[[300,0.9]], lights:[[100,0.3],[380,1.4],[700,2.6]]});
}, 'back');
GT.registerDraw(()=>{ if(!isHere()) return; F.rock([P(2)],21); F.rock([P(3)],33); F.log(P(0),4); F.log(P(1),8); }, 'world');
GT.registerDraw(()=>{ if(!isHere()) return; F.air(); }, 'overlay');

/* 赤ずきんのひとこと（お花を摘むたび）。崖の上・丸太の上の花は、ちがうことを言う */
const SAY_FLOOR=['きれい！　いいにおい……','おばあちゃん、よろこぶかな','この色、すき！','あっちにも咲いてるよ！'];
const SAY_HIGH=['そんな高いところのお花、よく取れたね！','わあ、崖の上のお花！　ありがとう！','すごい、あんな高いところのお花まで！'];
const fl={ got:0, n:0, done:false };
GT.registerSceneReset(()=>{ if(isHere()){ fl.got=-1; fl.n=0; fl.done=false; } });   // 数は、ステージを読みこんだあとの最初の update で数える
GT.registerUpdate(()=>{
  if(!isHere()) return;
  const c=GT.getCompanion&&GT.getCompanion(), got=GT.items.filter(i=>i.got);
  if(fl.got<0){ fl.got=got.length; fl.done=GT.items.length>0 && got.length>=GT.items.length; return; }
  if(got.length>fl.got){
    const it=got.sort((a,b)=>a.gotT-b.gotT)[0], high=it.y<300;
    fl.got=got.length;
    if(c){ const all=got.length>=GT.items.length;
      const text= all ? 'これで花束ができた！　ありがとう！' : (high?SAY_HIGH:SAY_FLOOR)[(fl.n++)%(high?SAY_HIGH.length:SAY_FLOOR.length)];
      c.speech={text, t:2.8}; }
  }
  if(!fl.done && GT.items.length && got.length>=GT.items.length){   // お花をぜんぶ摘むと、お話のかけら（赤ずきんのところから本へ）
    fl.done=true; const r=c||GT.player;
    setTimeout(()=>GT.addPagePiece('road','wolf:road',{x:r.x,y:r.y,w:r.w,h:r.h}),700);
  }
});
})();
