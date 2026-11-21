/* ============================================================================
   Gravity Tale ── エンジン：場面の進行・ハートとゲームオーバー・人物に話しかけるしくみ
   ----------------------------------------------------------------------------
   startScene / advanceScene、ハート（体力）とゲームオーバー、ステージ上の人物（NPC）との会話。
   エンジンのファイルは js/engine/ にあり、index.html で core.js → … → boot.js の順に読む。
   どのファイルも、いちばん外側の const / let / function を共有している（ふつうの <script> なので）。
   ========================================================================== */
"use strict";
/* ---- シーン進行 ---------------------------------------------------------- */
const sceneStartHooks=[];
GT.onSceneStart=fn=>{ sceneStartHooks.push(fn); };      // シーンが始まるたびに呼ばれる（menu.js のセーブ用）
/* ---- 体力（ハート 3つ）とゲームオーバー -------------------------------------
   敵や狼にぶつかると、ハートが 1つ減って、はじき飛ばされる（少しのあいだ無敵）。
   3回ダメージを受けると、ゲームオーバー → ページが前へ もどって、そのステージを最初からやり直す。
   ハートは、ページ（ステージ）を進んでも、やり直しても、そのまま。
   3つにもどるのは、ゲームオーバーのあとと、メニューから始めたとき（はじめから・つづきから・ステージをえらぶ）だけ。 */
GT.MAX_HP=3; GT.hp=GT.MAX_HP;
let gameOver=null, heartLost=0;            // gameOver … {t:経過秒, cause, dur}（ゲームオーバーの演出中）
/* やられ方ごとのゲームオーバー演出。ステージ側で登録する（例：12 おばあさんの家の 'wolf'）。
   GT.registerGameOver('名前', { dur:秒, start(go){…}, draw(go){…} })
   GT.damagePlayer(x, '名前') でハートが 0 になると、その演出になる（登録がなければ、ふつうのゲームオーバー） */
const gameOverStyles={};
GT.registerGameOver=(name,style)=>{ gameOverStyles[name]=style; };
/* 画面ゆれ：GT.shake(強さpx, 秒)。キャンバスごと、こきざみに揺らす */
let shakeT=0, shakeDur=0, shakePow=0;
GT.shake=(pow,dur)=>{ if(pow>=shakePow*(shakeDur>0?shakeT/shakeDur:0)){ shakePow=pow; shakeDur=shakeT=dur; } };
function applyShake(dt){
  if(shakeT<=0) return;
  shakeT=Math.max(0,shakeT-dt); const k=shakeDur>0?shakeT/shakeDur:0, a=shakePow*k*k;
  canvas.style.transform = shakeT>0 ? `translate(${((Math.random()*2-1)*a).toFixed(1)}px,${((Math.random()*2-1)*a).toFixed(1)}px)` : '';
}
GT.damagePlayer=function(fromX,cause){
  if(gameOver || flipping || GT.invincible>0) return false;
  GT.hp=Math.max(0,GT.hp-1); heartLost=1;
  GT.sfx&&GT.sfx('hit'); GT.hurtFlash=1;
  const pl=GT.player, g=GT.gravity[GT.currentPage()];
  if(GT.hp<=0){                                             // ゲームオーバー
    const st=cause&&gameOverStyles[cause];
    gameOver={t:0, cause:st?cause:null, dur:st&&st.dur?st.dur:1.6}; GT.mode='idle'; pl.vx=0; pl.vy=0; pl.squash=0.5;
    hideDialogue(); if(st&&st.start) st.start(gameOver); return true;
  }
  const away = fromX!=null ? ((pl.x+pl.w/2)<fromX?-1:1) : -pl.facing;   // ぶつかった相手と反対へ、はじき飛ばされる
  pl.vx=away*380; pl.vy=-360*g; pl.squash=0.6; GT.invincible=1.4;
  return true;
};
GT.isGameOver=()=>!!gameOver;
function startScene(idx){
  if(gameOver){ GT.hp=GT.MAX_HP; heartLost=0; }               // ゲームオーバーのあとだけ、ハートは 3つにもどる（ページを進んでもそのまま）
  gameOver=null;
  const direct = idx && typeof idx==='object';                 // シーンそのものを渡したとき（タイトル画面のうしろの場面など。playlist の外）
  GT.sceneIndex = direct ? GT.SCENES.indexOf(idx) : idx;   // （playlist にあるシーンなら、その番号）
  GT.scene = direct ? idx : GT.SCENES[idx]; const scene=GT.scene; if(!scene) return;
  for(const r of sceneResets) r();                      // 例：窓のぞき映像を閉じる
  for(const fn of sceneStartHooks) fn(scene, idx);
  if(scene.dynamic && dynamicHandlers[scene.dynamic]){ dynamicHandlers[scene.dynamic](scene); return; }
  if(sceneTypeHandlers[scene.type]){ sceneTypeHandlers[scene.type](scene); return; }
  if(scene.type==='talk'){
    if(scene.stage) GT.loadStageDef(GT.STAGE_DEFS[scene.stage]); GT.mode='idle';
    setHudStage(scene.label||'');
    beginDialogue(scene.lines||[], scene.choices, ()=>{ if(scene.onEnd) scene.onEnd(); advanceScene(); });
  } else if(scene.type==='play'){
    GT.loadStageDef(GT.STAGE_DEFS[scene.stage], {exit: scene.clear==='exit'});
    const cw=typeof scene.companion==='function'?scene.companion(GT.flags):scene.companion;
    if(cw){ const pl=GT.player; companion={who:cw, name:cw==='hood'?'赤ずきん':cw, page:'left', x:Math.max(EDGE,pl.x-40), w:32, h:40, y:H-EDGE-40, vy:0, g:1, talkable:false, onGround:true}; }   // うしろから ついてくる
    setHudStage((scene.label||'')+'　·　p.'+pageNo);
    if(scene.intro){ GT.mode='idle'; beginDialogue(Array.isArray(scene.intro)?scene.intro:[scene.intro],null,()=>{ hideDialogue(); GT.mode='play'; }); }   // 何行でも書ける
    else { GT.mode='play'; }
  } else if(scene.type==='story'){
    GT.loadStageDef(GT.STAGE_DEFS[scene.stage], {exit:false});
    storyStage=true; setupNpcs(scene.npcs);
    setHudStage((scene.label||'')+'　·　p.'+pageNo);
    const intro = scene.intro ? (Array.isArray(scene.intro)?scene.intro:[scene.intro]) : null;
    if(intro){ GT.mode='idle'; beginDialogue(intro,null,()=>{ hideDialogue(); GT.mode='play'; }); }
    else { GT.mode='play'; }
  } else {
    // 未知のタイプ：とりあえず会話だけ流す
    GT.mode='idle'; beginDialogue(scene.lines||[], scene.choices, ()=>advanceScene());
  }
}
function advanceScene(){ startScene(GT.sceneIndex+1); }
function injectSceneAfterCurrent(sc){ GT.SCENES.splice(GT.sceneIndex+1,0,sc); }
GT.storyPiece=(key,id,who)=>{ const n=who&&npcs.find(m=>m.who===who), ok=n&&n.x>-40&&n.x<W+40, r=ok?n:GT.player;
  GT.addPagePiece(key,id,{x:r.x,y:r.y,w:r.w,h:r.h}); };   // 大事な会話のあと・敵を倒したあと：お話のかけらが光の玉になって本へ
GT.openExit=()=>{ exitWanted=true; stageExit=true; goHint=true; GT.platforms=GT.platforms.filter(p=>!(p.page==='right'&&p.kind==='wallEdge')); };   // 右の端を開く（自分で歩いて、次のページへ）
GT.openStoryExit=()=>{ exitWanted=true; storyExitReady=true; updateExitGate(); };   // 話しかけなくても、右の端を開く
GT.startScene=startScene; GT.advanceScene=advanceScene; GT.injectSceneAfterCurrent=injectSceneAfterCurrent;
GT.getPageNo=()=>pageNo;
/* メニューなどから、好きなシーンへ飛ぶ（ページめくり・会話・QTE をいったん片づけてから始める） */
/* ページをめくる演出をはさんで、好きなシーンへ（メニューの「はじめから」など）。めくり終わりの半分で、そのシーンが始まる */
GT.flipToScene=function(idx, page){
  GT.hp=GT.MAX_HP; heartLost=0;           // メニューから始めるときは、ハートを 3つに
  flipping=false; flipT=0; flipSwapped=false;
  hideDialogue(); document.getElementById('qte').classList.remove('show');
  for(const k in keys) keys[k]=false;
  GT.mode='idle'; GT.player.vx=0;
  GT.sceneIndex=idx-1;                   // めくりの途中で advanceScene() → idx のシーンが始まる
  if(page) pageNo=page-1;                // めくると pageNo が 1 つ進む
  startPageFlip();
};
GT.jumpToScene=function(idx, page){
  GT.hp=GT.MAX_HP; heartLost=0;           // メニューから始めるときは、ハートを 3つに
  flipping=false; flipT=0; flipSwapped=false; setFlipHide(false);
  if(page) pageNo=page;
  hideDialogue(); document.getElementById('qte').classList.remove('show');
  for(const k in keys) keys[k]=false;
  startScene(idx);
};

/* ---- ステージ上のキャラ（NPC）に話しかけて進むしくみ --------------------- */
GT.getNpcs=()=>npcs;   // 動作確認用に公開
GT.dbg=()=>({storyStage,storyTalking,flipping,stageExit,storyExitReady,exitWanted,mission:missionReq});
/* 人物も、いるページの重力にしたがって床か天井へ落ちる（赤ずきん・マリ・狼・おばあさんなど）。
   b={x,y,w,h,vy}。y が無ければ床に立たせる。足場（ledge / ceilingLedge）の上や下にも止まる。
   結果：b.g（1=床に立つ / -1=天井に立つ）, b.onGround */
GT.fallBody=function(b,dt){
  const page=(b.x+b.w/2)<SPINE?'left':'right', g=GT.gravity[page]||1;
  if(b.y==null){ b.y=H-EDGE-b.h; b.vy=0; }
  b.g=g;
  const prevTop=b.y, prevBot=b.y+b.h;
  b.vy=Math.max(-1400,Math.min(1400,(b.vy||0)+GRAVITY*g*dt)); b.y+=b.vy*dt;
  b.onGround=false;
  const ov=p=>(p.kind==='ledge'||p.kind==='ceilingLedge') && p.x<b.x+b.w-2 && p.x+p.w>b.x+2;
  if(g>0){ let gy=H-EDGE; for(const p of GT.platforms) if(ov(p) && p.y>=prevBot-1) gy=Math.min(gy,p.y);
    if(b.y+b.h>=gy){ b.y=gy-b.h; b.vy=0; b.onGround=true; } }
  else { let cy=EDGE; for(const p of GT.platforms) if(ov(p) && p.y+p.h<=prevTop+1) cy=Math.max(cy,p.y+p.h);
    if(b.y<=cy){ b.y=cy; b.vy=0; b.onGround=true; } }
};
/* 人物を横に歩かせる（ついてくる赤ずきんなど）。GT.npcStep(b, 目標x, 速さ, dt)
   足場（切り株・石垣・樽など）にぶつかったら、すり抜けずに、ぴょんと跳び乗って越える。
   越えられないほど高いとき（NPC_HOP_MAX より高い）は、その手前で止まる。動いた向きを返す（0＝動いていない） */
const NPC_HOP_MAX=120;
GT.npcStep=function(b,target,speed,dt){
  const dx=target-b.x; if(Math.abs(dx)<=6) return 0;
  const nx=b.x+Math.sign(dx)*Math.min(speed*dt,Math.abs(dx));
  const g=b.g||1;
  let wall=null;
  for(const p of GT.platforms){
    if(p.kind!=='ledge'&&p.kind!=='ceilingLedge') continue;
    if(nx<p.x+p.w && nx+b.w>p.x && b.y<p.y+p.h-1 && b.y+b.h>p.y+1){ wall=p; break; } }   // 横からぶつかる
  if(!wall){ b.x=Math.max(EDGE,Math.min(W-EDGE-b.w,nx)); return Math.sign(dx); }
  if(b.onGround && !b.noGravity){                                     // 床（天井）に立っていれば、跳び乗る
    const rise = g>0 ? b.y+b.h-wall.y : wall.y+wall.h-b.y;
    if(rise<=NPC_HOP_MAX){ b.vy=-g*Math.sqrt(2*GRAVITY*(rise+14)); b.onGround=false; } }
  return 0;                                                           // この瞬間は横に進まない（跳んで上に出たら進める）
};
/* 何回も逆さにされると、人物が怒る。
   GT.grumble(b, who) … b が重力で上下ひっくり返ったときに呼ぶ。回数（b.anger）に応じてセリフが変わる。
     1回目は何も言わない。しばらく（8秒ごと）反転しないと、怒りが1つずつおさまる。
   GT.GRUMBLE で、キャラごとのセリフを変えられる（だんだん怒っていく順に5つ）。 */
GT.GRUMBLE={
  hood:  ['わっ！','きゃっ、また！？','ちょ、ちょっと……目が回るよ〜！','もう！　わざとやってるでしょ！','……知らないっ。（ぷいっ）'],
  mari:  ['……わ。','ねえ、遊んでるでしょ。','ちょっと。わたしで遊ばないで。','……怒るよ？','……。'],
  wolf:  ['うおっ！？','な、なんだこの森は……','おい小僧、やめろ。','グルルル……！','……覚えてろよ。'],
  granny:['あれまあ！','ひいっ、目が回る……','年寄りをからかうんじゃないよ！','こ、腰が……腰がぁ……','……あとで、お説教だよ。'],
};
GT.grumble=function(b,who){
  const now=performance.now()/1000;
  if(b.angerT!=null) b.anger=Math.max(0,(b.anger||0)-Math.floor((now-b.angerT)/8));
  b.angerT=now; b.anger=(b.anger||0)+1;
  if(b.anger<2) return null;                                   // 1回目は、まだ何も言わない
  const L=GT.GRUMBLE[who]||GT.GRUMBLE.hood, a=b.anger;
  const lv = a<=2?0 : a<=4?1 : a<=6?2 : a<=8?3 : 4;
  b.speech={ text:L[lv], t:2.6, angry:lv>=2 };
  return b.speech;
};
/* 吹き出し（人物の頭の側に出す）。below=true なら頭の下（天井に立っているとき）。angry で怒りマーク */
const speechQueue=[];   // 吹き出しは、描く順番に関係なく、最後（最前面）にまとめて描く
GT.drawSpeech=function(cx,headY,text,alpha,below,angry){ speechQueue.push([cx,headY,text,alpha,below,angry]); };
function paintSpeech(cx,headY,text,alpha,below,angry){
  ctx.save(); ctx.globalAlpha=Math.max(0,Math.min(1,alpha));
  ctx.font="700 13px 'Zen Old Mincho',serif"; ctx.textAlign='center'; ctx.textBaseline='middle';
  const w=ctx.measureText(text).width+20, h=26;
  const bx=Math.max(EDGE+4,Math.min(W-EDGE-4-w,cx-w/2)), by= below ? headY+18 : headY-18-h;
  const tx=Math.max(bx+10,Math.min(bx+w-10,cx)), ty= below ? by : by+h;
  roundRect(bx,by,w,h,12); ctx.fillStyle='rgba(250,244,228,0.96)'; ctx.fill();
  ctx.strokeStyle=angry?'#a8463a':'rgba(90,74,51,0.8)'; ctx.lineWidth=1.6; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(tx-6,ty); ctx.lineTo(tx,ty+(below?-9:9)); ctx.lineTo(tx+6,ty); ctx.closePath();
  ctx.fillStyle='rgba(250,244,228,0.96)'; ctx.fill(); ctx.stroke();
  ctx.fillStyle='rgba(250,244,228,0.96)'; ctx.fillRect(tx-5,ty+(below?0.5:-2.5),10,2);   // しっぽのつけ根の線を消す
  ctx.fillStyle=angry?'#8b2f26':'#3a2f2a'; ctx.fillText(text,bx+w/2,by+h/2+1);
  if(angry){                                                    // 怒りマーク
    const mx=bx+w-4, my=by+(below?h+4:-4);
    ctx.strokeStyle='#c9503f'; ctx.lineWidth=2.2; ctx.lineCap='round';
    for(const [sx,sy] of [[-1,-1],[1,-1],[1,1],[-1,1]]){ ctx.beginPath(); ctx.moveTo(mx+sx*2,my+sy*7); ctx.quadraticCurveTo(mx+sx*2,my+sy*2,mx+sx*7,my+sy*2); ctx.stroke(); }
  }
  ctx.restore();
};
function setupNpcs(defs){
  npcs=(defs||[]).map(d=>({
    who:d.who, name:d.name||'', page:d.page||'right', x:d.x, w:d.w||32, h:d.h||40, y:H-EDGE-(d.h||40), vy:0, g:1,
    lines:d.lines||null, choices:d.choices||null, onEnd:d.onEnd||null, noExit:!!d.noExit, required:d.required, noLift:!!d.noLift,
    talkable:!!(d.lines), talked:false
  }));
  activeNpc=null; storyTalking=false;
}
// 人物のほうから話しかけてくる（近づかなくても、その人との会話を始める）。話し終えたあとの扱いは tryTalk と同じ
GT.talkTo=(n)=>{ if(!n) return; activeNpc=n; tryTalk(true); };
let talkCooldown=0;   // 会話が終わった直後は、同じキー・タップでまた話しかけないように、少し待つ
function tryTalk(force){   // force … 人物のほうから話しかけてくるとき（GT.talkTo）。話し終えた人とも話す
  if(!storyStage || storyTalking || flipping || performance.now()<talkCooldown) return;
  const n=activeNpc; if(!n || !n.lines) return;
  // 自分から話しかけられるのは、操作できるときに、まだ話していない人だけ
  // （GT.talkTo で覚えた相手が残っていても、話し終えた人にもう一度話しかけない。エンディングのあとに、マリが同じセリフをくり返していた）
  if(!force && (GT.mode!=='play' || !n.talkable || n.talked)) return;
  storyTalking=true; GT.player.vx=0;
  beginDialogue(n.lines, n.choices, ()=>{
    storyTalking=false; hideDialogue(); talkCooldown=performance.now()+450;
    if(activeNpc===n) activeNpc=null;   // 話し終えた相手は忘れる（近くにいれば、次のフレームでまた選ばれる）
    if(n.onEnd) n.onEnd();
    n.talked=true; n.talkedOnce=true;
    // 自動ではめくらない。右端まで自分で歩いたら次ページへ。（noExit の人と話しても、右端は開かない）
    if(!n.noExit){ exitWanted=true; storyExitReady=true; updateExitGate(); }
  });
}

