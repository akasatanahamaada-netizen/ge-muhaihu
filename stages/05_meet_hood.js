/* ============================================================================
   ステージ：第一章 ── 森の道（赤ずきんと出会う）  id = 'meet_hood'
   種類：story
   担当：
   ----------------------------------------------------------------------------
   ◆ このステージの流れ
     1) 森の道。道の先を、赤ずきんが鼻歌を歌いながら（♪）ゆっくり歩いている。
     2) 追いつくと、赤ずきんが振り向いて話しかけてくる（自動で会話）→ 一緒に歩くことになる。
        ここから赤ずきんは、少年のうしろをついてくる。
     3) 右ページに大きな水たまり。ジャンプでは越えられない。入ると岸へ戻される。
        赤ずきんは岸で足を止める（自動で会話）。
     4) 本を裏返すと、赤ずきんも一緒に天井へ「落ちる」。天井を歩いて水たまりを越え、
        もう一度裏返して向こう岸へ降りる。
        （赤ずきんがまだ水たまりの上にいるうちに戻すと、岸へ逃げる。置いていくと「待って……！」）
     5) 二人とも向こう岸に着いたら、赤ずきんのほうから話しかけてくる（自動で会話）。話し終えると右の端が開く。

   ◆ 赤ずきんは、このファイルが自分で動かして描いている（engine の NPC は、
     最後に話しかけるときだけ、その場所に出して使う）。
     GT.registerUpdate … 赤ずきんの動き・水たまり・自動で始まる会話
     GT.registerDraw   … 赤ずきん・水たまり・しぶき・ふきだし・花畑
   ========================================================================== */
(function(){
const ctx=GT.ctx, W=GT.W, H=GT.H, EDGE=GT.EDGE, FLOOR=H-GT.EDGE, SPINE=GT.SPINE;
const POND={x:560, y:448, w:210};          // 水たまり（y は水面の高さ）
const HW=32, HH=40;                        // 赤ずきんの大きさ（engine の NPC と同じ）
const HOOD_START=300;                      // はじめにいる場所（ここから鼻歌を歌いながら、右へゆっくり歩いていく）
const HOOD_STROLL_END=SPINE-HW-14;         // 歩いていく先。左のページのうちに（背表紙の手前で）立ち止まって待つ
const HOOD_STROLL_SPEED=26;                // 歩く速さ（px/秒）。少年よりずっと遅いので、すぐ追いつける

// --- 地形 ------------------------------------------------------------------
GT.defineStage('meet_hood', {
  platforms:[], boxes:[], enemies:[],
  decor:[
    {layer:'back',  kind:'tree',  x:20,  y:110, w:110, h:310},
    {layer:'back',  kind:'tree',  x:190, y:150, w:100, h:270},
    {layer:'back',  kind:'tree',  x:470, y:120, w:100, h:300},
    {layer:'back',  kind:'tree',  x:790, y:130, w:100, h:300},
    {layer:'back',  kind:'bush',  x:130, y:420, w:80,  h:44},
    {layer:'back',  kind:'rock',  x:520, y:426, w:44,  h:38},
    {layer:'back',  kind:'rock',  x:772, y:430, w:40,  h:34},
    {layer:'front', kind:'fern',  x:-10, y:390, w:90,  h:80},
    {layer:'front', kind:'grass', x:250, y:434, w:60,  h:30},
    {layer:'front', kind:'grass', x:840, y:432, w:50,  h:32},
  ],
});

// --- セリフ ----------------------------------------------------------------
const GREET=[
  {s:'',c:'narr',t:'足音に気づいた少女が、くるりと振り向いた。'},
  {s:'赤ずきん',c:'hood',t:'あら、こんにちは。'},
  {s:'赤ずきん',c:'hood',t:'おばあちゃんのお家に行くところなの。カスタードとバターを届けに行くんだ。'},
  {s:'少年',c:'boy',t:'……そうなんだ。'},
  {s:'赤ずきん',c:'hood',t:'あなたも、この森に住んでいるの？'},
  {s:'少年',c:'boy',t:'……わからない。'},
  {s:'赤ずきん',c:'hood',t:'ふうん。不思議な人ね。'},
  {s:'赤ずきん',c:'hood',t:'よかったら、一緒に行かない？　おばあちゃんのお家まで、まだ少しあるから。'},
  {s:'',c:'narr',t:'少年がうなずく。'},
  {s:'赤ずきん',c:'hood',f:'smile',t:'うれしい！　一緒に行こう。'},
];
const STOP=[
  {s:'',c:'narr',t:'赤ずきんが足を止める。道いっぱいに、大きな水たまりが広がっている。'},
  {s:'赤ずきん',c:'hood',t:'うーん……跳べるかな。靴、濡らしたくないんだけど……'},
  {s:'',c:'narr',t:'少年は、手の中の本を見た。'},
];
// 向こう岸に着いてから、話しかけたとき
const AFTER=[
  {s:'赤ずきん',c:'hood',f:'surprise',t:'わ、わ！　何それ！？'},
  {s:'赤ずきん',c:'hood',f:'surprise',t:'……あれ？　なんで途中で止まるの？　ずーっと上まで、落ちていくかと思った。'},
  {s:'赤ずきん',c:'hood',f:'smile',t:'すごい、すごい！　あなた、魔法使いなの？'},
];
// 「魔法使いなの？」への返事（どちらを選んでも、セリフが変わるだけ。あとの流れは同じ）
const AFTER_END=[
  {s:'赤ずきん',c:'hood',t:'魔法って火とかを出すものだと思ってた。こういう魔法もあるのね！'},
  {s:'赤ずきん',c:'hood',f:'smile',t:'行こう！　おばあちゃんのお家はこっちだよ！'},
];
const AFTER_CHOICES=[
  { label:'……わからない。', after:[
      {s:'少年',c:'boy',t:'……わからない。'},
      {s:'赤ずきん',c:'hood',f:'smile',t:'きっと、魔法使いだよ！'},
      ...AFTER_END ]},
  { label:'そうだよ。', after:[
      {s:'少年',c:'boy',t:'そうだよ。'},
      {s:'赤ずきん',c:'hood',f:'smile',t:'そうなの！！　すごーい！！！！'},
      {s:'',c:'narr',t:'赤ずきんは、尊敬のまなざしで少年を見ている。'},
      ...AFTER_END ]},
];

// --- シーン ----------------------------------------------------------------
GT.registerScene({
  id:'meet_hood', type:'story', stage:'meet_hood', label:'第一章 ── 森の道',
  intro:[
    {s:'',c:'narr',t:'森の道。木々のあいだを、細い道が続いている。',act:'meet-setup'},
    {s:'',c:'narr',t:'道の先を、赤い頭巾の少女が歩いている。かごを大事そうに抱え、鼻歌を歌っている。'},
  ],
  npcs:[
    // 最後に話しかける相手。ふだんは画面の外にしまっておき、向こう岸で待っているときだけ出す。
    // （x は、エディタのクリア判定用に向こう岸の位置にしてある）
    { who:'hood', name:'赤ずきん', page:'right', x:800, lines:AFTER, choices:AFTER_CHOICES,
      onEnd:()=>{ st.phase='done'; GT.storyPiece&&GT.storyPiece('meet','meet:story','hood'); GT.fillPage('meet','――赤い頭巾の少女と、一緒に歩くことになった。'); } },
  ],
});

/* ==========================================================================
   赤ずきんの動き
   phase: 'wait'（鼻歌を歌いながら先を歩いている）→ 'follow'（ついてくる）→ 'talk'（向こう岸で待つ）→ 'done'（またついてくる）
   ========================================================================== */
const st={ phase:'wait', stopTold:false, busy:false, hood:null, bubble:null, waitT:0, splashes:[], talkTry:0, stuckT:0, last:performance.now() };
const isMeet=()=>GT.scene&&GT.scene.id==='meet_hood';
const engHood=()=>GT.getNpcs().find(n=>n.who==='hood');
function reset(){
  st.phase='wait'; st.stopTold=false; st.busy=false; st.bubble=null; st.waitT=0; st.splashes=[]; st.talkTry=0; st.stuckT=0;
  st.hood={x:HOOD_START, y:FLOOR, vy:0, g:1, face:1, settled:true, walking:false, blocked:false};
}
reset();
GT.registerSceneReset(()=>{ if(isMeet()) reset(); });
GT.registerAct('meet-setup',()=>{ const n=engHood(); if(n){ n.x=-300; n.talkable=false; } });

function autoTalk(lines,after){
  st.busy=true; GT.mode='idle'; GT.player.vx=0;
  GT.beginDialogue(lines,null,()=>{ GT.hideDialogue(); GT.mode='play'; st.busy=false; if(after) after(); });
}
function say(text,sec){ st.bubble={text, t:sec||1.6}; }
function splash(cx){
  for(let i=0;i<12;i++) st.splashes.push({x:cx+(Math.random()-0.5)*20, y:POND.y, vx:(Math.random()-0.5)*160, vy:-90-Math.random()*200, t:0});
}
const inPondX=(x,w)=> x+w>POND.x && x<POND.x+POND.w;
const pondSide=cx=> cx<POND.x+POND.w/2 ? 'left' : 'right';
const leftBank=()=>POND.x-HW-4, rightBank=()=>POND.x+POND.w+4;

GT.registerUpdate(dt=>{
  if(!isMeet()) return;
  const pl=GT.player, pcx=pl.x+pl.w/2, h=st.hood;

  // 少年が水たまりに入ったら、しぶきを上げて岸へ戻される
  if(pl.y+pl.h>POND.y+2 && inPondX(pl.x,pl.w)){
    splash(pcx); GT.sfx&&GT.sfx('plop');
    pl.x = pondSide(pcx)==='left' ? POND.x-pl.w-6 : POND.x+POND.w+6; pl.vx=0; pl.vy=0;
    if(st.phase!=='wait') say('だいじょうぶ？');
  }

  // 重力：赤ずきんも、いるページの向きに「落ちる」
  const g=GT.gravity[(h.x+HW/2)<SPINE?'left':'right'];
  if(g!==h.g){ h.g=g; h.settled=false; const sp=GT.grumble(h,'hood'); say(sp?sp.text:(h.g===-1?'わ、わ！':'きゃあっ'), sp?2.4:1.6); }
  if(!h.settled){
    h.vy+=GT.GRAVITY*g*dt; h.y+=h.vy*dt;
    if(g===1 && h.y>=FLOOR){ h.y=FLOOR; h.vy=0; h.settled=true;
      if(inPondX(h.x,HW)){ splash(h.x+HW/2); GT.sfx&&GT.sfx('splash'); h.x=leftBank(); h.fellT=performance.now(); say('きゃっ！ 冷たい！'); } }   // 水たまりに落ちたら、いつも手前の岸へもどる（向こう岸で話す流れにはならない。やり直し）
    if(g===-1 && h.y<=EDGE){ h.y=EDGE; h.vy=0; h.settled=true; }
  }

  // ついてくる（床にいるときは、水たまりの手前で止まる）
  h.walking=false; h.blocked=false;
  if(st.phase==='wait' && h.settled && h.g===1 && !st.busy && h.x<HOOD_STROLL_END){   // 出会う前：鼻歌を歌いながら、先を歩いていく
    h.x=Math.min(HOOD_STROLL_END, h.x+HOOD_STROLL_SPEED*dt); h.walking=true; h.face=1; }
  if((st.phase==='follow'||st.phase==='done') && h.settled){
    const target = pcx + (pcx>h.x+HW/2 ? -42 : 42) - HW/2;
    const dx=target-h.x;
    if(Math.abs(dx)>6){
      let nx=h.x+Math.sign(dx)*Math.min(230*dt,Math.abs(dx));
      if(h.g===1){
        if(pondSide(h.x+HW/2)==='left' && nx>leftBank()){ nx=leftBank(); h.blocked=true; }
        if(pondSide(h.x+HW/2)==='right' && nx<rightBank()){ nx=rightBank(); h.blocked=true; }
      }
      nx=Math.max(EDGE,Math.min(W-EDGE-HW,nx));
      if(Math.abs(nx-h.x)>0.01){ h.walking=true; h.face=Math.sign(nx-h.x); }
      h.x=nx;
    } else h.face = pcx>h.x+HW/2 ? 1 : -1;
  }

  // engine の NPC：向こう岸の床で待っているときだけ、その場所に出す（話しかけられる）
  const n=engHood();
  if(n){ const show = st.phase==='talk' && h.settled && h.g===1; n.x = show ? h.x : -300; n.talkable = show; }

  if(st.bubble){ st.bubble.t-=dt; if(st.bubble.t<=0) st.bubble=null; }
  if(st.busy) return;

  if(st.phase==='wait' && pcx>h.x-50){ h.face=-1; autoTalk(GREET,()=>{ st.phase='follow'; }); return; }
  // 少年が水たまりの前まで来たら、赤ずきんが足を止める
  if(st.phase==='follow' && !st.stopTold && h.g===1 && pondSide(h.x+HW/2)==='left'
     && pcx>POND.x-70 && pl.onGround && GT.gravity.right===1){
    st.stopTold=true; autoTalk(STOP); return; }
  // 向こう岸に、二人とも着いた
  const across = h.settled && h.g===1 && h.x>=rightBank()-0.5 && pcx>POND.x+POND.w && pl.onGround && GT.gravity.right===1;
  if(st.phase==='follow' && across){ st.phase='talk'; st.bubble=null; return; }
  // 向こう岸で待っている赤ずきんが、そのまま話しかけてくる（自分から話しかけなくても始まる）
  if(st.phase==='talk' && n && n.talkable && !n.talked && GT.mode==='play'
     && !document.getElementById('dlg').classList.contains('show') && performance.now()>st.talkTry){ st.talkTry=performance.now()+500; GT.talkTo(n); return; }   // （始まらなかったときは、0.5秒おいてもう一度。そのあいだも少年は動ける）
  // 赤ずきんが向こう岸に来られないまま（天井に残った など）、少年が向こう岸の床で待っていたら、6秒で追いつく
  if(st.phase==='follow' && pcx>POND.x+POND.w && pl.onGround && GT.gravity.right===1 && !(h.g===1 && h.x>=rightBank()-0.5) && !(h.g===1 && h.settled && h.x<=leftBank()+0.5)){   // （手前の岸の床にいるときは、追いつかない。水たまりに落ちたときなど）
    st.stuckT+=dt; if(st.stuckT>6){ st.stuckT=0; h.g=1; h.x=rightBank(); h.y=FLOOR; h.vy=0; h.settled=true; say('……やっと、追いついた！',2); } }
  else st.stuckT=0;
  // 置いていかれた
  if(st.phase==='follow' && h.g===1 && pondSide(h.x+HW/2)==='left' && pcx>POND.x+POND.w){
    st.waitT-=dt; if(st.waitT<=0){ say('待って……！'); st.waitT=3.2; } }
});

/* ==========================================================================
   描画
   ========================================================================== */
function ell(x,y,rx,ry,c){ ctx.beginPath(); ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2); ctx.fillStyle=c; ctx.fill(); }

/* 赤ずきん（engine の NPC と同じ形。重力が逆なら上下さかさま。かごを持っている） */
let idleT=0;
function watchStuck(){   // 会話の枠が出ていないのに、2秒たっても少年が動けないときは、動けるようにもどす
  if(!isMeet() || GT.paused){ idleT=0; return; }
  const dlgOn=document.getElementById('dlg').classList.contains('show'), d=GT.dbg?GT.dbg():{};
  if(GT.mode==='idle' && !dlgOn && !d.flipping && !d.storyTalking){ idleT+=1/60; if(idleT>2){ idleT=0; GT.mode='play'; st.busy=false; } }
  else idleT=0;
}
function drawHood(){
  watchStuck();
  const h=st.hood, n=engHood(); if(n && n.x>-100) return;   // engine が描いているときは描かない
  const t=performance.now()/1000;
  // 会話中は動きが止まるので、歩く絵（足をバタバタ）にはしない。立ち止まって話す
  const talking = st.busy || GT.mode!=='play' || document.getElementById('dlg').classList.contains('show');
  const walking = h.walking && !talking;
  const bob = !h.settled ? 0 : walking ? Math.abs(Math.sin(t*11))*2.5 : Math.sin(t*2.2+h.x*0.05)*2.2;
  const hw=HW/2, hh=HH/2, f=h.face;
  const drawn=GT.drawHoodSprite(h.x+hw, h.y-h.g*(walking?0:bob*0.6), GT.HOOD_H, f, h.g, null, walking);
  const top=drawn?GT.HOOD_H-HH:0;                                   // 絵が箱より上にはみ出す分
  if(!drawn){                                                       // 絵が読みこめていないときだけ、古い形で描く
  ctx.save();
  ctx.translate(h.x+hw, h.y); ctx.scale(1,h.g); ctx.translate(0,-hh-bob);
  ctx.beginPath(); GT.roundRectPath(-hw,-hh,HW,HH,9); ctx.fillStyle='#2b2e4a'; ctx.fill();
  ctx.fillStyle='#b8423f';
  ctx.beginPath(); ctx.moveTo(-hw,-hh*0.1); ctx.lineTo(hw,-hh*0.1); ctx.lineTo(hw*0.7,hh*0.9); ctx.lineTo(-hw*0.7,hh*0.9); ctx.closePath();
  ctx.globalAlpha=0.92; ctx.fill(); ctx.globalAlpha=1;
  ctx.beginPath(); ctx.arc(0,-hh,hw*0.95,Math.PI,0); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-hw*0.9*f,-hh); ctx.lineTo(-hw*1.7*f,-hh*0.7); ctx.lineTo(-hw*0.9*f,-hh*0.55); ctx.closePath(); ctx.fill();
  ctx.fillStyle='#e8dcc0'; ctx.beginPath();
  ctx.arc(-5*f,-hh*0.35,2.4,0,Math.PI*2); ctx.arc(5*f,-hh*0.35,2.4,0,Math.PI*2); ctx.fill();
  // かご
  const bx=f*(hw+3), by=hh*0.35;
  ctx.strokeStyle='#6b4a2b'; ctx.lineWidth=1.6; ctx.beginPath(); ctx.arc(bx,by-3,6,Math.PI,0); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(bx-8,by-3); ctx.lineTo(bx+8,by-3); ctx.lineTo(bx+6,by+5); ctx.lineTo(bx-6,by+5); ctx.closePath();
  ctx.fillStyle='#8b6a43'; ctx.fill();
  ctx.restore();
  }
  // 名前
  ctx.save(); ctx.font="600 11px 'Zen Old Mincho',serif"; ctx.textAlign='center'; ctx.fillStyle='rgba(74,70,60,0.85)';
  ctx.fillText('赤ずきん', h.x+hw, h.g===1 ? h.y-HH-top-12-bob : h.y+HH+top+20+bob);
  ctx.restore();
  // 出会う前の鼻歌（歩きながら）
  if(st.phase==='wait'){
    ctx.save(); ctx.font="700 14px serif"; ctx.textAlign='center';
    for(let i=0;i<2;i++){ const k=(t*0.5+i*0.5)%1;
      ctx.globalAlpha=Math.sin(k*Math.PI)*0.8; ctx.fillStyle='#8b4a3f';
      ctx.fillText(i?'♫':'♪', h.x+hw+12+Math.sin(k*5)*6+i*8, h.y-HH-top-22-k*30); }
    ctx.restore();
  }
}

/* ふきだし */
function drawBubble(){
  const b=st.bubble; if(!b) return;
  const h=st.hood, cx=h.x+HW/2, top=GT.HOOD_H-HH, y = h.g===1 ? h.y-HH-top-40 : h.y+HH+top+40;
  ctx.save(); ctx.globalAlpha=Math.min(1,b.t*4);
  ctx.font="700 13px 'Zen Old Mincho',serif"; ctx.textAlign='center'; ctx.textBaseline='middle';
  const w=ctx.measureText(b.text).width+20;
  const bx=Math.max(EDGE+4,Math.min(W-EDGE-4-w,cx-w/2));
  GT.roundRect(bx,y-12,w,24,12); ctx.fillStyle='rgba(250,244,228,0.95)'; ctx.fill();
  ctx.strokeStyle='rgba(139,74,63,0.6)'; ctx.lineWidth=1.4; ctx.stroke();
  ctx.fillStyle='#8b4a3f'; ctx.fillText(b.text,bx+w/2,y+1);
  ctx.restore();
}

/* 水たまり */
function drawPond(){
  const t=performance.now()/1000, p=POND;
  ctx.save();
  ctx.beginPath(); ctx.moveTo(p.x-8,FLOOR); ctx.quadraticCurveTo(p.x-2,p.y,p.x+14,p.y);
  ctx.lineTo(p.x+p.w-14,p.y); ctx.quadraticCurveTo(p.x+p.w+2,p.y,p.x+p.w+8,FLOOR); ctx.closePath();
  const g=ctx.createLinearGradient(0,p.y,0,FLOOR);
  g.addColorStop(0,'rgba(120,150,160,0.95)'); g.addColorStop(1,'rgba(70,96,108,0.95)');
  ctx.fillStyle=g; ctx.fill();
  ctx.save(); ctx.clip();
  // 空と梢の映りこみ
  ctx.fillStyle='rgba(232,240,236,0.35)';
  for(let i=0;i<5;i++){ const x=p.x+20+i*42+Math.sin(t*0.8+i)*6; ctx.fillRect(x,p.y+3+(i%2)*4,22,2); }
  // 波紋
  ctx.strokeStyle='rgba(232,240,236,0.5)'; ctx.lineWidth=1;
  for(let i=0;i<3;i++){ const k=(t*0.35+i/3)%1, x=p.x+40+i*65;
    ctx.globalAlpha=1-k; ctx.beginPath(); ctx.ellipse(x,p.y+7,4+k*24,1.5+k*3,0,0,Math.PI*2); ctx.stroke(); }
  ctx.restore();
  // 岸の草
  for(const bx of [p.x-4,p.x+p.w+4]) GTDecor.paint.grass(ctx, Math.round(bx-16), FLOOR-30, 32, 30, Math.round(bx), {flowers:false});
  ctx.restore();
}

/* しぶき */
function drawSplashes(){
  const now=performance.now(), dt=Math.min(0.05,(now-st.last)/1000); st.last=now;
  ctx.save(); ctx.fillStyle='rgba(200,222,230,0.9)';
  st.splashes=st.splashes.filter(s=>{ s.t+=dt; s.vy+=900*dt; s.x+=s.vx*dt; s.y+=s.vy*dt;
    if(s.t>0.8||s.y>FLOOR) return false;
    ctx.globalAlpha=1-s.t/0.8; ctx.beginPath(); ctx.arc(s.x,s.y,2.2,0,Math.PI*2); ctx.fill(); return true; });
  ctx.restore();
}

/* 花畑（赤ずきんが摘んでいた花）（地形より奥） */
function drawBack(){
  ctx.save();
  GTDecor.paint.grass(ctx, 262, FLOOR-18, 160, 18, 7, {flowers:false});            // 花畑の下草
  for(let i=0;i<14;i++){ const x=270+i*10+((i*37)%7);
    GTDecor.paint.flower(ctx, x, FLOOR, 0.9+((i*13)%9)*0.04, i%4, i*11); }
  ctx.restore();
}

/* 本を裏返す案内（水たまりの前で止まってから、越えるまで） */
function drawHint(){
  if(st.phase!=='follow' || !st.stopTold || st.busy || GT.gravity.right!==1) return;
  const a=0.55+0.35*Math.sin(performance.now()/260);
  ctx.save(); ctx.globalAlpha=a; ctx.font="700 14px 'Zen Old Mincho',serif"; ctx.textAlign='center';
  ctx.fillStyle='rgba(74,70,60,0.9)'; ctx.fillText(GT.ctl('F / Space ・「本を裏返す」で 天井へ','「本を裏返す」ボタンで 天井へ'), POND.x+POND.w/2, 250);
  ctx.restore();
}

GT.registerDraw(()=>{ if(!isMeet()) return; drawBack(); }, 'back');
GT.registerDraw(()=>{ if(!isMeet()) return; drawPond(); }, 'flat');   // 水たまりは、影を落とさない
GT.registerDraw(()=>{ if(!isMeet()) return; drawHood(); drawSplashes(); drawHint(); }, 'world');
GT.registerDraw(()=>{ if(!isMeet()) return; drawBubble(); }, 'speech');   // ふきだしは最前面
})();
