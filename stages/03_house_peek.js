/* ============================================================================
   ステージ：第一章 ── 赤ずきんの家（窓からのぞく）  id = 'house_peek'
   種類：story　家のそばのマリに会い、自分で窓をのぞきに行く
   担当：
   ----------------------------------------------------------------------------
   ◆ このステージの流れ
     1) 森の小道を抜けると、森のはずれの家。左ページは庭（柵・物干し・井戸）、右ページが家。
        窓には明かりがともり、中で人影が動いている。
     2) 右ページのマリに、自分から話しかける（タップ / Enter）。
        「話しかける前に、まず見ておいたほうがいいよ。……あの窓」（マリと話すまでは、薪の山に乗っても窓はのぞけない）
     3) 窓の下の薪の山に乗って、窓の前に立つと、窓のぞきが始まる（自動）
        窓の中で、母親が赤ずきんにお使いを頼む場面が見える。
     4) 窓から離れると、戸が開いて、赤ずきんがかごを持って駆けだしていく。
     5) のぞき終わると、マリのほうから話しかけてくる（自動）「これが、このお話のはじまり」。話し終えると右の端が開く。
        （のぞいたあとは、マリには自分から話しかけることはできない）

   ◆ このファイルが持っている独自の仕掛け（engine.js は触らない）
     セリフ中の act 合図：
       'peek-on'      … 窓の映像を開く
       'give-basket'  … かごを持たせる
       'peek-off'     … 窓の映像を閉じる
       'house-hood-run' … 戸が開いて、赤ずきんが駆けだしていく
       'peek-off-run' … 窓の映像を閉じて、そのまま赤ずきんが駆けだしていく（窓から離れる語りで使う）
     GT.registerUpdate … マリの声かけ・窓のぞきの開始（その場所に来たら自動で会話）
     GT.registerDraw   … 家・煙・窓明かり・庭・薪の山・窓の中の映像
   ========================================================================== */
(function(){
const ctx=GT.ctx, W=GT.W, H=GT.H, FLOOR=GT.H-GT.EDGE;

// 窓のぞき映像の状態
const peek={ on:false, alpha:0, basket:false, speaker:'', last:performance.now() };

// 会話の act 合図で映像を操作
GT.registerAct('peek-on',    ()=>{ peek.on=true; peek.basket=false; });
GT.registerAct('peek-off',   ()=>{ peek.on=false; });
GT.registerAct('give-basket',()=>{ peek.basket=true; });
// 誰がしゃべっているか（口パク用）
GT.registerLineHook(line=>{ peek.speaker=line.c||''; });
// シーンが切り替わったら必ず閉じる
GT.registerSceneReset(()=>{ peek.on=false; });

// --- 地形 ------------------------------------------------------------------
const WELL ={page:'left',  x:300, y:404, w:64, h:60, kind:'ledge'};   // 井戸（乗れる）
const WOOD  ={page:'right', x:648, y:420, w:76, h:44, kind:'ledge'};  // 薪の山（窓の下）
GT.defineStage('house_peek', {
  platforms:[ WELL, WOOD ],
  boxes:[], enemies:[],
  decor:[
    // 雲・丸い木・茂みは、ゴシックの枯れ木・薔薇の茂みにした（下の drawGothYard で描く）
  ],
});

// --- セリフ ----------------------------------------------------------------
// マリに話しかけたとき（窓をのぞく前）
const BRIEF=[
  {s:'マリ',c:'mari',t:'驚いた？　そう。本を裏返すと重力が反転するの。'},
  {s:'少年',c:'boy',t:'どうして空に落ちていかないの？'},
  {s:'マリ',c:'mari',t:'ここは本の中だから、ページより外には、いけないの。'},
  {s:'マリ',c:'mari',t:'――で、ここ。この物語の住人が住んでる家。'},
  {s:'マリ',c:'mari',t:'話しかける前にまず見ておいたほうがいいよ。……あの窓。'},
  {s:'マリ',c:'mari',t:'窓の下の薪の山。あそこに乗れば届くと思う。'},
];
// 薪の山の上（窓の前）に立ったとき
const PEEK=[
  {s:'',c:'narr',t:'少年は薪の山の上で背伸びして、そっと窓の中をのぞいた。',act:'peek-on'},
  {s:'',c:'narr',t:'暖かい明かりの下に、赤い頭巾の少女と、その母親らしい女の人がいる。'},
  {s:'母親',c:'mother',t:'赤ずきん、おばあちゃんがひどく具合を悪くしているそうなの。様子を見に行ってくれる？'},
  {s:'赤ずきん',c:'hood',f:'surprise',t:'おばあちゃんが？　だいじょうぶかな……。'},
  {s:'母親',c:'mother',t:'このカスタードとバターの小瓶を持っていってあげて。',act:'give-basket'},
  {s:'赤ずきん',c:'hood',f:'smile',t:'うん！　わたしが届けてくるね。'},
  {s:'母親',c:'mother',t:'おばあちゃんのお家は、森を抜けた先の村にあるわ。水車小屋を過ぎたところよ。'},
  {s:'赤ずきん',c:'hood',f:'smile',t:'わかった！　いつもの道だね。'},
  {s:'母親',c:'mother',t:'ええ。気をつけて行ってらっしゃい。'},
  {s:'赤ずきん',c:'hood',f:'smile',t:'はーい！　いってきます！'},
  {s:'',c:'narr',t:'少女はかごを抱えて、戸口へ駆けていく。'},
  {s:'母親',c:'mother',t:'……おばあちゃん、喜んでくれるといいわね。'},
  {s:'',c:'narr',t:'母親は、赤い頭巾を揺らしながら遠ざかっていく娘の背中を見送った。'},
  {s:'',c:'narr',t:'少年は、そっと窓から離れた。',act:'peek-off-run'},   // 窓の映像を閉じ、戸が開いて赤ずきんが駆けだしていく
];

// --- シーン ----------------------------------------------------------------
GT.registerScene({
  id:'house_peek', type:'story', stage:'house_peek', label:'第一章 ── 赤ずきんの家',
  intro:[
    {s:'',c:'narr',t:'―― 第一章「赤い頭巾」 ――'},   // ここから本編（序章はここまで）
    {s:'',c:'narr',t:'森の小道を抜けると森のはずれに小さな家が見えた。煙突から細い煙がのぼっている。'},
    {s:'',c:'narr',t:'窓には明かりがともり、中で人影が動いている。家のそばにマリが立っている。'},
    {s:'',c:'narr',t:'手の中の本がかすかに反応している。虫食いのページに文章が記されている。',act:'peek-book-guide'},   // 「本を開く」ボタンへ誘導（読み返してみよう）
  ],
  npcs:[
    // 窓をのぞき終わると、マリのほうから話しかけてくる（GT.talkTo。自分からは話しかけられないよう update で talkable=false にしてある）
    { who:'mari', name:'マリ', page:'right', x:596, lines:[   // 窓（667〜755）と薪の山（648〜）より左に立っている
      {s:'マリ',c:'mari',t:'見えた？　これがこのお話のはじまり。'},
      {s:'マリ',c:'mari',t:'あの子を追いかけて。……この先あなたの本に書かれることになるから。'},
    ], onEnd:()=>{ GT.fillPage('window','――窓の向こうで、母親が赤ずきんにお使いを頼んでいた。カスタードとバターの小瓶を、おばあさんのもとへ。'); } },
    // 戸口から駆けだしていく赤ずきん（はじめは画面の外。act:'house-hood-run' で動く）
    { who:'hood', name:'赤ずきん', page:'right', x:-300 },
  ],
});

/* ---------- 本を読み返すように誘導する ----------
   はじまりの語り「手の中の本がかすかに反応している…」で、画面の下の「本を開く」ボタンを光らせる（js/bookview.js の GT.guideToBook）。
   本を開くと消える。開くと、いちばん新しく書かれたページが出る。 */
GT.registerAct('peek-book-guide', ()=>{ if(GT.guideToBook) GT.guideToBook('本を開いて、読み返してみよう'); });

/* ---------- 自動で始まる会話（マリの声かけ・窓のぞき） ---------- */
const DOOR={x:800, y:372, w:52};
const st={ briefed:false, peeked:false, busy:false, runT0:0 };
const isHouse=()=>GT.scene&&GT.scene.id==='house_peek';
GT.registerSceneReset(()=>{ if(isHouse()){ st.briefed=false; st.peeked=false; st.busy=false; st.runT0=0; } });
GT.registerAct('house-hood-run',()=>{ st.runT0=performance.now(); setTimeout(()=>{ if(st.runT0) GT.sfx&&GT.sfx('door'); },1300); GT.holdDialogue(()=>!st.runT0); });   // 赤ずきんが出ていって、戸が閉まる
GT.registerAct('peek-off-run',()=>{ peek.on=false; st.runT0=performance.now(); setTimeout(()=>{ if(st.runT0) GT.sfx&&GT.sfx('door'); },1300);
  GT.holdDialogue(()=>!st.runT0); });   // 赤ずきんが画面の外へ駆けていくまで、会話の枠を消して見せる   // 窓から離れる ＋ 赤ずきんが駆けだしていく

function autoTalk(lines, then){
  st.busy=true; GT.mode='idle'; GT.player.vx=0;
  GT.beginDialogue(lines,null,()=>{ GT.hideDialogue(); GT.mode='play'; st.busy=false; if(then) then(); });
}
GT.registerUpdate(()=>{
  if(!isHouse()) return;
  const pl=GT.player, pcx=pl.x+pl.w/2;
  /* マリ：窓をのぞく前は、自分から話しかけると BRIEF を話す（話し終えても右の端は開かない）。
     のぞいたあとは、自分からは話しかけられない（マリのほうから話しかけてきて、npcs の lines を話す） */
  const mari=GT.getNpcs().find(n=>n.who==='mari');
  if(mari){
    if(!st.briefed){
      if(!mari._final){ mari._final={lines:mari.lines, onEnd:mari.onEnd, noExit:mari.noExit};
        mari.lines=BRIEF; mari.noExit=true; mari.required=true; mari.onEnd=()=>{ st.briefed=true; }; }   // 話さないと先へ進めない（吹き出しは「！」）
      mari.talkable=true;
    } else {
      if(mari._final){ Object.assign(mari,mari._final); mari._final=null; mari.talked=false; }   // のぞいたあとの会話にもどす
      mari.talkable=false;
    }
  }
  if(st.busy) return;
  const onWood = pl.onGround && GT.gravity.right===1 && Math.abs(pl.y+pl.h-WOOD.y)<2
              && pcx>WOOD.x+4 && pcx<WOOD.x+WOOD.w-4;
  // 窓をのぞけるのは、マリと話したあとだけ（先にのぞくと、のぞいたあとのマリの会話が始まらなくなるため）
  if(!st.peeked && st.briefed && onWood && !document.getElementById('dlg').classList.contains('show')){ st.peeked=true;
    autoTalk(PEEK, ()=>{ if(isHouse()) GT.talkTo(GT.getNpcs().find(n=>n.who==='mari')); });   // のぞき終わったら、そのままマリが話しかけてくる
  }
});

/* ---------- 窓ごしの映像（最前面に描く） ---------- */
function dot(x,y,r,color){ ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fillStyle=color; ctx.fill(); }

function drawBasket(cx,cy){
  ctx.save(); ctx.translate(cx,cy);
  ctx.strokeStyle='#6b4a2b'; ctx.lineWidth=2.4; ctx.beginPath(); ctx.arc(0,-6,11,Math.PI,0); ctx.stroke();
  ctx.fillStyle='#e8dcc0'; ctx.beginPath(); ctx.ellipse(0,-4,14,5,0,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#d7b35c'; ctx.fillRect(2,-15,9,10);
  ctx.fillStyle='#b8823f'; ctx.beginPath(); ctx.ellipse(-6,-8,7,3,-0.3,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-15,-4); ctx.lineTo(15,-4); ctx.lineTo(11,10); ctx.lineTo(-11,10); ctx.closePath();
  ctx.fillStyle='#8b6a43'; ctx.fill();
  ctx.strokeStyle='rgba(58,40,22,0.45)'; ctx.lineWidth=1; ctx.beginPath();
  for(let i=-9;i<=9;i+=6){ ctx.moveTo(i,-4); ctx.lineTo(i*0.75,10); } ctx.stroke();
  ctx.restore();
}
function drawPerson(x,footY,h,o){
  const bw=h*0.44, bh=h*0.56, hr=h*0.14, f=o.facing;
  const dressBottom=footY-h*0.08;
  const by=dressBottom-bh-o.bob;
  const hy=by-hr*0.85;
  ctx.save();
  for(const dx of [-0.2,0.2]){
    ctx.beginPath(); ctx.ellipse(x+bw*dx,footY-2,h*0.08,h*0.035,0,0,Math.PI*2); ctx.fillStyle='#3a2f2a'; ctx.fill();
  }
  ctx.beginPath(); ctx.moveTo(x-bw*0.32,by); ctx.lineTo(x+bw*0.32,by);
  ctx.lineTo(x+bw*0.5,dressBottom); ctx.lineTo(x-bw*0.5,dressBottom); ctx.closePath();
  ctx.fillStyle=o.dress; ctx.fill();
  if(o.apron){
    ctx.beginPath(); ctx.moveTo(x-bw*0.2,by+bh*0.25); ctx.lineTo(x+bw*0.2,by+bh*0.25);
    ctx.lineTo(x+bw*0.3,dressBottom); ctx.lineTo(x-bw*0.3,dressBottom); ctx.closePath();
    ctx.fillStyle=o.apron; ctx.fill();
  }
  if(o.cape){
    ctx.beginPath(); ctx.moveTo(x-bw*0.42,by+bh*0.04); ctx.quadraticCurveTo(x,by-bh*0.12,x+bw*0.42,by+bh*0.04);
    ctx.lineTo(x+bw*0.5,by+bh*0.5); ctx.lineTo(x-bw*0.5,by+bh*0.5); ctx.closePath();
    ctx.fillStyle=o.cape; ctx.fill();
  }
  if(o.hood){
    dot(x,hy,hr*1.32,o.hood);
    ctx.beginPath(); ctx.moveTo(x-f*hr*0.9,hy-hr*0.9); ctx.lineTo(x-f*hr*1.9,hy-hr*0.6); ctx.lineTo(x-f*hr*1.1,hy-hr*0.1);
    ctx.closePath(); ctx.fillStyle=o.hood; ctx.fill();
  }
  dot(x+f*hr*0.12,hy+hr*0.05,hr*(o.hood?0.86:1),'#ecd0a8');
  if(o.hair){
    ctx.beginPath(); ctx.arc(x,hy-hr*0.1,hr*1.04,Math.PI,0); ctx.closePath(); ctx.fillStyle=o.hair; ctx.fill();
    dot(x-f*hr*0.9,hy-hr*0.7,hr*0.45,o.hair);
  }
  const ex=x+f*hr*0.12;
  dot(ex+f*hr*0.15,hy,hr*0.09,'#2b2e4a'); dot(ex+f*hr*0.55,hy,hr*0.09,'#2b2e4a');
  if(o.talk){
    ctx.beginPath(); ctx.ellipse(ex+f*hr*0.4,hy+hr*0.45,hr*0.14,hr*(0.08+0.1*Math.abs(Math.sin(o.t*14))),0,0,Math.PI*2);
    ctx.fillStyle='#7a3b32'; ctx.fill();
  } else {
    ctx.strokeStyle='#7a3b32'; ctx.lineWidth=1.4; ctx.beginPath();
    ctx.moveTo(ex+f*hr*0.25,hy+hr*0.45); ctx.lineTo(ex+f*hr*0.6,hy+hr*0.45); ctx.stroke();
  }
  ctx.restore();
}
function drawPeekView(){
  const now=performance.now(); const dt=Math.min(0.1,(now-peek.last)/1000); peek.last=now;
  peek.alpha += ((peek.on?1:0)-peek.alpha)*Math.min(1,dt*6);
  if(!peek.on && peek.alpha<0.01){ peek.alpha=0; return; }
  const t=now/1000;
  ctx.save(); ctx.globalAlpha=peek.alpha;
  ctx.fillStyle='rgba(24,20,14,0.98)'; ctx.fillRect(0,0,W,H);
  const glow=ctx.createRadialGradient(450,165,40,450,165,330);
  glow.addColorStop(0,'rgba(255,205,120,0.30)'); glow.addColorStop(1,'rgba(255,205,120,0)');
  ctx.fillStyle=glow; ctx.fillRect(0,0,W,H);
  ctx.save(); ctx.beginPath(); ctx.rect(264,42,372,242); ctx.clip();
  const wall=ctx.createRadialGradient(450,170,20,450,170,260);
  wall.addColorStop(0,'#f3dfae'); wall.addColorStop(1,'#c99d63');
  ctx.fillStyle=wall; ctx.fillRect(264,42,372,242);
  ctx.fillStyle='#5a4630'; ctx.fillRect(264,42,372,14);
  ctx.strokeStyle='#57644a'; ctx.lineWidth=2; ctx.beginPath();
  for(let i=0;i<5;i++){ ctx.moveTo(326+i*3,56); ctx.lineTo(322+i*5,88); } ctx.stroke();
  ctx.fillStyle='#6b5b46'; ctx.fillRect(290,122,72,6);
  [['#b08d57',296],['#8b5e63',318],['#57644a',340]].forEach(([c,x])=>{ ctx.fillStyle=c; ctx.fillRect(x,106,14,16); });
  ctx.beginPath(); ctx.moveTo(566,268); ctx.lineTo(566,214); ctx.arc(586,214,20,Math.PI,0); ctx.lineTo(606,268); ctx.closePath();
  ctx.fillStyle='#4a3a28'; ctx.fill();
  const fl=1+0.12*Math.sin(t*9)+0.08*Math.sin(t*15);
  const hg=ctx.createRadialGradient(586,240,6,586,240,130);
  hg.addColorStop(0,'rgba(255,160,60,0.35)'); hg.addColorStop(1,'rgba(255,160,60,0)');
  ctx.fillStyle=hg; ctx.fillRect(264,42,372,242);
  ctx.beginPath(); ctx.ellipse(586,254,10*fl,17*fl,0,0,Math.PI*2); ctx.fillStyle='#ffb347'; ctx.fill();
  ctx.beginPath(); ctx.ellipse(586,258,5*fl,9*fl,0,0,Math.PI*2); ctx.fillStyle='#fff0b0'; ctx.fill();
  ctx.fillStyle='#9b7449'; ctx.fillRect(264,262,372,22);
  ctx.strokeStyle='rgba(58,40,22,0.35)'; ctx.lineWidth=1; ctx.beginPath();
  for(let x=290;x<636;x+=46){ ctx.moveTo(x,262); ctx.lineTo(x-6,284); } ctx.stroke();
  ctx.fillStyle='#8b6a43'; ctx.fillRect(404,234,92,8);
  ctx.fillRect(410,242,6,26); ctx.fillRect(484,242,6,26);
  if(!peek.basket){
    ctx.beginPath(); ctx.ellipse(428,231,14,4,0,0,Math.PI*2); ctx.fillStyle='#b8823f'; ctx.fill();
    ctx.fillStyle='#d7b35c'; ctx.fillRect(462,222,14,12); ctx.fillStyle='#8b6a43'; ctx.fillRect(461,220,16,4);
  }
  const sp=peek.speaker;
  const mBob=sp==='mother'?Math.abs(Math.sin(t*9))*2.5:Math.sin(t*2)*0.8;
  const hBob=sp==='hood'?Math.abs(Math.sin(t*9))*2.5:Math.sin(t*2+1)*0.8;
  if(!GT.drawCharSprite('mother',360,268-mBob*0.5,124,1,1,null,true))   // お母さんの絵（赤ずきんのほうを向く。窓の中なので白い縁取りなし）
    drawPerson(360,268,120,{dress:'#6f7f5e',apron:'#e8dcc0',hair:'#6b4a3a',facing:1,bob:mBob,talk:sp==='mother',t});
  if(!GT.drawHoodSprite(540,268-hBob*0.5,118,-1,1,null,false,true)){   // 赤ずきんの絵（お母さんのほうを向く。かごは絵が持っている。縁取りなし）
    drawPerson(540,268,92,{dress:'#4a4e6d',cape:'#b8423f',hood:'#b8423f',facing:-1,bob:hBob,talk:sp==='hood',t});
    if(peek.basket) drawBasket(514,268-92*0.34-hBob); }
  const cg=ctx.createLinearGradient(264,0,290,0);
  cg.addColorStop(0,'rgba(139,94,99,0.95)'); cg.addColorStop(1,'rgba(139,94,99,0.55)');
  ctx.fillStyle=cg; ctx.fillRect(264,42,26,242);
  const cg2=ctx.createLinearGradient(636,0,610,0);
  cg2.addColorStop(0,'rgba(139,94,99,0.95)'); cg2.addColorStop(1,'rgba(139,94,99,0.55)');
  ctx.fillStyle=cg2; ctx.fillRect(610,42,26,242);
  const vg=ctx.createRadialGradient(450,163,150,450,163,260);
  vg.addColorStop(0,'rgba(50,30,15,0)'); vg.addColorStop(1,'rgba(50,30,15,0.38)');
  ctx.fillStyle=vg; ctx.fillRect(264,42,372,242);
  ctx.fillStyle='rgba(255,255,255,0.06)';
  ctx.beginPath(); ctx.moveTo(300,42); ctx.lineTo(370,42); ctx.lineTo(264,150); ctx.lineTo(264,100); ctx.closePath(); ctx.fill();
  ctx.restore();
  ctx.beginPath(); ctx.rect(250,28,400,270); ctx.rect(264,42,372,242);
  ctx.fillStyle='#3a2f2a'; ctx.fill('evenodd');
  ctx.fillRect(446,42,8,242);
  ctx.strokeStyle='rgba(232,220,192,0.14)'; ctx.lineWidth=1;
  ctx.strokeRect(264.5,42.5,371,241);
  ctx.fillStyle='#4a3f2c'; ctx.fillRect(236,296,428,16);
  ctx.fillStyle='rgba(232,220,192,0.18)'; ctx.fillRect(236,296,428,2);
  for(let i=0;i<8;i++){
    ctx.save(); ctx.translate(244+i*9,302+(i%2)*9); ctx.rotate(i*0.7);
    ctx.beginPath(); ctx.ellipse(0,0,7,3.6,0,0,Math.PI*2); ctx.fillStyle=i%2?'#46543b':'#57644a'; ctx.fill(); ctx.restore();
  }
  for(let i=0;i<6;i++){
    ctx.save(); ctx.translate(648-i*8,34+(i%2)*7); ctx.rotate(-i*0.8);
    ctx.beginPath(); ctx.ellipse(0,0,7,3.6,0,0,Math.PI*2); ctx.fillStyle=i%2?'#57644a':'#46543b'; ctx.fill(); ctx.restore();
  }
  ctx.restore();
}
GT.registerDraw(drawPeekView,'overlay');

/* ==========================================================================
   ステージ上の家と庭（窓のぞき映像とは別。ふだんの画面に描く）
   ========================================================================== */
const WIN={x:667, y:344, w:88, h:54};      // 家の窓（のぞく窓。家のまん中の、大きな窓）
function ell(x,y,rx,ry,c){ ctx.beginPath(); ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2); ctx.fillStyle=c; ctx.fill(); }

/* 赤ずきんが戸口から駆けだす。戸が開く量 0〜1 を返す */
function hoodRun(){
  const hood=GT.getNpcs().find(n=>n.who==='hood');
  if(!st.runT0){ if(hood) hood.x=-300; return 0; }
  const k=(performance.now()-st.runT0)/1000;
  if(hood) hood.x = k<0.45 ? -300 : DOOR.x+10+(k-0.45)*130;
  if(hood && hood.x>W+40){ hood.x=-300; st.runT0=0; return 0; }
  return k<0.3 ? k/0.3 : (hood&&hood.x>DOOR.x+DOOR.w+30 ? Math.max(0,1-(hood.x-DOOR.x-DOOR.w-30)/40) : 1);
}

/* 家（地形より奥）：しっくいの壁に木の梁を組んだ家・赤い瓦屋根・れんがの煙突。
   動かない部分は一度だけ描いて取っておき（hoodHouseStatic）、煙・窓・戸だけ毎フレーム描く。 */
const HH={ wx:556, ww:310, wy:330, EAVE:336, APEX:{x:711,y:236} };     // 壁（左・幅・上）、屋根（軒の高さ・てっぺん）
let hoodHouseCanvas=null;
function hoodHouseStatic(){
  if(hoodHouseCanvas) return hoodHouseCanvas;
  hoodHouseCanvas=document.createElement('canvas'); hoodHouseCanvas.width=W; hoodHouseCanvas.height=H;
  const c=hoodHouseCanvas.getContext('2d');
  let sd=7; const R=()=>{ sd=(sd*9301+49297)%233280; return sd/233280; };
  const E=(x,y,rx,ry,col,rot)=>{ c.beginPath(); c.ellipse(x,y,Math.max(0.1,rx),Math.max(0.1,ry),rot||0,0,Math.PI*2); c.fillStyle=col; c.fill(); };
  const rr=(x,y,w,h,r)=>{ c.beginPath(); c.moveTo(x+r,y); c.arcTo(x+w,y,x+w,y+h,r); c.arcTo(x+w,y+h,x,y+h,r); c.arcTo(x,y+h,x,y,r); c.arcTo(x,y,x+w,y,r); c.closePath(); };
  const {wx,ww,wy,EAVE,APEX}=HH, wr=wx+ww;

  // ── れんがの煙突（屋根より先に描いて、根元を屋根で隠す） ──
  const CX=798, CW=30, CT=250;
  c.fillStyle='#2e2022'; c.fillRect(CX,CT,CW,70);
  for(let y=CT, row=0; y<CT+70; y+=7, row++) for(let x=CX-(row%2)*7; x<CX+CW; x+=14){
    const x0=Math.max(CX,x), w=Math.min(x+13,CX+CW)-x0; if(w<=2) continue;
    c.fillStyle=['#4e3434','#58393a','#46302f','#5e403e'][Math.floor(R()*4)]; c.fillRect(x0+0.5,y+0.5,w-1,6); }
  c.fillStyle='#2a2426'; rr(CX-4,CT-8,CW+8,9,2); c.fill();                     // 笠石
  c.fillStyle='rgba(220,210,225,0.18)'; c.fillRect(CX-3,CT-8,CW+6,2);
  c.fillStyle='#3a3234'; c.fillRect(CX+5,CT-15,8,8); c.fillRect(CX+17,CT-15,8,8);  // 煙突の筒（2本）
  c.fillStyle='#120c0e'; c.fillRect(CX+6,CT-16,6,2); c.fillRect(CX+18,CT-16,6,2);

  // ── しっくいの壁 ──
  const wg=c.createLinearGradient(0,wy,0,FLOOR); wg.addColorStop(0,'#5a524e'); wg.addColorStop(1,'#46403e');
  c.fillStyle=wg; c.fillRect(wx,wy,ww,FLOOR-wy);
  c.save(); c.beginPath(); c.rect(wx,wy,ww,FLOOR-wy); c.clip();
  for(let i=0;i<160;i++) E(wx+R()*ww, wy+R()*(FLOOR-wy), 2+R()*7, 1+R()*3, R()<0.5?'rgba(210,200,200,0.08)':'rgba(16,10,12,0.18)');   // しっくいのむら
  for(let i=0;i<5;i++){ const x=wx+20+R()*(ww-40), y=wy+40+R()*60;                                   // はがれて下地が見えるところ
    E(x,y,6+R()*6,3+R()*3,'rgba(40,26,24,0.45)'); for(let k=0;k<3;k++) c.fillStyle='rgba(70,40,36,0.5)', c.fillRect(x-4+k*4,y-1,3,2); }
  const sh=c.createLinearGradient(0,wy,0,wy+34); sh.addColorStop(0,'rgba(8,4,6,0.6)'); sh.addColorStop(1,'rgba(8,4,6,0)');
  c.fillStyle=sh; c.fillRect(wx,wy,ww,34);                                                            // 軒下の影
  c.restore();

  // ── 木の梁（ハーフティンバー） ──
  const beam=(x1,y1,x2,y2,wd)=>{ c.save(); c.lineCap='butt';
    c.strokeStyle='#1e1416'; c.lineWidth=wd; c.beginPath(); c.moveTo(x1,y1); c.lineTo(x2,y2); c.stroke();
    c.strokeStyle='rgba(210,195,215,0.12)'; c.lineWidth=1.2; c.beginPath(); c.moveTo(x1-wd/2+1.5,y1); c.lineTo(x2-wd/2+1.5,y2); c.stroke();
    c.strokeStyle='rgba(30,18,10,0.35)'; c.lineWidth=0.8;                                            // 木目
    for(let k=0;k<2;k++){ const o=(k?1:-1)*wd*0.2; c.beginPath(); c.moveTo(x1+o,y1); c.lineTo(x2+o,y2); c.stroke(); }
    c.restore(); };
  beam(wx,wy+4,wr,wy+4,8);                       // 上の梁
  beam(wx,FLOOR-30,wr,FLOOR-30,6);               // 腰の梁
  const POSTS=[wx+4, 618, 792, wr-4];
  for(const x of POSTS) beam(x,wy,x,FLOOR-30,8);   // 柱（窓と戸をよけて立てる）
  beam(wx+8,FLOOR-34,618-4,wy+10,6);             // 斜めの筋かい（左はし）
  // 梁をとめる木の釘
  for(const x of POSTS) for(const y of [wy+4,FLOOR-30]) E(x,y,1.8,1.8,'#7a6a5a');

  // ── 石の土台 ──
  for(let x=wx-4, i=0; x<wr+4; i++){ const w=16+R()*14, y=FLOOR-26;
    rr(x+1,y+1,Math.min(w,wr+4-x)-2,24,4); c.fillStyle=['#4a4448','#3e393c','#554e50','#38333a'][i%4]; c.fill();
    c.strokeStyle='rgba(10,6,8,0.7)'; c.lineWidth=1; c.stroke();
    c.beginPath(); c.moveTo(x+4,y+3); c.lineTo(x+w-5,y+3); c.strokeStyle='rgba(220,205,230,0.2)'; c.stroke(); x+=w; }
  for(let i=0;i<24;i++) E(wx+R()*ww, FLOOR-2-R()*5, 4+R()*7, 2+R()*2, 'rgba(40,56,34,0.6)');      // 苔

  // ── 赤い瓦屋根（うろこのように重ねた瓦） ──
  const L={x:532,y:EAVE+2}, Rr={x:890,y:EAVE+2};
  const roof=()=>{ c.beginPath(); c.moveTo(L.x,L.y); c.lineTo(APEX.x,APEX.y); c.lineTo(Rr.x,Rr.y); c.lineTo(Rr.x,Rr.y+8); c.lineTo(L.x,L.y+8); c.closePath(); };
  roof(); c.fillStyle='#1c1418'; c.fill();
  c.save(); roof(); c.clip();
  const TW=16, TH=11;
  const rows=[]; for(let y=APEX.y-4, row=0; y<EAVE+12; y+=TH, row++) rows.push([y,row]);
  for(const [y,row] of rows.reverse()){                                          // 下の段から描いて、上の段の丸いふちを重ねる
    for(let x=L.x-TW+(row%2)*TW/2; x<Rr.x+TW; x+=TW){
      const col=['#352a32','#3e3038','#2e242a','#46363e','#3a2c34'][Math.floor(R()*5)];
      c.beginPath(); c.moveTo(x,y); c.lineTo(x,y+TH*0.55); c.arc(x+TW/2,y+TH*0.55,TW/2,Math.PI,0,true); c.lineTo(x+TW,y); c.closePath();
      c.fillStyle=col; c.fill(); c.strokeStyle='rgba(8,4,6,0.7)'; c.lineWidth=0.9; c.stroke();
      c.beginPath(); c.moveTo(x+3,y+2); c.lineTo(x+3,y+TH*0.5); c.strokeStyle='rgba(215,200,225,0.14)'; c.lineWidth=1.2; c.stroke();   // 瓦の光（月あかり）
    }
  }
  const rs=c.createLinearGradient(0,APEX.y,0,EAVE+10); rs.addColorStop(0,'rgba(210,200,225,0.10)'); rs.addColorStop(1,'rgba(6,3,5,0.35)');
  c.fillStyle=rs; c.fillRect(L.x,APEX.y,Rr.x-L.x,EAVE-APEX.y+12);
  for(let i=0;i<8;i++) E(L.x+60+R()*(Rr.x-L.x-120), APEX.y+40+R()*50, 8+R()*12, 3+R()*4, 'rgba(36,52,32,0.45)', (R()-0.5)*0.5);   // 苔
  c.restore();
  // 破風板（屋根のふち）と、棟の飾り
  c.lineCap='round';
  c.strokeStyle='#120a0e'; c.lineWidth=7; c.beginPath(); c.moveTo(L.x-4,L.y+6); c.lineTo(APEX.x,APEX.y-2); c.lineTo(Rr.x+4,Rr.y+6); c.stroke();
  c.strokeStyle='#2e2228'; c.lineWidth=3; c.stroke();
  c.strokeStyle='#120a0e'; c.lineWidth=2.4; c.beginPath(); c.moveTo(APEX.x,APEX.y-2); c.lineTo(APEX.x,APEX.y-40); c.moveTo(APEX.x-8,APEX.y-26); c.lineTo(APEX.x+8,APEX.y-26); c.stroke();   // てっぺんの鉄の飾り
  c.fillStyle='#120a0e'; c.beginPath(); c.moveTo(APEX.x-4,APEX.y-38); c.lineTo(APEX.x,APEX.y-48); c.lineTo(APEX.x+4,APEX.y-38); c.closePath(); c.fill();
  c.beginPath(); c.arc(APEX.x,APEX.y-26,5,0,Math.PI*2); c.lineWidth=1.4; c.stroke();
  E(APEX.x,APEX.y-26,1.6,1.6,'#8a7240');
  // 軒先の木の板と、その影
  c.fillStyle='#1e1416'; c.fillRect(L.x,EAVE+6,Rr.x-L.x,5);
  for(let x=L.x+6;x<Rr.x;x+=14){ c.fillStyle='#120a0e'; c.beginPath(); c.moveTo(x,EAVE+11); c.lineTo(x+7,EAVE+11); c.lineTo(x+3.5,EAVE+16); c.closePath(); c.fill(); }   // 飾り板のぎざぎざ

  // ── 窓のまわり：よろい戸（赤） ──
  const w=WIN;
  for(const side of [-1,1]){
    const sx= side<0 ? w.x-32 : w.x+w.w+8, sw=24;
    rr(sx,w.y-6,sw,w.h+12,2); c.fillStyle='#4a1820'; c.fill(); c.strokeStyle='#1e070b'; c.lineWidth=1.4; c.stroke();
    for(let y=w.y;y<w.y+w.h+4;y+=6){ c.beginPath(); c.moveTo(sx+3,y); c.lineTo(sx+sw-3,y); c.strokeStyle='rgba(14,4,6,0.7)'; c.lineWidth=1; c.stroke(); }
    c.strokeStyle='#1e070b'; c.lineWidth=1.4; c.beginPath(); c.moveTo(sx+4,w.y-2); c.lineTo(sx+sw-4,w.y+w.h+2); c.stroke();   // 戸板の斜めの桟
  }
  c.fillStyle='#2e2428'; c.fillRect(w.x-10,w.y-12,w.w+20,5);                    // 窓の上のひさし板
  c.fillStyle='rgba(40,24,14,0.3)'; c.fillRect(w.x-10,w.y-7,w.w+20,2);

  // ── 戸のまわり：木の戸わく・ひさし・踏み段 ──
  const d=DOOR;
  c.fillStyle='#120a0e'; c.beginPath(); c.moveTo(d.x-14,d.y-14); c.lineTo(d.x+d.w/2,d.y-30); c.lineTo(d.x+d.w+14,d.y-14); c.lineTo(d.x+d.w+14,d.y-9); c.lineTo(d.x-14,d.y-9); c.closePath(); c.fill();  // 戸の上の小さな屋根
  c.fillStyle='#3a2c34'; c.beginPath(); c.moveTo(d.x-12,d.y-15); c.lineTo(d.x+d.w/2,d.y-28); c.lineTo(d.x+d.w+12,d.y-15); c.closePath(); c.fill();
  c.strokeStyle='#1e1416'; c.lineWidth=3; c.beginPath(); c.moveTo(d.x-10,d.y-10); c.lineTo(d.x-10,d.y+10); c.moveTo(d.x+d.w+10,d.y-10); c.lineTo(d.x+d.w+10,d.y+10); c.stroke();   // 支え
  rr(d.x-12,FLOOR-6,d.w+24,7,2); c.fillStyle='#4a4448'; c.fill(); c.strokeStyle='rgba(10,6,8,0.7)'; c.lineWidth=1; c.stroke();   // 踏み段
  // 戸のわきの、つるバラ
  c.strokeStyle='#1a1214'; c.lineWidth=1.6;
  c.beginPath(); c.moveTo(d.x-8,FLOOR-6); c.bezierCurveTo(d.x-18,d.y+50,d.x-4,d.y+20,d.x-14,d.y-6); c.stroke();
  for(let i=0;i<9;i++){ const k=i/8, x=d.x-12+Math.sin(k*7)*5, y=FLOOR-14-k*(FLOOR-d.y);
    E(x+(i%2?5:-5),y,4,2.6,'#1f2a1c',(i%2?0.5:-0.5));
    if(i%2===0) GT.goth.paint.rose(c,x,y-2,3.6); }
  // 壁ぎわの花だん
  for(let i=0;i<12;i++){ const x=wx+12+i*14; if(x>d.x-30 && x<d.x+d.w+16) continue; if(x>WOOD.x-4 && x<WOOD.x+WOOD.w+4) continue;
    E(x,FLOOR-4,7,4,'#1f2a1c'); E(x+3,FLOOR-7,4,3,'#2a3624');
    if(i%2===0) GT.goth.paint.rose(c,x,FLOOR-11,3.4); else { c.strokeStyle='#1a1214'; c.lineWidth=1; c.beginPath(); c.moveTo(x,FLOOR-4); c.lineTo(x+2,FLOOR-14); c.stroke(); } }
  // 壁をはうつた（左のはしと、窓のよこ）。黒ずんだ葉
  for(const [vx,top,sd] of [[wx+6,wy+8,3],[wx+40,wy+60,5],[wr-10,wy+20,9]]){ let q=sd;
    const RR=()=>{ q=(q*9301+49297)%233280; return q/233280; };
    c.strokeStyle='#161012'; c.lineWidth=1.4; c.beginPath(); c.moveTo(vx,FLOOR-24);
    for(let y=FLOOR-24;y>top;y-=6) c.lineTo(vx+Math.sin(y*0.09+sd)*7,y); c.stroke();
    for(let y=FLOOR-30;y>top;y-=7){ const lx=vx+Math.sin(y*0.09+sd)*7; E(lx+(RR()-0.5)*12,y,4+RR()*2.5,2.6+RR()*1.5,RR()<0.5?'#1c2619':'#26321f',RR()*3); }
  }
  // 壁のひび
  c.strokeStyle='rgba(10,6,8,0.55)'; c.lineWidth=1; c.beginPath(); c.moveTo(wx+120,wy+14); c.lineTo(wx+112,wy+40); c.lineTo(wx+122,wy+62); c.lineTo(wx+116,wy+80); c.stroke();
  return hoodHouseCanvas;
}
function drawHouse(){
  const t=performance.now()/1000;
  ctx.save();
  // 煙（煙突の筒から）
  for(let i=0;i<6;i++){
    const k=((t*0.22)+i/6)%1, y=232-k*150, x=811+k*30+Math.sin(k*6+t+i)*8*k;
    ctx.globalAlpha=0.3*(1-k); ell(x,y,6+k*16,5+k*13,'#8e888a');
  }
  ctx.globalAlpha=1;
  ctx.drawImage(hoodHouseStatic(),0,0);
  drawWindow(t);
  drawDoor();
  // 戸口への飛び石
  for(let i=0;i<6;i++){ const x=486+i*48+(i%2)*6;
    ell(x, FLOOR-2, 14, 4, 'rgba(58,52,56,0.8)'); ell(x-3, FLOOR-3.5, 8, 1.6, 'rgba(220,205,230,0.18)'); }
  ctx.restore();
}
/* 家の窓：明かりと、中で動く人影 */
function drawWindow(t){
  const w=WIN, fl=0.85+0.1*Math.sin(t*7)+0.05*Math.sin(t*13);
  // 外にもれる明かり
  ctx.save(); ctx.globalCompositeOperation='lighter';
  const g=ctx.createRadialGradient(w.x+w.w/2,w.y+w.h/2,10,w.x+w.w/2,w.y+w.h/2,90);
  g.addColorStop(0,`rgba(255,190,100,${0.22*fl})`); g.addColorStop(1,'rgba(255,190,100,0)');
  ctx.fillStyle=g; ctx.fillRect(w.x-90,w.y-90,w.w+180,w.h+180); ctx.restore();
  ctx.fillStyle='#1e1416'; ctx.fillRect(w.x-6,w.y-6,w.w+12,w.h+12);
  const gl=ctx.createLinearGradient(0,w.y,0,w.y+w.h);
  gl.addColorStop(0,`rgba(255,214,140,${fl})`); gl.addColorStop(1,`rgba(214,150,80,${fl})`);
  ctx.fillStyle=gl; ctx.fillRect(w.x,w.y,w.w,w.h);
  // 人影（赤ずきんが出ていくまでは2人、そのあとは母親だけ）
  ctx.save(); ctx.beginPath(); ctx.rect(w.x,w.y,w.w,w.h); ctx.clip();
  const sil=(x,hgt,c)=>{ ell(x,w.y+w.h-hgt+7,6,7,c); ctx.fillStyle=c; ctx.fillRect(x-8,w.y+w.h-hgt+13,16,hgt); };
  sil(w.x+16+Math.sin(t*0.6)*6, 34, 'rgba(70,50,35,0.55)');
  if(!st.peeked) sil(w.x+40+Math.sin(t*0.9+1)*4, 26, 'rgba(150,50,45,0.6)');
  ctx.restore();
  ctx.fillStyle='#1e1416'; ctx.fillRect(w.x+w.w/2-2,w.y,4,w.h); ctx.fillRect(w.x,w.y+w.h/2-2,w.w,4);
  // 窓の上のとがったアーチ（ゴシックの窓）
  ctx.beginPath(); ctx.moveTo(w.x-6,w.y-6); ctx.quadraticCurveTo(w.x-2,w.y-26,w.x+w.w/2,w.y-34); ctx.quadraticCurveTo(w.x+w.w+2,w.y-26,w.x+w.w+6,w.y-6); ctx.closePath(); ctx.fillStyle='#1e1416'; ctx.fill();
  ctx.beginPath(); ctx.moveTo(w.x+4,w.y-6); ctx.quadraticCurveTo(w.x+8,w.y-20,w.x+w.w/2,w.y-26); ctx.quadraticCurveTo(w.x+w.w-8,w.y-20,w.x+w.w-4,w.y-6); ctx.closePath();
  ctx.fillStyle=`rgba(200,90,70,${0.55*fl})`; ctx.fill();   // 赤いステンドグラス
  ctx.strokeStyle='#1e1416'; ctx.lineWidth=1.6; ctx.beginPath(); ctx.moveTo(w.x+w.w/2,w.y-26); ctx.lineTo(w.x+w.w/2,w.y-6); ctx.moveTo(w.x+16,w.y-13); ctx.lineTo(w.x+w.w-16,w.y-13); ctx.stroke();
  // 花の箱
  GT.roundRect(w.x-10,w.y+w.h+6,w.w+20,11,2); ctx.fillStyle='#2a1e1e'; ctx.fill(); ctx.strokeStyle='#0e0809'; ctx.lineWidth=1.2; ctx.stroke();
  ctx.fillStyle='rgba(40,26,14,0.35)'; ctx.fillRect(w.x-8,w.y+w.h+11,w.w+16,1.5);
  for(let i=0;i<7;i++){ const fx=w.x-5+i*11, fy=w.y+w.h+1-(i%3)*2;
    ell(fx,w.y+w.h+6,5,3,'#1f2a1c'); ell(fx+3,w.y+w.h+4,3,2,'#2a3624');
    if(i%2===0) GT.goth.paint.rose(ctx,fx,fy,3.4); }
}
/* 戸（赤ずきんが出るときに開く） */
function drawDoor(){
  const d=DOOR, open=hoodRun(), r=d.w/2, top=d.y+r;
  const arch=()=>{ ctx.beginPath(); ctx.moveTo(d.x,FLOOR); ctx.lineTo(d.x,top); ctx.arc(d.x+r,top,r,Math.PI,0); ctx.lineTo(d.x+d.w,FLOOR); ctx.closePath(); };
  ctx.fillStyle='#1e1416'; ctx.fillRect(d.x-6,d.y-4,d.w+12,FLOOR-d.y+4);
  arch(); ctx.fillStyle='#ffcf86'; ctx.fill();                       // 開くと見える部屋の明かり
  ctx.save(); arch(); ctx.clip();
  const pw=d.w*(1-open*0.8);                                          // 戸板（左の蝶番で開く）
  ctx.fillStyle='#3a1e1e'; ctx.fillRect(d.x,d.y,pw,FLOOR-d.y);
  ctx.strokeStyle='rgba(30,18,10,0.4)'; ctx.lineWidth=1.5;
  for(let i=1;i<4;i++){ const x=d.x+pw*i/4; ctx.beginPath(); ctx.moveTo(x,d.y); ctx.lineTo(x,FLOOR); ctx.stroke(); }
  ctx.strokeStyle='#120a0c'; ctx.lineWidth=2.4;                         // 鉄の帯（ちょうつがい）
  for(const y of [d.y+r+8, FLOOR-20]){ ctx.beginPath(); ctx.moveTo(d.x,y); ctx.lineTo(d.x+pw*0.7,y); ctx.stroke(); ell(d.x+pw*0.7,y,2.2,2.2,'#120a0c'); }
  ell(d.x+pw-8,d.y+52,2.8,2.8,'#120a0c'); ctx.strokeStyle='#8a7240'; ctx.lineWidth=1; ctx.beginPath(); ctx.arc(d.x+pw-8,d.y+56,4,0,Math.PI); ctx.stroke();   // 輪のとって
  ctx.restore();
  // 戸口のランプ
  const t=performance.now()/1000;
  const lfl=0.8+0.15*Math.sin(t*6)+0.06*Math.sin(t*17), lx=d.x+d.w+16, ly=d.y+10;
  ctx.save(); ctx.globalCompositeOperation='lighter';
  const lg=ctx.createRadialGradient(lx,ly+12,2,lx,ly+12,80*lfl); lg.addColorStop(0,`rgba(255,170,90,${0.3*lfl})`); lg.addColorStop(1,'rgba(255,170,90,0)');
  ctx.fillStyle=lg; ctx.fillRect(lx-90,ly-80,180,180); ctx.restore();
  ctx.strokeStyle='#120a0c'; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(lx-12,ly-6); ctx.lineTo(lx,ly-6); ctx.lineTo(lx,ly); ctx.stroke();   // 腕木
  ctx.fillStyle='#120a0c'; ctx.beginPath(); ctx.moveTo(lx-6,ly); ctx.lineTo(lx+6,ly); ctx.lineTo(lx+8,ly+5); ctx.lineTo(lx-8,ly+5); ctx.closePath(); ctx.fill();
  const lgl=ctx.createLinearGradient(0,ly+5,0,ly+21); lgl.addColorStop(0,`rgba(255,214,140,${0.9*lfl})`); lgl.addColorStop(1,`rgba(230,120,60,${0.85*lfl})`);
  ctx.fillStyle=lgl; ctx.fillRect(lx-6,ly+5,12,16); ctx.strokeStyle='#120a0c'; ctx.lineWidth=1.4; ctx.strokeRect(lx-6,ly+5,12,16);
  ctx.fillStyle='#120a0c'; ctx.fillRect(lx-7,ly+21,14,3);
}

/* 庭：柵・物干し・飛び石（地形より奥） */
function drawGarden(){
  const t=performance.now()/1000;
  ctx.save();
  // 柵
  ctx.fillStyle=ctx.strokeStyle='#161013';                                         // 鉄の柵（やりの先）
  ctx.fillRect(20,424,196,3); ctx.fillRect(20,450,196,3);
  for(let x=24;x<=212;x+=12){ const top=x%36===0?404:412;
    ctx.fillRect(x-1.2,top,2.4,FLOOR-top);
    ctx.beginPath(); ctx.moveTo(x-3.5,top+2); ctx.lineTo(x,top-7); ctx.lineTo(x+3.5,top+2); ctx.closePath(); ctx.fill(); }
  ctx.lineWidth=1.2; for(let x=30;x<212;x+=12){ ctx.beginPath(); ctx.arc(x,436,4,0,Math.PI*2); ctx.stroke(); }   // 輪の飾り
  ctx.strokeStyle='rgba(215,200,225,0.22)'; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(20,424.5); ctx.lineTo(216,424.5); ctx.stroke();
  // 柵ぎわの花
  GTDecor.paint.grass(ctx, 24, FLOOR-16, 190, 16, 5, {flowers:false});             // 柵ぎわの下草と花
  for(let i=0;i<6;i++) GT.goth.paint.rose(ctx, 36+i*32+(i%2)*6, FLOOR-8-(i%3)*10, 4+(i%2));   // 柵にからむ薔薇
  // 物干し
  ctx.fillStyle='#1e1416'; ctx.fillRect(98,290,5,FLOOR-290); ctx.fillRect(246,290,5,FLOOR-290);
  ctx.strokeStyle='rgba(60,50,38,0.8)'; ctx.lineWidth=1.3;
  const sag=x=>292+Math.sin((x-100)/148*Math.PI)*14;
  ctx.beginPath(); ctx.moveTo(100,292); ctx.quadraticCurveTo(174,320,248,292); ctx.stroke();
  const cloth=(x,w,h,c,ph)=>{ const y=sag(x+w/2)-1, sw=Math.sin(t*1.6+ph)*4;
    ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x+w,y); ctx.lineTo(x+w+sw,y+h); ctx.lineTo(x+sw,y+h); ctx.closePath(); ctx.fillStyle=c; ctx.fill();
    ctx.fillStyle='#6a6064'; ctx.fillRect(x+3,y-3,3,6); ctx.fillRect(x+w-6,y-3,3,6); };
  cloth(118,34,40,'#b8423f',0);       // 赤い頭巾のケープ
  cloth(162,30,30,'#a8a0a2',1.3);
  cloth(202,26,36,'#3a3236',2.1);     // エプロン
  ctx.restore();
}

/* 薪の山・井戸の見た目（engine の足場の上に重ねて描く） */
function drawProps(){
  ctx.save();
  // 薪の山（切り口が並んでいる）
  const w=WOOD;
  GT.roundRect(w.x,w.y,w.w,w.h,6); ctx.fillStyle='#1e1614'; ctx.fill();
  ctx.save(); GT.roundRect(w.x,w.y,w.w,w.h,6); ctx.clip();
  const R=11;
  for(let row=0;row*R*1.8<w.h;row++){ const y=w.y+R+row*R*1.8, off=(row%2)*R;
    for(let x=w.x+R-off;x<w.x+w.w+R;x+=R*2){
      ell(x,y,R-1,R-1,'#6e5a48'); ctx.strokeStyle='rgba(30,20,16,0.8)'; ctx.lineWidth=1;
      ctx.beginPath(); ctx.arc(x,y,R*0.55,0,Math.PI*2); ctx.stroke(); ell(x,y,1.6,1.6,'#2a1e18'); } }
  ctx.restore();
  // 井戸（石積み・屋根・つるべ）
  const e=WELL;
  ctx.fillStyle='#1e1416'; ctx.fillRect(e.x+4,e.y-62,5,62); ctx.fillRect(e.x+e.w-9,e.y-62,5,62);
  ctx.beginPath(); ctx.moveTo(e.x-8,e.y-56); ctx.lineTo(e.x+e.w/2,e.y-80); ctx.lineTo(e.x+e.w+8,e.y-56); ctx.closePath();
  ctx.fillStyle='#2e242a'; ctx.fill();
  ctx.strokeStyle='rgba(10,6,8,0.8)'; ctx.lineWidth=1.2; ctx.beginPath(); ctx.moveTo(e.x+e.w/2,e.y-56); ctx.lineTo(e.x+e.w/2,e.y-26); ctx.stroke();
  ctx.fillStyle='#2a1e1c'; ctx.fillRect(e.x+e.w/2-6,e.y-26,12,11);
  GT.roundRect(e.x,e.y,e.w,e.h,6); ctx.fillStyle='#48424a'; ctx.fill();
  ctx.strokeStyle='rgba(10,6,8,0.6)'; ctx.lineWidth=1.2;
  for(let row=0;row<4;row++){ const y=e.y+row*15; ctx.beginPath(); ctx.moveTo(e.x,y); ctx.lineTo(e.x+e.w,y); ctx.stroke();
    for(let x=e.x+((row%2)?10:20);x<e.x+e.w;x+=20){ ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x,y+15); ctx.stroke(); } }
  ctx.strokeStyle='rgba(215,200,225,0.25)'; ctx.lineWidth=1.4; ctx.beginPath(); ctx.moveTo(e.x+5,e.y+1); ctx.lineTo(e.x+e.w-5,e.y+1); ctx.stroke();   // 月あかりのふち
  ctx.strokeStyle='#161012'; ctx.lineWidth=1.2; ctx.beginPath(); ctx.moveTo(e.x+e.w-4,e.y+e.h); ctx.bezierCurveTo(e.x+e.w+6,e.y+40,e.x+e.w-14,e.y+20,e.x+e.w-6,e.y+2); ctx.stroke();   // つた
  for(let i=0;i<5;i++) ell(e.x+e.w-6+(i%2?5:-4),e.y+e.h-8-i*10,3.6,2.2,i%2?'#1c2619':'#26321f');
  GT.goth.paint.rose(ctx,e.x+e.w-8,e.y+14,3.6);
  ctx.restore();
}

/* 「のぞく」の案内（マリに言われてから、のぞくまで） */
function drawHint(){
  if(!st.briefed || st.peeked || st.busy) return;
  const p=0.5+0.5*Math.sin(performance.now()/260), w=WIN;
  ctx.save(); ctx.globalAlpha=0.5+0.5*p;
  ctx.strokeStyle='#c9a45a'; ctx.lineWidth=1.6; ctx.strokeRect(w.x-10,w.y-10,w.w+20,w.h+20);
  const label='薪の上から のぞく', cx=w.x+w.w/2, ly=w.y-50;
  ctx.font="700 13px 'Zen Old Mincho',serif"; ctx.textAlign='center'; ctx.textBaseline='middle';
  const lw=ctx.measureText(label).width+28;
  ctx.beginPath(); ctx.moveTo(cx-lw/2,ly); ctx.lineTo(cx-lw/2+8,ly-12); ctx.lineTo(cx+lw/2-8,ly-12); ctx.lineTo(cx+lw/2,ly); ctx.lineTo(cx+lw/2-8,ly+12); ctx.lineTo(cx-lw/2+8,ly+12); ctx.closePath();
  ctx.fillStyle='rgba(20,12,14,0.9)'; ctx.fill(); ctx.strokeStyle='#c9a45a'; ctx.lineWidth=1.2; ctx.stroke();
  ctx.fillStyle='#f1e3e6'; ctx.fillText(label, cx, ly+1);
  ctx.restore();
}

/* ゴシックの庭：遠くの木・ねじれた枯れ木・薔薇の茂み・墓石のような石（一度だけ描いて取っておく） */
let yardCv=null;
function drawGothYard(){
  if(!GT.goth) return;
  if(!yardCv){ yardCv=document.createElement('canvas'); yardCv.width=W; yardCv.height=H; const c=yardCv.getContext('2d'), P=GT.goth.paint;
    P.farTrees(c);
    P.tree(c,40,FLOOR+6,330,13,10);     // 左のはしの木
    P.tree(c,470,FLOOR+6,300,41,-14);   // 庭と家のあいだの木
    P.stone(c,268,26,34); P.roseBush(c,404,52,28,17); P.roseBush(c,876,40,26,19); }
  ctx.drawImage(yardCv,0,0);
}
GT.registerDraw(()=>{ if(!isHouse()) return; drawGothYard(); if(GT.goth) GT.goth.fog(false); drawGarden(); drawHouse(); }, 'back');
GT.registerDraw(()=>{ if(!isHouse()||!GT.goth) return; ctx.save(); ctx.globalAlpha=1-peek.alpha; GT.goth.fog(true); GT.goth.top(); GT.goth.wisps(); ctx.restore(); }, 'overlay');   // 窓のぞきの映像の上には出さない
GT.registerDraw(()=>{ if(!isHouse()) return; drawProps(); drawHint(); }, 'world');
})();
