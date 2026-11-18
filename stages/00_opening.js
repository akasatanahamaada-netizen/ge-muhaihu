/* ============================================================================
   ステージ：序章 ── 森（マリと出会う）  id = 'opening'　※ひとりで目覚める場面は stages/00a_wake.js
   種類：story（ステージ上のキャラに話しかけて進む）
   担当：
   ----------------------------------------------------------------------------
   このファイルの直し方：
     ・地形を変える  → GT.defineStage(...) の platforms / items / decor
     ・セリフを変える → 下の「セリフ」の欄（MARI_FIRST など）
     ・登場人物     → npcs[].who は 'mari' / 'hood' / 'wolf' が使えます
   並び順を変えたいときは playlist.js を直してください。

   ◆ このステージの流れ
     1) まぶたが開くように画面が明るくなる。少年は地面に倒れている（act:'opening-lie'）
        空から、本のページが数枚ひらひら落ちてくる（少年が「落ちてきた」なごり）
     2) 本を開くと、文章も挿絵もあるが、ところどころ欠けて読めないページが見える（act:'opening-book-on' / 'off'）
     3) 操作できるようになると、少年が起き上がる。
        右ページの大きな木の陰から、マリがときどき顔をのぞかせている。
        背表紙をこえて近づくと、マリが「！」と木の陰から出てくる。
     4) ミッション：散らばった「お話のかけら（ちぎれた紙きれ）」を 3つ 拾う
          ・かけらは空から落ちてきて、下の 3か所にとまる（とまるまでは拾えない）
          ・拾うと、かけらが画面上の「お話のかけら」の表示へ飛んでいく
          ・丘のてっぺん          … 段をのぼる練習
          ・右ページの切り株の上    … ジャンプの練習
          ・倒れていた場所の葉の陰  … 「ちゃんと見て」（手前の葉に隠れている）
     5) マリと話す。拾った数でセリフが変わる。話したあとも、何度でもヒントをくれる。
     6) 話し終えて、かけらを全部拾うと、右の端が開く。

   ◆ このファイルが持っている独自の仕掛け（engine.js は触らない）
     GT.registerAct      … 'opening-lie' 'opening-book-on' 'opening-book-off'
     GT.registerUpdate   … マリの動き・セリフの切り替え
     GT.registerDraw     … 木漏れ日・落ち葉・散らばったページ・マリの木・本の絵・まぶた
   ========================================================================== */
(function(){
const ctx=GT.ctx, W=GT.W, H=GT.H, EDGE=GT.EDGE, FLOOR=H-GT.EDGE;

// --- 地形 ------------------------------------------------------------------
GT.defineStage('opening', {
  platforms:[
    // 左ページ：少年が落ちてきた小さな丘（3段）
    {page:'left', x:90,  y:420, w:140, h:40,  kind:'ledge'},
    {page:'left', x:180, y:380, w:160, h:80,  kind:'ledge'},
    {page:'left', x:280, y:340, w:150, h:120, kind:'ledge'},
    // 右ページ：切り株（ジャンプで乗る）
    {page:'right', x:520, y:380, w:56, h:84,  kind:'ledge'},
  ],
  boxes:[
  ],
  enemies:[
  ],
  items:[
    {page:'left',  x:340, y:296, w:40, h:40},   // 丘のてっぺん
    {page:'right', x:534, y:334, w:28, h:28},   // 切り株の上
    {page:'left',  x:22,  y:434, w:26, h:26},   // 倒れていた場所の葉の陰（手前の葉で隠れる）
  ],
  mission:['items'],
  bookPage:'prologue',   // ここのかけらは、本の序章「森での目覚め」のページのもの（このステージのかけらで完結。全部拾うと、欠けた文字・挿絵が埋まる）
  // 見た目：輪郭線なしのフラットな絵本ふう（背景は playlist.js で見開き全体に敷く）
  decor:[
    // 奥の木は、ゴシックの枯れ木（下の GOTH.back で描く）
    // 石・茂みは、ゴシックの石と薔薇の茂み（下の GOTH で描く）
    {layer:'front', kind:'fernFlat',  x:-6,  y:386, w:96,  h:80},   // かけらを隠す葉
    {layer:'front', kind:'grassFlat', x:298, y:310, w:58,  h:30},
    {layer:'front', kind:'grassFlat', x:466, y:434, w:62,  h:30},
    {layer:'front', kind:'grassFlat', x:806, y:434, w:56,  h:30},
  ],
});

GT.setLedgeStyle('opening','flat');   // 足場は輪郭線なしの平らな茶色

// --- セリフ ----------------------------------------------------------------
// 最初に話しかけたとき。拾ったかけらの数で、途中が変わる。
function MARI_FIRST(c){   // マリは、最低限のことしか言わない（あとは「自分の目で見てきて」）
  const rest=c.itemsAll-c.items;
  return [
    {s:'マリ',c:'mari',t:'……来たんだ。'},
    {s:'少年',c:'boy',t:'……ここ、どこ？'},
    {s:'マリ',c:'mari',t:'本の中。'},
    {s:'少年',c:'boy',t:'本の、中……？'},
    {s:'マリ',c:'mari',t:'名前は？'},
    {s:'少年',c:'boy',t:'……思い出せない。'},
    {s:'マリ',c:'mari',t:'じゃあ、自分で決めて。',ask:'name'},
    {s:'マリ',c:'mari',t:'{name}。……わかった。'},
    {s:'マリ',c:'mari',t:'その本。全部埋めないと、帰れないよ。'},
    {s:'少年',c:'boy',t:'埋めるって、どうやって？'},
    {s:'マリ',c:'mari',t:'……説明は、しない。自分の目で見てきて。'},
    ...(rest>0 ? [{s:'マリ',c:'mari',t:'まずは、そこらに落ちてる紙きれ。拾っておいて。'}] : []),
    {s:'少年',c:'boy',t:'……きみは？'},
    {s:'マリ',c:'mari',t:'マリ。',act:'mari-named'},
  ];
}
function MARI_AGAIN(c){
  const rest=c.itemsAll-c.items;
  if(rest<=0) return [ {s:'マリ',c:'mari',t:'……行って。'} ];
  return [ {s:'マリ',c:'mari',t:`あと ${rest}つ。`}, {s:'マリ',c:'mari',t:'自分の目で、探して。'} ];
}

// --- シーン（会話と進行） --------------------------------------------------
GT.registerScene({
  id:'opening', type:'story', stage:'opening', label:'序章 ── 森',
  intro:[
    {s:'',c:'narr',t:'ページの向こうも、霧の深い森だった。'},
    {s:'',c:'narr',t:'大きな木の陰から、誰かがこちらをうかがっている。'},
  ],
  npcs:[
    { who:'mari', name:'マリ', page:'right', x:710,
      lines:MARI_FIRST({items:0,itemsAll:3}),          // 実際は話しかける直前に作り直す（下の update）
      onEnd:()=>{ st.talkedOnce=true;
        GT.fillPage('prologue','――少年は、ところどころ欠けた本とともに森で目を覚ました。そして、木の陰にいた少女と出会った。少女は、マリと名乗った。');
        // マリとの会話が、このページの最後のピース。マリのところから本へ飛んでいき、「少女と出会った・マリと名乗った」が埋まる
        const n=mariNpc(); GT.addPagePiece('prologue','opening:mari', n?{x:n.x,y:n.y,w:n.w,h:n.h}:null); } }
  ],
});

/* ==========================================================================
   ここから下は、このステージ専用の演出
   ========================================================================== */
const MARI_HIDE_X=710, MARI_PEEK_X=674, MARI_OUT_X=630, MARI_SPEED=110;
const TRUNK={x:690, w:72};                 // マリが隠れる木の幹
const HIDDEN_ITEM=2;                       // items の何番目が「葉の陰」か

const st={
  t0:performance.now(), lieDone:false,
  book:{on:false,a:0}, last:performance.now(),
  mariOut:false, bangT:0, talkedOnce:false,
  startX:60, movedFar:false, gotSeen:[],
};
const isOpening=()=>GT.scene&&GT.scene.id==='opening';
const mariNpc=()=>GT.getNpcs().find(n=>n.who==='mari');

GT.registerSceneReset(()=>{
  if(!isOpening()) return;
  const now=performance.now();
  st.t0=now; st.last=now; st.lieDone=false; st.book.on=false; st.book.a=0;
  st.mariOut=false; st.bangT=0; st.talkedOnce=false; st.movedFar=false; st.gotSeen=[];
});

// 少年は地面に倒れている（会話中は物理が止まるので、平たいまま。操作できると起き上がる）
GT.registerAct('opening-lie',()=>{
  const pl=GT.player, sq=1.65;
  pl.squash=sq; pl.y=FLOOR-pl.h/2-(pl.h/2)*(2-sq);
});
GT.registerAct('opening-book-on', ()=>{ st.book.on=true; });
GT.registerAct('mari-named', ()=>{ GT.flags.mariNamed=true; });
GT.registerAct('opening-book-off',()=>{ st.book.on=false; });

/* ---------- 毎フレームの処理（操作中だけ動く） ---------- */
GT.registerUpdate(dt=>{
  if(!isOpening()) return;
  const pl=GT.player, n=mariNpc(); if(!n) return;
  const pcx=pl.x+pl.w/2;
  if(Math.abs(pcx-(st.startX+pl.w/2))>90) st.movedFar=true;

  // マリ：はじめは木の陰。ときどき顔を出す。背表紙をこえて近づくと出てくる
  if(!st.mariOut && pcx>GT.SPINE+20){ st.mariOut=true; st.bangT=1.3; }
  let target;
  if(st.mariOut) target=MARI_OUT_X;
  else { const ph=((performance.now()-st.t0)/1000)%3.4; target=(ph>2.2&&ph<3.1)?MARI_PEEK_X:MARI_HIDE_X; }
  const step=(st.mariOut?MARI_SPEED:70)*dt;
  if(Math.abs(target-n.x)<=step) n.x=target; else n.x+=Math.sign(target-n.x)*step;
  st.bangT=Math.max(0,st.bangT-dt);

  // 木の陰にいるあいだは話しかけられない
  const c=GT.missionCount();
  n.talkable=st.mariOut;
  // 話しかける直前の状態でセリフを作る。1回話したあとは、ヒントを何度でもくれる
  if(!st.talkedOnce){ n.lines=MARI_FIRST(c); }
  else {
    if(n.talked){ n.talked=false; n.onEnd=null; }
    n.lines=MARI_AGAIN(c);
  }
});

/* ---------- 描画の小道具 ---------- */
function ell(x,y,rx,ry,c,rot){ ctx.beginPath(); ctx.ellipse(x,y,rx,ry,rot||0,0,Math.PI*2); ctx.fillStyle=c; ctx.fill(); }
const secs=()=>(performance.now()-st.t0)/1000;
// 決まった乱数（毎フレーム同じ値になる）
const rnd=i=>{ const s=Math.sin(i*127.1+311.7)*43758.5453; return s-Math.floor(s); };

/* お話のかけら：本から抜け落ちたページのかけらが、空からひらひら落ちてきて、拾う場所（items）にとまる。
   とまるまでは、拾えるかけら（engine が描く）は隠しておく（it.hidden）。
   とまったところで、落ちてきた紙と同じ形のまま、拾えるようになる。 */
const FALL_DELAY=[0.4,1.3,2.2], FALL=3.0;
function drawPages(){
  const t=secs();
  GT.items.forEach((it,i)=>{
    const k=Math.min(1,Math.max(0,(t-(FALL_DELAY[i]||0))/FALL));
    it.hidden = !it.got && k<1;
    if(k<=0 || k>=1) return;
    // ひらひら左右にゆれながら落ちる（最後はぴったり拾う場所にとまる）
    const ex=it.x+it.w/2, ey=it.y+it.h/2, h=it.hole, hx=h?h.x+h.w/2:ex, hy=h?h.y+h.h/2:-20;
    const y=hy+(ey-hy)*k, sway=Math.sin(k*Math.PI*4+i)*34*(1-k)*Math.min(1,k*4);
    const bx=hx+(ex-hx)*k*k*(3-2*k);
    const rot=Math.sin(k*Math.PI*5+i)*0.9*(1-k);
    ctx.save(); ctx.translate(bx+sway,y); ctx.scale(1,0.4+0.6*Math.abs(Math.cos(k*9*(1-k)+i)));
    const sz=GT.pageScrapSize(it);
    GT.drawPageScrap(0,0,sz.w,sz.h,rot,GT.pageScrapSeed(it),0); ctx.restore();
  });
}

/* はじめて動きだしたら、「落ちている紙きれ＝お話のかけら」を教える（1つ拾うまで） */
function drawScrapHint(){
  if(GT.mode!=='play' || !st.movedFar || GT.items.some(i=>i.got)) return;
  const it=GT.items[0]; if(!it || it.hidden) return;
  GT.drawHint(it.x+it.w/2, it.y-58, ['落ちている紙きれ ＝ お話のかけら','さわると 拾える']);
}

/* 月あかりの筋（青白く、うすく） */
function drawLightShafts(){
  const t=performance.now()/1000;
  ctx.save(); ctx.globalCompositeOperation='lighter';
  [[120,70,0.6],[330,50,1.7],[600,90,2.9],[760,40,4.1]].forEach(([x,w,s])=>{
    const a=0.026+0.012*Math.sin(t*0.7+s);
    const g=ctx.createLinearGradient(0,EDGE,0,FLOOR);
    g.addColorStop(0,`rgba(210,214,230,${a*1.6})`); g.addColorStop(1,'rgba(210,214,230,0)');
    ctx.fillStyle=g; ctx.beginPath();
    ctx.moveTo(x,EDGE); ctx.lineTo(x+w,EDGE); ctx.lineTo(x+w-110,FLOOR); ctx.lineTo(x-150,FLOOR); ctx.closePath(); ctx.fill();
  });
  // 光の中を漂うちり
  for(let i=0;i<22;i++){
    const x=(rnd(i)*W+Math.sin(t*0.3+i)*20)%W, y=EDGE+((rnd(i+50)*H+t*(6+rnd(i+9)*8))%(FLOOR-EDGE));
    ctx.globalAlpha=0.25+0.25*Math.sin(t*2+i); ell(x,y,1.2,1.2,'#e8dcff');
  }
  ctx.restore();
}

/* 落ち葉 */
function drawLeaves(){
  const t=performance.now()/1000;
  for(let i=0;i<9;i++){
    const sp=18+rnd(i+3)*16, span=FLOOR-EDGE+40;
    const y=EDGE-20+((t*sp+rnd(i)*span)%span);
    const x=rnd(i+20)*W+Math.sin(t*1.3+i*2)*26;
    const r=t*2+i;
    ell(x,y,4.6,2.6*Math.abs(Math.cos(r)),i%3?'rgba(150,26,52,0.85)':'rgba(196,52,77,0.85)',Math.sin(r)*0.8);   // 薔薇の花びら
  }
}

/* マリが隠れる大きな木（マリより手前・少年より奥）：凝った木（GTDecor.paint） */
function drawMariTree(){
  GOTH.big(TRUNK.x, TRUNK.w); return;                // ゴシックの木（下は、前の丸い木。もどすときは、この行を消す）
  const x=TRUNK.x, w=TRUNK.w, P=GTDecor.paint;
  P.trunk(ctx, x, 104, FLOOR, w, 41, { hollow:{x:x+w*0.55,y:250,rx:8,ry:13},
    branches:[{y:150,dir:-1,len:80},{y:132,dir:1,len:84},{y:190,dir:1,len:46}] });
  P.canopy(ctx,[ {x:x+w/2,y:66,rx:84,ry:56}, {x:x-28,y:116,rx:58,ry:42}, {x:x+w+26,y:108,rx:56,ry:42}, {x:x+w/2-4,y:132,rx:62,ry:40} ], 43);
}

/* 切り株：平らな茶色に、上のふちとたて線 */
function drawStump(){
  const p={x:520,y:380,w:56,h:84};
  ctx.save();
  GT.roundRect(p.x,p.y,p.w,p.h,6); const sg=ctx.createLinearGradient(p.x,0,p.x+p.w,0);
  sg.addColorStop(0,'#2a1a20'); sg.addColorStop(0.55,'#3e2a2e'); sg.addColorStop(1,'#1e1218'); ctx.fillStyle=sg; ctx.fill();   // 暗い木
  ctx.strokeStyle='#120a0e'; ctx.lineWidth=1.6; ctx.stroke();
  ctx.strokeStyle='rgba(10,4,8,0.55)'; ctx.lineWidth=1.3;
  for(let i=1;i<4;i++){ const bx=p.x+i*p.w/4; ctx.beginPath(); ctx.moveTo(bx,p.y+16); ctx.lineTo(bx+(i-2)*2,p.y+p.h-2); ctx.stroke(); }
  ctx.beginPath(); ctx.ellipse(p.x+p.w/2,p.y+7,p.w/2-3,5,0,0,Math.PI*2); ctx.fillStyle='#6a5258'; ctx.fill();   // 切り口（月あかり）
  ctx.strokeStyle='rgba(30,16,24,0.6)'; ctx.lineWidth=1;
  for(const k of [0.12,0.22,0.32]){ ctx.beginPath(); ctx.ellipse(p.x+p.w/2,p.y+7,p.w*k,2.5*k/0.22,0,0,Math.PI*2); ctx.stroke(); }   // 年輪
  ctx.strokeStyle='#26301e'; ctx.lineWidth=1.5; ctx.beginPath();                                                     // つた
  for(let y=p.y+12;y<p.y+p.h;y+=4){ const x=p.x+p.w-10+Math.sin(y*0.15)*5; y===p.y+12?ctx.moveTo(x,y):ctx.lineTo(x,y); } ctx.stroke();
  for(let y=p.y+20;y<p.y+p.h-4;y+=12) ell(p.x+p.w-10+Math.sin(y*0.15)*5+((y/12)%2<1?-5:5),y,4.5,2.2,'#34422a');
  ctx.restore();
}

/* 葉の陰のかけらが、ときどききらっと光る（見つけるヒント） */
function drawHiddenGlint(){
  const it=GT.items[HIDDEN_ITEM]; if(!it||it.got||it.hidden) return;
  const t=performance.now()/1000, k=(t%2.6)/2.6; if(k>0.35) return;
  const a=Math.sin(k/0.35*Math.PI), cx=it.x+it.w/2+4, cy=it.y+2;
  ctx.save(); ctx.globalAlpha=a; ctx.strokeStyle='#ffe9a0'; ctx.lineWidth=1.6;
  ctx.beginPath(); ctx.moveTo(cx-7,cy); ctx.lineTo(cx+7,cy); ctx.moveTo(cx,cy-7); ctx.lineTo(cx,cy+7); ctx.stroke();
  ctx.restore();
}

/* マリの「！」と、操作のヒント */
function drawMarks(){
  const n=mariNpc();
  if(n && st.bangT>0){
    const a=Math.min(1,st.bangT*3), jump=Math.max(0,st.bangT-1.0)*40;
    ctx.save(); ctx.globalAlpha=a; ctx.font="700 22px 'Zen Old Mincho',serif"; ctx.textAlign='center';
    ctx.fillStyle='#4a4e6d'; ctx.fillText('！', n.x+n.w/2, (n.g||1)>0 ? n.y-30-jump : n.y+n.h+44+jump); ctx.restore();
  }
  // 歩きかたの案内は、前のページ（目覚めの場面）の「→ 右へ進む」だけ
}

/* 本の絵（虫食いのページ） */
/* 序章で少年が開く本：「物語を振り返る」画面の本と同じつくり（革の表紙・クリーム色の紙・本物の挿絵と文章）。
   ただし、まだ何も埋まっていないので、文字はところどころ にじんだり 欠けたりして読めず、挿絵には かけらの形の穴があいている */
const BOOK_TEXT_L='――少年は、ところどころ欠けた本とともに森で目を覚ました。そして、木の陰にいた少女と出会った。';
const BOOK_TEXT_R='少女は、マリと名乗った。森のむこうには、まだ白いままのページが、どこまでも続いている。';
const bookArtCv=document.createElement('canvas');
function bookText(x,y,maxW,text,seed,lack,lineH){   // 1文字ずつ書く。欠けた字は、にじみ（インクのしみ）か空白にする。全体に ぼやけている
  ctx.save(); ctx.font="500 12px 'Zen Old Mincho',serif"; ctx.textBaseline='middle'; ctx.textAlign='left'; ctx.filter='blur(1.1px)';
  let cx=x, cy=y, i=0;
  for(const ch of text){
    const w=ctx.measureText(ch).width;
    if(cx+w>x+maxW){ cx=x; cy+=lineH; }
    const v=rnd(Math.floor(i/3)+seed*97)*0.65+rnd(i*1.7+seed*13)*0.35;   // となりどうしで、まとまって欠ける
    if(v<lack){
      if(rnd(i+seed*5)<0.35){ ctx.fillStyle='rgba(120,92,60,0.13)'; ctx.beginPath(); ctx.ellipse(cx+w/2,cy,w*0.5,4.5,rnd(i)*3,0,Math.PI*2); ctx.fill(); }   // うすいしみ（多くは、ただの空白）
    } else { ctx.fillStyle='rgba(58,53,80,0.6)'; ctx.fillText(ch,cx,cy); }
    cx+=w; i++;
  }
  ctx.restore(); return cy;
}
function drawBookView(){
  const now=performance.now(), dt=Math.min(0.1,(now-st.last)/1000); st.last=now;
  st.book.a+=((st.book.on?1:0)-st.book.a)*Math.min(1,dt*6);
  if(st.book.a<0.01) return;
  const cx=W/2, cy=176, pw=236, ph=262, top=cy-ph/2, k=st.book.a;
  ctx.save(); ctx.globalAlpha=k;
  ctx.fillStyle='rgba(24,20,14,0.82)'; ctx.fillRect(0,0,W,H);
  ctx.translate(cx,cy); ctx.scale(0.94+0.06*k,0.94+0.06*k); ctx.translate(-cx,-cy);   // 開くとき、少し手前にせり出す
  // 表紙（革。金の縁取り）
  ctx.save(); ctx.shadowColor='rgba(0,0,0,0.55)'; ctx.shadowBlur=24; ctx.shadowOffsetY=10;
  GT.roundRect(cx-pw-16,top-12,pw*2+32,ph+24,10);
  const cg=ctx.createLinearGradient(cx-pw,top,cx+pw,top+ph); cg.addColorStop(0,'#6a4a33'); cg.addColorStop(0.6,'#4a3222'); cg.addColorStop(1,'#3a2618');
  ctx.fillStyle=cg; ctx.fill(); ctx.restore();
  GT.roundRect(cx-pw-10,top-6,pw*2+20,ph+12,7); ctx.strokeStyle='rgba(214,178,110,0.55)'; ctx.lineWidth=1.4; ctx.stroke();
  // 紙（下に重なるページの厚み → いちばん上のページ）
  for(let d=3;d>=1;d--){ ctx.fillStyle=d%2?'#d9caa2':'#e6d8b4'; ctx.fillRect(cx-pw-d*1.2,top+d*1.6,pw*2+d*2.4,ph-d*0.6); }
  for(const side of [-1,1]){
    const x0=side<0?cx-pw:cx, g=ctx.createLinearGradient(x0,0,x0+pw,0);
    if(side<0){ g.addColorStop(0,'#efe5c9'); g.addColorStop(0.7,'#f3ead3'); g.addColorStop(0.96,'#ddcfa9'); g.addColorStop(1,'#cbbb92'); }
    else      { g.addColorStop(0,'#cbbb92'); g.addColorStop(0.04,'#ddcfa9'); g.addColorStop(0.3,'#f3ead3'); g.addColorStop(1,'#efe5c9'); }
    ctx.fillStyle=g; ctx.fillRect(x0,top,pw,ph);
  }
  const ink='#3a2f2a', pad=24;
  // ---- 左ページ：本文だけ（見出しは書かない。ぼやけた文章が並んでいる） ----
  bookText(cx-pw+pad, top+40, pw-pad*2, BOOK_TEXT_L, 3, 0.35, 22);
  // 小さな飾り（つる草の文様）
  ctx.save(); ctx.strokeStyle='rgba(176,141,87,0.55)'; ctx.lineWidth=1.2; const oy=top+ph-46, ox=cx-pw/2;
  ctx.beginPath(); ctx.moveTo(ox-46,oy); ctx.bezierCurveTo(ox-24,oy-12,ox-10,oy+10,ox,oy); ctx.bezierCurveTo(ox+10,oy-10,ox+24,oy+12,ox+46,oy); ctx.stroke();
  ctx.fillStyle='rgba(176,141,87,0.6)'; ctx.beginPath(); ctx.arc(ox,oy,2.4,0,Math.PI*2); ctx.fill(); ctx.restore();
  // ---- 右ページ：挿絵（本物の挿絵を、うすく色あせさせて）と、その下の文章 ----
  const aw=pw-pad*2, ah=aw*330/600, ax=cx+pad, ay=top+24;
  if(GT.bookArt && GT.bookArt.has('prologue')){ GT.bookArt.mount(bookArtCv,'prologue');
    ctx.save(); ctx.filter='blur(2.2px) sepia(0.45) saturate(0.6) contrast(0.8)'; ctx.globalAlpha=k*0.7; ctx.drawImage(bookArtCv,ax,ay,aw,ah); ctx.restore(); }   // 色あせて、ぼやけた挿絵
  ctx.save(); ctx.strokeStyle='rgba(90,74,51,0.35)'; ctx.lineWidth=1; ctx.strokeRect(ax+0.5,ay+0.5,aw-1,ah-1); ctx.restore();
  [[ax+aw*0.36,ay+ah*0.62,0],[ax+aw*0.74,ay+ah*0.42,1]].forEach(([hx,hy,j])=>{               // かけらが抜け落ちた穴（下のページの紙が見える）
    const pts=GT.scrapPoints ? GT.scrapPoints(40,36,51+j*17) : [];
    ctx.beginPath(); pts.forEach(([x,y],i)=>i?ctx.lineTo(hx+x,hy+y):ctx.moveTo(hx+x,hy+y)); ctx.closePath();
    ctx.fillStyle='#e3d6b4'; ctx.fill(); ctx.strokeStyle='rgba(255,250,235,0.95)'; ctx.lineWidth=2.5; ctx.stroke();
    ctx.strokeStyle='rgba(90,74,51,0.45)'; ctx.lineWidth=1; ctx.stroke(); });
  bookText(cx+pad, ay+ah+24, pw-pad*2, BOOK_TEXT_R, 7, 0.45, 22);
  // ページ番号
  ctx.save(); ctx.fillStyle='#9a8462'; ctx.font="500 10px 'Zen Old Mincho',serif"; ctx.textAlign='center';
  ctx.fillText('― 1 ―',cx-pw/2,top+ph-14); ctx.fillText('― 2 ―',cx+pw/2,top+ph-14); ctx.restore();
  // 虫食い（左ページは少し、右ページはたくさん食べられている）
  GT.wormEaten(ctx, cx-pw, top, pw, ph, 3, { edges:['left','top','bottom'], under:'#dccb9f', outside:'#4a3222', count:3 });
  GT.wormEaten(ctx, cx,    top, pw, ph, 7, { edges:['right','top','bottom'], under:'#dccb9f', outside:'#4a3222', count:5, avoid:[{x:ax,y:ay,w:aw,h:ah}] });
  // のど（真ん中の影）
  const sg=ctx.createLinearGradient(cx-16,0,cx+16,0);
  sg.addColorStop(0,'rgba(58,50,38,0)'); sg.addColorStop(0.5,'rgba(58,50,38,0.4)'); sg.addColorStop(1,'rgba(58,50,38,0)');
  ctx.fillStyle=sg; ctx.fillRect(cx-16,top,32,ph);
  // しおりのひも（赤）：本の下から、少しだけたれている
  ctx.save(); ctx.strokeStyle='#9a2f28'; ctx.lineWidth=4; ctx.lineCap='round';
  ctx.beginPath(); ctx.moveTo(cx+8,top+ph-6); ctx.quadraticCurveTo(cx+6,top+ph+12,cx+12,top+ph+26); ctx.stroke();
  ctx.fillStyle='#9a2f28'; ctx.beginPath(); ctx.moveTo(cx+6,top+ph+22); ctx.lineTo(cx+18,top+ph+22); ctx.lineTo(cx+15,top+ph+34); ctx.lineTo(cx+12,top+ph+28); ctx.lineTo(cx+9,top+ph+34); ctx.closePath(); ctx.fill();
  ctx.restore();
  ctx.restore();
}

/* 目を覚ます：まぶたが2回ひらく */
function drawWake(){
  return;   // 目覚めは前のページ（stages/00a_wake.js）
  const t=secs(); if(t>3.2) return;
  const k=(a,b,x)=>Math.min(1,Math.max(0,(x-a)/(b-a)));
  let open;
  if(t<0.7) open=0;
  else if(t<1.2) open=0.35*k(0.7,1.2,t);
  else if(t<1.5) open=0.35-0.3*k(1.2,1.5,t);
  else open=0.05+0.95*(1-Math.pow(1-k(1.5,3.0,t),2));
  const lid=(1-open)*(H/2+30);
  ctx.save(); ctx.fillStyle='#120e09';
  ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(W,0); ctx.lineTo(W,lid-30); ctx.quadraticCurveTo(W/2,lid+30,0,lid-30); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(0,H); ctx.lineTo(W,H); ctx.lineTo(W,H-lid+30); ctx.quadraticCurveTo(W/2,H-lid-30,0,H-lid+30); ctx.closePath(); ctx.fill();
  // まだぼんやりしている
  ctx.globalAlpha=0.5*(1-open); ctx.fillRect(0,0,W,H);
  ctx.restore();
}

/* 3段の丘：森の小道①と同じ「苔むした岩」（stages/_decor.js の GTDecor.forest.rock）。
   段の形を変えたら、下の番号（platforms の何番目か）も合わせて直すこと。 */
/* ---- ゴシックの森（タイトル画面の、霧の薔薇の森に合わせる） --------------------------
   ・奥の木：葉のない、ねじれた枯れ木。枝先にとげ、幹にいばらのつると薔薇。片がわに月あかりのふち
   ・上のすみ：いばらの枝が、画面のふちから伸びてくる（少年より手前）
   ・地面の霧（ゆっくり流れる）と、ただよう淡い光の粒
   動かない絵は、一度だけ別のキャンバスに描いておく（重くならないように） */
const GOTH=(()=>{
  const R=seed=>{ let s=seed; return ()=>((s=(s*16807)%2147483647)/2147483647); };
  function branch(c,r,x,y,len,ang,w,d){
    const x2=x+Math.cos(ang)*len, y2=y+Math.sin(ang)*len, mx=(x+x2)/2+(r()-0.5)*len*0.35, my=(y+y2)/2+(r()-0.5)*len*0.35;
    c.lineWidth=w; c.beginPath(); c.moveTo(x,y); c.quadraticCurveTo(mx,my,x2,y2); c.stroke();
    if(d<=2) for(let i=0;i<3;i++){ const u=0.3+r()*0.6, tx=x+(x2-x)*u, ty=y+(y2-y)*u, ta=ang+(r()<0.5?-1:1)*1.15;   // とげ
      c.lineWidth=1; c.beginPath(); c.moveTo(tx,ty); c.lineTo(tx+Math.cos(ta)*4.5,ty+Math.sin(ta)*4.5); c.stroke(); }
    if(d<=0) return;
    const n=d>2?2:(r()<0.5?2:3);
    for(let i=0;i<n;i++){ const a=ang+(i-(n-1)/2)*(0.5+r()*0.35)+(r()-0.5)*0.35;
      branch(c,r,x2,y2,len*(0.62+r()*0.16),a,Math.max(1,w*0.62),d-1); }
  }
  function rose(c,x,y,s){
    c.fillStyle='#6e1024'; c.beginPath(); c.arc(x,y,s,0,Math.PI*2); c.fill();
    c.fillStyle='#a8243f'; c.beginPath(); c.arc(x-s*0.25,y-s*0.25,s*0.62,0,Math.PI*2); c.fill();
    c.strokeStyle='#3e0812'; c.lineWidth=1; c.beginPath(); c.arc(x-s*0.15,y-s*0.15,s*0.35,0.4,5.6); c.stroke();
    c.fillStyle='#1f2a1c'; c.beginPath(); c.ellipse(x+s*0.9,y+s*0.6,s*0.7,s*0.32,0.6,0,Math.PI*2); c.fill();   // 葉
  }
  function vine(c,r,x,base,topY,tw,lean){
    const at=y=>{ const u=(base-y)/(base-topY); return x+lean*u+Math.sin(y*0.055)*tw*0.95; };
    c.strokeStyle='#2c2026'; c.lineWidth=1.8; c.beginPath();
    for(let y=base;y>topY+16;y-=4){ y===base?c.moveTo(at(y),y):c.lineTo(at(y),y); } c.stroke();
    c.lineWidth=1; for(let y=base-10;y>topY+24;y-=13){ const vx=at(y), s=r()<0.5?-1:1; c.beginPath(); c.moveTo(vx,y); c.lineTo(vx+s*4,y-3); c.stroke(); }
    for(let i=0;i<3;i++){ const y=base-(base-topY)*(0.12+r()*0.62); rose(c,at(y),y,4+r()*2.5); }
  }
  function tree(c,x,base,h,seed,lean){
    const r=R(seed), topY=base-h*0.55, tw=Math.max(13,h*0.065);
    c.fillStyle=c.strokeStyle='#22141b'; c.lineCap='round';
    c.beginPath(); c.moveTo(x-tw*1.35,base); c.quadraticCurveTo(x-tw*0.55+lean*0.3,base-h*0.3,x-tw*0.32+lean,topY);
    c.lineTo(x+tw*0.32+lean,topY); c.quadraticCurveTo(x+tw*0.55+lean*0.3,base-h*0.3,x+tw*1.35,base); c.closePath(); c.fill();
    for(const s of [-1,1]){ c.lineWidth=tw*0.38; c.beginPath(); c.moveTo(x+s*tw*0.8,base-8); c.quadraticCurveTo(x+s*tw*1.7,base-3,x+s*tw*2.6,base); c.stroke(); }   // 根
    branch(c,r,x+lean,topY,h*0.23,-Math.PI/2-0.55,tw*0.55,4);
    branch(c,r,x+lean,topY,h*0.25,-Math.PI/2+0.5,tw*0.55,4);
    branch(c,r,x+lean*0.6,topY+h*0.16,h*0.18,-Math.PI/2+(r()<0.5?-1:1)*1.15,tw*0.4,3);
    c.fillStyle='#0f070b'; c.beginPath(); c.ellipse(x+lean*0.4,base-h*0.3,tw*0.24,tw*0.42,0,0,Math.PI*2); c.fill();   // うろ
    c.strokeStyle='rgba(200,165,215,0.3)'; c.lineWidth=1.6; c.beginPath();                                          // 月あかりのふち
    c.moveTo(x+tw*1.15,base-6); c.quadraticCurveTo(x+tw*0.5+lean*0.3,base-h*0.3,x+tw*0.28+lean,topY); c.stroke();
    vine(c,r,x,base,topY,tw,lean);
  }
  // マリが隠れる大きな木：幹の太さ・場所は前と同じ（マリがかくれられるように）。丸い葉のかたまりのかわりに、ねじれた枝の冠
  function bigTree(c,x,w,top,base){
    const r=R(97); c.fillStyle=c.strokeStyle='#22141b'; c.lineCap='round';
    c.beginPath(); c.moveTo(x-10,base); c.quadraticCurveTo(x+4,base-80,x+6,top+60); c.lineTo(x+w*0.3,top); c.lineTo(x+w*0.7,top); c.lineTo(x+w-6,top+60);
    c.quadraticCurveTo(x+w-4,base-80,x+w+10,base); c.closePath(); c.fill();
    for(const [sx,ex] of [[x+6,x-34],[x+w-6,x+w+34],[x+w*0.4,x+w*0.2-6]]){ c.lineWidth=12; c.beginPath(); c.moveTo(sx,base-14); c.quadraticCurveTo((sx+ex)/2,base-4,ex,base); c.stroke(); }   // 根
    c.strokeStyle='rgba(0,0,0,0.35)'; c.lineWidth=1.4;                                                                                    // 樹皮のすじ
    for(let i=0;i<5;i++){ const bx=x+10+i*(w-20)/4; c.beginPath(); c.moveTo(bx,top+70); c.quadraticCurveTo(bx+(r()-0.5)*10,(top+base)/2,bx+(r()-0.5)*6,base-10); c.stroke(); }
    c.fillStyle='#0f070b'; c.beginPath(); c.ellipse(x+w*0.55,250,8,13,0,0,Math.PI*2); c.fill();                                          // うろ
    c.strokeStyle='rgba(200,165,215,0.3)'; c.lineWidth=1.8; c.beginPath(); c.moveTo(x+w+8,base-4); c.quadraticCurveTo(x+w-4,base-80,x+w-6,top+60); c.stroke();
    c.strokeStyle='#22141b';
    branch(c,r,x+w*0.35,top+6,96,-Math.PI/2-0.75,13,4); branch(c,r,x+w*0.65,top+6,100,-Math.PI/2+0.7,13,4);
    branch(c,r,x+w*0.5,top,70,-Math.PI/2+0.05,10,4); branch(c,r,x+6,top+70,74,Math.PI+0.35,9,3); branch(c,r,x+w-6,top+86,64,-0.3,8,3);
    vine(c,r,x+w*0.5,base,top+40,w*0.42,0);
  }
  // 遠くの木（うすい影絵。奥行き）
  function farTrees(c){ const r=R(5); c.fillStyle=c.strokeStyle='rgba(60,36,56,0.55)'; c.lineCap='round';
    for(const [x,h] of [[150,250],[360,280],[560,240],[610,300],[840,260]]){ const b=FLOOR+4, tw=8+h*0.02;
      c.beginPath(); c.moveTo(x-tw,b); c.lineTo(x-tw*0.4,b-h*0.6); c.lineTo(x+tw*0.4,b-h*0.6); c.lineTo(x+tw,b); c.fill();
      branch(c,r,x,b-h*0.6,h*0.2,-Math.PI/2-0.5,tw*0.7,3); branch(c,r,x,b-h*0.6,h*0.2,-Math.PI/2+0.5,tw*0.7,3); } }
  // こわれかけた木の柵と、からむ薔薇（タイトル画面の絵のように）
  function fence(c,x0,x1,seed){ const r=R(seed), b=FLOOR+2;
    c.strokeStyle='#120a0e'; c.lineWidth=1.4;
    const post=(x,h,tilt)=>{ c.save(); c.translate(x,b); c.rotate(tilt); c.fillStyle='#3a2a2c'; c.beginPath(); c.moveTo(-6,0); c.lineTo(-6,-h); c.lineTo(0,-h-8); c.lineTo(6,-h); c.lineTo(6,0); c.closePath(); c.fill(); c.stroke();
      c.strokeStyle='rgba(10,4,8,0.5)'; c.beginPath(); c.moveTo(-1,-h+6); c.lineTo(1,-8); c.stroke(); c.strokeStyle='#120a0e'; c.restore(); };
    const n=Math.max(2,Math.round((x1-x0)/60)); const xs=[]; for(let i=0;i<=n;i++) xs.push(x0+(x1-x0)*i/n);
    for(const yy of [b-30,b-54]){ c.fillStyle='#4a3436'; c.beginPath(); c.moveTo(x0,yy); c.lineTo(x1,yy+(r()-0.5)*10); c.lineTo(x1,yy+7+(r()-0.5)*4); c.lineTo(x0,yy+7); c.closePath(); c.fill(); c.stroke(); }
    xs.forEach((x,i)=>post(x,56+r()*16,(r()-0.5)*0.18));
    for(let i=0;i<5;i++) rose(c,x0+r()*(x1-x0),b-24-r()*36,4+r()*2.5); }
  // 石（苔とつた。墓石のように少し傾いた、上の丸い石）
  function stone(c,x,w,h){ const b=FLOOR+2; c.save(); c.translate(x+w/2,b); c.rotate(-0.06);
    c.beginPath(); c.moveTo(-w/2,0); c.lineTo(-w/2,-h+w/2); c.arc(0,-h+w/2,w/2,Math.PI,0); c.lineTo(w/2,0); c.closePath();
    const g=c.createLinearGradient(-w/2,0,w/2,0); g.addColorStop(0,'#5a4a58'); g.addColorStop(1,'#2e2430'); c.fillStyle=g; c.fill(); c.strokeStyle='#120a10'; c.lineWidth=1.6; c.stroke();
    c.strokeStyle='rgba(12,6,12,0.6)'; c.lineWidth=1; c.beginPath(); c.moveTo(-w*0.1,-h*0.7); c.lineTo(w*0.05,-h*0.5); c.lineTo(-w*0.05,-h*0.3); c.stroke();
    c.strokeStyle='rgba(225,205,240,0.3)'; c.lineWidth=1.4; c.beginPath(); c.arc(0,-h+w/2,w/2-2,Math.PI*1.1,Math.PI*1.6); c.stroke();
    c.fillStyle='#34422a'; c.beginPath(); c.ellipse(-w*0.15,-3,w*0.45,5,0,0,Math.PI*2); c.fill(); c.restore(); }
  // 薔薇の茂み
  function roseBush(c,x,w,h,seed){ const r=R(seed), b=FLOOR+3;
    for(let i=0;i<14;i++){ const lx=x+r()*w, ly=b-r()*h*0.9; c.fillStyle=i%2?'#1f2a1c':'#2a3624'; c.beginPath(); c.ellipse(lx,ly,9+r()*7,6+r()*4,r()*3,0,Math.PI*2); c.fill(); }
    c.strokeStyle='#1a1214'; c.lineWidth=1.2; for(let i=0;i<4;i++){ const sx=x+r()*w; c.beginPath(); c.moveTo(sx,b); c.quadraticCurveTo(sx+(r()-0.5)*30,b-h,sx+(r()-0.5)*20,b-h-10); c.stroke(); }
    for(let i=0;i<5;i++) rose(c,x+8+r()*(w-16),b-6-r()*(h-8),4.5+r()*2.5); }
  let backCv=null, topCv=null, bigCv=null, propCv=null;
  const mk=()=>{ const cv=document.createElement('canvas'); cv.width=W; cv.height=H; return cv; };
  return {
    paint:{R,branch,rose,vine,tree,farTrees,fence,stone,roseBush},   // ほかのステージでも使う（赤ずきんの家など）
    back(){ if(!backCv){ backCv=mk(); const c=backCv.getContext('2d');
        farTrees(c);
        tree(c,64,FLOOR+6,340,11,10); tree(c,252,FLOOR+6,300,23,-12); tree(c,468,FLOOR+6,286,37,14);
        fence(c,590,690,61); fence(c,800,W-8,67); }
      ctx.drawImage(backCv,0,0); },
    props(){ if(!propCv){ propCv=mk(); const c=propCv.getContext('2d'); stone(c,606,34,46); roseBush(c,780,96,40,29); roseBush(c,420,52,26,31); }
      ctx.drawImage(propCv,0,0); },
    // マリの木の枝にさげたランタン（ゆらゆら・火がまたたく）
    lantern(){ const t=performance.now()/1000, hx=652, hy=176, a=Math.sin(t*1.1)*0.06, L=34;
      const lx=hx+Math.sin(a)*L, ly=hy+Math.cos(a)*L, fl=0.85+0.15*Math.sin(t*11)+0.08*Math.sin(t*27);
      ctx.save(); ctx.globalCompositeOperation='lighter';
      let g=ctx.createRadialGradient(lx,ly+10,2,lx,ly+10,110*fl); g.addColorStop(0,`rgba(255,170,90,${0.32*fl})`); g.addColorStop(1,'rgba(255,170,90,0)');
      ctx.fillStyle=g; ctx.fillRect(lx-120,ly-110,240,240); ctx.restore();
      ctx.save(); ctx.strokeStyle='#1a1014'; ctx.lineWidth=1.2; ctx.beginPath(); ctx.moveTo(hx,hy); ctx.lineTo(lx,ly); ctx.stroke();   // くさり
      ctx.translate(lx,ly); ctx.rotate(-a);
      ctx.fillStyle='#1a1014'; ctx.beginPath(); ctx.moveTo(-6,2); ctx.lineTo(6,2); ctx.lineTo(9,8); ctx.lineTo(-9,8); ctx.closePath(); ctx.fill();   // 屋根
      ctx.beginPath(); ctx.arc(0,1,3,Math.PI,0); ctx.strokeStyle='#1a1014'; ctx.stroke();
      g=ctx.createLinearGradient(0,8,0,26); g.addColorStop(0,`rgba(255,214,140,${0.9*fl})`); g.addColorStop(1,`rgba(230,120,60,${0.85*fl})`);
      ctx.fillStyle=g; ctx.fillRect(-7,8,14,18);                                                               // ガラスの中の灯り
      ctx.strokeStyle='#1a1014'; ctx.lineWidth=1.6; ctx.strokeRect(-7,8,14,18); ctx.beginPath(); ctx.moveTo(0,8); ctx.lineTo(0,26); ctx.stroke();
      ctx.fillStyle='#1a1014'; ctx.fillRect(-8,26,16,3); ctx.restore(); },
    // 青白く光るきのこ
    shrooms(){ const t=performance.now()/1000;
      for(const [x,s,k] of [[136,1,0],[150,0.7,1],[598,0.9,2],[880,1.1,3],[896,0.7,4]]){ const y=FLOOR+1, a=0.55+0.25*Math.sin(t*1.6+k*1.7);
        ctx.save(); ctx.globalCompositeOperation='lighter';
        const g=ctx.createRadialGradient(x,y-8*s,0,x,y-8*s,22*s); g.addColorStop(0,`rgba(170,220,255,${0.35*a})`); g.addColorStop(1,'rgba(170,220,255,0)');
        ctx.fillStyle=g; ctx.fillRect(x-24*s,y-32*s,48*s,48*s); ctx.restore();
        ctx.fillStyle='#d8dcef'; ctx.fillRect(x-1.6*s,y-8*s,3.2*s,8*s);
        ctx.beginPath(); ctx.ellipse(x,y-8*s,7*s,4.5*s,0,Math.PI,0); ctx.fillStyle=`rgba(190,225,255,${0.75+0.25*a})`; ctx.fill();
        ell(x-2*s,y-10*s,1.1*s,0.9*s,'#ffffff'); } },
    big(x,w){ if(!bigCv){ bigCv=mk(); bigTree(bigCv.getContext('2d'),x,w,104,FLOOR+4); } ctx.drawImage(bigCv,0,0); },
    top(){ if(!topCv){ topCv=mk(); const c=topCv.getContext('2d'); c.strokeStyle='#1a0e14'; c.lineCap='round';
        let r=R(71); branch(c,r,-8,EDGE-4,96,0.32,10,4); branch(c,r,-8,EDGE+40,70,0.62,6,3);
        r=R(83); branch(c,r,W+8,EDGE-4,96,Math.PI-0.32,10,4); branch(c,r,W+8,EDGE+44,64,Math.PI-0.66,6,3);
        rose(c,58,EDGE+22,6); rose(c,92,EDGE+12,4.5); rose(c,W-64,EDGE+20,6); rose(c,W-104,EDGE+34,4.5); }
      ctx.drawImage(topCv,0,0); },
    fog(near){ const t=performance.now()/1000;
      ctx.save();
      for(let k=0;k<(near?1:2);k++){ const y=near?FLOOR-6:FLOOR-34-k*34, a=near?0.07:0.11-k*0.03, sp=near?14:7+k*4;
        for(let i=0;i<7;i++){ const x=((i*190+t*sp+k*90)%(W+340))-170;
          const g=ctx.createRadialGradient(x,y,0,x,y,170); g.addColorStop(0,`rgba(215,212,214,${a})`); g.addColorStop(1,'rgba(215,212,214,0)');
          ctx.fillStyle=g; ctx.save(); ctx.translate(x,y); ctx.scale(1,0.2); ctx.translate(-x,-y); ctx.fillRect(x-170,y-170,340,340); ctx.restore(); } }
      ctx.restore(); },
    wisps(){ const t=performance.now()/1000;
      ctx.save(); ctx.globalCompositeOperation='lighter';
      for(let i=0;i<12;i++){ const x=rnd(i+300)*W+Math.sin(t*0.4+i)*30, y=EDGE+70+rnd(i+310)*(FLOOR-EDGE-130)+Math.sin(t*0.6+i*2)*22;
        const a=0.22+0.18*Math.sin(t*1.7+i*1.3);
        const g=ctx.createRadialGradient(x,y,0,x,y,9); g.addColorStop(0,`rgba(255,226,196,${a})`); g.addColorStop(1,'rgba(255,226,196,0)');
        ctx.fillStyle=g; ctx.fillRect(x-9,y-9,18,18); ell(x,y,1.3,1.3,`rgba(255,244,228,${a+0.3})`); }
      ctx.restore(); },
  };
})();
GT.goth=GOTH;   // ゴシックの森の描き方を、ほかのステージにも貸す

function drawHill(){
  const P=i=>GT.STAGE_DEFS.opening.platforms[i];
  GTDecor.forest.rock([P(0),P(1),P(2)],3);
}

GT.registerDraw(()=>{ if(!isOpening()) return; drawLightShafts(); GOTH.back(); GOTH.props(); GOTH.fog(false); }, 'back');
GT.registerDraw(()=>{ if(!isOpening()) return; drawHill(); drawPages(); drawStump(); GOTH.shrooms(); drawMariTree(); GOTH.lantern(); drawLeaves(); drawMarks(); }, 'world');
GT.registerDraw(()=>{ if(!isOpening()) return; GOTH.fog(true); GOTH.top(); GOTH.wisps(); GTDecor.forest.air(); drawHiddenGlint(); drawScrapHint(); drawBookView(); drawWake(); }, 'overlay');
})();
