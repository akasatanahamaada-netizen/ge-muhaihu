/* ============================================================================
   ステージ：第一章 ── 分かれ道  id = 'crossroads'
   種類：story　近道か遠回りかを選ぶ（flags.route）
   担当：
   ----------------------------------------------------------------------------
   ここで選んだ flags.route（'shortcut' / 'detour'）が結末を分けます。
     近道(shortcut)  … 狼を追い、おばあさんを助けられる可能性がある
                        近道のときだけ、近道のステージ（08_path2.js）を通る
     遠回り(detour)  … 安全だが遅く、着いたときにはおばあさんは…
                        遠回りのときだけ、遠回りの道①②（09_path3.js / 10_path4.js）を通る

   ◆ このステージの流れ（道は「歩いて」選ぶ）
     1) 赤ずきんは、少年のうしろから一緒に歩いてくる。分かれ道の手前（HOOD_WAIT）まで来ると立ちどまり、話しかけると、二つの道を教えてくれる。
     2) 右ページで道が分かれる。
          上の道（近道）… 本を裏返して、天井づたいに行く。暗いいばらの道。
                          垂れさがるいばらを、ジャンプでよけて進む。
          下の道（遠回り）… 床をそのまま行く。明るいが、ぬかるみで足が遅くなる。先に水車小屋。
     3) 道の終わり近くまで行くと「この道を行く／引き返す」をたずねられる。
        行くと決めると flags.route が決まり、右の端から次へ。
        赤ずきんは、ずっと左のページで待っている。遠回りを選んだときだけついてくる。近道なら、左のページに残る（ここで別れる）。

   ◆ このファイルが持っている独自の仕掛け（js/engine/ は触らない）
     GT.registerUpdate … 赤ずきんの動き・話しかける前のセリフ作り・道の確認
     GT.registerDraw   … いばらの近道・明るい遠回り・水車小屋・案内（道しるべは置かない）
   ========================================================================== */
(function(){
const ctx=GT.ctx, W=GT.W, H=GT.H, EDGE=GT.EDGE, FLOOR=H-GT.EDGE, SPINE=GT.SPINE;
const HOOD_WAIT=392;                        // 赤ずきんが立ちどまる場所（分かれ道の手前）。そこまでは少年と一緒に歩いてくる
const DECIDE_X=780;                         // ここまで来たら「この道を行く？」
const THORN1={page:'right', x:610, y:EDGE, w:30, h:46, kind:'ceilingLedge'};   // 天井から垂れさがるいばら
const THORN2={page:'right', x:722, y:EDGE, w:30, h:56, kind:'ceilingLedge'};
const MUD   ={page:'right', x:560, y:446, w:200, h:18, slow:0.35, jump:0.6};  // 遠回りのぬかるみ

// --- 地形 ------------------------------------------------------------------
GT.defineStage('crossroads', {
  platforms:[ THORN1, THORN2 ],
  boxes:[], enemies:[],
  swamps:[ MUD ],
  decor:[
    {layer:'back',  kind:'tree',  x:20,  y:120, w:110, h:300},
    {layer:'back',  kind:'tree',  x:170, y:150, w:100, h:270},
    {layer:'back',  kind:'tree',  x:300, y:100, w:110, h:320},
    {layer:'back',  kind:'tree',  x:458, y:130, w:100, h:290},   // 右ページの木（森の中の分かれ道）
    {layer:'back',  kind:'tree',  x:826, y:110, w:100, h:310},
    {layer:'back',  kind:'bush',  x:110, y:420, w:80,  h:44},
    {layer:'front', kind:'fern',  x:-8,  y:396, w:80,  h:72},
    {layer:'front', kind:'grass', x:240, y:434, w:60,  h:30},
    {layer:'front', kind:'grass', x:780, y:434, w:60,  h:30},
  ],
});

// --- セリフ ----------------------------------------------------------------
function HOOD_LINES(){
  return [
    // 赤ずきんは、いつもの道（下の道）しか知らない。上の道には、少年が自分で気づく
    {s:'赤ずきん',c:'hood',t:'おばあちゃんのお家へは、この道をまっすぐ。水車小屋をまわって行くの。'},
    {s:'赤ずきん',c:'hood',t:'ちょっとぬかるんでるけど、明るくて安全よ。'},
    ...(GT.flags.warnedHood ? [
      {s:'赤ずきん',c:'hood',f:'worried',t:'……さっきの話、ずっと気になってるの。狼さんが、おばあちゃんのところへ行ってたら……'},
    ] : []),                                   // 伝えなかったときは、ここでは何も言わない
    {s:'',c:'narr',t:'ふと見上げると、頭の上にいばらが絡みあっている。その奥に、くぐり抜けられそうなすきまがあった。'},
    {s:'少年',c:'boy',t:'（……道じゃない。でも、頑張れば何とか通れるかもしれない。あっちのほうが、近い気がする）'},
    {s:'',c:'narr',t:'いばらの先へ、狼が向かったかもしれない。いつもの道は、確実だが遅い。'},
    {s:'',c:'narr',t:'（本を裏返していばらの上を行くか、赤ずきんと下の道を行くか）'},
  ];
}
/* 道を決めたら、本の「分かれ道」のページに書きこむ（ピースは、赤ずきんのところから本へ） */
function crossPage(){
  GT.fillPage('crossroads', GT.flags.route==='shortcut'
    ? '――少年は、いばらの近道を選び、赤ずきんと別れた。'
    : '――少年は、赤ずきんと一緒に、遠回りの道を選んだ。');
  GT.storyPiece&&GT.storyPiece('crossroads','crossroads:story','hood');
}
const ROUTES={
  shortcut:{
    ask:[ {s:'',c:'narr',t:'いばらの奥は、暗くて狭い。かごを抱えた赤ずきんには、通れそうにない。この先は、少年ひとりの道だ。'} ],
    choices:[
      { label:'近道を行く（狼を追う）', set:()=>{ GT.flags.route='shortcut'; crossPage(); }, after:[
        {s:'赤ずきん',c:'hood',f:'surprise',t:'えっ、そこを通るの！？　……かごがあるから、わたしはいつもの道で行くね。気をつけてね！　おばあちゃんのお家で、会おうね！'},
        {s:'',c:'narr',t:'少年は赤ずきんと別れ、近道を駆けた。狼より先に、おばあさんの家へ。'} ]},
      { label:'引き返す', after:[] },
    ]},
  detour:{
    ask:[ {s:'',c:'narr',t:'道は、水車小屋のほうへ大きくまわっている。赤ずきんが、となりで待っている。'} ],
    choices:[
      { label:'遠回りを行く（赤ずきんと一緒に）', set:()=>{ GT.flags.route='detour'; crossPage(); }, after:[
        {s:'赤ずきん',c:'hood',f:'smile',t:'うん、一緒に行こう。'},
        {s:'',c:'narr',t:'二人は安全な遠回りを選んだ。だが、その分だけ時間がかかる。'} ]},
      { label:'引き返す', after:[] },
    ]},
};

// --- シーン ----------------------------------------------------------------
GT.registerScene({
  id:'crossroads', type:'story', stage:'crossroads', label:'第一章 ── 分かれ道',
  intro:{s:'',c:'narr',t:'赤ずきんと並んで歩いていくと、森の道が、少しひらけた場所に出た。',act:'cross-setup'},
  npcs:[
    { who:'hood', name:'赤ずきん', page:'left', x:HOOD_WAIT, lines:HOOD_LINES(),   // 話しかける直前に作り直す
      onEnd:()=>{ st.talked=true; } },
  ],
});

/* ==========================================================================
   選んだ道のときだけ遊ぶステージ
     dynamic:'shortcutOnly' … 近道のときだけ（08_path2.js）。遠回りのときは飛ばす
     dynamic:'detourOnly'   … 遠回りのときだけ（09_path3.js / 10_path4.js）。近道のときは飛ばす
   ========================================================================== */
function onlyOnRoute(route){
  return scene=>{
    if(GT.flags.route!==route){ GT.advanceScene(); return; }
    // dynamic を外した写しで、ふつうのシーンとして始め直す（始めたら元に戻す。次に遊ぶときもまた道を見る）
    const plain=Object.assign({},scene); delete plain.dynamic;
    GT.SCENES[GT.sceneIndex]=plain; GT.startScene(GT.sceneIndex); GT.SCENES[GT.sceneIndex]=scene;
  };
}
GT.registerDynamic('shortcutOnly', onlyOnRoute('shortcut'));
GT.registerDynamic('detourOnly',   onlyOnRoute('detour'));

/* ==========================================================================
   進行
   ========================================================================== */
const st={ talked:false, busy:false, bubble:null, arrived:false, last:performance.now() };
const isCross=()=>GT.scene&&GT.scene.id==='crossroads';
const hoodNpc=()=>GT.getNpcs().find(n=>n.who==='hood');
// いまどちらの道にいるか（右ページを裏返して天井にいれば近道）
const pathOf=()=> (GT.gravity.right===-1 && GT.player.y<H/2) ? 'shortcut' : 'detour';
GT.registerSceneReset(()=>{ if(isCross()){ st.talked=false; st.busy=false; st.bubble=null; st.arrived=false; } });
// 赤ずきんは、少年のすぐうしろから（一緒に歩いてきた）
GT.registerAct('cross-setup',()=>{ GT.flags.route=null; const h=hoodNpc(); if(h) h.x=Math.max(EDGE,GT.player.x-38); });

function autoTalk(lines,choices,after){
  st.busy=true; GT.mode='idle'; GT.player.vx=0;
  GT.beginDialogue(lines,choices,()=>{ GT.hideDialogue(); GT.mode='play'; st.busy=false; if(after) after(); });
}

GT.registerUpdate(()=>{
  if(!isCross()) return;
  const pl=GT.player, pcx=pl.x+pl.w/2, h=hoodNpc();
  if(h && !st.talked) h.lines=HOOD_LINES();
  if(st.busy || !st.talked) return;
  // 道の終わり近く：その道で決まっていなければ、たずねる
  const path=pathOf();
  if(pcx>DECIDE_X && GT.flags.route!==path){
    const r=ROUTES[path];
    autoTalk(r.ask, r.choices, ()=>{
      if(GT.flags.route!==path){ pl.x=DECIDE_X-140; pl.vx=0; }           // 引き返した
      else if(path==='shortcut') st.bubble={text:'気をつけてね！',t:2.4};
    });
  }
});

/* 赤ずきんの動き（会話中も動けるよう、描画のついでに進める）
   話す前：少年と一緒に歩いてきて、分かれ道の手前（HOOD_WAIT）で立ちどまる（それより先へは行かない）。
   話したあと：その場で待つ。遠回りを選んだときだけ、少年についてくる。
   近道を選んだときは、その場から動かない（ページの重力にはしたがう。裏返されると天井に落ちる） */
function moveHood(){
  const h=hoodNpc(); if(!h) return;
  const now=performance.now(), dt=Math.min(0.05,(now-st.last)/1000); st.last=now;
  h.noGravity = false;
  if(st.bubble){ st.bubble.t-=dt; if(st.bubble.t<=0) st.bubble=null; }
  if(GT.mode!=='play') return;
  const pcx=GT.player.x+GT.player.w/2;
  if(!st.talked && !GT.flags.route){                        // 話す前：少年と一緒に、分かれ道の手前まで歩く
    if(!st.arrived){ GT.npcStep(h, Math.min(HOOD_WAIT, pcx+(pcx>h.x+16?-42:42)-16), 200, dt);
      if(h.x>=HOOD_WAIT-10) st.arrived=true; }               // 着いたら、そこで待つ（少年がもどっても、ついていかない）
    h.talkable = st.arrived;                                 // 分かれ道の手前に着いてから、話しかけられる（道の話は、そこでする）
    return; }
  if(GT.flags.route!=='detour') return;                     // 話したあと・近道：その場から動かない
  GT.npcStep(h, pcx+(pcx>h.x+16?-42:42)-16, 200, dt);       // 遠回り：ついてくる（足場は、すり抜けずに跳び乗る）
}

/* ==========================================================================
   描画
   ========================================================================== */
function ell(x,y,rx,ry,c){ ctx.beginPath(); ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2); ctx.fillStyle=c; ctx.fill(); }

/* ==========================================================================
   分かれ道の絵（道しるべを置かないので、絵だけで「道が二つに分かれている」と分かるようにする）
     ・いつもの道 … 日の当たる土の道が、遠くの水車小屋までのびていく。道ばたに花、小さな靴の足あと（赤ずきんがいつも通る道）
     ・いばらの上 … 天井に、からみあったいばらの暗いしげみ
     ・木は、左ページと同じ描き方（_decor.js の tree）で、右ページにも立てる
   ========================================================================== */
const rnd=i=>{ const v=Math.sin(i*127.1+311.7)*43758.5453; return v-Math.floor(v); };
function shoe(x,y,col){ ell(x,y,3.2,1.3,col); ell(x-3.6,y,1.6,1.1,col); }   // 小さな靴の足あと

/* 奥（地形より奥）：空気・遠くの丘・水車小屋・いつもの道・いばらのしげみ */
function drawRoutes(){
  const t=performance.now()/1000;
  ctx.save();
  // いつもの道：右下から差す明るい日ざし
  const sun=ctx.createRadialGradient(830,FLOOR-30,20,830,FLOOR-30,380);
  sun.addColorStop(0,'rgba(255,226,150,0.42)'); sun.addColorStop(1,'rgba(255,226,150,0)');
  ctx.fillStyle=sun; ctx.fillRect(SPINE,120,W-SPINE,FLOOR-120);
  // 遠くの丘と水車小屋
  ctx.fillStyle='rgba(120,140,100,0.35)';
  ctx.beginPath(); ctx.moveTo(SPINE,FLOOR); ctx.quadraticCurveTo(640,330,W,360); ctx.lineTo(W,FLOOR); ctx.closePath(); ctx.fill();
  GTDecor.paint.watermill(ctx, 812, 420, 1.15, t, {body:'rgba(110,92,72,0.75)', wheel:'rgba(92,72,54,0.8)', water:'rgba(150,185,200,0.5)'});

  // いつもの道：土の道。左ページからまっすぐ来て、右ページで丘をのぼり、水車小屋の前で細くなって消える
  ctx.save();
  const road=ctx.createLinearGradient(0,FLOOR,0,410);
  road.addColorStop(0,'rgba(168,128,80,0.78)'); road.addColorStop(1,'rgba(196,160,108,0.6)');
  const roadPath=()=>{ ctx.beginPath(); ctx.moveTo(0,FLOOR); ctx.lineTo(0,FLOOR-13);
    ctx.bezierCurveTo(300,FLOOR-15, 560,FLOOR-18, 660,FLOOR-28);          // 道の向こう側のふち（のぼっていく）
    ctx.bezierCurveTo(720,FLOOR-36, 760,421, 790,418);
    ctx.lineTo(802,421);                                                  // 水車小屋の前で細くなる
    ctx.bezierCurveTo(772,430, 744,FLOOR-18, 704,FLOOR-7);                // 道の手前側のふち
    ctx.lineTo(W,FLOOR); ctx.closePath(); };
  roadPath(); ctx.fillStyle=road; ctx.fill();
  ctx.save(); roadPath(); ctx.clip();                                     // まん中が、日に照らされて明るい
  ctx.fillStyle='rgba(240,214,160,0.35)';
  ctx.beginPath(); ctx.moveTo(0,FLOOR-6); ctx.bezierCurveTo(300,FLOOR-8, 560,FLOOR-10, 680,FLOOR-20); ctx.bezierCurveTo(740,FLOOR-26,770,424,792,420); ctx.lineTo(790,424); ctx.bezierCurveTo(760,430,730,FLOOR-12,680,FLOOR-12); ctx.bezierCurveTo(560,FLOOR-4,300,FLOOR-3,0,FLOOR-2); ctx.closePath(); ctx.fill();
  ctx.restore();
  ctx.strokeStyle='rgba(96,70,42,0.55)'; ctx.lineWidth=1.3;              // 道の向こう側のふち（インクの線）
  ctx.beginPath(); ctx.moveTo(0,FLOOR-13); ctx.bezierCurveTo(300,FLOOR-15, 560,FLOOR-18, 660,FLOOR-28); ctx.bezierCurveTo(720,FLOOR-36, 760,421, 790,418); ctx.stroke();
  for(let i=0;i<30;i++){ const x=6+i*24+rnd(i+40)*10; if(x>650) break;   // 道ばたの草（向こう側のふち）
    const y=FLOOR-13-(x/650)*12; ctx.strokeStyle='rgba(92,112,58,0.7)'; ctx.lineWidth=1.1;
    for(let k=-1;k<=1;k++){ ctx.beginPath(); ctx.moveTo(x+k*2,y); ctx.lineTo(x+k*4,y-5-rnd(i+k)*4); ctx.stroke(); } }
  ctx.strokeStyle='rgba(150,118,74,0.35)'; ctx.lineWidth=1;              // 車輪のわだち
  for(const dy of [3,6]){ ctx.beginPath(); ctx.moveTo(0,FLOOR-dy); ctx.bezierCurveTo(320,FLOOR-dy-1, 560,FLOOR-dy-3, 650,FLOOR-dy-10); ctx.stroke(); }
  for(let i=0;i<26;i++){ const x=10+i*34+rnd(i)*20, y=FLOOR-2-rnd(i+5)*6;  // 小石
    if(x>700) continue; ell(x,y,1.6+rnd(i+9)*1.4,1,'rgba(140,120,96,0.55)'); }
  for(let i=0;i<9;i++){ const x=40+i*46, y=FLOOR-5+(i%2)*2.5; shoe(x,y,'rgba(120,88,60,0.45)'); }   // 小さな靴の足あと（いつもの道へ）
  for(let i=0;i<4;i++) shoe(600+i*40,FLOOR-14-i*3,'rgba(120,88,60,0.4)');
  ctx.restore();
  // 道ばたの花（日の当たる道のしるし）
  for(const [x,k] of [[560,0],[598,2],[640,1],[690,3],[734,0],[772,2]]) GTDecor.paint.flower(ctx, x, FLOOR-2, 0.8, k, x);
  ctx.restore();
}
function drawThornTunnel(){  // いばらのトンネル（天井）は、影を落とす
  ctx.save();
  // いばらの上：天井側の暗がり（右ページの上半分を、冷たく暗く）
  ctx.save(); ctx.translate(700,EDGE); ctx.scale(1.5,0.7);
  const dark=ctx.createRadialGradient(0,0,20,0,0,280);
  dark.addColorStop(0,'rgba(22,24,20,0.62)'); dark.addColorStop(1,'rgba(22,24,20,0)');
  ctx.fillStyle=dark; ctx.fillRect(-280,0,560,280); ctx.restore();


  // いばらのトンネル（天井）：からみあう枝・とげ・暗い実。中ほどが、獣の通れるすきま
  ctx.save();
  ctx.fillStyle='rgba(30,36,26,0.78)';                                   // 奥のしげみ（大きく、垂れさがる）
  for(let i=0;i<11;i++){ const x=480+i*40, r=28+rnd(i*5+1)*18; ctx.beginPath(); ctx.ellipse(x,EDGE,r*1.1,r,0,0,Math.PI); ctx.fill(); }
  ctx.fillStyle='rgba(38,44,32,0.94)';                                   // 手前のしげみ
  for(let i=0;i<13;i++){ const x=470+i*33, r=16+rnd(i*3)*14; ctx.beginPath(); ctx.arc(x,EDGE,r,0,Math.PI); ctx.fill(); }
  ctx.strokeStyle='rgba(44,52,34,0.9)'; ctx.lineWidth=1.6;               // 垂れさがるつる
  for(let i=0;i<10;i++){ const x=500+rnd(i+60)*370, len=30+rnd(i+70)*36;
    ctx.beginPath(); ctx.moveTo(x,EDGE+10); ctx.quadraticCurveTo(x+6*Math.sin(i),EDGE+10+len*0.6,x-3,EDGE+10+len); ctx.stroke();
    ctx.fillStyle='rgba(44,52,34,0.9)'; ctx.beginPath(); ctx.moveTo(x-2,EDGE+10+len*0.5); ctx.lineTo(x-7,EDGE+12+len*0.5); ctx.lineTo(x-1,EDGE+14+len*0.5); ctx.fill(); }
  ctx.fillStyle='rgba(24,26,20,0.9)';                                    // 奥の、いっそう暗いすきま（トンネルの口）
  ctx.beginPath(); ctx.ellipse(560,EDGE+18,34,16,0,0,Math.PI*2); ctx.fill();
  ctx.strokeStyle='rgba(60,70,44,0.95)'; ctx.lineWidth=2.2;              // からみあう枝
  for(let i=0;i<14;i++){ const x0=470+rnd(i)*410, x1=x0+40+rnd(i+3)*60, yb=EDGE+18+rnd(i+7)*30;
    ctx.beginPath(); ctx.moveTo(x0,EDGE+4); ctx.bezierCurveTo(x0+15,yb, x1-15,yb, x1,EDGE+6); ctx.stroke();
    ctx.fillStyle='rgba(60,70,44,0.95)';
    for(let k=1;k<4;k++){ const u=k/4, mx=x0+(x1-x0)*u, my=EDGE+4+(yb-EDGE-4)*Math.sin(u*Math.PI)*0.75;   // とげ
      ctx.beginPath(); ctx.moveTo(mx-2,my); ctx.lineTo(mx,my+5); ctx.lineTo(mx+2,my); ctx.fill(); } }
  for(let i=0;i<9;i++){ const x=490+rnd(i+20)*380, y=EDGE+10+rnd(i+30)*34; ell(x,y,2.2,2.2,'rgba(110,28,34,0.85)'); ell(x-0.7,y-0.7,0.7,0.7,'rgba(255,220,220,0.5)'); }   // 暗い実
  ctx.restore();
  ctx.restore();
}

/* いばら（天井から垂れさがる足場）：からみあった、とげのある枝の束 */
function drawThorns(){
  ctx.save();
  for(const p of [THORN1,THORN2]){
    ctx.fillStyle='#2e3626'; GT.roundRect(p.x,p.y,p.w,p.h,8); ctx.fill();
    ctx.strokeStyle='#4a5636'; ctx.lineWidth=2;
    for(let k=0;k<3;k++){ ctx.beginPath(); ctx.moveTo(p.x+4+k*9,p.y); ctx.bezierCurveTo(p.x-4+k*12,p.y+p.h*0.4, p.x+p.w+4-k*10,p.y+p.h*0.7, p.x+6+k*8,p.y+p.h); ctx.stroke(); }
    ctx.fillStyle='#2e3626';
    for(let y=p.y+8;y<p.y+p.h;y+=10){
      ctx.beginPath(); ctx.moveTo(p.x,y); ctx.lineTo(p.x-7,y+3); ctx.lineTo(p.x,y+6); ctx.fill();
      ctx.beginPath(); ctx.moveTo(p.x+p.w,y+4); ctx.lineTo(p.x+p.w+7,y+7); ctx.lineTo(p.x+p.w,y+10); ctx.fill(); }
    ell(p.x+p.w/2,p.y+p.h-6,2.2,2.2,'rgba(110,28,34,0.9)');
  }
  ctx.restore();
}

/* 道の案内・選んだ道・ふきだし */
function drawGuide(){
  const t=performance.now()/1000;
  ctx.save(); ctx.font="700 14px 'Zen Old Mincho',serif"; ctx.textAlign='center'; ctx.textBaseline='middle';
  if(st.talked && !GT.flags.route && !st.busy){
    const tag=(txt,x,y)=>{ const w=ctx.measureText(txt).width+28;     // 読みやすいよう、こい色の札の上に、明るい字で
      ctx.globalAlpha=0.88+0.12*Math.sin(t*3.5);
      GT.roundRect(x-w/2,y-13,w,26,13); ctx.fillStyle='rgba(43,36,24,0.82)'; ctx.fill();
      ctx.strokeStyle='rgba(227,197,138,0.7)'; ctx.lineWidth=1; ctx.stroke();
      ctx.fillStyle='#f6ecd2'; ctx.fillText(txt,x,y+1); ctx.globalAlpha=1; };
    tag('↑ 本を裏返して　いばらの上へ', 660, 120);
    tag('→ そのまま　いつもの道', 660, 400);
  }
  if(GT.flags.route){
    const txt='進む道：'+(GT.flags.route==='shortcut'?'近道（ひとりで）':'遠回り（赤ずきんと）');
    const w=ctx.measureText(txt).width+28;
    GT.roundRect(W/2-w/2,35,w,26,13); ctx.fillStyle='rgba(43,36,24,0.78)'; ctx.fill();
    ctx.fillStyle='#f3ead0'; ctx.fillText(txt,W/2,49);
  }
  ctx.restore();
}
/* 赤ずきんのふきだし（木などに隠れないよう、最前面に描く） */
function drawHoodBubble(){
  const h=hoodNpc();
  if(!(st.bubble && h && h.x<W)) return;
  const b=st.bubble, cx=Math.min(W-EDGE-60,h.x+16), y=(h.g||1)>0 ? h.y-44 : h.y+h.h+56;
  ctx.save(); ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.globalAlpha=Math.min(1,b.t*3); ctx.font="700 13px 'Zen Old Mincho',serif";
  const w=ctx.measureText(b.text).width+20;
  GT.roundRect(cx-w/2,y-12,w,24,12); ctx.fillStyle='rgba(250,244,228,0.95)'; ctx.fill();
  ctx.strokeStyle='rgba(139,74,63,0.6)'; ctx.lineWidth=1.4; ctx.stroke();
  ctx.fillStyle='#8b4a3f'; ctx.fillText(b.text,cx,y+1);
  ctx.restore();
}

GT.registerDraw(()=>{ if(!isCross()) return; drawRoutes(); }, 'backflat');   // 地面（道・丘・水車小屋・花・靴の足あと）は、影を落とさない
GT.registerDraw(()=>{ if(!isCross()) return; drawThornTunnel(); }, 'back');
GT.registerDraw(()=>{ if(!isCross()) return; moveHood(); drawThorns(); }, 'world');
GT.registerDraw(()=>{ if(!isCross()) return; drawGuide(); drawHoodBubble(); }, 'speech');   // 案内の字は最前面に（影も落とさず、暗くもならない）
})();
