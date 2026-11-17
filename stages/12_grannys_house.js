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
let castLast=performance.now();
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
  if(c.hood==='shawl') hoodAt(176,1,()=>{           // おばあさんの肩掛けを抱いている
    ctx.fillStyle='#8a7fa0'; ctx.beginPath(); ctx.ellipse(186,-14,10,7,0.3,0,Math.PI*2); ctx.fill(); });
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
GT.registerSceneType('qte', ()=>{
  GT.loadStageDef(GT.STAGE_DEFS['wolf_boss']); GT.mode='idle'; qteActive=false;
  { const pl=GT.player; pl.x=262; pl.y=H-EDGE-pl.h; pl.facing=-1; }   // 少年は戸口のそば（ベッドのほうを向く）
  GT.setHudStage('第一章 ── ！');
  GT.musicMute && GT.musicMute(true);     // 狼がおばあさんのふりをしているあいだは、BGM を止める（跳ね起きたら流す）
  const lines=[
    {s:'おばあちゃん？',c:'wolf',sc:'granny',f:'disguise',t:'おやおや、よく来たね。カスタードとバターの小瓶は、そこの椅子に置いておくれ。'},
    {s:'おばあちゃん？',c:'wolf',sc:'granny',f:'disguise',t:'さあ、もっと近くへおいで。'},
    {s:'赤ずきん',c:'hood',f:'surprise',t:'……おばあちゃん？'},
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
    {s:'',c:'narr',t:'狼が、勢いよくベッドから跳ね起きた。',act:'bgm-on'},
  ];
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
      {s:'',c:'narr',t:'狼が牙をむく。本を裏返し、家具を落として反撃しろ。'} ]});
    GT.advanceScene();
  } else {
    GT.flags.saved=false;
    GT.musicHush&&GT.musicHush(6.5); GT.sfx&&GT.sfx('gore');   // 赤ずきんが、目の前で食べられる
    GT.beginDialogue([
      {s:'',c:'narr',t:'――間に合わなかった。'},
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
        {s:'',c:'narr',t:'本を裏返し、天井から家具を落として狼を追い詰めろ。'} ]});
      GT.advanceScene();
    });
    return;
  }
  if(GT.flags.stoppedAtDoor){
    GT.beginDialogue([
      {s:'',c:'narr',t:'少年が先に、そっと中をうかがう。ベッドに、おばあさんの寝間着を着た狼が横たわっていた。'},
      {s:'',c:'narr',t:'赤ずきんが、戸口で息をのむ。……奇襲できる。'},
    ], null, ()=>{
      GT.injectSceneAfterCurrent({type:'boss',ambush:true,intro:[
        {s:'',c:'narr',t:'天井にたたきつけられた狼が、目を回している。いまのうちに、家具を落としてたたみかけろ。'} ]});
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
    {s:'',c:'narr',t:'――少年は、間に合わなかった。'},
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
    {s:'マリ',c:'mari',t:'また、一緒に行こう。'},
  ],
  normal:[
    {s:'マリ',c:'mari',t:'おかえり。'},
    {s:'マリ',c:'mari',t:'……そっか。ひとりは、間に合わなかったんだね。'},
    {s:'マリ',c:'mari',t:'ページは埋まったよ。……こういうお話として。'},
    {s:'',c:'narr',t:'少年が本を開く。最後のページの文字だけが、少しにじんでいた。'},
    {s:'マリ',c:'mari',t:'本はね、書き直せないの。でも――もう一度、最初から読むことはできる。'},
    {s:'マリ',c:'mari',t:'……どこで、どの道を選べばよかったんだろうね。'},
  ],
  bad:[
    {s:'マリ',c:'mari',t:'……おかえり。'},
    {s:'マリ',c:'mari',t:'……つらかったね。'},
    {s:'マリ',c:'mari',t:'ページは、それでも埋まるの。このお話は、こういうお話になった。'},
    {s:'マリ',c:'mari',t:'でも、あなたはもう知ってる。どこで、手を伸ばせばよかったか。'},
    {s:'マリ',c:'mari',t:'……もう一度、最初から読む？'},
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
  else resultText = '――少年は、間に合わなかった。';
  GT.fillPage('result', resultText + '\n（' + hoodLine + '／' + grannyLine + '）');
  ending.summary = hoodLine+'　／　'+grannyLine;

  const after = typeof AFTER[ending.kind]==='function' ? AFTER[ending.kind](flags) : AFTER[ending.kind];
  GT.beginDialogue(after.concat([BOOK_GLOW[ending.kind]]),null,()=>{ GT.hideDialogue(); GT.startPageFlip(); });   // ページをめくって、外の場面へ
});

/* ---- 外の場面（epilogue）：少年が歩いて、自分で話しかける ---- */
// 助かった人たちのセリフ（話しかけても右端は開かない。マリと話すと終わる）
const OUT_TALK={
  hood:{
    true:f=>[
      {s:'赤ずきん',c:'hood',f:'smile',t:'夕焼け、きれいだね。……あなたがいなかったら、今日のこの空、見られなかったかも。'},
      ...(f.warnedHood?[{s:'赤ずきん',c:'hood',t:'森であなたが止めてくれたこと、ずっと忘れない。'}]
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
      {s:'おばあさん',c:'granny',t:'その本、大事にするんだよ。あんたのことが、ちゃんと書いてあるんだろうからね。'},
    ],
  },
};
GT.defineStage('epilogue_out', { label:'第一章 ── 外', platforms:[], boxes:[], enemies:[] });
// 外の場面で、だれがどこにいるか（いない人は x=-300 で隠す）
GT.registerAct('epi-setup',()=>{
  const f=GT.flags, kind=ending.kind, npcs=GT.getNpcs(), get=w=>npcs.find(n=>n.who===w);
  ending.epilogue=true; ending.card=false;
  GT.setHudStage(epilogueDusk()?'第一章 ── 夕暮れ':'第一章 ── 夜明け');
  const h=get('hood'), g=get('granny'), m=get('mari');
  if(h){ if(kind==='bad'){ h.x=-300; } else { h.x=kind==='true'?400:330; h.lines=OUT_TALK.hood[kind](f); } }
  if(g){ if(kind==='true'){ g.x=300; g.lines=OUT_TALK.granny.true(f); } else g.x=-300; }
  if(m){ m.lines=EPILOGUE[kind].concat([{s:'',c:'narr',t:'第一章「赤い頭巾」　おわり',act:'end-card'}]); }
});
GT.registerSceneReset(()=>{ if(isEpi()){ ending.epilogue=true; ending.card=false; } else if(GT.scene&&GT.scene.type!=='end'){ ending.epilogue=false; ending.card=false; } });
// 最後の選択肢（本を開いたあとも、ここに戻ってくる）
function showEndChoices(){
  GT.beginDialogue([], [
    { label:'本を開いて、読み返す', set:()=>GT.openBookModal(), after:[] },
    { label:'はじめから読む', set:()=>location.reload(), after:[] },
  ], showEndChoices);
}

/* 外（マリと話す場面）：近道なら夕暮れ、遠回りなら夜明け。地形より奥 */
function drawEpilogue(){
  if(!isEpi()) return;
  const t=performance.now()/1000, FLOOR=H-EDGE;
  ctx.save();
  const sky=ctx.createLinearGradient(0,0,0,FLOOR);
  if(epilogueDusk()){ sky.addColorStop(0,'#7a5c78'); sky.addColorStop(0.55,'#e08a5a'); sky.addColorStop(1,'#f2b878'); }   // 夕焼け
  else { sky.addColorStop(0,'#5a6488'); sky.addColorStop(0.55,'#d9a27a'); sky.addColorStop(1,'#efd2a0'); }                  // 夜明け
  ctx.globalAlpha=0.85; ctx.fillStyle=sky; ctx.fillRect(0,0,W,H); ctx.globalAlpha=1;
  ell(700,FLOOR-40,60,60,epilogueDusk()?'rgba(255,170,100,0.8)':'rgba(255,230,170,0.75)');   // しずむ夕日／のぼる朝日
  ctx.fillStyle='rgba(70,64,60,0.55)';
  ctx.beginPath(); ctx.moveTo(0,FLOOR); ctx.quadraticCurveTo(300,330,600,380); ctx.quadraticCurveTo(780,410,W,350); ctx.lineTo(W,FLOOR); ctx.closePath(); ctx.fill();
  // 遠くのおばあさんの家（窓に明かり）
  ctx.fillStyle='rgba(60,52,44,0.9)'; ctx.fillRect(150,372,70,46);
  ctx.beginPath(); ctx.moveTo(142,374); ctx.lineTo(185,346); ctx.lineTo(228,374); ctx.closePath(); ctx.fill();
  ctx.fillStyle = ending.kind==='bad' ? 'rgba(120,110,90,0.6)' : `rgba(255,200,110,${0.8+0.1*Math.sin(t*4)})`; ctx.fillRect(172,388,12,12);
  // 木々のシルエット
  [[40,300,50],[300,320,44],[820,290,56]].forEach(([x,y,r])=>{ ctx.fillStyle='rgba(50,56,44,0.7)'; ctx.fillRect(x-4,y,8,FLOOR-y); ell(x,y,r*0.7,r,'rgba(50,56,44,0.7)'); });
  ctx.restore();
}
GT.registerDraw(drawEpilogue,'back');

/* エンディングの画面（最前面） */
function drawEndCard(){
  if(!isEpi() || !ending.card) return;
  const k=Math.min(1,(performance.now()-ending.cardT)/1200), e=ENDINGS[ending.kind];
  ctx.save(); ctx.globalAlpha=k;
  ctx.fillStyle='rgba(20,16,12,0.82)'; ctx.fillRect(0,0,W,H);
  ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillStyle='#b7ab8a'; ctx.font="600 16px 'Cormorant Garamond',serif"; ctx.fillText('G R A V I T Y   T A L E',W/2,70);
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
  intro:[ {s:'',c:'narr',get t(){ return OUTSIDE[ending.kind]||OUTSIDE.true; }, act:'epi-setup'},
          {s:'',c:'narr',t:'（まわりの人に、話しかけてみよう）'} ],
  npcs:[
    { who:'granny', name:'おばあさん', page:'left', x:-300, noExit:true, lines:[{s:'おばあさん',c:'granny',t:'……。'}] },   // セリフは epi-setup で入れる
    { who:'hood',   name:'赤ずきん',   page:'left', x:-300, noExit:true, lines:[{s:'赤ずきん',c:'hood',t:'……。'}] },
    { who:'mari',   name:'マリ',       page:'right', x:690, noExit:true, required:true,   // 話すとエンディング（右の端は開かないが、話さないと進めない）
      lines:[{s:'マリ',c:'mari',t:'おかえり。'}],
      onEnd:()=>{ GT.mode='idle'; showEndChoices(); } },
  ],
});

})();
