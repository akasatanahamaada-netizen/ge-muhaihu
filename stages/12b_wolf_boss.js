/* ============================================================================
   おばあさんの家：狼とのボス戦  (stages/12b_wolf_boss.js)
   ----------------------------------------------------------------------------
   ・ボス戦の地形 'wolf_boss'（到着・QTE・ボス戦で共通して使う）
   ・狼（spawnWolf / updateWolf / 家具を落として攻撃。狼のページを裏返すと、しがみつく・目を回す）
   ・ボス戦の画面表示（体力バー・攻略のヒント・ポップ文字・勝利の文字）
   ・狼にやられたときのゲームオーバー演出（GT.registerGameOver('wolf')）
   ・シーンの種類 'boss'（12_grannys_house.js が injectSceneAfterCurrent で差し込む）
       {type:'boss', ambush:ベッドの狼に奇襲するか, saveHood:QTE で赤ずきんを助けたか, hollow:赤ずきんを救えなかったか, intro:[会話]}
   部屋の絵は 12a_room_art.js、お話（到着・QTE・結末）は 12_grannys_house.js。
   ========================================================================== */
(function(){
const ctx=GT.ctx, W=GT.W, H=GT.H, EDGE=GT.EDGE, SPINE=GT.SPINE;

// ボス戦では mode='boss' のあいだ、物理と反転を有効にする
GT.physicsModes.add('boss');
GT.flipModes.add('boss');

// --- おばあさんの家の地形（到着/QTE/ボス戦で共通して使う） ----------------
GT.defineStage('wolf_boss', {
  label:'第一章 ── おばあさんの家',
  platforms:[
    {page:'left', x:120, y:340, w:120, h:20, kind:'ledge'},          // 棚
    {page:'left', x:250, y:90,  w:170, h:20, kind:'ceilingLedge'},   // 梁
    {page:'right',x:520, y:300, w:120, h:20, kind:'ledge'},          // 棚
    {page:'right',x:700, y:150, w:130, h:20, kind:'ledge'},          // 高い棚
    {page:'right',x:560, y:90,  w:150, h:20, kind:'ceilingLedge'},   // 梁
  ],
  // 落として狼に当てる家具（見た目は FURNITURE の順：タンス・つぼ・本の山）
  boxes:[{x:300,y:H-EDGE-34,w:34,h:34},{x:640,y:H-EDGE-34,w:34,h:34},{x:760,y:150-34,w:34,h:34}],
  enemies:[],
});

/* ========================== 狼（ボス） ==================================
   ◆ 攻略のしかた
     ・狼は家具（箱）をすり抜けて歩く。狼が家具と重なったときに、そのページを裏返すと――
       狼は一瞬（GRIP 秒）床にしがみつき（！？）、家具だけが天井へ飛んでいく。
       しがみついているあいだに（少年が着地してから）もう一度裏返すと、家具が戻ってきて狼の頭に落ちる（ダメージ）。
     ・しがみつく時間が過ぎると、狼は天井（床）に打ちつけられて目を回す（DIZZY 秒）。
       目を回しているあいだは、ぶつかっても平気。
     ・家具が当たるのは、狼の「上」（重力の向きで見て）から落ちてきたときだけ。
     ・狼は身構えて（！）から飛びかかる。体力が残り1になると、遠吠えして速くなる。
   ======================================================================= */
const DIZZY=1.8;                       // 目を回している時間(秒)
const GRIP=1.4;                        // 裏返されたとき、床にしがみつく時間(秒)。空中では裏返せないので、少年が着地してから裏返し直せる長さにしてある
const DIZZY_SPEED=900;                 // これより速く打ちつけられると目を回す
let wolf=null;
GT.getBoss=()=>wolf;   // 現在の狼を取り出す（デバッグ・動作確認用）
const fx={ pops:[], stars:[], banner:null, hintOff:false, last:performance.now() };   // 演出
function spawnWolf(){
  wolf={ x:SPINE+120, y:H-EDGE-52, w:44, h:36, dir:-1,
    hp:3, maxhp:3, vy:0, vx:0, onGround:false, page:'right',
    stun:0, dizzy:0, windup:0, howl:0, grip:0, lastG:1, enraged:false,
    hitFlash:0, alive:true, deathT:0, squash:1, lungeCD:1.4 };
  fx.pops=[]; fx.stars=[]; fx.banner=null; fx.hintOff=false;
}
function pop(text,x,y,color){ fx.pops.push({text,x,y,color:color||'#c9503f',t:0}); }
function burst(x,y,n){ for(let i=0;i<(n||10);i++){ const a=Math.random()*Math.PI*2, s=120+Math.random()*160;
  fx.stars.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,t:0}); } }

function damageWolf(source){
  if(!wolf||!wolf.alive) return;
  GT.sfx&&GT.sfx('hit'); wolf.hp-=1; wolf.hitFlash=1; wolf.stun=0.7; wolf.dizzy=0; wolf.windup=0; wolf.squash=0.6;
  wolf.dir=(source&&source.x<wolf.x)?1:-1; wolf.vy=-260*GT.gravity[wolf.page];
  fx.hintOff=true; GT.hurtFlash=0.25;
  pop('ギャン！',wolf.x+wolf.w/2,wolf.y-8); burst(wolf.x+wolf.w/2,wolf.y+wolf.h/2,12);
  if(wolf.hp<=0){ defeatWolf(); return; }
  if(wolf.hp===1 && !wolf.enraged){ wolf.enraged=true; wolf.howl=1.1; }   // 追いつめられて遠吠え
}
function defeatWolf(){
  wolf.alive=false; wolf.deathT=0; wolf.squash=0.2;
  const hollow=GT.scene&&GT.scene.hollow;
  if(hollow) fx.banner={ text:'……', t:0 };   // 「狼を倒した！」の文字は出さない
  setTimeout(()=>{ GT.flags.saved = hollow?false:true; GT.mode='play'; GT.openExit&&GT.openExit(); },1700);   // 無理やり場面を変えず、自分で右の端へ歩いて、次のページへ
}
// 狼にぶつかられた：はじき飛ばされる（はじめの場所へは戻されない）
function hurtPlayer(){                                    // ハートが減る（3回でゲームオーバー → ページがもどって、戦いをやり直す）
  const pl=GT.player;
  if(GT.damagePlayer(wolf.x+wolf.w/2,'wolf') && !GT.isGameOver()) pop('いたっ',pl.x+pl.w/2,pl.y-6,'#4a4e6d');
}
function updateWolf(dt){
  const gravity=GT.gravity, player=GT.player;
  wolf.hitFlash=Math.max(0,wolf.hitFlash-dt*2.5); wolf.page=GT.pageOf(wolf);
  const wg=gravity[wolf.page];
  if(!wolf.alive){ wolf.deathT+=dt; return; }
  // ページの重力が変わった（裏返された・ページをまたいだ）：立っていれば、しばらくしがみつく
  if(wg!==wolf.lastG){ wolf.lastG=wg;
    if(wolf.onGround && wolf.dizzy<=0){ wolf.grip=GRIP; wolf.windup=0; wolf.vy=0; wolf.vx=0; pop('！？',wolf.x+wolf.w/2,wg===1?wolf.y+wolf.h+24:wolf.y-8,'#5a4630'); } }
  if(wolf.grip>0){ wolf.grip-=dt; wolf.squash+=(0.8-wolf.squash)*Math.min(1,dt*10); return; }
  const speed=GT.ENEMY_SPEED*(wolf.enraged?1.8:1.3);
  if(wolf.howl>0){ wolf.howl-=dt; if(wolf.howl<=0) pop('ウォォォン！',wolf.x+wolf.w/2,wolf.y-10,'#8b3a2f'); }
  else if(wolf.dizzy>0){ wolf.dizzy-=dt; }
  else if(wolf.stun>0){ wolf.stun-=dt; }
  else if(wolf.windup>0){                                   // 身構えている
    wolf.windup-=dt; wolf.squash+=(1.3-wolf.squash)*Math.min(1,dt*12);
    if(wolf.windup<=0 && wolf.onGround){ wolf.vy=-560*wg; wolf.vx=wolf.dir*(wolf.enraged?380:300); }
  }
  else{
    wolf.lungeCD-=dt; const dir=(player.x<wolf.x)?-1:1; wolf.dir=dir;
    wolf.x+=dir*speed*dt;
    if(wolf.lungeCD<=0&&wolf.onGround){ wolf.windup=wolf.enraged?0.32:0.5; wolf.lungeCD=wolf.enraged?1.0:1.6; }
  }
  wolf.vy+=GT.GRAVITY*wg*dt; wolf.x+=(wolf.vx||0)*dt; wolf.vx=(wolf.vx||0)*0.9;
  // 左右の端は、上下の当たり判定より先に止める。
  // （壁にめり込んだまま上下の判定をすると、壁の上・下＝画面の外へ押し出されてしまう）
  if(wolf.x<EDGE){ wolf.x=EDGE; wolf.vx=0; } if(wolf.x+wolf.w>W-EDGE){ wolf.x=W-EDGE-wolf.w; wolf.vx=0; }
  const vyBefore=wolf.vy;
  // 速く落ちても薄い足場をすり抜けないよう、8px ずつ刻んで判定する（壁は上下の判定に使わない）
  wolf.onGround=false;
  const plats=GT.pagePlatforms(wolf.page).filter(p=>p.kind!=='wallEdge');
  const steps=Math.max(1,Math.ceil(Math.abs(wolf.vy*dt)/8));
  for(let i=0;i<steps&&wolf.vy!==0;i++){ wolf.y+=wolf.vy*dt/steps; GT.resolveBodyCollisions(wolf,'y',plats); }
  // 念のため：ページの外に出ていたら、床（天井）へ戻す
  if(wolf.y<EDGE || wolf.y+wolf.h>H-EDGE || !isFinite(wolf.y)){
    wolf.y = wg===1 ? H-EDGE-wolf.h : EDGE; wolf.vy=0; }
  // 天井（床）に勢いよく打ちつけられたら、目を回す
  if(wolf.vy===0 && vyBefore*wg>DIZZY_SPEED){
    wolf.dizzy=DIZZY; wolf.windup=0; wolf.squash=0.5; wolf.vx=0; GT.sfx&&GT.sfx('dizzy');
    pop('ドスン！',wolf.x+wolf.w/2,wolf.y+wolf.h/2,'#5a4630'); burst(wolf.x+wolf.w/2,wg===1?wolf.y+wolf.h:wolf.y,8);
  }
  wolf.squash+=(1-wolf.squash)*Math.min(1,dt*8);
  if(GT.invincible<=0&&wolf.alive&&wolf.stun<=0&&wolf.dizzy<=0&&wolf.grip<=0&&GT.rectsOverlap(player,wolf)){ hurtPlayer(); }
}

// 毎フレーム：落ちてくる箱が狼に当たればダメージ。そのあと狼を動かす。
GT.registerUpdate(dt=>{
  if(GT.mode!=='boss'||!wolf) return;
  if(wolf.alive){
    const wg=GT.gravity[wolf.page];
    for(const box of GT.boxes){
      // 狼の「上」（重力の向きで見て）から落ちてきた家具だけが当たる
      const fromAbove = wg===1 ? box.y+box.h/2 < wolf.y+wolf.h/2 : box.y+box.h/2 > wolf.y+wolf.h/2;
      if(GT.rectsOverlap(box,wolf)&&fromAbove&&box.vy*wg>140&&wolf.stun<=0){ damageWolf(box); box.vy=-box.vy*0.3; box.squash=1.3; }
    }
  }
  updateWolf(dt);
});

// 狼の描画（プレイヤーより後ろ）
function drawWolf(){
  if(!wolf) return; const wg=GT.gravity[wolf.page], t=performance.now()/1000;
  if(GT.hasSprite && GT.hasSprite('wolfLeft')){ drawWolfSprite(wg,t); return; }   // 狼ミニの絵があれば、そちらで描く
  ctx.save();
  const sx=wolf.squash, sy=2-wolf.squash; const hw=(wolf.w/2)*sx, hh=(wolf.h/2)*sy;
  const shake = wolf.howl>0 ? Math.sin(t*60)*2 : 0;
  ctx.translate(wolf.x+wolf.w/2+shake,wolf.y+wolf.h/2); ctx.scale(wolf.dir>=0?1:-1,wg);
  if(!wolf.alive){ ctx.globalAlpha=Math.max(0.2,1-wolf.deathT*0.5); ctx.beginPath(); GT.roundRectPath(-hw*1.35,-hh*0.4,hw*2.7,hh*0.8,6); ctx.fillStyle='#3a2f2a'; ctx.fill(); ctx.restore(); return; }
  // しっぽ
  ctx.fillStyle='#3a2f2a'; ctx.beginPath(); ctx.moveTo(-hw+2,-hh*0.4); ctx.quadraticCurveTo(-hw-16,-hh*0.9+Math.sin(t*6)*3,-hw-14,hh*0.2); ctx.lineTo(-hw+2,hh*0.1); ctx.closePath(); ctx.fill();
  ctx.beginPath(); GT.roundRectPath(-hw,-hh,hw*2,hh*2,8); ctx.fillStyle=wolf.hitFlash>0?'#8b3a2f':'#3a2f2a'; ctx.fill();
  ctx.beginPath(); GT.roundRectPath(hw-4,-hh*0.2,hw*0.5,hh*0.5,4); ctx.fillStyle='#2c231f'; ctx.fill();
  // 牙
  ctx.fillStyle='#e8dcc0'; ctx.beginPath(); ctx.moveTo(hw+2,hh*0.28); ctx.lineTo(hw+5,hh*0.55); ctx.lineTo(hw+8,hh*0.28); ctx.fill();
  ctx.fillStyle='#3a2f2a'; ctx.beginPath(); ctx.moveTo(hw-10,-hh); ctx.lineTo(hw-4,-hh-11); ctx.lineTo(hw+2,-hh); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-hw+2,-hh); ctx.lineTo(-hw+8,-hh-11); ctx.lineTo(-hw+14,-hh); ctx.closePath(); ctx.fill();
  if(wolf.dizzy>0){                                          // 目がぐるぐる
    ctx.strokeStyle='#e8dcc0'; ctx.lineWidth=1.4; ctx.beginPath(); ctx.arc(hw-9,-3,3,t*8,t*8+Math.PI*1.5); ctx.stroke();
  } else {
    if(wolf.enraged){ ctx.shadowColor='rgba(255,60,40,0.9)'; ctx.shadowBlur=8; }
    ctx.fillStyle='#c9503f'; ctx.beginPath(); ctx.arc(hw-9,-3,2.6,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0;
  }
  ctx.restore();
  // 目を回している星・身構えの「！」
  const cx=wolf.x+wolf.w/2, headY = wg===1 ? wolf.y-10 : wolf.y+wolf.h+10;
  if(wolf.dizzy>0){ ctx.save(); ctx.fillStyle='#e8c35a';
    for(let i=0;i<3;i++){ const a=t*5+i*2.1; star(cx+Math.cos(a)*18, headY+Math.sin(a)*5, 5); ctx.fill(); }
    ctx.restore(); }
  if(wolf.windup>0){ ctx.save(); ctx.font="700 22px 'Zen Old Mincho',serif"; ctx.textAlign='center';
    ctx.fillStyle='#c9503f'; ctx.fillText('！',cx,wg===1?headY-6:headY+22); ctx.restore(); }
}
/* 狼（ミニの絵）のボス。つぶれ・ひるみの赤い点滅・怒りの赤いもや・倒れたあとを、絵に重ねて表す */
const WOLF_BOSS_H=86;
function drawWolfSprite(wg,t){
  const cx=wolf.x+wolf.w/2, foot= wg===1 ? wolf.y+wolf.h : wolf.y;
  const shake = wolf.howl>0 ? Math.sin(t*60)*2 : 0, dir= wolf.dir>=0 ? 1 : -1;
  ctx.save(); ctx.translate(cx+shake, foot);
  if(!wolf.alive){                                                    // 倒れて、ぺたんと平たくなり、うすれていく
    ctx.globalAlpha=Math.max(0.2,1-wolf.deathT*0.5); ctx.scale(1.25,0.4);
    GT.drawCharSprite('wolf',0,0,WOLF_BOSS_H,dir,wg); ctx.restore(); return; }
  ctx.scale(wolf.squash, 2-wolf.squash);
  if(wolf.hitFlash>0 && Math.floor(t*20)%2===0) ctx.filter='sepia(1) saturate(6) hue-rotate(-45deg) brightness(1.1)';   // 当たったら赤く点滅
  if(wolf.enraged){ ctx.shadowColor='rgba(255,60,40,0.85)'; ctx.shadowBlur=14; }
  const running = Math.abs(wolf.vx||0)>30 && wolf.stun<=0 && wolf.dizzy<=0;
  const step = GT.wolfRunPose(running, dir, wg);                    // 走る絵と立ち絵を交互に（主人公の歩きと同じ）
  GT.drawCharSprite(step?'wolfRun':'wolf', 0, 0, WOLF_BOSS_H, dir, wg);
  ctx.restore();
  // 目を回している星・身構えの「！」（絵の頭の上に出す）
  const headY = wg===1 ? foot-WOLF_BOSS_H-4 : foot+WOLF_BOSS_H+4;
  if(wolf.dizzy>0){ ctx.save(); ctx.fillStyle='#e8c35a';
    for(let i=0;i<3;i++){ const a=t*5+i*2.1; star(cx+Math.cos(a)*22, headY+Math.sin(a)*5, 5); ctx.fill(); }
    ctx.restore(); }
  if(wolf.windup>0){ ctx.save(); ctx.font="700 22px 'Zen Old Mincho',serif"; ctx.textAlign='center';
    ctx.fillStyle='#c9503f'; ctx.fillText('！',cx,wg===1?headY-6:headY+22); ctx.restore(); }
}
function star(cx,cy,r){ ctx.beginPath(); for(let i=0;i<10;i++){ const a=-Math.PI/2+i*Math.PI/5, rr=i%2?r*0.45:r; ctx.lineTo(cx+Math.cos(a)*rr,cy+Math.sin(a)*rr); } ctx.closePath(); }
GT.registerDraw(()=>{ if(GT.scene&&GT.scene.type==='boss'&&wolf&&!(GT.mode==='ambush'&&ambush.phase!=='done')) drawWolf(); },'world');   // 会話のあいだも見せる（奇襲の演出中は、横たわった絵のほう）

/* ---- ボス戦の画面表示：体力バー・攻略のヒント・ポップ文字・勝利の文字 ---- */
function drawBossHud(){
  if(!wolf || !GT.scene || GT.scene.type!=='boss') return;
  const now=performance.now(), dt=Math.min(0.05,(now-fx.last)/1000); fx.last=now;
  ctx.save();
  // 体力バー
  const bw=220, bx=W/2-bw/2, by=34;
  GT.roundRect(bx-10,by-6,bw+20,30,14); ctx.fillStyle='rgba(43,36,24,0.82)'; ctx.fill();
  ctx.font="700 13px 'Zen Old Mincho',serif"; ctx.textBaseline='middle'; ctx.textAlign='left'; ctx.fillStyle='#f3ead0';
  ctx.fillText('狼',bx+2,by+9);
  for(let i=0;i<wolf.maxhp;i++){ const x=bx+30+i*((bw-34)/wolf.maxhp);
    GT.roundRect(x,by+3,(bw-34)/wolf.maxhp-6,12,6); ctx.fillStyle=i<wolf.hp?(wolf.enraged?'#e0563f':'#c9503f'):'rgba(232,220,192,0.18)'; ctx.fill(); }
  // ヒント（はじめて当てるまで）
  if(!fx.hintOff && GT.mode==='boss'){
    ctx.textAlign='center'; ctx.font="700 13px 'Zen Old Mincho',serif";
    GT.roundRect(W/2-210,122,420,48,12); ctx.fillStyle='rgba(43,36,24,0.72)'; ctx.fill();
    ctx.globalAlpha=0.8+0.2*Math.sin(now/300); ctx.fillStyle='#f3ead0';
    ctx.fillText('狼が家具と重なったら そのページを裏返し、着地したら すぐもう一度',W/2,137);
    ctx.fillText('しがみつく狼の頭に、飛んでいった家具が落ちてくる',W/2,157);
    ctx.globalAlpha=1;
  }
  // ポップ文字
  ctx.textAlign='center'; ctx.font="700 18px 'Zen Old Mincho',serif";
  fx.pops=fx.pops.filter(p=>{ p.t+=dt; if(p.t>0.9) return false;
    ctx.globalAlpha=1-p.t/0.9; ctx.fillStyle=p.color; ctx.fillText(p.text,p.x,p.y-p.t*30); return true; });
  // 星の粒
  ctx.fillStyle='#e8c35a';
  fx.stars=fx.stars.filter(s=>{ s.t+=dt; if(s.t>0.6) return false; s.x+=s.vx*dt; s.y+=s.vy*dt;
    ctx.globalAlpha=1-s.t/0.6; star(s.x,s.y,4); ctx.fill(); return true; });
  // 勝利の文字
  if(fx.banner){ fx.banner.t+=dt; const k=fx.banner.t;
    ctx.globalAlpha=Math.min(1,k*3)*(k>1.4?Math.max(0,1-(k-1.4)*3):1);
    ctx.font="700 40px 'Zen Old Mincho',serif"; ctx.fillStyle='rgba(43,36,24,0.85)';
    ctx.fillText(fx.banner.text,W/2+2,H/2-18); ctx.fillStyle='#f3ead0'; ctx.fillText(fx.banner.text,W/2,H/2-20); }
  ctx.restore();
}
GT.registerDraw(drawBossHud,'overlay');

/* ---- 狼にやられたときのゲームオーバー -----------------------------------------
   ① 白くひかって画面がゆれ、爪あとが三本、ページを裂く
   ② 少年のまわりから、暗やみが輪になってせばまる（暗やみの中に、狼の赤い目）
   ③ 物語の一文が書かれる「少年は、狼に たべられてしまった。」→「おしまい……？」
   ④ ページがもどって、戦いをやり直す */
const WOLF_GO_DUR=4.4;
GT.registerGameOver('wolf',{
  dur:WOLF_GO_DUR,
  start(go){
    const pl=GT.player; go.px=pl.x+pl.w/2; go.py=pl.y+pl.h/2;
    go.cx=Math.max(170,Math.min(W-170,go.px)); go.cy=Math.max(130,Math.min(H-130,go.py));   // 爪あとの中心（ページの中に収める）
    go.eye = wolf ? { x:wolf.x+wolf.w/2+(wolf.dir>=0?14:-14), y:(GT.gravity[wolf.page]===1? wolf.y+wolf.h-58 : wolf.y+58), dir:wolf.dir>=0?1:-1 } : null;
    const a=-0.95+Math.random()*0.2;                                    // 爪あとの向き（右上から左下へ）
    go.claws=[-1,0,1].map(k=>({ a, ox:k*26, len:300+Math.random()*60, w:9+Math.random()*3, drips:[0.35,0.55,0.7].map(u=>({u:u+Math.random()*0.1,len:14+Math.random()*26})) }));
    go.spat=Array.from({length:14},()=>({ x:go.cx+(Math.random()*2-1)*150, y:go.cy+(Math.random()*2-1)*90, r:2+Math.random()*7 }));
    GT.shake(12,0.6); GT.hurtFlash=1;
    GT.musicHush&&GT.musicHush(WOLF_GO_DUR+0.6); GT.sfx&&GT.sfx('gore');   // 少年が、狼にやられた
  },
  draw(go){
    const t=go.t, c=ctx;
    c.save();
    // ① 白い光
    if(t<0.25){ c.fillStyle=`rgba(255,244,228,${0.85*(1-t/0.25)})`; c.fillRect(0,0,W,H); }
    // ② 暗やみの輪（少年のまわりから、せばまる）
    const k=Math.min(1,Math.max(0,(t-0.35)/1.3)), e=k*k*(3-2*k);
    const R=Math.hypot(W,H)*(1-e)+ (e<1?0:0), r0=Math.max(0,R*0.55);
    { const g=c.createRadialGradient(go.px,go.py,r0,go.px,go.py,Math.max(r0+1,R));
      g.addColorStop(0,'rgba(20,10,8,0)'); g.addColorStop(1,`rgba(20,10,8,${0.25+0.7*e})`);
      c.fillStyle=g; c.fillRect(0,0,W,H);
      if(e>0.02){ c.beginPath(); c.rect(0,0,W,H); c.arc(go.px,go.py,Math.max(0,R),0,Math.PI*2,true); c.fillStyle=`rgba(20,10,8,${Math.min(1,0.3+e)})`; c.fill(); } }
    // 爪あと（赤いインク）
    const cl=Math.min(1,t/0.16);
    for(const [i,cw] of go.claws.entries()){
      const p=Math.min(1,Math.max(0,(t-i*0.04)/0.12)); if(p<=0) continue;
      const ca=Math.cos(cw.a), sa=Math.sin(cw.a), nx=-sa, ny=ca;
      const cx=go.cx+nx*cw.ox, cy=go.cy+ny*cw.ox, L=cw.len;
      const x0=cx-ca*L/2, y0=cy-sa*L/2, x1=x0+ca*L*p, y1=y0+sa*L*p;
      for(const [col,wk] of [['#4a0c08',1],['#9e2218',0.55]]){
        c.beginPath(); c.moveTo(x0,y0);
        c.quadraticCurveTo((x0+x1)/2+nx*cw.w*wk,(y0+y1)/2+ny*cw.w*wk,x1,y1);
        c.quadraticCurveTo((x0+x1)/2-nx*cw.w*wk*0.6,(y0+y1)/2-ny*cw.w*wk*0.6,x0,y0);
        c.fillStyle=col; c.fill(); }
      if(t>0.3) for(const d of cw.drips){ const dp=Math.min(1,(t-0.3)/1.2); const dx=x0+ca*L*d.u, dy=y0+sa*L*d.u;   // したたる
        c.beginPath(); c.moveTo(dx-2,dy); c.lineTo(dx+2,dy); c.lineTo(dx+1.2,dy+d.len*dp); c.arc(dx,dy+d.len*dp,1.8,0,Math.PI); c.lineTo(dx-1.2,dy+d.len*dp); c.closePath(); c.fillStyle='#7a1610'; c.fill(); }
    }
    if(cl>=1) for(const sp of go.spat){ c.globalAlpha=0.85; c.beginPath(); c.ellipse(sp.x,sp.y,sp.r,sp.r*0.8,0,0,Math.PI*2); c.fillStyle='#6e140e'; c.fill(); } c.globalAlpha=1;
    // 暗やみの中の、狼の赤い目
    if(go.eye && t>0.7){ const a=Math.min(1,(t-0.7)/0.5)*(t>2.6&&t<2.75?0.1:1);
      c.save(); c.globalAlpha=a; c.shadowColor='rgba(255,40,30,0.95)'; c.shadowBlur=16;
      for(const s of [-1,1]){ const ex=go.eye.x+s*7, ey=go.eye.y;
        c.beginPath(); c.ellipse(ex,ey,5,2.6,s*go.eye.dir*0.25,0,Math.PI*2); c.fillStyle='#ff4a30'; c.fill(); }
      c.restore(); }
    // ③ 物語の一文
    const line1='少年は、狼に たべられてしまった。';
    if(t>1.5){ const n=Math.min(line1.length,Math.floor((t-1.5)/0.055));
      c.textAlign='center'; c.textBaseline='middle'; c.font="700 26px 'Zen Old Mincho',serif";
      const full=c.measureText(line1).width, shown=line1.slice(0,n);
      c.textAlign='left'; c.fillStyle='rgba(0,0,0,0.6)'; c.fillText(shown,W/2-full/2+2,H/2-8+2);
      c.fillStyle='#e8d9b8'; c.fillText(shown,W/2-full/2,H/2-8);
      if(n<line1.length && Math.floor(t*6)%2===0){ c.fillStyle='#e8d9b8'; c.fillRect(W/2-full/2+c.measureText(shown).width+3,H/2-20,2,24); } }
    if(t>3.0){ c.globalAlpha=Math.min(1,(t-3.0)/0.5); c.textAlign='center'; c.font="600 17px 'Zen Old Mincho',serif";
      c.fillStyle='#b08d77'; c.fillText('―― おしまい……？',W/2,H/2+30); }
    if(t>3.6){ c.globalAlpha=Math.min(1,(t-3.6)/0.4)*0.85; c.font="500 13px 'Zen Old Mincho',serif";
      }   // （「ページをもどって、やりなおす」などの文は出さない）
    c.restore();
  },
});

/* ---- 奇襲（狼がおばあさんの寝間着でベッドに寝ているとき＝戸口で赤ずきんを止めたときだけ） ----
   ① ベッドで寝たふりをする狼（まくらに頭・ナイトキャップ・ふとんのふくらみ・はみ出たしっぽ・Zzz）
      「本を裏返して、狼を天井へたたきつけろ！」
   ※ 赤ずきんを助ける QTE に成功したときも、②〜④ と同じ演出（体力は減らさず、ひるませるだけ）。startAmbush(done,{auto:true,…})
   ② 少年が本を裏返す（F／スペース／反転ボタン）→ 左ページの重さが逆になり、狼がベッドから天井へ落ちていく
   ③ 天井にたたきつけられて、ひるむ（ドスン！ ギャン！ 狼の体力 3→2・赤く点滅・ぶるぶる・星）
   ④ 本がもとにもどり、狼は床へ落ちて目を回す →「奇襲成功！」→ 会話 → 戦い（すぐに攻めこめる） */
const BED={ x:100, top:418 };                // ベッド（ふとんの上の面の高さ）
const AMB_X=150, AMB_LAND=184;               // 天井にたたきつけられる場所・床に落ちる場所（x）
const ambush={ phase:null, t:0, x:BED.x, y:0, vy:0, rot:0, done:null, cap:null, opt:{} };
// ベッドで寝たふりをする狼：まくらに頭をあずけ、からだは ふとんの中（ふくらみ）。足もとから しっぽがはみ出す
function drawWolfInBed(breath){
  const t=performance.now()/1000, b=breath||0, HS=WOLF_BOSS_H*0.9;
  ctx.save();
  // しっぽ（足もとの柱のむこうから、ゆらゆら）
  ctx.save(); ctx.translate(150,428); ctx.rotate(-0.5+Math.sin(t*2.2)*0.12);
  ctx.beginPath(); ctx.ellipse(16,0,17,7,0,0,Math.PI*2); ctx.fillStyle='#8f7f78'; ctx.fill(); ctx.strokeStyle='#4a3a30'; ctx.lineWidth=1.2; ctx.stroke();
  ctx.beginPath(); ctx.ellipse(28,0,7,5.5,0,0,Math.PI*2); ctx.fillStyle='#f3e6d4'; ctx.fill(); ctx.restore();
  // 頭（まくらにもたれて、うしろへ傾く）。首から下は、ふとんでかくれる
  ctx.save(); ctx.beginPath(); ctx.rect(0,0,W,BED.top+8-b); ctx.clip();
  ctx.translate(62,BED.top+2-b); ctx.rotate(-0.5);
  if(!(GT.hasSprite&&GT.hasSprite('wolfRight')&&GT.drawCharSprite('wolf',0,HS*0.3,HS,1,1))){
    ctx.beginPath(); ctx.ellipse(0,-20,20,22,0,0,Math.PI*2); ctx.fillStyle='#8f7f78'; ctx.fill(); }
  // おばあさんのナイトキャップ（耳のあいだに、ちょこんと）
  ctx.beginPath(); ctx.ellipse(4,-HS*0.66,15,9,0,Math.PI,0); ctx.lineTo(17,-HS*0.66+3); ctx.lineTo(-11,-HS*0.66+3); ctx.closePath();
  ctx.fillStyle='#f6eed8'; ctx.fill(); ctx.strokeStyle='#5a4630'; ctx.lineWidth=1.2; ctx.stroke();
  for(let i=0;i<7;i++){ ctx.beginPath(); ctx.arc(-11+i*4.6,-HS*0.66+3,2.4,0,Math.PI*2); ctx.fillStyle='#fffaf0'; ctx.fill(); }
  ctx.restore();
  // ふとんのふくらみ（からだ）
  ctx.beginPath(); ctx.moveTo(64,BED.top+30); ctx.lineTo(64,BED.top+2-b); ctx.quadraticCurveTo(76,BED.top-12-b,98,BED.top-14-b);
  ctx.quadraticCurveTo(122,BED.top-17-b,134,BED.top-6-b); ctx.quadraticCurveTo(146,BED.top-2,146,BED.top+8); ctx.lineTo(146,BED.top+30); ctx.closePath();
  const g=ctx.createLinearGradient(0,BED.top-16,0,BED.top+30); g.addColorStop(0,'#b9786a'); g.addColorStop(1,'#8b5e63'); ctx.fillStyle=g; ctx.fill();
  ctx.strokeStyle='#3a2a1a'; ctx.lineWidth=1.4; ctx.stroke();
  ctx.save(); ctx.clip(); ctx.strokeStyle='rgba(255,245,225,0.55)'; ctx.setLineDash([2,2]); ctx.lineWidth=0.8;
  for(const sx of [72,92,112,130]){ ctx.beginPath(); ctx.moveTo(sx,BED.top-20); ctx.lineTo(sx,BED.top+30); ctx.stroke(); }
  ctx.beginPath(); ctx.moveTo(50,BED.top+6); ctx.quadraticCurveTo(100,BED.top-4-b,150,BED.top+6); ctx.stroke(); ctx.restore();
  ctx.restore();
}
GT.drawWolfInBed=()=>drawWolfInBed(Math.sin(performance.now()/1000*2)*1.2);   // 到着の場面（12_grannys_house.js）でも使う
// とんでいる狼（中心 x,y・回転 rot）／天井でひるむ狼（足が天井）
function drawSpinWolf(x,y,rot,flash){
  ctx.save(); ctx.translate(x,y); ctx.rotate(rot);
  if(flash && Math.floor(performance.now()/60)%2===0) ctx.filter='sepia(1) saturate(6) hue-rotate(-45deg) brightness(1.1)';
  GT.drawCharSprite('wolf',0,WOLF_BOSS_H/2,WOLF_BOSS_H,1,1); ctx.restore();
}
/* opt.auto   … 本を裏返すのを待たずに、すぐ天井へ（QTE で、もう裏返したあと）
   opt.damage … 天井にたたきつけたとき、狼の体力を 1 減らすか（ふつうは true）
   opt.banner … 床に落ちたときの文字　opt.land … 床に落ちる場所(x)　opt.flipSfx … 裏返す音を鳴らすか */
function startAmbush(done,opt){
  opt=Object.assign({auto:false, damage:true, banner:'奇襲成功！', land:AMB_LAND, flipSfx:true}, opt||{});
  Object.assign(ambush,{ phase:'wait', t:0, x:BED.x, y:0, vy:0, rot:0, done, cap:null, opt });
  wolf.hp=wolf.maxhp; wolf.x=-200;                                       // 立っている狼は、奇襲がすむまで出さない
  const pl=GT.player; pl.x=262; pl.y=H-EDGE-pl.h; pl.vx=pl.vy=0; pl.facing=-1;   // 少年は戸口のそば（ベッドのほうを向く）
  GT.mode='ambush';
  if(opt.auto) beginRise();
}
// ベッドから天井へ（本を裏返した）
function beginRise(){
  Object.assign(ambush,{ phase:'rise', t:0, x:80, y:BED.top-10, vy:-200, rot:-Math.PI/2 });   // ベッドから、ふわっと浮く
  ambush.cap={ x:62, y:BED.top-46, vy:-60, vx:-20, r:0 };                                     // ナイトキャップが脱げて、ひらひら
  if(ambush.opt.flipSfx) GT.sfx&&GT.sfx('flip');
  GT.shake(4,0.25); pop('！？',100,BED.top-60,'#5a4630');
}
// 本を裏返すと、奇襲
GT.registerFlipIntercept(()=>{
  if(GT.mode!=='ambush'||ambush.phase!=='wait') return false;
  beginRise(); return true;
});
const CEIL=EDGE+WOLF_BOSS_H/2;               // 天井に足をつけたときの、絵の中心の高さ
GT.registerModeUpdate('ambush', dt=>{
  if(!wolf) return; const a=ambush; a.t+=dt;
  if(a.cap){ a.cap.vy-=300*dt; a.cap.y+=a.cap.vy*dt; a.cap.x+=a.cap.vx*dt; a.cap.r+=dt*2.5; if(a.cap.y<EDGE+10){ a.cap.y=EDGE+10; a.cap.vy=0; a.cap.vx=0; } }
  if(a.phase==='rise'){                                                   // 天井へ落ちていく（くるりと回って、足から）
    a.vy-=2600*dt; a.y+=a.vy*dt; a.x+=(AMB_X-a.x)*Math.min(1,dt*6);
    a.rot+=(Math.PI-a.rot)*Math.min(1,dt*7);
    if(a.y<=CEIL){ a.y=CEIL; a.rot=Math.PI; a.x=AMB_X; a.phase='stuck'; a.t=0;
      GT.sfx&&GT.sfx('hit'); GT.shake(12,0.45);
      if(a.opt.damage) wolf.hp=wolf.maxhp-1;
      pop('ドスン！',a.x,EDGE+WOLF_BOSS_H+22,'#5a4630'); pop('ギャン！',a.x+46,EDGE+WOLF_BOSS_H*0.6); burst(a.x,EDGE+4,16); }
  } else if(a.phase==='stuck'){                                           // 天井で、ひるむ
    if(a.t>1.1){ a.phase='fall'; a.t=0; a.vy=0; GT.sfx&&GT.sfx('flip'); }   // 本がもとにもどる
  } else if(a.phase==='fall'){                                            // 床へ落ちる（くるりと回って、足から）
    a.vy+=2600*dt; a.y+=a.vy*dt; a.x+=(a.opt.land-a.x)*Math.min(1,dt*5);
    a.rot+=(Math.PI*2-a.rot)*Math.min(1,dt*7);
    const floorY=H-EDGE-WOLF_BOSS_H/2;
    if(a.y>=floorY){ a.phase='done'; a.t=0; GT.shake(6,0.2); GT.sfx&&GT.sfx('land');
      wolf.x=a.opt.land-wolf.w/2; wolf.y=H-EDGE-wolf.h; wolf.vy=0; wolf.vx=0; wolf.onGround=true; wolf.page='left'; wolf.lastG=GT.gravity.left;
      wolf.dir=-1; wolf.dizzy=DIZZY+1.8; wolf.squash=0.5; wolf.lungeCD=2.2;
      GT.sfx&&GT.sfx('dizzy'); }   // （「奇襲成功！」「間に合った！」の文字は出さない）
  } else if(a.phase==='done'){
    wolf.squash+=(1-wolf.squash)*Math.min(1,dt*6);
    if(a.t>1.6 && a.done){ const d=a.done; a.done=null; a.phase=null; a.cap=null; d(); }
  }
});
GT.registerDraw(()=>{
  if(GT.mode!=='ambush') return; const a=ambush, t=performance.now()/1000;
  if(a.phase==='wait'){
    drawWolfInBed(Math.sin(t*2)*1.2);                                   // 寝息で、ふとんが すこし上下する
    ctx.save(); ctx.font="700 16px 'Zen Old Mincho',serif"; ctx.textAlign='center'; ctx.fillStyle='rgba(90,70,48,0.85)';
    for(let i=0;i<3;i++){ const k=(t*0.6+i/3)%1; ctx.globalAlpha=Math.sin(k*Math.PI); ctx.fillText('z',96+k*22+i*4,BED.top-62-k*40); }
    ctx.restore();
    GT.drawHint(W/2-20,150,['狼は、ベッドで寝たふりをしている……',[['F','Space'],'本を裏返す']]);
  } else if(a.phase==='rise' || a.phase==='fall'){
    drawSpinWolf(a.x,a.y,a.rot,false);
  } else if(a.phase==='stuck'){                                           // 天井でひるむ：ぶるぶる・赤く点滅・目を回す星
    const sh=a.t<0.5?Math.sin(t*70)*3*(1-a.t/0.5):0;
    drawSpinWolf(a.x+sh,a.y,Math.PI,a.t<0.6);
    ctx.save(); ctx.fillStyle='#e8c35a';
    for(let i=0;i<3;i++){ const ang=t*5+i*2.1; star(a.x+Math.cos(ang)*24, EDGE+WOLF_BOSS_H+8+Math.sin(ang)*5, 5); ctx.fill(); }
    ctx.restore();
  }
  if(a.cap){ ctx.save(); ctx.translate(a.cap.x,a.cap.y); ctx.rotate(a.cap.r); ctx.beginPath(); ctx.ellipse(0,0,15,9,0,Math.PI,0); ctx.closePath();
    ctx.fillStyle='#f6eed8'; ctx.fill(); ctx.strokeStyle='#5a4630'; ctx.lineWidth=1.2; ctx.stroke(); ctx.restore(); }
},'world');

// ボス戦シーン（injectSceneAfterCurrent で差し込まれる {type:'boss',...}）
GT.registerSceneType('boss', scene=>{
  GT.loadStageDef(GT.STAGE_DEFS['wolf_boss']); spawnWolf(); GT.mode='idle';
  GT.setHudStage('第一章 ── 狼との戦い');
  const fight=()=>GT.beginDialogue(scene.intro||[],null,()=>{ GT.hideDialogue(); GT.mode='boss'; });
  if(scene.ambush){ startAmbush(fight); }
  else if(scene.saveHood){ startAmbush(fight,{auto:true, damage:false, banner:'間に合った！', land:120, flipSfx:false}); }   // QTE 成功：赤ずきんに届く前に、狼は天井へ    // 狼がベッドで寝たふりをしている：本を裏返して奇襲（狼の体力を 1 減らしてから戦う）
  else fight();
});
})();
