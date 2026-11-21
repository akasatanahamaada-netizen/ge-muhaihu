/* ============================================================================
   Gravity Tale ── エンジン：物理（毎フレームの更新）
   ----------------------------------------------------------------------------
   メインループ（loop）と update：少年・木箱・敵の動き、当たり判定、かけらを拾う、右の端でページをめくる。
   エンジンのファイルは js/engine/ にあり、index.html で core.js → … → boot.js の順に読む。
   どのファイルも、いちばん外側の const / let / function を共有している（ふつうの <script> なので）。
   ========================================================================== */
"use strict";
/* ========================================================================== */
/*  物理                                                                      */
/* ========================================================================== */
let lastTime=performance.now();
GT.paused=false;                     // true のあいだ、ゲームは止まる（メニューを開いているときなど）
function loop(now){ let dt=(now-lastTime)/1000; dt=Math.min(dt,1/30); lastTime=now; if(!GT.paused){ update(dt); updateFlipBuffer(dt); } else if(flipping){ flipT+=dt; if(flipT>=FLIP_DUR){ flipping=false; setFlipHide(false); } } applyShake(dt); render(); requestAnimationFrame(loop); }   // メニューを開いたまま めくるとき（タイトルの章えらび）も、めくりを進める

function update(dt){
  const player=GT.player, gravity=GT.gravity, boxes=GT.boxes, enemies=GT.enemies;
  goalPulse+=dt;
  flashPage.left=Math.max(0,flashPage.left-dt*2.2);
  flashPage.right=Math.max(0,flashPage.right-dt*2.2);
  GT.hurtFlash=Math.max(0,GT.hurtFlash-dt*2.5);
  GT.invincible=Math.max(0,GT.invincible-dt);

  if(flipping){
    if(GT.flipFreeze!=null) flipT=GT.flipFreeze*FLIP_DUR; else flipT+=dt;   // flipFreeze（0〜1）… 確認用に、めくりの途中で止める
    if(flipT>=FLIP_DUR){ flipping=false; setFlipHide(false); }
    return;
  }
  heartLost=Math.max(0,heartLost-dt*1.6);
  if(gameOver){                                               // ゲームオーバー：少し見せてから、ページを前へもどしてやり直す
    gameOver.t+=dt;
    if(gameOver.t>gameOver.dur) startPageFlip(-1);
    return;
  }

  if(storyStage) for(const n of npcs){                       // 人物も、ページの重力にしたがう
    if(n.noGravity){ n.g=1; n.vy=0; n.y=H-EDGE-n.h; if(n.speech){ n.speech.t-=dt; if(n.speech.t<=0) n.speech=null; } continue; }   // 重力の影響を受けない人（床を歩きつづける）
    const before=n.g; GT.fallBody(n,dt);
    if(before!==n.g && n.x>-100) GT.grumble(n,n.who);          // 逆さにされた（何回もされると怒る）
    if(n.speech){ n.speech.t-=dt; if(n.speech.t<=0) n.speech=null; } }
  if(companion){ const c=companion, before=c.g; GT.fallBody(c,dt);
    if(before!==c.g) { const sp=GT.grumble(c,c.who); }                  // 逆さにされた（何回もされると怒る）
    if(c.speech){ c.speech.t-=dt; if(c.speech.t<=0) c.speech=null; }
    if(GT.physicsModes.has(GT.mode) && !flipping){
      const pl=player, back=pl.facing>=0?-38:38, target=pl.x+back;
      if(Math.abs(c.x-pl.x)>380 && pl.onGround){ c.x=Math.max(EDGE,Math.min(W-EDGE-c.w,pl.x+back)); c.y=pl.y+pl.h-c.h; c.vy=0; }   // はなれすぎたら、そばへ
      else if(Math.abs(target-c.x)>22) GT.npcStep(c,target,175,dt); } }
  if(modeUpdaters[GT.mode]){ modeUpdaters[GT.mode](dt); return; }
  if(!GT.physicsModes.has(GT.mode)) return;
  if(storyTalking) return;
  // 押し戻しの向きを決めるため、このフレームのはじめの位置を覚えておく（resolveBodyCollisions が使う）
  for(const b of [player,...boxes,...enemies]){ b.px=b.x; b.py=b.y; }
  updateExitGate();                           // ミッションが終わっていれば右端を開ける
  missionFlash=Math.max(0,missionFlash-dt);

  if(storyStage){
    activeNpc=null; let best=1e9;
    const pcx=player.x+player.w/2, pcy=player.y+player.h/2;
    for(const n of npcs){ if(!n.talkable||n.talked) continue;
      const nx=n.x+n.w/2, ny=n.y+n.h/2;
      const d=Math.hypot(pcx-nx, pcy-ny);
      if(d<TALK_RANGE && d<best){ best=d; activeNpc=n; }
    }
  } else activeNpc=null;
  GT.activeNpc=activeNpc;   // 動作確認用に公開

  const page=GT.currentPage(); const g=gravity[page];
  const canSteer=!player.flipFall;            // 本を裏返して落ちているあいだは、左右のボタンが効かない
  const left=canSteer&&(keys['ArrowLeft']||keys['a']||keys['A']);
  const right=canSteer&&(keys['ArrowRight']||keys['d']||keys['D']);
  if(left&&!right){ player.vx-=ACCEL*dt; player.facing=-1; }
  else if(right&&!left){ player.vx+=ACCEL*dt; player.facing=1; }
  else{ const d=FRICTION*dt; if(Math.abs(player.vx)<=d) player.vx=0; else player.vx-=Math.sign(player.vx)*d; }
  // 沼に触れている間は最高速度が下がる（slow を書けば沼ごとに変えられる）
  const maxSpeed=MAX_SPEED*swampFactor(player);
  player.vx=Math.max(-maxSpeed,Math.min(maxSpeed,player.vx));

  player.vy+=GRAVITY*g*dt;
  const jump=keys['ArrowUp']||keys['w']||keys['W'];
  // 話しかけるのは、画面タップか Enter だけ（↑ はキャラの近くでもジャンプ）
  if(jump&&player.onGround){ player.vy=-JUMP_SPEED*swampFactor(player,'jump')*g; player.onGround=false; }

  for(const box of boxes){
    const bg=gravity[GT.pageOf(box)]; box.vy+=GRAVITY*bg*dt;
    const d=FRICTION*dt; if(Math.abs(box.vx)<=d) box.vx=0; else box.vx-=Math.sign(box.vx)*d;
    box.vx=Math.max(-MAX_SPEED,Math.min(MAX_SPEED,box.vx));
  }

  const prevX=player.x; player.x+=player.vx*dt; const dx=player.x-prevX;
  if(dx!==0){ for(const box of boxes){ if(GT.rectsOverlap(player,box)){ box.x+=dx; box.vx=player.vx; } } }
  for(const box of boxes) resolveBodyCollisions(box,'x',GT.pagePlatforms(GT.pageOf(box)));
  resolveBodyCollisions(player,'x',boxes.concat(GT.pagePlatforms(page)));   // 箱→地形の順（地形の中に残らない）

  for(const en of enemies){
    if(!en.alive){ en.deathT+=dt; en.squash+=(1-en.squash)*Math.min(1,dt*4); continue; }
    const active=(en.page===GT.currentPage()); const eg=gravity[en.page];
    // 足場・壁に加えて、同じページの木の箱も通り抜けられない
    const enPlats=GT.pagePlatforms(en.page).concat(boxes.filter(b=>GT.pageOf(b)===en.page));
    if(active){ en.x+=en.dir*ENEMY_SPEED*swampFactor(en)*dt;   // 沼の中では敵も遅くなる
      if(en.x<en.minX){ en.x=en.minX; en.dir=1; }
      if(en.x+en.w>en.maxX){ en.x=en.maxX-en.w; en.dir=-1; }
      for(const plat of enPlats){ if(!GT.rectsOverlap(en,plat)) continue;   // 足場・壁・箱にぶつかったら折り返す
        if(en.dir>0){ en.x=plat.x-en.w; en.dir=-1; } else { en.x=plat.x+plat.w; en.dir=1; } } }
    en.vy+=GRAVITY*eg*dt; en.onGround=false;
    // 速く落ちても薄い足場をすり抜けないよう、1回 8px 以下に刻んで判定する
    const steps=Math.max(1,Math.ceil(Math.abs(en.vy*dt)/8));
    for(let i=0;i<steps&&en.vy!==0;i++){ en.y+=en.vy*dt/steps; resolveBodyCollisions(en,'y',enPlats); }
    en.squash+=(1-en.squash)*Math.min(1,dt*10);
  }

  for(const box of boxes){
    box.onGround=false;
    // 速く落ちても薄い足場や敵をすり抜けないよう、1回 8px 以下に刻んで判定する
    const steps=Math.max(1,Math.ceil(Math.abs(box.vy*dt)/8)), vy0=box.vy;
    for(let i=0;i<steps&&box.vy!==0;i++){
      box.y+=vy0*dt/steps;
      resolveBodyCollisions(box,'y',GT.pagePlatforms(GT.pageOf(box)));
      const bg=gravity[GT.pageOf(box)];
      if(GT.rectsOverlap(box,player)&&box.vy*bg>0){       // 落ちてきた箱はプレイヤーの頭に乗る（めり込まない）
        box.y=(bg===1)?player.y-box.h:player.y+player.h; box.vy=0; box.onGround=true; }
      for(const en of enemies){
        if(!en.alive||en.page!==GT.pageOf(box)) continue; const eg=gravity[en.page];
        if(GT.rectsOverlap(box,en)&&box.vy*eg>150){ GT.sfx&&GT.sfx('hit'); en.alive=false; en.squash=0.18; en.vy=0; en.deathT=0;
          box.y=(eg===1)?en.y-box.h:en.y+en.h; box.vy=0; box.onGround=true; box.squash=1.3; }
        else if(GT.rectsOverlap(box,en)&&box.vy*eg>0){   // ゆっくり落ちてきた箱は敵の上に乗る（めり込まない）
          box.y=(eg===1)?en.y-box.h:en.y+en.h; box.vy=0; box.onGround=true; }
      }
    }
    box.squash+=(1-box.squash)*Math.min(1,dt*10);
  }

  // 速く落ちても薄い足場をすり抜けないよう、1回 8px 以下に刻んで判定する
  player.onGround=false;
  const pSteps=Math.max(1,Math.ceil(Math.abs(player.vy*dt)/8)), pCols=boxes.concat(GT.pagePlatforms(page));
  for(let i=0;i<pSteps&&player.vy!==0;i++){ player.y+=player.vy*dt/pSteps; resolveBodyCollisions(player,'y',pCols); }
  if(player.onGround) player.flipFall=false;   // 着地したら、また左右に動ける

  for(const it of GT.items){ if(!it.got&&!it.hidden&&GT.rectsOverlap(player,GT.itemHitbox(it))){ it.got=true; it.gotT=0;   // アイテムを取る（hidden のあいだは取れない）
    if(itemLook==='page'){ hudPulse=1; chime(); flyScrapToBook(it); if(curStageDef&&curStageDef.itemsOptional&&GT.items.every(i=>i.got)) missionFlash=2.2; }
    const bp=curStageDef&&curStageDef.bookPage&&GT.pageRecord.find(p=>p.key===curStageDef.bookPage);   // 本のページに記録
    if(bp){ bp.found=bp.found||[]; if(!bp.found.includes(it.pid)) bp.found.push(it.pid); } } }
  hudPulse=Math.max(0,hudPulse-dt*1.8);
  for(const it of GT.items) if(it.got) it.gotT+=dt;

  if(GT.invincible<=0){ for(const en of enemies){ if(en.alive&&GT.rectsOverlap(player,en)){ GT.damagePlayer(en.x+en.w/2); break; } } }   // ぶつかったらハートが減る

  for(const fn of updatePasses) fn(dt);     // ボス戦など拡張の更新

  if(GT.goal&&GT.rectsOverlap(player,GT.goal)&&missionDone()){ startPageFlip(); }
  if(GT.mode==='play'&&stageExit&&!flipping&&(player.x+player.w/2)>=W-8){ startPageFlip(); }

  player.x=Math.max(-40,Math.min(W+40,player.x));
  player.y=Math.max(-400,Math.min(H+400,player.y));
  player.squash+=(1-player.squash)*Math.min(1,dt*10);
}

GT.respawnPlayer=function(){ const pl=GT.player; GT.sfx&&GT.sfx('hit');
  pl.x=player_start.x; pl.y=player_start.y; pl.vx=0; pl.vy=0; pl.squash=0.6; GT.hurtFlash=1; GT.invincible=1.0; };

/* 沼に触れていれば倍率（いちばん効きの強い沼のもの）、触れていなければ 1
   what='slow' … 歩く速さ（沼の slow / 標準 SWAMP_SLOW）
   what='jump' … ジャンプの勢い（沼の jump / 標準 SWAMP_JUMP） */
function swampFactor(body,what){
  const key=what||'slow', def=key==='jump'?SWAMP_JUMP:SWAMP_SLOW;
  let f=1;
  for(const sw of GT.swamps){ if(GT.rectsOverlap(body,sw)) f=Math.min(f,sw[key]!=null?sw[key]:def); }
  return f;
}
GT.swampFactor=swampFactor;

/* めり込みを押し戻す。L=左へ R=右へ U=上へ D=下へ
   body.px / body.py（そのフレームのはじめの位置。update の最初に記録）があれば、
   「はじめにいた側」へ戻す。箱にはさまれても、壁や床の反対側へは決して抜けない。 */
function resolveBodyCollisions(body,axis,colliders){
  for(const plat of colliders){
    if(plat===body) continue; if(!GT.rectsOverlap(body,plat)) continue;
    const side=pickSide(body,axis,plat);
    if(side) pushOut(body,plat,side); else if(axis==='x') body.vx=0;
  }
}
function pickSide(body,axis,plat){
  if(body.px!==undefined){
    const E=0.01;
    const l=body.px+body.w<=plat.x+E, r=body.px>=plat.x+plat.w-E;
    const u=body.py+body.h<=plat.y+E, d=body.py>=plat.y+plat.h-E;
    if(axis==='x'){ if(l) return 'L'; if(r) return 'R'; if(u) return 'U'; if(d) return 'D'; }
    else          { if(u) return 'U'; if(d) return 'D'; if(l) return 'L'; if(r) return 'R'; }
    // はじめから重なっていた（はさまれていた）：一番浅い向きへ。ただし本の外側へは出さない
    const need={ L:body.x+body.w-plat.x, R:plat.x+plat.w-body.x, U:body.y+body.h-plat.y, D:plat.y+plat.h-body.y };
    if(plat.kind==='floorEdge') need.D=Infinity; else if(plat.kind==='ceilingEdge') need.U=Infinity;
    else if(plat.kind==='wallEdge'){ if(plat.x<SPINE) need.L=Infinity; else need.R=Infinity; }
    return ['L','R','U','D'].reduce((a,b)=>need[b]<need[a]?b:a);
  }
  // はじめの位置が分からない体（拡張側の独自キャラなど）は、動いてきた向きの反対へ
  return axis==='x' ? (body.vx>0?'L':body.vx<0?'R':null) : (body.vy>0?'U':body.vy<0?'D':null);
}
const LAND_SQUASH_SPEED=150;   // これより速く落ちてきて着地したときだけ、つぶれる（px/秒）
function pushOut(body,plat,side){
  if(side==='L'){ body.x=plat.x-body.w; body.vx=0; return; }
  if(side==='R'){ body.x=plat.x+plat.w; body.vx=0; return; }
  const g = GT.gravity[GT.pageOf(body)];
  // つぶれる演出（squash）は、勢いよく着地したときだけ。床に置いてあるだけの箱は、毎フレーム少しだけ沈んで押し戻されるので、
  // そこでつぶすと、ずっと横に広がったまま ぷるぷる震えて見える
  const impact = body.vy*g;
  if(side==='U'){ body.y=plat.y-body.h; body.vy=0; if(g===1){ body.onGround=true; if(impact>LAND_SQUASH_SPEED) body.squash=1.28; } }
  else          { body.y=plat.y+plat.h; body.vy=0; if(g===-1){ body.onGround=true; if(impact>LAND_SQUASH_SPEED) body.squash=1.28; } }
}
GT.resolveBodyCollisions=resolveBodyCollisions;

