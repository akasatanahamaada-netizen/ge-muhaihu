/* ============================================================================
   ステージ：序章 ── 森（オープニング）  id = 'opening'
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
    {layer:'back',  kind:'tree',      x:16,  y:150, w:100, h:314},
    {layer:'back',  kind:'tree',      x:172, y:110, w:132, h:270},
    {layer:'back',  kind:'tree',      x:462, y:180, w:124, h:284},
    
    {layer:'back',  kind:'rockFlat',  x:604, y:422, w:62,  h:42},
    {layer:'back',  kind:'bushFlat',  x:786, y:420, w:82,  h:44},
    {layer:'front', kind:'fernFlat',  x:-6,  y:386, w:96,  h:80},   // かけらを隠す葉
    {layer:'front', kind:'grassFlat', x:298, y:310, w:58,  h:30},
    {layer:'front', kind:'grassFlat', x:466, y:434, w:62,  h:30},
    {layer:'front', kind:'grassFlat', x:806, y:434, w:56,  h:30},
  ],
});

GT.setLedgeStyle('opening','flat');   // 足場は輪郭線なしの平らな茶色

// --- セリフ ----------------------------------------------------------------
// 最初に話しかけたとき。拾ったかけらの数で、途中が変わる。
function MARI_FIRST(c){
  const rest=c.itemsAll-c.items;
  const head=[
    {s:'マリ',c:'mari',t:'あ、起きた。'},
    {s:'マリ',c:'mari',t:'だいじょうぶ？　落ちてきたとき、けっこう派手だったよ。'},
    {s:'少年',c:'boy',t:'……ここ、どこ？'},
    {s:'マリ',c:'mari',t:'ここは、本の中の世界なの。'},
    {s:'少年',c:'boy',t:'本の中？'},
    {s:'マリ',c:'mari',t:'この本には、いろんな童話が収録されているの。'},
    {s:'少年',c:'boy',t:'よくわからないけど、そうなんだ……。'},
    {s:'マリ',c:'mari',t:'……いいわ。いきなりこんなことを言われても、信じられないわよね。'},
    {s:'マリ',c:'mari',t:'ところで、あなたの名前は？'},
    {s:'少年',c:'boy',t:'……思い出せない。自分が誰なのかも。'},
    {s:'',c:'narr',t:'言いようのない不安が少年を襲う。自分が誰なのか、今までどこにいたのか。それすら思い出せない。'},
    {s:'マリ',c:'mari',t:'記憶が、なにもないの？'},
    {s:'少年',c:'boy',t:'……うん。名前も、わからない。'},
    {s:'マリ',c:'mari',t:'そっか……。でも、名前がないと呼びにくいな。'},
    {s:'マリ',c:'mari',t:'ねえ、自分で決めてみて。あなたの名前。',ask:'name'},
    {s:'マリ',c:'mari',t:'{name}。……うん、いい名前。よろしくね、{name}。'},
    {s:'',c:'narr',t:'少年は周囲を見渡す。'},
    {s:'マリ',c:'mari',t:'これから会う人たちも、みんな絵本の中の住人なの。'},
    {s:'少年',c:'boy',t:'……絵本の、中？'},
    {s:'マリ',c:'mari',t:'そう。みんな、自分のお話の中で暮らしてるの。'},
    {s:'',c:'narr',t:'少年は、抱えていた本に目を落とした。'},
    {s:'マリ',c:'mari',t:'……うん、それ。その本が大事なの。'},
    {s:'マリ',c:'mari',t:'その本を全部埋めないと、帰れないから。'},
    {s:'マリ',c:'mari',t:'ただ先に進むだけじゃダメだよ。ちゃんと見て、ちゃんと話して。そうすれば、物語が紡がれていくの。'},
    {s:'マリ',c:'mari',t:'飛ばしちゃダメ。一つでも空いていたら、完成しないから。'},
  ];
  const mid = rest>0 ? [
    {s:'マリ',c:'mari',t:'……ほら。落ちたときに、『お話のかけら』が散らばっちゃってる。'},
    {s:'マリ',c:'mari',t:`落ちてる紙きれを、全部拾って。あと ${rest}つ。`},
    {s:'マリ',c:'mari',t:'見えているところにあるとは限らないよ。'},
  ] : [
    {s:'マリ',c:'mari',t:'……あれ。散らばってたかけら、もう全部拾ったんだ。'},
    {s:'マリ',c:'mari',t:'ふうん。ちゃんと見てるじゃない。'},
  ];
  const tail=[
    {s:'少年',c:'boy',t:'……きみは、だれ？'},
    {s:'マリ',c:'mari',t:'わたし？　わたしは、マリ。この本のことを、少しだけ知ってるの。',act:'mari-named'},   // ここで名乗る（ここから名前の欄が「マリ」になる）
  ];
  return head.concat(mid,tail);
}
// 2回目以降に話しかけたとき（ヒント）
function MARI_AGAIN(c, hiddenLeft){
  const rest=c.itemsAll-c.items;
  if(rest<=0) return [
    {s:'マリ',c:'mari',t:'次のページに行って。物語があなたを待ってる。'},
    {s:'マリ',c:'mari',t:'……わたし？　わたしは、まだここにいる。'},
  ];
  if(hiddenLeft) return [
    {s:'マリ',c:'mari',t:`あと ${rest}つ。`},
    {s:'マリ',c:'mari',t:'あなたが倒れてたところ、ちゃんと見た？　葉っぱの陰とか。'},
  ];
  return [
    {s:'マリ',c:'mari',t:`あと ${rest}つ。`},
    {s:'マリ',c:'mari',t:'高いところも、見てみて。'},
  ];
}

// --- シーン（会話と進行） --------------------------------------------------
GT.registerScene({
  id:'opening', type:'story', stage:'opening', label:'序章 ── 森',
  intro:[
    {s:'',c:'narr',t:'背中に衝撃を受け、少年は目を覚ます。あたりを見回すと、鬱蒼と生い茂る木々に囲まれていた。手には一冊の本を抱えている。',act:'opening-lie'},
    {s:'',c:'narr',t:'手にした本のページをめくると、まるで虫食いのように、ところどころ文字が欠けていて読めなくなっている。',act:'opening-book-on'},
    {s:'',c:'narr',get t(){ return GT.ctl('（← → で歩く。↑ でジャンプ。人の近くで画面タップ・Enter で話しかけられる）','（◀ ▶ で歩く。▲ でジャンプ。人の近くで画面をタップすると話しかけられる）'); },act:'opening-book-off'},
    {s:'',c:'narr',t:'向こうにある大きな木。その陰から、誰かがこちらをうかがっている。'},
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
    n.lines=MARI_AGAIN(c, !GT.items[HIDDEN_ITEM].got);
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

/* 木漏れ日 */
function drawLightShafts(){
  const t=performance.now()/1000;
  ctx.save(); ctx.globalCompositeOperation='lighter';
  [[120,70,0.6],[330,50,1.7],[600,90,2.9],[760,40,4.1]].forEach(([x,w,s])=>{
    const a=0.022+0.012*Math.sin(t*0.7+s);
    const g=ctx.createLinearGradient(0,EDGE,0,FLOOR);
    g.addColorStop(0,`rgba(255,236,170,${a*1.6})`); g.addColorStop(1,'rgba(255,236,170,0)');
    ctx.fillStyle=g; ctx.beginPath();
    ctx.moveTo(x,EDGE); ctx.lineTo(x+w,EDGE); ctx.lineTo(x+w-110,FLOOR); ctx.lineTo(x-150,FLOOR); ctx.closePath(); ctx.fill();
  });
  // 光の中を漂うちり
  for(let i=0;i<22;i++){
    const x=(rnd(i)*W+Math.sin(t*0.3+i)*20)%W, y=EDGE+((rnd(i+50)*H+t*(6+rnd(i+9)*8))%(FLOOR-EDGE));
    ctx.globalAlpha=0.25+0.25*Math.sin(t*2+i); ell(x,y,1.2,1.2,'#fff2c0');
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
    ell(x,y,5,2.4*Math.abs(Math.cos(r)),i%3?'rgba(122,128,74,0.75)':'rgba(176,141,87,0.75)',Math.sin(r)*0.8);
  }
}

/* マリが隠れる大きな木（マリより手前・少年より奥）：凝った木（GTDecor.paint） */
function drawMariTree(){
  const x=TRUNK.x, w=TRUNK.w, P=GTDecor.paint;
  P.trunk(ctx, x, 104, FLOOR, w, 41, { hollow:{x:x+w*0.55,y:250,rx:8,ry:13},
    branches:[{y:150,dir:-1,len:80},{y:132,dir:1,len:84},{y:190,dir:1,len:46}] });
  P.canopy(ctx,[ {x:x+w/2,y:66,rx:84,ry:56}, {x:x-28,y:116,rx:58,ry:42}, {x:x+w+26,y:108,rx:56,ry:42}, {x:x+w/2-4,y:132,rx:62,ry:40} ], 43);
}

/* 切り株：平らな茶色に、上のふちとたて線 */
function drawStump(){
  const p={x:520,y:380,w:56,h:84};
  ctx.save();
  GT.roundRect(p.x,p.y,p.w,p.h,6); ctx.fillStyle='#634e3a'; ctx.fill();
  ctx.strokeStyle='rgba(30,20,10,0.35)'; ctx.lineWidth=1.3;
  for(let i=1;i<4;i++){ const bx=p.x+i*p.w/4; ctx.beginPath(); ctx.moveTo(bx,p.y+16); ctx.lineTo(bx+(i-2)*2,p.y+p.h-2); ctx.stroke(); }
  ctx.beginPath(); ctx.ellipse(p.x+p.w/2,p.y+7,p.w/2-3,5,0,0,Math.PI*2); ctx.fillStyle='#7a634b'; ctx.fill();
  ctx.strokeStyle='rgba(50,36,22,0.5)'; ctx.lineWidth=1;
  ctx.beginPath(); ctx.ellipse(p.x+p.w/2,p.y+7,p.w*0.22,2.5,0,0,Math.PI*2); ctx.stroke();
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
  if(GT.mode==='play' && !st.movedFar){
    const a=0.55+0.25*Math.sin(performance.now()/300);
    ctx.save(); ctx.globalAlpha=a; ctx.font="700 14px 'Zen Old Mincho',serif"; ctx.textAlign='left';
    GT.roundRect(26,151,204,28,14); ctx.fillStyle='rgba(246,238,216,0.85)'; ctx.fill();
    ctx.fillStyle='rgba(74,70,60,0.95)'; ctx.fillText(GT.ctl('← →  あるく　　↑  ジャンプ','◀ ▶  あるく　　▲  ジャンプ'), 38, 170); ctx.restore();
  }
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
function drawHill(){
  const P=i=>GT.STAGE_DEFS.opening.platforms[i];
  GTDecor.forest.rock([P(0),P(1),P(2)],3);
}

GT.registerDraw(()=>{ if(!isOpening()) return; drawLightShafts(); }, 'back');
GT.registerDraw(()=>{ if(!isOpening()) return; drawHill(); drawPages(); drawStump(); drawMariTree(); drawLeaves(); drawMarks(); }, 'world');
GT.registerDraw(()=>{ if(!isOpening()) return; drawHiddenGlint(); drawScrapHint(); drawBookView(); drawWake(); }, 'overlay');
})();
