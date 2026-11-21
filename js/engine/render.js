/* ============================================================================
   Gravity Tale ── エンジン：1フレームの描画（影・色合い・ページめくりの絵）
   ----------------------------------------------------------------------------
   render：奥から手前へ層ごとに描き、物の影（光は左下から、影は右上へ）、場面の色合い、ふちのぼかし、ページめくりの絵を重ねる。
   エンジンのファイルは js/engine/ にあり、index.html で core.js → … → boot.js の順に読む。
   どのファイルも、いちばん外側の const / let / function を共有している（ふつうの <script> なので）。
   ========================================================================== */
"use strict";
function render(){
  try{ renderBody(); } finally { flushHint(); }
}
/* ---- 影（明るい場面）：光は左下から。物の影は、うしろの背景の右上へのびる ----
   奥の飾り・足場や人物・手前の飾りを、それぞれ別の層に描いてから、背景の上に「影→物」の順に重ねる。
   影は、層をそのまま小さな画面に写し（右上へずらし、上ほど右へかたむける）、影の色でぬって、大きくのばして重ねる（のばすと自然にぼける）。
   手前の層ほど、影は遠く・大きくかたむき・よくぼける（奥行き）。ぼかしの計算を物ごとにしないので、軽い */
let layeredNow=false;   // このフレームを、層に分けて描いたか
const layerB=document.createElement('canvas'), layerM=document.createElement('canvas'), layerF=document.createElement('canvas'), layerB2=document.createElement('canvas'), layerB0=document.createElement('canvas');
for(const c of [layerB,layerM,layerF,layerB2,layerB0]){ c.width=W; c.height=H; }
const shadowSmall=[document.createElement('canvas'),document.createElement('canvas')];
function grabLayer(L){ const g=L.getContext('2d'); g.clearRect(0,0,W,H); g.drawImage(canvas,0,0); ctx.clearRect(0,0,W,H); }
GT.SHADOW={ dx:10, dy:6, alpha:0.82 };   // 影の基本の量（depth で、遠く・うすくなる）
/* 影を、受ける物ごとに分けて落とす：
   すぐうしろの物（奥の層 layerB の木や家）に映る影は、近く（nearDepth）に。そのさらに奥の背景に映る影は、遠く（depth）に */
const shadowScaleNow=()=>{ const v=GT.scene&&GT.scene.shadowScale; return v>0?v:1; };   // 場面ごとの影の濃さ（scene.shadowScale。ふつうは 1）
function castLayerSplit(L,depth,nearDepth){
  const sc=shadowSmall[1]; if(sc.width!==W){ sc.width=W; sc.height=H; }
  const s=sc.getContext('2d'), S=GT.SHADOW, dk=(gradeK||0)>0.02?0.25:0;
  for(const [d,inside] of [[depth,false],[nearDepth,true]]){
    s.setTransform(1,0,0,1,0,0); s.globalCompositeOperation='source-over'; s.clearRect(0,0,W,H);
    s.drawImage(L, Math.round(S.dx+46*d), -Math.round(S.dy+30*d));
    s.globalCompositeOperation='source-in';
    s.fillStyle=`rgba(10,6,4,${(Math.min(0.92,S.alpha-0.36*d+dk)*shadowScaleNow()).toFixed(3)})`;
    s.fillRect(0,0,W,H);
    s.globalCompositeOperation = inside ? 'destination-in' : 'destination-out';   // 奥の物の上だけ／それ以外だけ
    s.drawImage(layerB,0,0);
    ctx.drawImage(sc,0,0);
  }
  s.globalCompositeOperation='source-over';
}
function castLayer(L,depth){
  // 影は、かたむけず、そのまま右上へずらす。ふちは、まっすぐ くっきり（画面と同じ大きさで写し、ぼかさない）
  const d=depth, sc=shadowSmall[0], S=GT.SHADOW;
  if(sc.width!==W){ sc.width=W; sc.height=H; }
  const s=sc.getContext('2d');
  s.setTransform(1,0,0,1,0,0); s.globalCompositeOperation='source-over'; s.clearRect(0,0,W,H);
  s.drawImage(L, Math.round(S.dx+46*d), -Math.round(S.dy+30*d));          // 手前の層ほど、遠くへ（差を大きく）
  // 影の色でぬる（奥の層ほど濃く、手前ほどうすい。暗い森では、さらに濃く）
  const dk=(gradeK||0)>0.02?0.25:0;
  s.globalCompositeOperation='source-in';
  s.fillStyle=`rgba(10,6,4,${(Math.min(0.92,S.alpha-0.36*d+dk)*shadowScaleNow()).toFixed(3)})`;
  s.fillRect(0,0,W,H);
  ctx.drawImage(sc,0,0);
}
function drawBookBase(gravity){
  ctx.drawImage(GT.paperArt.paper,0,0);
  drawStageBackground();
  ctx.fillStyle='rgba(87,100,74,0.05)'; ctx.fillRect(0,0,SPINE,H);
  ctx.fillStyle='rgba(139,94,99,0.05)'; ctx.fillRect(SPINE,0,SPINE,H);
  if(gravity.left===-1){ ctx.fillStyle='rgba(43,46,74,0.06)'; ctx.fillRect(0,0,SPINE,H); }
  if(gravity.right===-1){ ctx.fillStyle='rgba(43,46,74,0.06)'; ctx.fillRect(SPINE,0,SPINE,H); }
  const sg=ctx.createLinearGradient(SPINE-16,0,SPINE+16,0);
  sg.addColorStop(0,'rgba(58,50,38,0)'); sg.addColorStop(0.5,'rgba(58,50,38,0.35)'); sg.addColorStop(1,'rgba(58,50,38,0)');
  ctx.fillStyle=sg; ctx.fillRect(SPINE-16,0,32,H);
}
function drawGoText(){
  if(missionReq && exitWanted && !stageExit) drawExitGate();
  if((storyStage||missionReq||goHint) && stageExit && !flipping && !storyTalking){
    const p=0.5+0.5*Math.sin(goalPulse*4);
    ctx.save(); ctx.textAlign='right'; ctx.globalAlpha=0.55+0.45*p;
    ctx.fillStyle='#b08d57'; ctx.font="700 22px 'Caveat',cursive";
    ctx.fillText('Go to the right edge →', W-26, H/2);
    ctx.restore();
  }
}
function renderBody(){
  const gravity=GT.gravity;
  ctx.clearRect(0,0,W,H);
  layeredNow = GT.shadowsOn!==false;   // 影は、序章の暗い森もふくめて、すべての場面で
  if(layeredNow){
    const hasBP=drawBackPre.length>0; if(hasBP){ for(const fn of drawBackPre) fn(); grabLayer(layerB0); }   // いちばん奥の、影を落とさない物
    for(const fn of drawBack) fn();                                   // 奥の層
    grabLayer(layerB);
    const hasBF=drawBackFlat.length>0; if(hasBF){ for(const fn of drawBackFlat) fn(); grabLayer(layerB2); }   // 影を落とさない奥の物（地面の道など）
    for(const plat of GT.platforms){ if(plat.kind!=='ledge'&&plat.kind!=='ceilingLedge') continue; drawLedge(plat, gravity[plat.page]===-1); }
    drawGoal();
    for(const box of GT.boxes) drawBox(box);
    for(const en of GT.enemies) drawEnemy(en);
    if(storyStage) for(const n of npcs) drawNpc(n);
    if(companion) drawNpc(companion);
    for(const fn of drawWorld) fn();
    drawPlayer();
    grabLayer(layerM);                                                // 足場・人物・少年の層
    for(const fn of drawOverlay) fn();
    grabLayer(layerF);                                                // 手前の層
    drawBookBase(gravity);
    // 影は、その層より奥にあるもの すべての上に落ちる（少年の影は、うしろの家や木の上にも映る）。
    // 奥の層ほど影は近く・濃く、手前の層ほど遠く・うすく。空気の遠近：奥の層は少しかすみ、手前の層は少し暗く くっきり
    if(hasBP){ ctx.save(); ctx.filter='saturate(0.8) brightness(1.04) contrast(0.9)'; ctx.drawImage(layerB0,0,0); ctx.restore(); }
    castLayer(layerB,0.25);
    ctx.save(); ctx.filter='saturate(0.8) brightness(1.04) contrast(0.9)'; ctx.drawImage(layerB,0,0); if(hasBF) ctx.drawImage(layerB2,0,0); ctx.restore();
    if(GT.extraShadow) GT.extraShadow(ctx);   // 場面ごとの特別な影（タイトルの狼の大きな影など）。うしろの木の上にも映る
    drawPageEdges();
    for(const fn of drawFlat) fn();                                   // 影を落とさない物（水たまりなど）。少年や人物の影は、この上に落ちる
    castLayerSplit(layerM,0.6,0.12);                                  // 少年や足場の影：うしろの木や家には近く、背景には遠く
    castLayerSplit(layerF,1,0.3);                                              // 手前の草などの影は、少年や人物より うしろに落とす（少年にかぶらない）
    ctx.drawImage(layerM,0,0);
    for(const sw of GT.swamps) drawSwamp(sw);                         // 沼は影を落とさない（少年の足元を隠すよう、少年より手前に）
    ctx.save(); ctx.filter='brightness(0.86) saturate(1.08) contrast(1.05)'; ctx.drawImage(layerF,0,0); ctx.restore();
    if(!(GT.scene&&(GT.scene.id==='title'||GT.scene.id==='chapter_select'))){ drawGravityIcon(SPINE/2,20,gravity.left,flashPage.left);
    drawGravityIcon(SPINE+SPINE/2,20,gravity.right,flashPage.right); }   // タイトル画面では、重力の矢印を出さない
    for(const it of GT.items) drawItem(it);
    drawGoText();
  } else {
  drawBookBase(gravity);
  for(const fn of drawBackPre) fn();
  for(const fn of drawBack) fn();           // 奥の飾り（地形より後ろ・判定なし）
  for(const fn of drawBackFlat) fn();
  drawPageEdges();
  for(const plat of GT.platforms){
    if(plat.kind!=='ledge'&&plat.kind!=='ceilingLedge') continue;
    drawLedge(plat, gravity[plat.page]===-1);
  }
  drawGravityIcon(SPINE/2,20,gravity.left,flashPage.left);
  drawGravityIcon(SPINE+SPINE/2,20,gravity.right,flashPage.right);
  drawGoal();
  for(const box of GT.boxes) drawBox(box);
  for(const en of GT.enemies) drawEnemy(en);
  if(storyStage) for(const n of npcs) drawNpc(n);
  if(companion) drawNpc(companion);
  for(const it of GT.items) drawItem(it);
  drawGoText();
  for(const fn of drawFlat) fn();
  for(const fn of drawWorld) fn();          // ボスなど（プレイヤーより後ろ）
  drawPlayer();
  for(const sw of GT.swamps) drawSwamp(sw);   // 沼はプレイヤーの足元を隠すよう手前に描く
  for(const fn of drawOverlay) fn();         // 手前の木・窓のぞきなど（ゴシックの色合いをかけるため、色合いより先に描く）
  }
  drawGothicWorld();                                                                                                // 世界を暗く・色を抜く（不気味さに合わせて）
  liftCharacters();                                                                                                 // 少年と人物は、暗くしない（色合いの上に描きなおす）
  if(itemLook==='page') for(const it of GT.items) if(!it.got&&!it.hidden) drawItem(it);                            // 光の玉（お話のかけら）は、色合いの上にも重ねて、くっきり光らせる
  ctx.save(); ctx.globalCompositeOperation='multiply'; ctx.drawImage(GT.paperArt.agedPaper,0,0); ctx.restore();   // 古い紙の色むら・しみ（表示類より奥）
  drawEdgeFade();                                                                                                   // ふちを、まわりのページの色へ ぼかす（ページのふくらみとのさかいを目立たせない）
  drawGradeMul();   // 全体の色合い（まわりのページと同じ色）
  if(missionReq && !flipping && !gameOver && !GT.paused && !GT.missionHidden && !document.querySelector('.gtm.show')) drawMissionHud(); else missionEl.classList.remove('show');   // メニュー・ページめくりのあいだは出さない
  if(GT.hurtFlash>0){ ctx.fillStyle=`rgba(139,20,20,${GT.hurtFlash*0.35})`; ctx.fillRect(0,0,W,H); }
  drawHearts();
  if(gameOver){ const st=gameOver.cause&&gameOverStyles[gameOver.cause]; if(st&&st.draw) st.draw(gameOver); else drawGameOver(); }
  for(const fn of drawSpeechFns) fn();       // ステージ独自の吹き出し（最前面）
  for(const a of speechQueue.splice(0)) paintSpeech(...a);   // 人物の吹き出し（最前面）
  if(flipping) drawFlip();                   // ページめくり（いちばん手前。ページの大きさの層 flipCv に描く）
  else if(flipCvDirty){ fctx.setTransform(1,0,0,1,0,0); fctx.clearRect(0,0,flipCv.width,flipCv.height); flipCvDirty=false; }
}

/* ゴシックの色合い：世界（背景・地形・人物）を赤紫の色みに寄せ、少し色を抜き、四すみを暗くする（表示類・ふちのぼかしより奥） */
/* 不気味さ（0〜1）：お話が進むほど暗く・色が抜け・霧が出る。値は js/playlist.js の GT.sceneMood（シーンの id ごと。'@種類' でも決められる） */
let moodCur=null;
function sceneMood(){
  const sc=GT.scene; if(!sc) return 0.3; const T=GT.sceneMood||{};
  let v = sc.id!=null && T[sc.id]!=null ? T[sc.id] : T['@'+sc.type]!=null ? T['@'+sc.type] : 0.5;
  if(typeof v==='function') v=v(GT.flags);
  return Math.max(0,Math.min(1,+v||0));
}
GT.moodNow=()=>moodCur; GT.moodTarget=sceneMood;
GT.moodSnap=()=>{ moodCur=null; gradeK=null; };   // 次の画面で、ゆっくりではなく一気に、そのシーンの色合いにする
GT.isBright=()=>!!(GT.scene && sceneMood()===0);   // 不気味さ 0 の場面は、ゴシックにする前と同じ見た目
let gradeK=null;   // ゴシックの色合いのかかり具合（0＝前と同じ明るさ、1＝ゴシック）   // いまの不気味さ／このシーンの不気味さ
function drawMoodFog(m){   // 地面をはう霧（不気味さが 0.45 をこえると出てくる）
  const a=(m-0.45)*0.3; if(a<=0) return; const t=performance.now()/1000;
  for(let k=0;k<2;k++){ const y=H-GT.EDGE-8-k*30, sp=9+k*5;
    for(let i=0;i<6;i++){ const x=((i*210+t*sp+k*120)%(W+380))-190;
      const g=ctx.createRadialGradient(x,y,0,x,y,190); g.addColorStop(0,`rgba(205,202,204,${a*(1-k*0.35)})`); g.addColorStop(1,'rgba(205,202,204,0)');
      ctx.save(); ctx.translate(x,y); ctx.scale(1,0.22); ctx.translate(-x,-y); ctx.fillStyle=g; ctx.fillRect(x-190,y-190,380,380); ctx.restore(); } }
}
let dimNow=0;   // そのステージだけ暗くする量（背景の spec.dim）。ゴシックの色合いとは別（色は変えず、暗くするだけ）
function drawGothicWorld(){
  const spd=stageBackgroundSpec(); dimNow=(spd&&spd.dim)||0;
  if(dimNow>0){ ctx.save(); ctx.globalCompositeOperation='multiply'; ctx.fillStyle=`rgba(40,38,44,${dimNow})`; ctx.fillRect(0,0,W,H); ctx.restore(); }
  const target=sceneMood(); moodCur = moodCur==null ? target : moodCur+(target-moodCur)*0.04;   // ゆっくり変わる
  const m=moodCur;
  const gk=GT.isBright()?0:1; gradeK = gradeK==null ? gk : gradeK+(gk-gradeK)*0.04; const K=gradeK;
  if(K<0.005) return;
  ctx.save(); ctx.globalAlpha=K;
  drawMoodFog(m);
  ctx.globalCompositeOperation='saturation'; ctx.globalAlpha=(0.16+0.3*m)*K; ctx.fillStyle='#808080'; ctx.fillRect(0,0,W,H);   // 色を抜く（進むほど、色が消えていく）
  if(m>0.3){ ctx.globalCompositeOperation='color'; ctx.globalAlpha=(m-0.3)*0.16*K; ctx.fillStyle='#4a5a5e'; ctx.fillRect(0,0,W,H); }   // 進むと、冷たく青ざめた色みに
  ctx.globalCompositeOperation='color'; ctx.globalAlpha=GRADE_HUE; ctx.fillStyle='#8a3d62'; ctx.fillRect(0,0,W,H);  // 赤紫の色みに寄せる（明るさはそのまま）
  ctx.globalCompositeOperation='source-over'; ctx.globalAlpha=1;
  const sp=stageBackgroundSpec();                                                     // 背景の shade（0〜1）… そのステージだけ、世界ぜんたいを暗くする（暗い森など）
  ctx.globalAlpha=K;
  const shade=(sp&&sp.shade||0)+0.5*m;                                               // 進むほど、世界ぜんたいが暗くなる
  if(shade>0){ ctx.globalCompositeOperation='multiply'; ctx.fillStyle=`rgba(16,14,12,${Math.min(0.85,shade)})`; ctx.fillRect(0,0,W,H); ctx.globalCompositeOperation='source-over'; }
  const vig=ctx.createRadialGradient(W/2,H*0.5,H*(0.42-0.12*m),W/2,H*0.5,W*0.62);       // 四すみの暗さも、進むほど強く・内がわへ
  vig.addColorStop(0,'rgba(10,8,6,0)'); vig.addColorStop(1,`rgba(10,8,6,${GRADE_VIG*(0.55+0.75*m)})`);
  ctx.fillStyle=vig; ctx.fillRect(0,0,W,H);
  ctx.restore();
}
/* 少年と人物は、ゴシックの色合い（暗さ・色抜け）をかけない。色合いをかけたあとに、同じ場所へもう一度描く。
   ・木の陰に隠れているなど、まわりの絵に隠したい人は n.noLift=true（ステージ側で決める）
   ・沼に入っているときの少年は、足もとを沼で隠すので描きなおさない */
function liftCharacters(){
  if((gradeK==null || gradeK<0.02) && !(dimNow>0)) return;
  ctx.save(); ctx.globalAlpha=dimNow>0?1:Math.min(1,gradeK);
  if(storyStage) for(const n of npcs){ if(n.noLift || n.x<-100 || n.x>W+100) continue; drawNpc(n); }
  if(companion) drawNpc(companion);
  const pl=GT.player, inSwamp=(GT.swamps||[]).some(s=>GT.rectsOverlap&&GT.rectsOverlap(pl,s));
  for(const en of GT.enemies) drawEnemy(en);   // 敵も、暗さに沈まないように
  if(!inSwamp && !gameOver) drawPlayer();
  ctx.restore();
  for(const fn of drawLiftFns) fn();
  // 暗くした場面（近道）で人物を描きなおしたあと、手前の層（手前の木や岩）を、同じ暗さで上に重ねなおす（人物が手前の木より前に出ないように）
  if(layeredNow && dimNow>0){
    const sc=shadowSmall[1]; if(sc.width!==W){ sc.width=W; sc.height=H; }
    const s=sc.getContext('2d'); s.setTransform(1,0,0,1,0,0); s.globalCompositeOperation='source-over'; s.clearRect(0,0,W,H);
    s.filter='brightness(0.86) saturate(1.08) contrast(1.05)'; s.drawImage(layerF,0,0); s.filter='none';
    s.globalCompositeOperation='source-atop'; s.fillStyle=`rgba(0,0,0,${(0.84*dimNow).toFixed(3)})`; s.fillRect(0,0,W,H);
    ctx.drawImage(sc,0,0);
  }
}
/* 全体の色合い（乗算）。明るい場面（gradeK＝0）では、まん中にはかけず、ふちだけにかける（まわりのページの紙の色と、さかいを合わせる） */
function drawGradeMul(){
  const K=gradeK==null?1:gradeK, col=GRADE_MUL.join(',');
  ctx.save(); ctx.globalCompositeOperation='multiply';
  if(K>0.005){ ctx.fillStyle=`rgba(${col},${K})`; ctx.fillRect(0,0,W,H); }
  if(K<0.995){ const F=EDGE_FADE*2.4, a=1-K;
    for(const e of ['left','right','top','bottom']){
      const g = e==='left'?ctx.createLinearGradient(0,0,F,0) : e==='right'?ctx.createLinearGradient(W,0,W-F,0) : e==='top'?ctx.createLinearGradient(0,0,0,F) : ctx.createLinearGradient(0,H,0,H-F);
      g.addColorStop(0,`rgba(${col},${a})`); g.addColorStop(1,`rgba(${col},0)`); ctx.fillStyle=g;
      if(e==='left') ctx.fillRect(0,0,F,H); else if(e==='right') ctx.fillRect(W-F,0,F,H); else if(e==='top') ctx.fillRect(0,0,W,F); else ctx.fillRect(0,H-F,W,F); } }
  ctx.restore();
}
/* ゲーム画面のふちを、まわりのページ（js/page.js の .gt-pages。色は PAGE_COLOR）へ だんだん溶けこませる */
const EDGE_FADE=22;
function drawEdgeFade(){
  ctx.save();
  for(const e of ['left','right','top','bottom']){
    const g = e==='left'?ctx.createLinearGradient(0,0,EDGE_FADE,0) : e==='right'?ctx.createLinearGradient(W,0,W-EDGE_FADE,0)
            : e==='top'?ctx.createLinearGradient(0,0,0,EDGE_FADE) : ctx.createLinearGradient(0,H,0,H-EDGE_FADE);
    g.addColorStop(0,'rgba(239,231,218,0.95)'); g.addColorStop(0.5,'rgba(239,231,218,0.45)'); g.addColorStop(1,'rgba(239,231,218,0)');
    ctx.fillStyle=g;
    if(e==='left') ctx.fillRect(0,0,EDGE_FADE,H); else if(e==='right') ctx.fillRect(W-EDGE_FADE,0,EDGE_FADE,H);
    else if(e==='top') ctx.fillRect(0,0,W,EDGE_FADE); else ctx.fillRect(0,H-EDGE_FADE,W,EDGE_FADE);
  }
  ctx.restore();
}
/* ページめくり演出 */
/* ページめくり：紙がしなるように、やわらかくめくれる。
   紙を背表紙から外へ細い短冊に分けて、外がわ（つまんだふち）ほど先に持ち上がって倒れる（紙がまるくたわむ）。
   立ち上がったところは少し手前に来るので、ほんの少し大きく見える（寝ている紙は、ページとぴったり同じ大きさ）。向きによって、紙に陰と光が入る。
   めくれた紙は、下のページに やわらかい影を落とす。動きは ゆっくり始まって、ゆっくり着地する。 */
const FLIP_STRIPS=48;
function drawFlip(){
  const p=Math.min(1,flipT/FLIP_DUR);
  toPage(extLive);                                                    // 次のシーン（いま描いたもの）を、ページの大きさの紙に写しとる
  const W=EW, H=EH, SPINE=ESP, flipOld=extOld, flipLive=extLive;      // ここでは、ページのふくらみまでふくめた大きさで描く
  const ctx=fctx; ctx.setTransform(1,0,0,1,0,0); ctx.clearRect(0,0,flipCv.width,flipCv.height);
  ctx.setTransform(1,0,0,1,100-PAGE_PAD_X,70-PAGE_PAD_TOP); flipCvDirty=true;   // ページの左上が、ゲーム画面の (-PAGE_PAD_X, -PAGE_PAD_TOP)
  const ease = p<0.5 ? 4*p*p*p : 1-Math.pow(-2*p+2,3)/2;            // ゆっくり始まって、ゆっくり着地
  const lift=Math.sin(p*Math.PI);                                     // 紙が いちばん持ち上がるのは まん中
  const base=ease*Math.PI, lead=1.35*lift;                            // 背表紙側の角度と、外がわが先に進む量
  // 短冊ごとの角度 → 位置（背表紙から積み上げる）・高さ（持ち上がるほど少し大きく）
  const N=FLIP_STRIPS, pts=[];
  let x=SPINE, z=0;
  const d=flipDir;                                                    // 1=次へ（右の紙が左へ） / -1=前へ（左の紙が右へ）
  for(let i=0;i<=N;i++){
    const u=i/N, a=Math.max(0,Math.min(Math.PI, base + lead*Math.pow(u,1.6)));     // 外がわほど先に倒れる（紙がまるくたわむ）
    pts.push({u,a,x,z});
    if(i<N){ x+=d*Math.cos(a)*SPINE/N; z+=Math.sin(a)*SPINE/N; }
  }
  ctx.save();
  ctx.save(); pagePath(ctx); ctx.clip();                              // 下のページ・暗さ・影は、ページの形の中だけ
  if(d>0) ctx.drawImage(flipOld,0,0,SPINE,H,0,0,SPINE,H);            // 紙が倒れてくる側のページは、倒れてくるまで前のまま
  else    ctx.drawImage(flipOld,SPINE,0,SPINE,H,SPINE,0,SPINE,H);
  ctx.fillStyle=`rgba(28,22,14,${0.22*lift})`; ctx.fillRect(0,0,W,H);  // 見開きが少し暗くなる
  // 下のページに落ちる やわらかい影（紙のいちばん外のふちのまわり）
  const tip=pts[N], tipX=tip.x;
  const shW=40+70*lift, sg=ctx.createLinearGradient(tipX,0, tipX+(tipX>=SPINE?shW:-shW),0);   // 紙の外がわへ落ちる影
  sg.addColorStop(0,`rgba(30,22,12,${0.35*lift})`); sg.addColorStop(1,'rgba(30,22,12,0)');
  ctx.fillStyle=sg; ctx.fillRect(Math.min(tipX,tipX+(tipX>=SPINE?shW:-shW)),0,shW,H);
  ctx.restore();                                                      // （ページの形の切り抜き、ここまで）
  // 光がもれ出す（森の出口から、次のページへ）：めくれる紙の下の、新しいページから光があふれる
  const glow = flipFromId && GT.flipGlowFrom.has(flipFromId) ? Math.sin(Math.min(1,p*1.15)*Math.PI) : 0;
  if(glow>0.01){
    const gx = d>0 ? SPINE+SPINE*0.35 : SPINE-SPINE*0.35, gy=H*0.5, t=performance.now()/1000;
    ctx.save(); ctx.globalCompositeOperation='lighter';
    const rg=ctx.createRadialGradient(gx,gy,0,gx,gy,SPINE*1.1);
    rg.addColorStop(0,`rgba(255,242,200,${0.6*glow})`); rg.addColorStop(0.45,`rgba(255,220,160,${0.3*glow})`); rg.addColorStop(1,'rgba(255,200,120,0)');
    ctx.fillStyle=rg; ctx.fillRect(0,0,W,H);
    const rq=(p-0.04)/0.22, rk = rq>0&&rq<1 ? Math.sin(rq*Math.PI) : 0;   // 光の筋は、めくりはじめに一瞬だけ（およそ0.5秒）。次のページが見えはじめる少し前に消える
    if(rk>0.01) for(let k=0;k<14;k++){                              // 光の筋（ゆっくりゆれる）
      const a=(k/14)*Math.PI*2+Math.sin(t*0.6+k)*0.08, len=SPINE*(0.7+0.3*Math.sin(t*1.3+k*2.1)), wd=0.006+0.004*Math.sin(k*1.7);   // とても細い筋
      const lg=ctx.createRadialGradient(gx,gy,0,gx,gy,len);
      lg.addColorStop(0,`rgba(255,246,210,${0.14*rk})`); lg.addColorStop(1,'rgba(255,230,170,0)');
      ctx.fillStyle=lg; ctx.beginPath(); ctx.moveTo(gx,gy); ctx.arc(gx,gy,len,a-wd,a+wd); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }
  // 紙（短冊を背表紙から順に。奥の短冊が先、手前の短冊があと）
  const order=[...Array(N).keys()];
  for(const i of order){
    const p0=pts[i], p1=pts[i+1], am=(p0.a+p1.a)/2;
    const front = am<Math.PI/2;                                        // 表（前の右ページ）か、裏（次の左ページ）か
    const x0=p0.x, x1=p1.x, w=x1-x0; if(Math.abs(w)<0.05) continue;
    const sc=1+0.012*Math.sin(am);                                    // 立ち上がったところだけ、ほんの少し大きく（寝ている紙はページと同じ大きさ）
    const hh=H*sc, top=(H-hh)/2;
    const srcX = d>0 ? (front ? SPINE+p0.u*SPINE : SPINE-p1.u*SPINE)          // 次へ：表=前の右ページ / 裏=次の左ページ
                     : (front ? SPINE-p1.u*SPINE : SPINE+p0.u*SPINE), srcW=SPINE/N;   // 前へ：表=前の左ページ / 裏=やり直す右ページ
    const src = front ? flipOld : flipLive;
    const dx=Math.min(x0,x1), dw=Math.abs(w)+0.6;                       // すき間ができないよう、少し重ねる
    if(front) ctx.drawImage(src, srcX,0,srcW,H, dx,top,dw,hh);
    else      ctx.drawImage(src, srcX,0,srcW,H, dx,top,dw,hh);
    // 陰と光：紙が立つほど暗く、ゆるやかに傾いたところに やわらかい光
    const facing=Math.abs(Math.cos(am));
    ctx.fillStyle=`rgba(40,28,14,${0.5*Math.pow(1-facing,0.8)})`; ctx.fillRect(dx,top,dw,hh);
    const shine=Math.max(0,Math.sin(am*2))*0.16*lift;
    if(shine>0.002){ ctx.fillStyle=`rgba(255,248,230,${shine})`; ctx.fillRect(dx,top,dw,hh); }
  }
  // 背表紙のくぼみの影
  const spg=ctx.createLinearGradient(SPINE-18,0,SPINE+18,0);
  spg.addColorStop(0,'rgba(58,45,30,0)'); spg.addColorStop(0.5,`rgba(58,45,30,${0.25*lift})`); spg.addColorStop(1,'rgba(58,45,30,0)');
  ctx.fillStyle=spg; ctx.fillRect(SPINE-18,0,36,H);
  // めくれていくふちの、紙の厚みの光
  if(lift>0.02){ const sc=1+0.012*Math.sin(tip.a), hh=H*sc, top=(H-hh)/2;
    ctx.strokeStyle=`rgba(255,250,235,${0.5*lift})`; ctx.lineWidth=1.6;
    ctx.beginPath(); ctx.moveTo(tipX,top+2); ctx.lineTo(tipX,top+hh-2); ctx.stroke(); }
  // 光がもれ出す：紙のふちからあふれる光と、舞う光の粒（紙の上にも重ねる）
  if(glow>0.01){
    const t=performance.now()/1000;
    ctx.save(); ctx.globalCompositeOperation='lighter';
    const eg=ctx.createLinearGradient(tipX-60*d,0,tipX+40*d,0);
    eg.addColorStop(0,'rgba(255,236,180,0)'); eg.addColorStop(0.6,`rgba(255,240,200,${0.55*glow})`); eg.addColorStop(1,'rgba(255,236,180,0)');
    ctx.fillStyle=eg; ctx.fillRect(Math.min(tipX-60*d,tipX+40*d),0,100,H);
    for(let k=0;k<40;k++){
      const r=(k*97.3)%1, q=(k*57.1)%1, life=((t*0.5+r)%1);
      const px=tipX+d*(10+q*SPINE*0.6)*life, py=H*(0.1+0.8*((k*31.7)%1))-life*60;
      ctx.fillStyle=`rgba(255,244,200,${0.8*glow*(1-life)})`; ctx.beginPath(); ctx.arc(px,py,1.2+2*(1-life),0,Math.PI*2); ctx.fill();
    }
    ctx.restore();
  }
  ctx.restore();
}

