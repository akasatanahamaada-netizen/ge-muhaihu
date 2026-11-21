/* ============================================================================
   ステージ：第一章 ── おばあさんの家（結末）  id = 'arrive' / 'ending'
   種類：talk(到着) → boss or qte(injectで差し込み) → end(結末)
   ----------------------------------------------------------------------------
   おばあさんの家は 3つのファイルに分かれています：
     ・12a_room_art.js   … 部屋の絵（背景・落とせる家具の見た目）
     ・12b_wolf_boss.js  … 狼とのボス戦（地形 'wolf_boss'・狼の動き・体力バー・やられたときの演出）
     ・このファイル      … お話：
         - 家の中に誰がいるか（おばあさん・赤ずきん。重力で天井へ落ちる）と、部屋の描画
         - QTE（1.6秒以内に本を裏返す）
         - 到着シーン arriveHouse（家の中に入ったところ。分岐で boss か qte を差し込む）
           ※家の前の場面（戸を叩く・赤ずきんを止めるか）は 11_house_front.js
         - 結末 result（flags.route / flags.saved から3つのエンディングを決める。
           戦いのあとの会話 → 外でマリと話す（近道なら夕暮れ、遠回りなら夜明け） → エンディングの画面 → 本を開く／はじめから）

   ふつうのステージ作りでは、ここまで触る必要はありません。
   新しいボスや仕掛けを足したい人は、ここを参考にしてください。
   仕組み：GT.registerSceneType / registerDynamic / registerUpdate /
          registerDraw / registerModeUpdate / registerFlipIntercept
   ========================================================================== */
(function(){
const ctx=GT.ctx, W=GT.W, H=GT.H, EDGE=GT.EDGE, SPINE=GT.SPINE;

/* ---- おばあさんの家の中（ボス戦・QTE・結末の背景） ------------------------ */
// 家に入ったところ（arriveHouse）から、もう部屋を見せる
const isRoom=()=>GT.scene&&(GT.scene.dynamic==='arriveHouse'||GT.scene.type==='boss'||GT.scene.type==='qte'||(GT.scene.type==='end'&&!ending.epilogue));
function ell(x,y,rx,ry,c){ ctx.beginPath(); ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2); ctx.fillStyle=c; ctx.fill(); }
function drawRoom(){
  if(!isRoom()) return;
  const t=performance.now()/1000, cast=castNow(), dim=!!cast.dim, noon=GT.flags.route==='shortcut';
  GT.grannyRoom.draw(t,noon,dim);                     // 部屋の絵（12a_room_art.js）
  ctx.save(); drawCast(t,cast); ctx.restore();
}
/* 部屋にいる人（分岐・場面で変わる）
   granny: 'shiver'（ベッドで震える）/'sit'（ベッドに腰かける）  hood: 'corner'/'door'/'near'/'bedside'/'shawl'
   cap: ベッドに残された赤い頭巾  wolfDown: 倒れた狼  wolfBed: ベッドで寝たふりをする狼  dim: 暗い部屋 */
function castNow(){
  const sc=GT.scene||{}, f=GT.flags;
  if(sc.type==='end'){ const k=ending.kind;
    return { granny:k==='true'?'sit':null,
             hood:k==='true'?(ending.hoodIn?'bedside':null):k==='normal'?'shawl':null,
             cap:k==='bad', wolfDown:true, dim:k==='bad' }; }
  if(sc.hollow) return { cap:true, dim:true };
  if(f.route==='shortcut') return { granny:'shiver' };
  if(f.stoppedAtDoor && sc.dynamic==='arriveHouse') return { hood:'door', wolfBed:true };
  if(sc.ambush) return { hood:'door' };
  if(sc.type==='qte') return { hood:'near', wolfBed:true };                             // ベッドの狼に、赤ずきんが近づいていく
  if(sc.saveHood) return { hood:'near' };                                                  // 奇襲のあいだ、赤ずきんは戸口で見守る   // おばあさんの寝間着で、ベッドに寝ている狼
  return { hood:'corner' };
}
function drawHoodSmall(x,foot,alpha){
  if(GT.drawHoodSprite(x,foot,GT.PLAYER_H,0,1,alpha==null?1:alpha)) return;   // 赤ずきんの絵（正面）
  const hw=12, hh=15;
  ctx.save(); ctx.globalAlpha=alpha==null?1:alpha; ctx.translate(x,foot-hh);
  ctx.fillStyle='#2b2e4a'; GT.roundRect(-hw,-hh,hw*2,hh*2,7); ctx.fill();
  ctx.fillStyle='#b8423f'; ctx.beginPath(); ctx.arc(0,-hh,hw*0.95,Math.PI,0); ctx.closePath(); ctx.fill();
  ctx.globalAlpha*=0.92; ctx.beginPath(); ctx.moveTo(-hw,-hh*0.1); ctx.lineTo(hw,-hh*0.1); ctx.lineTo(hw*0.7,hh*0.9); ctx.lineTo(-hw*0.7,hh*0.9); ctx.closePath(); ctx.fill();
  ctx.globalAlpha=alpha==null?1:alpha; ell(-4,-hh*0.35,1.8,1.8,'#e8dcc0'); ell(4,-hh*0.35,1.8,1.8,'#e8dcc0');
  ctx.restore();
}
/* 部屋にいる人も、ページの重力にしたがって床か天井へ落ちる（GT.fallBody）。
   天井に落ちたときは、上下さかさまに描く。 */
const castBody={ granny:{x:84,w:24,h:30}, hood:{x:184,w:24,h:30} };
GT.registerSceneReset(()=>{ for(const k in castBody){ castBody[k].y=null; castBody[k].vy=0; castBody[k].g=1; castBody[k].onGround=true; } });
GT.registerUpdate(dt=>{
  if(!isRoom()) return;
  for(const k in castBody){ const b=castBody[k]; if(b.y==null) continue;
    const page=(b.x+b.w/2)<SPINE?'left':'right';
    if(GT.gravity[page]===1 && b.g===1 && b.onGround && b.bedY!=null) continue;        // ベッドで落ち着いている
    const before=b.g; b.bedY=null; GT.fallBody(b,dt);
    if(before!==b.g) GT.grumble(b,k); }                                                // 何回も逆さにされると怒る
  for(const k in castBody){ const b=castBody[k]; if(b.speech){ b.speech.t-=dt; if(b.speech.t<=0) b.speech=null; } }
});
// (x, 足もと) を、重力にしたがった位置へ。天井にいるときは ctx を上下さかさまにして返す
function castPlace(key,x,footY){
  const b=castBody[key]; b.x=x-b.w/2;
  if(b.y==null){ b.y=footY-b.h; b.vy=0; b.g=1; b.onGround=true; b.bedY=footY<H-EDGE-1?footY:null; }
  return b;
}
function drawCast(t,c){
  const FLOOR=H-EDGE, shiver=Math.sin(t*30)*0.8;
  if(c.cap){ ctx.fillStyle='#b8423f'; ctx.beginPath(); ctx.moveTo(70,416); ctx.quadraticCurveTo(92,398,118,416); ctx.lineTo(110,424); ctx.lineTo(78,424); ctx.closePath(); ctx.fill(); }
  // 重力にしたがった位置に置く（天井にいるときは、足もとを軸に上下さかさま）
  const flipAt=(b,fn)=>{ ctx.save(); const foot=b.g>0?b.y+b.h:b.y; ctx.translate(0,foot); ctx.scale(1,b.g>0?1:-1); fn(); ctx.restore(); };
  if(c.granny){                                     // おばあさん（はじめはベッドの上）
    const b=castPlace('granny',96,422);
    flipAt(b,()=>{ const x=96+(c.granny==='shiver'&&b.g>0&&b.bedY!=null?shiver:0), y=-20;
      if(GT.drawCharSprite(c.granny==='shiver'?'grannyScared':'granny',x,0,GT.PLAYER_H,1,1)) return;   // 狼におそわれているあいだは、怯えた絵          // おばあさんの絵（二頭身・部屋のほうを向く）
      ctx.fillStyle='#8a7fa0'; GT.roundRect(x-12,y-6,24,26,8); ctx.fill();
      ell(x,y-12,9,9,'#ecd0a8'); ell(x,y-18,11,6,'#f6eed8');
      ell(x-3,y-12,1.3,1.3,'#2b2e4a'); ell(x+3,y-12,1.3,1.3,'#2b2e4a'); });
  }
  if(c.wolfBed && GT.drawWolfInBed) GT.drawWolfInBed();     // ベッドで寝たふりをする狼（12b_wolf_boss.js）
  const hoodAt=(x,alpha,extra)=>{ const b=castPlace('hood',x,FLOOR);
    flipAt(b,()=>{ drawHoodSmall(x,0,alpha); if(extra) extra(); }); };
  if(c.hood==='corner') hoodAt(196+shiver);
  if(c.hood==='door') hoodAt(330);
  if(c.hood==='near') hoodAt(212);                    // ベッドのそば（QTE のとき）                    // 戸口のそば（奇襲のとき）
  if(c.hood==='bedside') hoodAt(176,Math.min(1,(performance.now()-ending.hoodInT)/600));
  if(c.hood==='shawl') hoodAt(176);                 // おばあさんの肩掛けを抱いている（肩掛けの紫の楕円は、点に見えるので描かない）
  for(const k of ['granny','hood']){ const b=castBody[k];                          // 怒った吹き出し
    if(b.speech && b.y!=null && (k==='granny'?c.granny:c.hood)) GT.drawSpeech(b.x+b.w/2, b.g>0?b.y-6:b.y+b.h+6, b.speech.text, b.speech.t/0.4, b.g<0, b.speech.angry); }
  if(c.wolfDown && GT.hasSprite && GT.hasSprite('wolfLeft')){   // 倒れた狼（ミニの絵を横たえる）
    const lh=60, lw=lh*510/783;
    ctx.save(); ctx.translate(676,FLOOR-lw/2); ctx.rotate(-Math.PI/2); ctx.filter='brightness(0.85) saturate(0.8)';
    GT.drawCharSprite('wolf',0,0,lh,-1,1); ctx.restore();
    ctx.strokeStyle='#5a4630'; ctx.lineWidth=1.4;                                   // 目を回している
    for(let i=0;i<2;i++){ ctx.beginPath(); ctx.arc(616+i*10,FLOOR-30,3,performance.now()/150,performance.now()/150+Math.PI*1.5); ctx.stroke(); }
  } else if(c.wolfDown){                                   // 倒れた狼
    ell(640,FLOOR-7,30,8,'#3a2f2a'); ctx.fillStyle='#3a2f2a';
    ctx.beginPath(); ctx.moveTo(662,FLOOR-12); ctx.lineTo(670,FLOOR-22); ctx.lineTo(674,FLOOR-10); ctx.fill(); }
}
GT.registerDraw(drawRoom,'back');

/* 落とす箱を、家具の見た目にする（タンス・つぼ・本の山） */
const FURNITURE=['chest','pot','books'];
function drawFurniture(){
  if(!isRoom()) return;
  GT.boxes.forEach((b,i)=>GT.grannyRoom.drawFurniture(FURNITURE[i%FURNITURE.length],b));   // 絵は 12a_room_art.js
}
GT.registerDraw(drawFurniture,'world');
GT.boxSkinned=isRoom;   // 家の中では、engine のふつうの箱は描かず、家具の絵だけにする

/* ============================ QTE ====================================== */
let qteActive=false, qteTimer=0, qteWindow=0;

GT.registerAct('bgm-off',()=>{ GT.musicMute && GT.musicMute(true); });
GT.registerAct('bgm-on', ()=>{ GT.musicMute && GT.musicMute(false); });
const CLASSIC=(atDoor)=>[   // 「なんて大きな〜なの」「おまえを食べるためだよ！」（遠回りなら、かならず流れる）。atDoor … 赤ずきんが戸口にいる（止めたとき）
  ...(atDoor ? [
    {s:'おばあちゃん？',c:'wolf',sc:'granny',f:'disguise',t:'おやおや、よく来たね。そんな戸口にいないで、もっと近くへおいで。'},
    {s:'赤ずきん',c:'hood',f:'surprise',t:'……おばあちゃん？'},
    {s:'',c:'narr',t:'赤ずきんは少年のうしろで、声をふるわせた。'},
  ] : [
    {s:'おばあちゃん？',c:'wolf',sc:'granny',f:'disguise',t:'おやおや、よく来たね。カスタードとバターの小瓶は、そこの椅子に置いておくれ。'},
    {s:'おばあちゃん？',c:'wolf',sc:'granny',f:'disguise',t:'さあ、もっと近くへおいで。'},
    {s:'赤ずきん',c:'hood',f:'surprise',t:'……おばあちゃん？'},
  ]),
  {s:'赤ずきん',c:'hood',t:'まあ、おばあちゃん、なんて大きな腕なの。'},
  {s:'おばあちゃん？',c:'wolf',sc:'granny',f:'disguise',t:'おまえを抱きしめるためだよ、かわいい子。'},
  {s:'赤ずきん',c:'hood',t:'それに、なんて立派な脚なの。'},
  {s:'おばあちゃん？',c:'wolf',sc:'granny',f:'disguise',t:'もっと速く走るためだよ、かわいい子。'},
  {s:'赤ずきん',c:'hood',t:'なんて大きな耳なの。'},
  {s:'おばあちゃん？',c:'wolf',sc:'granny',f:'disguise',t:'おまえの声を、よく聞くためだよ。'},
  {s:'赤ずきん',c:'hood',t:'なんて大きな目なの。'},
  {s:'おばあちゃん？',c:'wolf',sc:'granny',f:'disguise',t:'おまえを、よく見るためだよ。'},
  {s:'赤ずきん',c:'hood',f:'surprise',t:'……なんて大きな歯なの。'},
  {s:'おばあちゃん？',c:'wolf',sc:'granny',f:'disguise',t:'それは、'},                     // ひと呼吸おいてから
  {s:'狼',c:'wolf',f:'granny',big:true,t:'おまえを食べるためだよ！'},   // ここで正体を見せる（名前は「狼」、立ち絵も黒塗りでなくなる）。big … 太く大きな文字で
];

GT.registerSceneType('qte', ()=>{
  GT.loadStageDef(GT.STAGE_DEFS['wolf_boss']); GT.mode='idle'; qteActive=false;
  { const pl=GT.player; pl.x=262; pl.y=H-EDGE-pl.h; pl.facing=-1; }   // 少年は戸口のそば（ベッドのほうを向く）
  GT.setHudStage('第一章 ── ！');
  GT.musicMute && GT.musicMute(true);     // 狼がおばあさんのふりをしているあいだは、BGM を止める（跳ね起きたら流す）
  const lines=CLASSIC().concat([{s:'',c:'narr',t:'狼が、勢いよくベッドから跳ね起きた。',act:'bgm-on'}]);
  GT.beginDialogue(lines,null,()=>{
    GT.hideDialogue(); qteActive=true;
    qteWindow=1.6; qteTimer=0; GT.mode='qte';
    document.getElementById('qte').classList.add('show');
    document.getElementById('qteBig').textContent='狼が跳ねた！';
  });
});
// QTE 中の時間切れ判定
GT.registerModeUpdate('qte', dt=>{ if(!qteActive) return; qteTimer+=dt; if(qteTimer>=qteWindow){ resolveQTE(false); } });
// QTE 中は、反転キー＝成功
GT.registerFlipIntercept(()=>{ if(qteActive){ GT.sfx&&GT.sfx('flip'); resolveQTE(true); return true; } return false; });
// QTEボタン
document.getElementById('qteBtn').addEventListener('pointerdown',e=>{ e.preventDefault(); if(qteActive) resolveQTE(true); });

function resolveQTE(success){
  if(!qteActive) return; qteActive=false;
  document.getElementById('qte').classList.remove('show');
  if(success){
    // 間に合った：狼はベッドから天井へたたきつけられて、ひるむ（演出は 12b_wolf_boss.js の startAmbush）
    GT.injectSceneAfterCurrent({type:'boss',saveHood:true,intro:[
      {s:'',c:'narr',t:'間に合った。少年が本を裏返すと、狼の牙は空を切り、赤ずきんは天井へ引きはなされた。'},
      {s:'',c:'narr',t:'狼が、牙をむいた。'} ]});
    GT.advanceScene();
  } else {
    GT.flags.saved=false;
    GT.musicHush&&GT.musicHush(6.5); GT.sfx&&GT.sfx('gore');   // 赤ずきんが、目の前で食べられる
    GT.beginDialogue([
      {s:'',c:'narr',t:'――赤ずきんは、狼に食べられてしまった。'},
      {s:'',c:'narr',t:'目の前が、暗くなる。音が、止む。'},
    ], null, ()=>{
      GT.injectSceneAfterCurrent({type:'boss',hollow:true,intro:[
        {s:'',c:'narr',t:'明るくなると、赤ずきんの姿はなかった。ベッドに、赤い頭巾だけが残されている。……狼が、ゆっくりとこちらを向いた。'} ]});
      GT.advanceScene();
    });
  }
}

/* ========================= 到着（分岐の要） =============================
   家の前の場面は 11_house_front.js（戸を叩く・赤ずきんを止めるかの選択はそちら）。
   ここは、戸を開けて中に入ったところ。flags.route / flags.stoppedAtDoor で分かれる。 */
GT.registerDynamic('arriveHouse', ()=>{
  GT.loadStageDef(GT.STAGE_DEFS['wolf_boss']); GT.mode='idle';
  GT.setHudStage('第一章 ── おばあさんの家');
  if(GT.flags.route==='shortcut'){
    GT.beginDialogue([
      {s:'',c:'narr',t:'少年は戸を押し開けた。昼の光が、部屋に差しこむ。'},
      {s:'',c:'narr',t:'――ベッドのおばあさんに、狼が、まさに牙をむこうとしていた。'},
      {s:'おばあさん',c:'granny',f:'scared',t:'ひ……！　だ、誰か……！'},
      {s:'',c:'narr',t:'狼が、こちらを振り向く。間に合った。'},
    ], null, ()=>{
      GT.injectSceneAfterCurrent({type:'boss',intro:[
        {s:'',c:'narr',t:'狼が、低くうなった。'} ]});
      GT.advanceScene();
    });
    return;
  }
  if(GT.flags.stoppedAtDoor){
    GT.musicMute && GT.musicMute(true);     // 狼がおばあさんのふりをしているあいだは、BGM を止める（跳ね起きたら流す）
    GT.beginDialogue([
      {s:'',c:'narr',t:'少年が先に、そっと中をうかがう。ベッドに、おばあさんの寝間着を着た誰かが横たわっていた。'},
      ...CLASSIC(true),
      {s:'',c:'narr',t:'狼が、ベッドから跳ね起きた。――けれど、少年はもう本に手をかけていた。',act:'bgm-on'},
    ], null, ()=>{
      GT.injectSceneAfterCurrent({type:'boss',ambush:true,intro:[
        {s:'',c:'narr',t:'天井にたたきつけられた狼が、目を回している。'} ]});
      GT.advanceScene();
    });
    return;
  }
  GT.beginDialogue([
    {s:'',c:'narr',t:'赤い夕日が、カーテンのすきまから細く差し込んでいる。'},
    {s:'',c:'narr',t:'ベッドの上には、おばあさんの寝間着を着た誰かが横たわっていた。'},
  ], null, ()=>{ GT.injectSceneAfterCurrent({type:'qte'}); GT.advanceScene(); });
});

/* ============================ 結末 =====================================
   戦いのあとの場面（部屋の中・会話だけ） → ページをめくる
   → 外の場面（別のステージ 'epilogue'：近道なら夕暮れ、遠回りなら夜明け）。
     少年が自分で歩いて、マリや、助かった人たちに話しかける。マリと話し終えると → エンディングの画面
   エンディングは3つ：
     true   … 近道で先回りし、二人とも助けた            「分けあったカスタード」
     normal … 遠回り。赤ずきんは助けたが、おばあさんは…  「残された肩掛け」
     bad    … QTE に失敗し、だれも助けられなかった      「ベッドの上の赤い頭巾」
   名前は、それぞれの結末で最後に残ったもの（三人で分けたカスタード／肩掛け／赤い頭巾）。
   ======================================================================= */
const ENDINGS={
  true:  { mark:'A', title:'分けあったカスタード' },
  normal:{ mark:'B', title:'残された肩掛け' },
  bad:   { mark:'C', title:'ベッドの上の赤い頭巾' },
};
GT.ENDINGS=ENDINGS;   // 本の第一章のとびらで、見たエンディングの名前を出すのに使う
const ending={ kind:'true', hoodIn:false, hoodInT:0, epilogue:false, card:false, cardT:0 };
GT.defineStage('ending_room', { label:'第一章 ── おばあさんの家', platforms:[], boxes:[], enemies:[] });
GT.registerAct('end-hood-in', ()=>{ ending.hoodIn=true; ending.hoodInT=performance.now(); GT.holdDialogue(()=>performance.now()-ending.hoodInT>700); });   // 赤ずきんが入ってくるまで、会話の枠を消して見せる
// 近道で昼のうちに着いたら、外に出るのは夕暮れ。遠回りで夕方に着いたら、一夜明けて夜明け
const epilogueDusk=()=>GT.flags.route==='shortcut';
const isEpi=()=>GT.scene&&GT.scene.id==='epilogue';
GT.registerAct('end-card',    ()=>{ ending.card=true; ending.cardT=performance.now(); GT.setHudStage('第一章・完'); });

const AFTER={
  // 結末A：赤ずきんの来かたは、少年が狼のことを伝えていたか（flags.warnedHood）で変わる
  true:f=>[
    ...(f.warnedHood ? [
      // 伝えていた：赤ずきんも胸さわぎがして、急いで来た
      {s:'',c:'narr',t:'戸口で、ぱたぱたと足音がした。',act:'end-hood-in'},
      {s:'赤ずきん',c:'hood',f:'smile',t:'おばあちゃん！　……よかった、無事で。'},
      {s:'赤ずきん',c:'hood',t:'あなたに言われてから、ずっと胸がどきどきしてたの。……気がついたら、走ってた。'},
      {s:'',c:'narr',t:'少年は何も言わない。ただ、頷く。'},
      {s:'おばあさん',c:'granny',t:'おやおや、そんなに息を切らして。……それは、カスタードかい。'},
      {s:'赤ずきん',c:'hood',f:'smile',t:'うん！　バターの小瓶も。……ちょっと、揺れちゃったけど。'},
    ] : [
      // 伝えていなかった：赤ずきんは何も知らずに、のんびり来る
      {s:'',c:'narr',t:'戸口から、鼻歌が聞こえてきた。',act:'end-hood-in'},
      {s:'赤ずきん',c:'hood',t:'おばあちゃん、来たよ！　カスタードとバターの小瓶を……'},
      {s:'',c:'narr',t:'赤ずきんが、床に倒れた狼を見て、目をまるくする。'},
      {s:'赤ずきん',c:'hood',f:'surprise',t:'……狼さん？　どうして、ここに……'},
      {s:'おばあさん',c:'granny',t:'この狼が、わたしを食べようとしたんだよ。この子が、助けてくれたんだ。'},
      {s:'赤ずきん',c:'hood',f:'surprise',t:'……そんな。わたし、狼さんに、お家の場所を教えちゃった……'},
      {s:'',c:'narr',t:'少年は、首を横にふった。'},
      {s:'おばあさん',c:'granny',t:'いいんだよ。こうして、みんな無事だったんだから。……さあ、それはカスタードかい。'},
      {s:'赤ずきん',c:'hood',t:'……うん。バターの小瓶も。'},
    ]),
    {s:'',c:'narr',t:'三人は、暖炉のそばで食べ物を分けあった。'},
    {s:'',c:'narr',t:'赤ずきんが持ってきたカスタードとバターの小瓶。温かな部屋に、穏やかな時間が流れている。'},
    {s:'赤ずきん',c:'hood',t:'……森って、怖いところもあるんだね。'},
    {s:'赤ずきん',c:'hood',t:'狼さん、あんなに親切そうだったのに。'},
    {s:'赤ずきん',c:'hood',t:'でも、今日はあなたがいてくれた。……ありがとう。'},
    {s:'',c:'narr',t:'――少年は、間に合った。赤ずきんも、おばあさんも、無事だった。'},
  ],
  normal:[
    {s:'赤ずきん',c:'hood',t:'……ありがとう。あなたが来てなかったら、わたし……'},
    {s:'',c:'narr',t:'少年は何も言わない。ただ、頷く。'},
    {s:'',c:'narr',t:'赤ずきんが、空っぽのベッドを見つめる。'},
    {s:'赤ずきん',c:'hood',f:'surprise',t:'……おばあちゃんは？　ねえ、おばあちゃんは、どこ……？'},
    {s:'',c:'narr',t:'ベッドのそばに、おばあさんの肩掛けが落ちていた。まだ、少しだけ温かい。'},
    {s:'赤ずきん',c:'hood',t:'……遠回りなんて、しなければよかった。'},
    {s:'',c:'narr',t:'少年は、答えられなかった。'},
    {s:'赤ずきん',c:'hood',t:'……ううん。あなたのせいじゃない。わたしが、狼さんに、お家の場所を教えたから。'},
    {s:'',c:'narr',t:'赤ずきんは、肩掛けを胸に抱いた。暖炉の火だけが、変わらずに燃えている。'},
    {s:'',c:'narr',t:'――少年は、赤ずきんを守った。でも、おばあさんには、間に合わなかった。'},
  ],
  bad:[
    {s:'',c:'narr',t:'狼は倒れた。'},
    {s:'',c:'narr',t:'だが、赤ずきんも、おばあさんも、もうどこにもいない。'},
    {s:'',c:'narr',t:'ベッドの上には、赤い頭巾だけが静かに残されていた。'},
    {s:'',c:'narr',t:'床に転がったかごの中で、カスタードとバターの小瓶が、手つかずのまま残っている。'},
    {s:'',c:'narr',t:'少年は、頭巾を手に取った。'},
    {s:'',c:'narr',t:'――赤ずきんは、狼に食べられてしまった。'},
  ],
};
// 部屋の場面の終わり（このあとページがめくれて、外の場面へ）
const BOOK_GLOW={
  true:  {s:'',c:'narr',t:'手の中の本が、熱を帯びる。白いページに、文字がひとりでに書かれていく。'},
  normal:{s:'',c:'narr',t:'手の中の本が、熱を帯びる。白いページに、文字がひとりでに書かれていく。'},
  bad:   {s:'',c:'narr',t:'手の中の本が、冷たく重い。白いページに、文字がひとりでに書かれていく。'},
};
// 外の場面のはじめの語り
const OUTSIDE={
  true:  '……気がつくと、少年は家の外にいた。日が傾き、空が夕焼けに染まりはじめている。',
  normal:'……気がつくと、少年は家の外にいた。夜が、明けはじめている。',
  bad:   '……気がつくと、少年は家の外にいた。夜が、明けようとしていた。',
};
// マリと話す（話し終えると、エンディングの画面）
const EPILOGUE={
  true:[
    {s:'マリ',c:'mari',t:'おかえり。'},
    {s:'マリ',c:'mari',t:'……うん。ちゃんと見て、ちゃんと話したね。'},
    {s:'マリ',c:'mari',t:'ほら。一話ぶん、埋まった。'},
    {s:'',c:'narr',t:'少年が本を開く。虫食いだったページが、文字と絵で埋まっていた。'},
    {s:'マリ',c:'mari',t:'でも、本はまだずっと続いてる。……次のお話も、白いままだよ。'},
    {s:'マリ',c:'mari',t:'次のお話も、ここで待ってる。'},
  ],
  normal:[
    {s:'マリ',c:'mari',t:'おかえり。'},
    {s:'マリ',c:'mari',t:'……そっか。ひとりは、間に合わなかったんだね。'},
    {s:'マリ',c:'mari',t:'ページは埋まったよ。……でも、これで決まりじゃない。'},
    {s:'',c:'narr',t:'少年が本を開く。最後のページに、このお話の結末が書きこまれていた。'},
    {s:'マリ',c:'mari',t:'お話はね、書き直せるの。あなたが、ちがう道を選べば。'},
    {s:'マリ',c:'mari',t:'……どこで、どの道を選べば、ふたりとも助けられるんだろうね。'},
  ],
  bad:[
    {s:'マリ',c:'mari',t:'……おかえり。'},
    {s:'マリ',c:'mari',t:'……つらかったね。'},
    {s:'マリ',c:'mari',t:'ページは埋まった。……でもね、これで終わりじゃないよ。'},
    {s:'マリ',c:'mari',t:'このお話は、まだ変えられる。あなたはもう知ってるから。どこで、手を伸ばせばいいか。'},
    {s:'マリ',c:'mari',t:'……もう一度、行ってみる？'},
  ],
};

GT.registerDynamic('result', ()=>{
  GT.loadStageDef(GT.STAGE_DEFS['ending_room']); GT.mode='idle';
  GT.player.x=430; GT.player.y=H-EDGE-GT.player.h; GT.player.facing=-1;
  GT.setHudStage('第一章 ── おばあさんの家');
  const flags=GT.flags;
  const hoodSaved = flags.saved!==false;
  const grannySaved = (flags.route==='shortcut') && hoodSaved;   // おばあさんが助かるのは近道のときだけ
  flags.grannyAlive = grannySaved;
  Object.assign(ending,{ kind: grannySaved?'true':hoodSaved?'normal':'bad', hoodIn:false, hoodInT:0, epilogue:false, card:false, cardT:0 });
  flags.ending=ending.kind;
  GT.recordEnding&&GT.recordEnding(ending.kind);   // 見たエンディングとして記録（本の第一章のとびらに出る）

  GT.fillPage('granny', grannySaved
    ? '――おばあさんは無事だった。少年が、狼より先に家へ着いたから。'
    : (flags.route==='shortcut'
        ? '――おばあさんを救えなかった。'
        : '――家に着いたとき、おばあさんの姿は、もうどこにもなかった。'));
  const hoodLine = hoodSaved ? '赤ずきん：救えた' : '赤ずきん：救えなかった';
  const grannyLine = grannySaved ? 'おばあさん：救えた' : 'おばあさん：救えなかった';
  let resultText;
  if(hoodSaved && grannySaved) resultText = '――少年は、間に合った。赤ずきんも、おばあさんも、無事だった。';
  else if(hoodSaved && !grannySaved) resultText = '――少年は、赤ずきんを守った。でも、おばあさんには、間に合わなかった。';
  else resultText = '――赤ずきんは、狼に食べられてしまった。';
  GT.fillPage('result', resultText);   // （「赤ずきん：救えた」などの行は、本には書かない。文字を少なく）
  ending.summary = hoodLine+'　／　'+grannyLine;

  const after = typeof AFTER[ending.kind]==='function' ? AFTER[ending.kind](flags) : AFTER[ending.kind];
  GT.beginDialogue(after.concat([BOOK_GLOW[ending.kind]]),null,()=>{ GT.hideDialogue(); GT.storyPiece&&GT.storyPiece('granny','granny:story'); GT.mode='play'; GT.openExit&&GT.openExit(); });   // かけらが本へ飛んだら、自分で右の端へ（外の場面へ）   // かけらが本へ飛んでから、ページをめくって外の場面へ
});

/* ---- 外の場面（epilogue）：少年が歩いて、自分で話しかける ---- */
// 助かった人たちのセリフ（話しかけても右端は開かない。マリと話すと終わる）
const OUT_TALK={
  hood:{
    true:f=>[
      {s:'赤ずきん',c:'hood',f:'smile',t:'夕焼け、きれいだね。……あなたがいなかったら、今日のこの空、見られなかったかも。'},
      ...(f.warnedHood?[{s:'赤ずきん',c:'hood',t:'森であなたが教えてくれたこと、ずっと忘れない。'}]
                     :[{s:'赤ずきん',c:'hood',t:'狼さんに道を教えちゃったこと、後悔してる……。'}]),
      {s:'赤ずきん',c:'hood',t:'今度は、ちゃんと道を守って来る。……また、会えるといいな。'},
    ],
    normal:()=>[
      {s:'',c:'narr',t:'赤ずきんは、おばあさんの肩掛けを胸に抱いている。'},
      {s:'赤ずきん',c:'hood',t:'……ひと晩じゅう、眠れなかった。肩掛け、まだ少しだけ、おばあちゃんのにおいがする。'},
      {s:'赤ずきん',c:'hood',t:'……あなたは、行っちゃうの？　……そっか。'},
      {s:'赤ずきん',c:'hood',t:'来てくれて、ありがとう。それだけは、ほんとうだから。'},
    ],
  },
  granny:{
    true:()=>[
      {s:'おばあさん',c:'granny',t:'外の風は気持ちいいねえ。……生きてるって、いいもんだ。'},
      {s:'おばあさん',c:'granny',t:'カスタード、まだ残ってるよ。……ほら、あんたの分。'},
      {s:'おばあさん',c:'granny',t:'その本、大事にするんだよ。……なんだか、あんたにとって大切なものに見えるからね。'},
    ],
  },
};
// 外の場面の地形：両はしに木、手前に草や葉（ほかのステージと同じく、影を落とす）。人物（x 300〜430）にはかからない
// 奥の木・茂みは、手前の丘の上に立つので、丘といっしょに drawEpilogueNear が描く（decor の 'back' だと丘より先に描かれ、根元が丘に隠れる）
const EPI_BACK_DECOR=[
  {kind:'tree',  x:-34, y:150, w:120, h:316},
  {kind:'tree',  x:772, y:120, w:140, h:346},
  {kind:'tree',  x:690, y:250, w:84,  h:216},
  {kind:'bush',  x:548, y:424, w:92,  h:44},
  {kind:'bush',  x:66,  y:428, w:70,  h:38},
];
GT.defineStage('epilogue_out', { label:'第一章 ── 外', platforms:[], boxes:[], enemies:[],
  decor:[
    {layer:'front', kind:'fern',  x:-14, y:392, w:96,  h:78},
    {layer:'front', kind:'grass', x:200, y:436, w:64,  h:30},
    {layer:'front', kind:'grass', x:604, y:436, w:70,  h:30},
    {layer:'front', kind:'fern',  x:828, y:396, w:90,  h:74},
  ] });
// 外の場面で、だれがどこにいるか（いない人は x=-300 で隠す）
GT.registerAct('epi-setup',()=>{
  const f=GT.flags, kind=ending.kind, npcs=GT.getNpcs(), get=w=>npcs.find(n=>n.who===w);
  ending.epilogue=true; ending.card=false;
  GT.setHudStage(epilogueDusk()?'第一章 ── 夕暮れ':'第一章 ── 夜明け');
  const h=get('hood'), g=get('granny'), m=get('mari');
  if(h){ if(kind==='bad'){ h.x=-300; } else { h.x=kind==='true'?400:330; h.lines=OUT_TALK.hood[kind](f);
    h.onEnd=()=>{ setTimeout(backToMari,60); }; } }   // 話し終えたら、少年がひとこと
  if(g){ if(kind==='true'){ g.x=300; g.lines=OUT_TALK.granny.true(f); } else g.x=-300; }
});
GT.registerSceneReset(()=>{ if(isEpi()){ ending.epilogue=true; ending.card=false; } else if(GT.scene&&GT.scene.type!=='end'){ ending.epilogue=false; ending.card=false; } });
/* ---- 外の景色（epilogue）：絵本の一枚絵のように ----
   夕暮れ（二人とも助けた結末）／夜明け（おばあさんを救えなかった）／沈んだ夜明け（赤ずきんも救えなかった）で、色と動くものが変わる。
   奥から：空 → 星 → 太陽（光の輪と、ゆっくり回る光の筋）→ 雲 → 遠い丘・丘の上の森 → おばあさんの家（煙突の煙・窓の明かり）
          → 家から手前へのびる道・草地と花 → 鳥・ホタル（夕暮れ）／朝もや（夜明け）
   動かない部分（空・丘・家・道・草地）は、結末ごとに一度だけ描いて取っておく（毎フレーム描かない） */
const EPI_PAL={
  true:  { sky:[[0,'#3b3263'],[0.32,'#7c5a8c'],[0.6,'#d7806a'],[0.8,'#f2ad66'],[1,'#f9d892']],
           sun:'#ffd27a', glow:'255,196,110', meadow:['#6d7a44','#4e5a32'], rim:'255,200,120',
           cloud:'#c98a9a', cloudLit:'255,214,150', path:'#d9b07a', wall:'#e2c9a0', roof:'#8a3f36', light:true, birds:true, stars:0.5, fly:true },
  normal:{ sky:[[0,'#283561'],[0.35,'#5e6896'],[0.62,'#c995a2'],[0.82,'#efc59e'],[1,'#f7e3b9']],
           sun:'#fff0c0', glow:'255,226,170', meadow:['#5b7350','#405440'], rim:'255,230,180',
           cloud:'#a99ab4', cloudLit:'255,226,190', path:'#cdb38c', wall:'#d6c6aa', roof:'#7a4a44', light:true, birds:true, stars:0.8, mist:true },
  bad:   { sky:[[0,'#252a3e'],[0.4,'#4c5268'],[0.7,'#8c8592'],[1,'#c4b7a6']],
           sun:'#e6dccb', glow:'225,215,200', meadow:['#4f584a','#3c4438'], rim:'220,214,200',
           cloud:'#8a8696', cloudLit:'220,212,200', path:'#a89c88', wall:'#b9ae9c', roof:'#5e4a46', light:false, birds:false, stars:0.6, mist:true },
};
const EPI_SUN={x:575, y:390, r:32}, EPI_HORIZON=406,   // 太陽は、手前の丘（家のある草地）のうしろに半分しずむ
      EPI_HOUSE={x:122, base:380};
const epiCache={};   // 結末ごとの、動かない部分の絵 {sky, land}
const eRnd=i=>{ const v=Math.sin(i*91.7+17.3)*43758.5453; return v-Math.floor(v); };
function epiSky(P){
  const cv=document.createElement('canvas'); cv.width=W; cv.height=H; const c=cv.getContext('2d');
  const g=c.createLinearGradient(0,0,0,EPI_HORIZON); for(const [o,col] of P.sky) g.addColorStop(o,col);
  c.fillStyle=g; c.fillRect(0,0,W,H);
  const h=c.createRadialGradient(EPI_SUN.x,EPI_HORIZON,10,EPI_SUN.x,EPI_HORIZON,520);       // 地平線の、太陽のまわりの明るみ
  h.addColorStop(0,`rgba(${P.glow},0.55)`); h.addColorStop(1,`rgba(${P.glow},0)`); c.fillStyle=h; c.fillRect(0,0,W,H);
  return cv;
}
// 手前の丘（家・道・草地・花）
function epiNear(P,kind){
  const cv=document.createElement('canvas'); cv.width=W; cv.height=H; const c=cv.getContext('2d'), FL=H-EDGE;
  // 手前の丘（家が建っている、なだらかな丘）
  c.beginPath(); c.moveTo(0,H); c.lineTo(0,EPI_HOUSE.base-8);
  c.bezierCurveTo(140,EPI_HOUSE.base-16, 300,EPI_HOUSE.base+6, 470,EPI_HOUSE.base+22);
  c.bezierCurveTo(640,EPI_HOUSE.base+36, 780,EPI_HOUSE.base+26, W,EPI_HOUSE.base+30); c.lineTo(W,H); c.closePath();
  const mg=c.createLinearGradient(0,EPI_HOUSE.base-16,0,FL); mg.addColorStop(0,P.meadow[0]); mg.addColorStop(1,P.meadow[1]); c.fillStyle=mg; c.fill();
  c.strokeStyle=`rgba(${P.rim},0.4)`; c.lineWidth=1.2; c.beginPath(); c.moveTo(0,EPI_HOUSE.base-8);
  c.bezierCurveTo(140,EPI_HOUSE.base-16, 300,EPI_HOUSE.base+6, 470,EPI_HOUSE.base+22); c.bezierCurveTo(640,EPI_HOUSE.base+36, 780,EPI_HOUSE.base+26, W,EPI_HOUSE.base+30); c.stroke();
  // 家の戸口から、手前へのびる道（遠くは細く、手前は広く）
  const dx=EPI_HOUSE.x+44, dy=EPI_HOUSE.base;
  c.beginPath(); c.moveTo(dx-5,dy); c.bezierCurveTo(dx+30,dy+30, 330,FL-40, 470,FL);
  c.lineTo(600,FL); c.bezierCurveTo(400,FL-44, dx+40,dy+26, dx+5,dy); c.closePath();
  const pg=c.createLinearGradient(0,dy,0,FL); pg.addColorStop(0,P.path); pg.addColorStop(1,P.path); c.globalAlpha=0.75; c.fillStyle=pg; c.fill(); c.globalAlpha=1;
  c.strokeStyle='rgba(90,66,40,0.35)'; c.lineWidth=1; c.stroke();
  for(let i=0;i<24;i++){ const u=eRnd(i+40), x=dx+(500-dx)*u+(eRnd(i+70)-0.5)*40*u, y=dy+(FL-dy)*u;   // 道の小石
    c.beginPath(); c.ellipse(x,y,1+u*2.4,0.6+u*1.2,0,0,Math.PI*2); c.fillStyle='rgba(110,90,64,0.45)'; c.fill(); }
  // 草地の、草の筆あと
  for(let i=0;i<160;i++){ const x=eRnd(i)*W, y=EPI_HOUSE.base+10+eRnd(i+300)*(FL-EPI_HOUSE.base-10), s=0.5+(y-EPI_HOUSE.base)/(FL-EPI_HOUSE.base);
    c.strokeStyle=eRnd(i+5)<0.5?'rgba(40,52,26,0.35)':`rgba(${P.rim},0.18)`; c.lineWidth=0.9;
    c.beginPath(); c.moveTo(x,y); c.lineTo(x+(eRnd(i+8)-0.5)*4*s,y-6*s); c.stroke(); }
  // 小さな花（遠くは小さく）
  const fc = kind==='bad' ? ['#cfc6b4','#a9a294'] : ['#f3ead0','#e8c35a','#d98aa8','#c9b0e0'];
  for(let i=0;i<46;i++){ const x=eRnd(i+500)*W, y=EPI_HOUSE.base+20+eRnd(i+600)*(FL-EPI_HOUSE.base-24); if(x>dx-10&&x<560&&y>dy+(x-dx)*0.35) continue;
    const s=0.6+(y-EPI_HOUSE.base)/(FL-EPI_HOUSE.base)*1.4; c.beginPath(); c.arc(x,y,1.3*s,0,Math.PI*2); c.fillStyle=fc[i%fc.length]; c.fill(); }
  epiHouse(c,P);
  return cv;
}
// おばあさんの家：木組みの壁・とんがり屋根（こけら板）・煙突・戸・窓・柵
function epiHouse(c,P){
  const x=EPI_HOUSE.x, b=EPI_HOUSE.base, w=88, wh=50, top=b-wh, INK='rgba(58,40,24,0.85)';
  c.save(); c.lineJoin='round';
  c.beginPath(); c.ellipse(x+w/2+8,b+2,w*0.62,5,0,0,Math.PI*2); c.fillStyle='rgba(30,22,14,0.25)'; c.fill();   // 足もとの影
  // 壁（太陽は右下から：右の壁が明るい）
  const wg=c.createLinearGradient(x,0,x+w,0); wg.addColorStop(0,'rgba(0,0,0,0.12)'); wg.addColorStop(1,'rgba(255,230,180,0.12)');
  c.fillStyle=P.wall; c.fillRect(x,top,w,wh); c.fillStyle=wg; c.fillRect(x,top,w,wh);
  c.strokeStyle='rgba(92,64,40,0.85)'; c.lineWidth=2.2;                                                       // 木組み
  c.strokeRect(x,top,w,wh); c.beginPath(); c.moveTo(x,top+wh*0.45); c.lineTo(x+w,top+wh*0.45);
  c.moveTo(x+w*0.3,top); c.lineTo(x+w*0.3,b); c.moveTo(x+w*0.72,top); c.lineTo(x+w*0.72,b);
  c.moveTo(x,top); c.lineTo(x+w*0.3,top+wh*0.45); c.moveTo(x+w,top); c.lineTo(x+w*0.72,top+wh*0.45); c.stroke();
  // 煙突
  c.fillStyle='#8a6a58'; c.fillRect(x+w*0.68,top-40,12,30); c.strokeStyle=INK; c.lineWidth=1.3; c.strokeRect(x+w*0.68,top-40,12,30);
  c.fillStyle='#6e5446'; c.fillRect(x+w*0.68-2,top-43,16,4);
  // 屋根（こけら板の段）
  c.beginPath(); c.moveTo(x-12,top+2); c.lineTo(x+w/2,top-44); c.lineTo(x+w+12,top+2); c.closePath();
  const rg=c.createLinearGradient(x,top-44,x+w,top); rg.addColorStop(0,P.roof); rg.addColorStop(1,'rgba(255,200,140,0.0)');
  c.fillStyle=P.roof; c.fill(); c.fillStyle='rgba(255,210,150,0.10)'; c.fill(); c.strokeStyle=INK; c.lineWidth=1.6; c.stroke();
  c.save(); c.clip(); c.strokeStyle='rgba(40,20,14,0.35)'; c.lineWidth=1;
  for(let k=1;k<6;k++){ const y=top+2-k*8; c.beginPath(); c.moveTo(x-14,y); c.lineTo(x+w+14,y); c.stroke();
    for(let sx=x-12+(k%2)*5;sx<x+w+12;sx+=10){ c.beginPath(); c.moveTo(sx,y); c.lineTo(sx,y+8); c.stroke(); } }
  c.restore();
  // 戸（木の板・取っ手）と、窓（十字の桟）
  c.fillStyle='#6a4a32'; c.fillRect(x+w*0.38,b-30,16,30); c.strokeStyle=INK; c.lineWidth=1.2; c.strokeRect(x+w*0.38,b-30,16,30);
  c.fillStyle='#d9b25e'; c.beginPath(); c.arc(x+w*0.38+12,b-15,1.4,0,Math.PI*2); c.fill();
  for(const wx of [x+10, x+w-26]){ c.fillStyle=P.light?'#ffcf72':'#4a4650'; c.fillRect(wx,top+8,16,14);
    c.strokeStyle=INK; c.lineWidth=1.3; c.strokeRect(wx,top+8,16,14); c.beginPath(); c.moveTo(wx+8,top+8); c.lineTo(wx+8,top+22); c.moveTo(wx,top+15); c.lineTo(wx+16,top+15); c.stroke();
    c.fillStyle='#7a3b32'; c.fillRect(wx-2,top+22,20,3); }                                   // 窓の下の花箱
  // 柵（家の左右）
  c.strokeStyle='rgba(92,70,46,0.9)'; c.lineWidth=1.6;
  for(const [x0,x1] of [[x-40,x-6],[x+w+8,x+w+44]]){ for(let px=x0;px<=x1;px+=8){ c.beginPath(); c.moveTo(px,b+2); c.lineTo(px,b-12); c.stroke(); }
    c.beginPath(); c.moveTo(x0-2,b-8); c.lineTo(x1+2,b-8); c.moveTo(x0-2,b-3); c.lineTo(x1+2,b-3); c.stroke(); }
  c.restore();
}
function epiCloud(x,y,s,P,t){
  ctx.save(); ctx.translate(x,y); ctx.scale(s,s);
  const parts=[[0,0,38,13],[-30,4,24,10],[30,3,28,11],[-8,-9,22,11],[16,-7,20,9]];
  for(const [px,py,rx,ry] of parts){ ctx.beginPath(); ctx.ellipse(px,py,rx,ry,0,0,Math.PI*2); ctx.fillStyle=P.cloud; ctx.globalAlpha=0.55; ctx.fill(); }
  ctx.globalAlpha=0.6; ctx.fillStyle=`rgba(${P.cloudLit},0.9)`;                              // 太陽の側（下・右）のふちが光る
  for(const [px,py,rx,ry] of parts){ ctx.beginPath(); ctx.ellipse(px+3,py+4,rx*0.85,ry*0.55,0,0,Math.PI); ctx.fill(); }
  ctx.restore();
}
function epiNow(){ const kind=EPI_PAL[ending.kind]?ending.kind:'true', P=EPI_PAL[kind];
  return epiCache[kind]||(epiCache[kind]={ sky:epiSky(P), near:epiNear(P,kind) }); }
function drawEpilogue(){
  if(!isEpi()) return;
  const kind=EPI_PAL[ending.kind]?ending.kind:'true', P=EPI_PAL[kind], t=performance.now()/1000, FL=H-EDGE;
  const C=epiNow();
  ctx.save();
  ctx.drawImage(C.sky,0,0);
  // 星（空の上のほう。またたく）
  for(let i=0;i<36;i++){ const x=eRnd(i+900)*W, y=eRnd(i+950)*170, a=P.stars*(1-y/190)*(0.45+0.55*Math.sin(t*(1.2+eRnd(i)*1.6)+i));
    if(a<=0.02) continue; ctx.globalAlpha=a; ctx.fillStyle='#fff6dc'; ctx.beginPath(); ctx.arc(x,y,0.7+eRnd(i+3)*1.1,0,Math.PI*2); ctx.fill(); }
  ctx.globalAlpha=1;
  // 太陽：大きな光の輪と、ゆっくり回る光の筋（丘のうしろに半分しずむ）
  const S=EPI_SUN, pulse=0.5+0.5*Math.sin(t*0.9);
  const sg=ctx.createRadialGradient(S.x,S.y,S.r*0.6,S.x,S.y,S.r*5.5); sg.addColorStop(0,`rgba(${P.glow},${0.55+0.1*pulse})`); sg.addColorStop(1,`rgba(${P.glow},0)`);
  ctx.fillStyle=sg; ctx.beginPath(); ctx.arc(S.x,S.y,S.r*5.5,0,Math.PI*2); ctx.fill();
  // 光の筋：太陽のそばは太く、外へ行くほど細くとがる（長い筋と短い筋を交互に）。外ほどうすい
  const rg=ctx.createRadialGradient(S.x,S.y,S.r,S.x,S.y,S.r*6.5);
  rg.addColorStop(0,`rgba(${P.glow},${0.5+0.1*pulse})`); rg.addColorStop(0.5,`rgba(${P.glow},${0.18+0.05*pulse})`); rg.addColorStop(1,`rgba(${P.glow},0)`);
  ctx.save(); ctx.translate(S.x,S.y); ctx.rotate(t*0.03); ctx.translate(-S.x,-S.y); ctx.fillStyle=rg;
  for(let i=0;i<16;i++){ const a=i/16*Math.PI*2, L=S.r*(i%2?4.2:6.5), w=i%2?0.12:0.17;   // w … 根もとの太さ（角度）
    ctx.beginPath(); ctx.moveTo(S.x+Math.cos(a-w)*S.r*1.05, S.y+Math.sin(a-w)*S.r*1.05);
    ctx.lineTo(S.x+Math.cos(a)*L, S.y+Math.sin(a)*L);                                  // 先は、とがる
    ctx.lineTo(S.x+Math.cos(a+w)*S.r*1.05, S.y+Math.sin(a+w)*S.r*1.05); ctx.closePath(); ctx.fill(); }
  ctx.restore();
  // 太陽の円：白いふちの線は描かず、まん中から外へ、やわらかくぼける光の玉に
  const sd=ctx.createRadialGradient(S.x,S.y,0,S.x,S.y,S.r*1.25);
  sd.addColorStop(0,'rgba(255,253,242,1)'); sd.addColorStop(0.5,'rgba(255,246,214,1)'); sd.addColorStop(0.72,P.sun); sd.addColorStop(0.86,`rgba(${P.glow},0.6)`); sd.addColorStop(1,`rgba(${P.glow},0)`);
  ctx.beginPath(); ctx.arc(S.x,S.y,S.r*1.25,0,Math.PI*2); ctx.fillStyle=sd; ctx.fill();
  const st=ctx.createLinearGradient(S.x-260,0,S.x+260,0); st.addColorStop(0,`rgba(${P.glow},0)`); st.addColorStop(0.5,`rgba(255,248,225,${0.55+0.15*pulse})`); st.addColorStop(1,`rgba(${P.glow},0)`);
  ctx.fillStyle=st; ctx.fillRect(S.x-260,EPI_HORIZON-4,520,3);                                  // 地平線に、太陽の光の線
  // 雲（ゆっくり流れる）
  for(const [x0,y,s,v] of [[120,96,1.1,5],[430,64,0.8,3.5],[640,150,1.25,4.2],[860,110,0.9,6]]){
    const x=((x0+t*v)%(W+200))-100; epiCloud(x,y,s,P,t); }
  // 鳥（遠くを、羽ばたきながら）
  if(P.birds) for(let i=0;i<4;i++){ const x=((i*230+t*(18+i*3))%(W+120))-60, y=170+i*18+Math.sin(t*0.7+i)*8, f=Math.sin(t*7+i*1.7)*3.2;
    ctx.strokeStyle='rgba(50,36,40,0.7)'; ctx.lineWidth=1.3; ctx.beginPath(); ctx.moveTo(x-6,y-f); ctx.quadraticCurveTo(x-3,y-2,x,y); ctx.quadraticCurveTo(x+3,y-2,x+6,y-f); ctx.stroke(); }
  // 朝もや（夜明け）：手前の丘のうしろを、ゆっくり流れる
  if(P.mist) for(let i=0;i<5;i++){ const x=((i*230+t*8)%(W+300))-150, y=EPI_HORIZON-4+i%2*8;
    const g=ctx.createRadialGradient(x,y,4,x,y,150); g.addColorStop(0,'rgba(240,236,232,0.28)'); g.addColorStop(1,'rgba(240,236,232,0)');
    ctx.fillStyle=g; ctx.beginPath(); ctx.ellipse(x,y,150,22,0,0,Math.PI*2); ctx.fill(); }
  ctx.restore();
}
/* 手前の丘（家・道・草地）と、その上に立つ木・茂み：ほかのステージの木と同じ「奥の物」の層（'back'）に描く。
   → 丘と家と木は、右上に影を落とす。人物の影は、丘や木の上では近く・濃く、丘の向こう（空・遠い丘）では遠く・うすく落ちる */
function drawEpilogueNear(){
  if(!isEpi()) return;
  ctx.drawImage(epiNow().near,0,0);
  if(window.GTDecor){ const dim=GT.isBright&&!GT.isBright(); ctx.save(); if(dim) ctx.filter='saturate(0.4) brightness(0.55)';   // 暗い場面では、ほかの飾りと同じく色をおさえる
    for(const d of EPI_BACK_DECOR) GTDecor.draw(ctx,d.kind,d.x,d.y,d.w,d.h); ctx.restore(); }
}
/* 煙突の煙・窓の明かり・ホタル：影を落とさない（'backflat'。丘と木の上に描く） */
function drawEpilogueFx(){
  if(!isEpi()) return;
  const kind=EPI_PAL[ending.kind]?ending.kind:'true', P=EPI_PAL[kind], t=performance.now()/1000, FL=H-EDGE;
  ctx.save();
  // 煙突の煙と、窓の明かり（救えなかった結末では、どちらもない）
  const hx=EPI_HOUSE.x, hb=EPI_HOUSE.base, top=hb-50;
  if(P.light){
    for(let i=0;i<6;i++){ const k=(t*0.22+i/6)%1, sx=hx+88*0.68+6+Math.sin(k*6+i)*6*k+k*26, sy=top-44-k*90;
      ctx.globalAlpha=0.32*(1-k); ctx.fillStyle='#e8e0d6'; ctx.beginPath(); ctx.ellipse(sx,sy,5+k*12,4+k*8,0,0,Math.PI*2); ctx.fill(); }
    const fl=0.75+0.15*Math.sin(t*5)+0.1*Math.sin(t*13);
    for(const wx of [hx+10, hx+88-26]){ const g=ctx.createRadialGradient(wx+8,top+15,2,wx+8,top+15,26);
      g.addColorStop(0,`rgba(255,200,110,${0.55*fl})`); g.addColorStop(1,'rgba(255,200,110,0)'); ctx.globalAlpha=1; ctx.fillStyle=g; ctx.fillRect(wx-20,top-10,56,50); }
  }
  ctx.globalAlpha=1;
  // ホタル（夕暮れ）：草地の上を、ふわふわ
  if(P.fly) for(let i=0;i<12;i++){ const x=(eRnd(i+70)*W+Math.sin(t*0.6+i)*30+W)%W, y=FL-30-eRnd(i+80)*70+Math.sin(t*0.9+i*2)*10, a=0.5+0.5*Math.sin(t*2.4+i*1.3);
    const g=ctx.createRadialGradient(x,y,0.5,x,y,7); g.addColorStop(0,`rgba(255,240,160,${0.9*a})`); g.addColorStop(1,'rgba(255,240,160,0)');
    ctx.fillStyle=g; ctx.beginPath(); ctx.arc(x,y,7,0,Math.PI*2); ctx.fill(); }
  ctx.restore();
}
// 空と遠い丘は、いちばん奥（影を落とさない・影の受け手にもならない層）に描く。
// （'back' に描くと、画面いっぱいの半透明の空が「奥の物」あつかいになり、人物の影が近い影と遠い影の二重になっていた）
GT.registerDraw(drawEpilogue,'backpre');
GT.registerDraw(drawEpilogueNear,'back');
GT.registerDraw(drawEpilogueFx,'backflat');

/* エンディングの画面（最前面） */
function drawEndCard(){
  if(!(isEpi()||(GT.scene&&GT.scene.id==='afterword')) || !ending.card) return;
  const k=Math.min(1,(performance.now()-ending.cardT)/1200), e=ENDINGS[ending.kind];
  ctx.save(); ctx.globalAlpha=k;
  ctx.fillStyle='rgba(20,16,12,0.82)'; ctx.fillRect(0,0,W,H);
  ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillStyle='#b7ab8a'; ctx.font="600 16px 'Cormorant Garamond',serif"; ctx.fillText('G R A V I T Y   T A L E S',W/2,70);
  ctx.fillStyle='#e8dcc0'; ctx.font="700 26px 'Zen Old Mincho',serif"; ctx.fillText('第一章「赤い頭巾」',W/2,110);
  ctx.strokeStyle='rgba(176,141,87,0.6)'; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(W/2-140,138); ctx.lineTo(W/2+140,138); ctx.stroke();
  ctx.fillStyle='#d9b877'; ctx.font="700 15px 'Zen Old Mincho',serif"; ctx.fillText('エンディング '+e.mark,W/2,166);
  ctx.fillStyle='#f3ead0'; ctx.font="700 30px 'Zen Old Mincho',serif"; ctx.fillText('「'+e.title+'」',W/2,204);
  // （「赤ずきん：救えた」などのまとめと、埋まったページの数は出さない）
  ctx.fillStyle='#8a8266'; ctx.font="500 13px 'Zen Old Mincho',serif"; ctx.fillText('〜 おわり 〜',W/2,256);
  ctx.restore();
}
GT.registerDraw(drawEndCard,'overlay');

// --- 到着・結末のシーン登録（並び順は playlist.js） ------------------------
GT.registerScene({ id:'arrive', type:'talk', stage:'wolf_boss', label:'第一章 ── おばあさんの家', dynamic:'arriveHouse' });
GT.registerScene({ id:'ending', type:'end',  label:'第一章 ── 戦いのあと', dynamic:'result' });
// 外の場面：少年が歩いて、マリ（と、助かった人たち）に話しかける。マリと話し終えると、エンディングの画面
GT.registerScene({
  id:'epilogue', type:'story', stage:'epilogue_out', label:'第一章 ── 外',
  shadowScale:0.6,   // 明るい空の上では影が目立ちすぎるので、ほかの場面の 6割の濃さに
  intro:[ {s:'',c:'narr',get t(){ return OUTSIDE[ending.kind]||OUTSIDE.true; }, act:'epi-setup'},
          {s:'',c:'narr',get t(){ return ending.kind==='bad' ? '……そこには、もう誰もいなかった。' : '外には、見知った顔があった。'; }},],
  npcs:[
    { who:'granny', name:'おばあさん', page:'left', x:-300, noExit:true, lines:[{s:'おばあさん',c:'granny',t:'……。'}] },   // セリフは epi-setup で入れる
    { who:'hood',   name:'赤ずきん',   page:'left', x:-300, noExit:true, required:true, lines:[{s:'赤ずきん',c:'hood',t:'……。'}] },   // 話しかけてほしい人（！）。右の端は開かない（マリのページへは、本を開いてもどる）
    // マリは、ここにはいない（次のページ＝はじめの暗い森で待っている）
  ],
});

/* ---- 第一章のあと（afterword）：ページがめくれると、はじめの暗い森。マリが話しかけてくる ---- */
GT.defineStage('afterword', { label:'序章 ── 暗い森', platforms:[], boxes:[], enemies:[],
  decor:[ {layer:'front', kind:'grassFlat', x:466, y:434, w:62, h:30}, {layer:'front', kind:'grassFlat', x:806, y:434, w:56, h:30} ] });
const isAfter=()=>GT.scene&&GT.scene.id==='afterword';
// だれもいない結末：語りが終わったら、少年がひとこと
const epiSay={ said:false };
GT.registerSceneReset(()=>{ if(isEpi()) epiSay.said=false; });
GT.registerUpdate(()=>{ if(!isEpi() || ending.kind!=='bad' || epiSay.said || GT.mode!=='play') return; epiSay.said=true;
  backToMari(); });
/* マリのページ（森の出口）へは、本を開いてもどる。本の「森の小道」のページの「森の出口」から */
function backToMari(){
  GT.mode='idle';
  GT.beginDialogue([{s:'少年',c:'boy',t:'……マリが待っているページに戻ろう。本を開いて、「森の出口」のページへ。'}],null,()=>{ GT.hideDialogue(); GT.mode='play';
    GT.guideToBook&&GT.guideToBook('本を開いて、「森の出口」へ','forest_exit','mari_gate'); });   // 栞の Book と、本の中の「森の出口」のボタンが光る
}
/* 本から「森の出口」へもどるとき：お話を読み終えていれば、マリが待っている森の出口（afterword）へ。いまの分岐のまま */
GT.bookJump=id=>{
  if(id!=='mari_gate' || !GT.flags.ending) return false;
  let idx=GT.SCENES.findIndex(s=>s.id==='afterword');
  if(idx<0){ GT.SCENES=GT.playlist.map(i=>GT.sceneRegistry[i]).filter(Boolean); idx=GT.SCENES.findIndex(s=>s.id==='afterword'); }
  if(idx<0) return false;
  if(GT.hideMenu) GT.hideMenu();
  GT.jumpToScene(idx); return true;
};
const aft={ talked:false, restart:false };
GT.registerSceneReset(()=>{ if(GT.scene&&GT.scene.id==='afterword'){ aft.talked=false; aft.restart=false; } });
GT.registerUpdate(()=>{ if(!(GT.scene&&GT.scene.id==='afterword') || aft.talked || GT.mode!=='play') return;
  const m=GT.getNpcs().find(n=>n.who==='mari'); if(!m) return; aft.talked=true; GT.talkTo(m); });   // 語りが終わったら、マリのほうから話しかけてくる（エンディングのあとのセリフ）
GT.registerAct('after-setup',()=>{
  const m=GT.getNpcs().find(n=>n.who==='mari');
  if(m){ m.lines=EPILOGUE[ending.kind].concat([{s:'',c:'narr',t:'第一章「赤い頭巾」　おわり',act:'end-card'}]); }
});
/* エンディングの画面のあと：画面を消して、マリがもう一度話す。お話を変えたいなら、次のページへ進むと最初から */
const RESTART_TALK=[
  {s:'マリ',c:'mari',t:'……ねえ。もし、お話を変えたいなら。'},
  {s:'マリ',c:'mari',t:'もう一度、次のページへ進んで。そうしたら、お話は、また章のはじまりから始まるよ。'},
  {s:'マリ',c:'mari',t:'今度は、ちがう道を選んでもいい。だれかに、ちがう言葉をかけてもいい。'},
  {s:'マリ',c:'mari',t:'このままでいいなら、本を開いて、読み返してもいいよ。……わたしは、ここで待ってる。'},
  // 本からステージを選んで、やり直せることの説明
  {s:'',c:'narr',t:'本を開くと、ページの下に「このステージから、やり直す」のボタンが並んでいる。'},
  {s:'',c:'narr',t:'ボタンを押すと、そのステージのはじめから、やり直すことができる。そのとき選んでいた道も、そのときのままに戻る。'},
];
function afterEnd(){
  GT.mode='idle';
  setTimeout(()=>{
    ending.card=false;
    const m=GT.getNpcs().find(n=>n.who==='mari');
    if(m){ m.lines=RESTART_TALK.slice(); m.talked=false; m.talkable=true; m.onEnd=()=>{ GT.mode='play'; setTimeout(()=>{ m.talked=false; },0); }; }   // 何度でも話しかけられて、同じ説明
    GT.beginDialogue(RESTART_TALK.slice(),null,()=>{ GT.hideDialogue(); GT.mode='play'; aft.restart=true; });
  },3200);
}
// 次のページ（右の端）へ進むと、お話は最初から
GT.registerUpdate(()=>{
  if(!isAfter() || !aft.restart || GT.mode!=='play') return;
  const pl=GT.player; if(pl.x+pl.w < W-EDGE-6) return;
  aft.restart=false;
  // 章をえらぶ画面から、もう一度（森の出口から めくったときと同じ、光がもれるめくり・曲は頭から・章の名前をペンで書く）
  if(GT.restoreStateOf) GT.restoreStateOf('chapter_select');
  GT.titleChapter=0; GT.mode='idle';
  GT.startPageFlip(1, GT.sceneRegistry.chapter_select);
});
GT.registerDraw(()=>{ if(!isAfter() || !aft.restart || GT.mode!=='play') return;
  const p=0.5+0.5*Math.sin(performance.now()/1000*4);
  ctx.save(); ctx.textAlign='right'; ctx.globalAlpha=0.55+0.45*p; ctx.fillStyle='#d9b877'; ctx.font="700 22px 'Caveat',cursive";
  ctx.fillText('Next page →', W-26, H/2); ctx.restore(); },'overlay');
GT.registerScene({
  id:'afterword', type:'story', stage:'mari_gate', label:'序章 ── 森の出口',   // マリが待っている、森の出口にもどる（stages/02c_mari_gate.js が描く）
  intro:[ {s:'',c:'narr',t:'ページがめくれる。……気がつくと、少年は森の出口に立っていた。',act:'after-setup'},
          {s:'',c:'narr',t:'大きな木の下で、マリが待っていた。'} ],
  npcs:[
    { who:'mari', name:'マリ', page:'right', x:630, noExit:true, required:true,   // 話すとエンディング
      lines:[{s:'マリ',c:'mari',t:'おかえり。'}],
      onEnd:afterEnd },
  ],
});


})();
