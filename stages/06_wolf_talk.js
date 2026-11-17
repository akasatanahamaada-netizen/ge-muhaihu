/* ============================================================================
   ステージ：第一章 ── 狼  id = 'wolf_talk'
   種類：story　狼に話しかける。「危険を告げるか」で分岐（flags.warnedHood）
   担当：
   ----------------------------------------------------------------------------
   分岐の作り方：npc の choices に選択肢を並べ、set でフラグを立てる。
   ここで立てた flags.warnedHood は、後の「おばあさんの家」で使われます。

   ◆ このステージの流れ
     1) 昼の森の奥。赤ずきんが少年のうしろをついてくる。
     2) 右ページに入ると、茂みが揺れて、狼が現れる（自動）。赤ずきんは狼のそばへ。
     3) 狼に話しかける前に、まわりを見ると「違和感」が見つかる（3つ。見なくても進める）
          ・道の上の大きな足あと（左ページ・背表紙の手前）
          ・木の幹の爪あと（左ページ。切り株 → 枝に乗って、近くで見る）
          ・狼についた血（右ページ・狼のうしろに回りこむ）……毛に血がこびりつき、足もとにも血のしずくが落ちている
     4) 狼に話しかける → 狼は脇道へ去る → 「赤ずきんに伝えるか」を選ぶ
        「狼はあやしい、と伝える」は、違和感を 3つとも調べたときだけ選べる（足りなければ、うすく出て選べない）。
        見つけた数は GT.flags.wolfClues に入る（0〜3）。

   ◆ このファイルが持っている独自の仕掛け（engine.js は触らない）
     act：'wolf-setup'（はじめの位置）/ 'wolf-leave'（狼が脇道へ去る）
     GT.registerUpdate        … 赤ずきんがついてくる・狼の登場・違和感を見つける
     GT.registerDraw          … 昼の森の奥・霧・茂み・爪あと・足あと・影・狼についた血・違和感のありか（？）
   ========================================================================== */
(function(){
const ctx=GT.ctx, W=GT.W, H=GT.H, EDGE=GT.EDGE, FLOOR=H-GT.EDGE, SPINE=GT.SPINE;
const WOLF_HIDE=820, WOLF_STAND=700, HOOD_BY_WOLF=610;
const STUMP ={page:'left', x:226, y:420, w:48, h:44, kind:'ledge'};
const BRANCH={page:'left', x:96,  y:372, w:94, h:14, kind:'ledge'};
const TRUNK ={x:140, w:40, top:96};        // 爪あとのある木
const PRINTS={x:330, w:100};               // 足あと
const BUSH  ={x:760, w:130};               // 狼が隠れている茂み

// --- 地形 ------------------------------------------------------------------
GT.defineStage('wolf_talk', {
  platforms:[ STUMP, BRANCH ],
  boxes:[], enemies:[],
  decor:[
    // 奥の木（小さめ・うしろに並ぶ）
    {layer:'back',  kind:'tree',  x:-20, y:60,  w:100, h:360},
    {layer:'back',  kind:'tree',  x:200, y:150, w:70,  h:270},
    {layer:'back',  kind:'tree',  x:355, y:160, w:80,  h:260},
    {layer:'back',  kind:'tree',  x:420, y:110, w:70,  h:310},
    {layer:'back',  kind:'tree',  x:690, y:150, w:80,  h:270},
    {layer:'back',  kind:'tree',  x:775, y:60,  w:110, h:360},
    {layer:'back',  kind:'tree',  x:840, y:140, w:80,  h:280},
    {layer:'back',  kind:'tree',  x:250, y:90,  w:110, h:330},
    {layer:'back',  kind:'tree',  x:480, y:70,  w:120, h:350},
    {layer:'back',  kind:'tree',  x:610, y:120, w:90,  h:300},
    {layer:'back',  kind:'rock',  x:420, y:430, w:40,  h:34},
    {layer:'front', kind:'fern',  x:-10, y:396, w:80,  h:72},
    {layer:'front', kind:'grass', x:270, y:436, w:60,  h:28},
    {layer:'front', kind:'grass', x:560, y:436, w:50,  h:28},
  ],
});

// --- セリフ ----------------------------------------------------------------
const APPEAR=[
  {s:'',c:'narr',t:'茂みががさりと揺れる。――狼が、茂みから現れた。'},
  {s:'赤ずきん',c:'hood',f:'surprise',t:'あら、狼さん！'},
  {s:'',c:'narr',t:'赤ずきんが、何のためらいもなく狼に近づいていく。'},
  {s:'少年',c:'boy',t:'（狼に話しかけよう。……その前に、まわりをよく見ておこう。何かがおかしい気がする。）'},
];
const CLUES=[
  { key:'prints', lines:[
    {s:'',c:'narr',t:'道の上に大きな獣の足あと。爪の先が、深く土に食いこんでいる。'} ]},
  { key:'claws', lines:[
    {s:'',c:'narr',t:'木の幹に大きな爪あと。木の皮がめくれている。'} ]},
  { key:'blood', lines:[
    {s:'',c:'narr',t:'狼には血がついている。'} ]},
];
const clueCount=()=>CLUES.filter(c=>st.found[c.key]).length;

// --- シーン ----------------------------------------------------------------
GT.registerScene({
  id:'wolf_talk', type:'story', stage:'wolf_talk', label:'第一章 ── 狼',
  intro:[
    {s:'',c:'narr',t:'昼の日ざしの中、森の奥へ進むほどに木々は高くなっていく。',act:'wolf-setup'},
  ],
  npcs:[
    { who:'hood', name:'赤ずきん', page:'right', x:560 },   // その場にいる（会話相手は狼）。位置は update で動かす
    { who:'wolf', name:'狼', page:'right', x:WOLF_STAND, lines:[
      {s:'',c:'narr',t:'狼は赤ずきんに話しかけようとした。'},
      {s:'',c:'narr',t:'しかし、その隣に立つ少年の姿を目にすると、わずかに眉をひそめた。'},
      {s:'',c:'narr',t:'一瞬だけ不快そうな表情を浮かべたあと、何事もなかったかのように笑みを戻す。'},
      {s:'狼',c:'wolf',t:'こんにちは、赤ずきんちゃん。'},
      {s:'赤ずきん',c:'hood',f:'smile',t:'こんにちは！'},
      {s:'狼',c:'wolf',t:'こんなところで何をしているんだい？'},
      {s:'赤ずきん',c:'hood',t:'おばあちゃんのお家に行くところなの。お母さんから、カスタードとバターを届けるように頼まれたのよ。'},
      {s:'狼',c:'wolf',t:'それは親切だねえ。おばあさんのお家は遠いのかい？'},
      {s:'赤ずきん',c:'hood',t:'ええ。あそこに見える水車小屋を過ぎた先の、村のいちばん端のお家よ。'},
      {s:'狼',c:'wolf',t:'なるほど。そうか、そうか。'},
      {s:'',c:'narr',t:'狼は、口元に笑みを浮かべた。'},
      {s:'狼',c:'wolf',t:'それなら、ちょうどいい。おばあさんのところまで競争してみないかい？'},
      {s:'赤ずきん',c:'hood',f:'surprise',t:'競争？'},
      {s:'狼',c:'wolf',t:'そうさ。君はこの道を行くといい。わたしは別の道を行こう。どちらが先に着くか、勝負だ。'},
      {s:'赤ずきん',c:'hood',f:'smile',t:'おもしろそう！　わたし、負けないよ！'},
      {s:'',c:'narr',t:'狼は少年を見て不愉快そうに一瞬表情を崩す。'},
      {s:'狼',c:'wolf',t:'それじゃあ、お先に。'},
      {s:'',c:'narr',t:'狼は、木々のあいだへと姿を消した。',act:'wolf-leave'},
      {s:'',c:'narr',t:'少年は、狼の後ろ姿を見つめた。何かがおかしい。'},
      {s:'',c:'narr',t:'少年は強い違和感を覚えた。赤ずきんに、伝えるべきか。'},
    ], choices:[
      // 違和感を 3つとも調べたときだけ選べる。足りなければ、うすく「まだ言葉にできない」と出る
      { label:'狼はあやしい、と赤ずきんに伝える', when:()=>clueCount()>=CLUES.length,
        lockedLabel:()=>`（狼はあやしい……でも、まだ言葉にできない。違和感 ${clueCount()} / ${CLUES.length}）`,
        set:()=>{GT.flags.warnedHood=true;}, after:()=>{
        // ここに来るのは、違和感を 3つとも調べたときだけ
        return [
          {s:'少年',c:'boy',t:'……あの狼、なんだか変だよ。'},
          {s:'',c:'narr',t:'少年は、見てきたものを話した。'+[st.found.prints&&'大きな足あと',st.found.claws&&'木の爪あと',st.found.blood&&'それから――狼についた血'].filter(Boolean).join('、')+'。'},
          {s:'',c:'narr',t:'赤ずきんが、狼の消えた脇道をふり返る。かごを抱く手に、力がこもった。'},
          {s:'赤ずきん',c:'hood',t:'……分かった。急ぎましょう。おばあちゃんのところへ。'},
        ];
      }},
      { label:'何も言わない', set:()=>{GT.flags.warnedHood=false;}, after:()=>[
        {s:'',c:'narr',t:'少年は口をつぐんだ。赤ずきんは、鼻歌まじりに歩いていく。'},
        ...(clueCount()>0?[{s:'',c:'narr',t:'少年が見たものは、だれにも話されないまま、胸の奥に残った。'}]:[]),
      ]},
    ], onEnd:()=>{ st.phase='done'; GT.fillPage('wolf', GT.flags.warnedHood
        ?'――少年は違和感に気づき、赤ずきんに危険を告げた。'
        :'――狼は、脇道へ消えていった。'); } },
  ],
});

/* ==========================================================================
   進行
   phase: 'walk'（赤ずきんとついてくる）→ 'appear'（狼が出てくる）→ 'wolf'（狼がいる）→ 'done'
   ========================================================================== */
const st={ phase:'walk', busy:false, found:{}, appearT0:0, leaveT0:0, last:performance.now() };
const isWolf=()=>GT.scene&&GT.scene.id==='wolf_talk';
const npc=who=>GT.getNpcs().find(n=>n.who===who);
GT.registerSceneReset(()=>{ if(!isWolf()) return;
  st.phase='walk'; st.busy=false; st.rustled=false; st.found={}; st.appearT0=0; st.leaveT0=0; GT.flags.wolfClues=0; });
GT.registerAct('wolf-setup',()=>{ const h=npc('hood'), w=npc('wolf');
  if(h) h.x=EDGE; if(w){ w.x=WOLF_HIDE; w.talkable=false; } });
GT.registerAct('wolf-leave',()=>{ st.leaveT0=performance.now(); const w=npc('wolf');
  GT.holdDialogue(()=>{ const w=npc('wolf'); return !w || w.x>=W+20; }); });   // 狼が画面の外へ去るまで、会話の枠を消して見せる

function autoTalk(lines,after){
  st.busy=true; GT.mode='idle'; GT.player.vx=0;
  GT.beginDialogue(lines,null,()=>{ GT.hideDialogue(); GT.mode='play'; st.busy=false; if(after) after(); });
}

GT.registerUpdate(dt=>{
  if(!isWolf()) return;
  const pl=GT.player, pcx=pl.x+pl.w/2, w=npc('wolf');
  if(w) w.talkable = st.phase==='wolf';
  if(st.busy) return;

  // 狼が現れる
  if(st.phase==='walk' && pl.x>280 && !st.rustled){ st.rustled=true; GT.sfx&&GT.sfx('bush'); }   // 少年が近づくと、茂みがガサガサ
  if(st.phase==='walk' && pcx>SPINE+30){ GT.sfx&&GT.sfx('bush'); st.phase='appear'; st.appearT0=performance.now(); GT.mode='idle'; pl.vx=0; return; }

  // 違和感を見つける
  const onFloor = pl.onGround && Math.abs(pl.y+pl.h-FLOOR)<2;
  const spots={
    prints: onFloor && pcx>PRINTS.x+20 && pcx<PRINTS.x+PRINTS.w-20,
    claws:  pl.onGround && Math.abs(pl.y+pl.h-BRANCH.y)<2 && pcx<BRANCH.x+BRANCH.w,
    blood:  st.phase==='wolf' && !st.leaveT0 && onFloor && pcx>WOLF_STAND+80,   // 狼のうしろ（右）に回りこむと、血に気づく
  };
  // 近づいただけでは気づかない。その場所で Enter／画面タップをしたときだけ調べる（下の inspect）
  st.spot=null;
  for(const c of CLUES){ if(!st.found[c.key] && spots[c.key]){ st.spot=c; break; } }
});
function inspect(){
  if(!isWolf() || GT.paused || st.busy || !st.spot || GT.mode!=='play' || document.getElementById('dlg').classList.contains('show')) return false;
  const c=st.spot; st.spot=null;
  st.found[c.key]=true; GT.flags.wolfClues=clueCount(); autoTalk(c.lines); return true;
}
window.addEventListener('keydown',e=>{ if((e.key==='Enter'||e.key==='z'||e.key==='Z') && inspect()){ e.preventDefault(); e.stopImmediatePropagation(); } }, true);
GT.canvas.addEventListener('pointerdown',e=>{ if(inspect()){ e.preventDefault(); e.stopImmediatePropagation(); } }, true);

/* ==========================================================================
   描画
   ========================================================================== */
function ell(x,y,rx,ry,c,rot){ ctx.beginPath(); ctx.ellipse(x,y,rx,ry,rot||0,0,Math.PI*2); ctx.fillStyle=c; ctx.fill(); }

/* 狼の登場と退場・赤ずきんの移動（会話中・演出中も動くよう、描画のついでに位置を進める） */
function moveActors(){
  const w=npc('wolf'), h=npc('hood'); if(!w||!h) return;
  const now=performance.now(), dt=Math.min(0.05,(now-st.last)/1000); st.last=now;
  // 赤ずきん：狼が出てきたら狼のそばへ駆け寄る。それ以外は少年のうしろをついてくる（会話中は止まる）
  const toWolf = st.phase==='wolf' || (st.phase==='appear' && now-st.appearT0>1400);
  if(toWolf || (GT.mode==='play' && !st.busy)){
    const pcx=GT.player.x+GT.player.w/2;
    const target = toWolf ? HOOD_BY_WOLF : pcx+(pcx>h.x+16?-42:42)-16;
    GT.npcStep(h,target,toWolf?150:220,dt);                 // 切り株などは、すり抜けずに跳び乗る
  }
  if(st.phase==='appear'){
    const k=(now-st.appearT0)/1000;
    w.x = WOLF_HIDE-(WOLF_HIDE-WOLF_STAND)*Math.min(1,Math.max(0,(k-0.9)/0.9));
    if(k>2.0){ st.phase='wolf'; GT.mode='play'; autoTalk(APPEAR); }
  }
  if(st.leaveT0){ w.x = WOLF_STAND+Math.max(0,(now-st.leaveT0)/1000-0.3)*120; if(w.x>W+80) w.x=W+80; }   // 去っていく（120px/秒。約2秒で見えなくなる）
}

/* 昼の森の奥（地形より奥） */
function drawBack(){
  const t=performance.now()/1000;
  ctx.save();
  ctx.fillStyle='rgba(30,34,22,0.08)'; ctx.fillRect(0,0,W,H);                // 昼でも、木の多い森の中は少し暗い
  const tg=ctx.createLinearGradient(0,0,0,H*0.5);                             // 上は葉が重なって、日ざしがさえぎられる
  tg.addColorStop(0,'rgba(24,32,18,0.30)'); tg.addColorStop(1,'rgba(24,32,18,0)');
  ctx.fillStyle=tg; ctx.fillRect(0,0,W,H*0.5);
  const vg=ctx.createRadialGradient(W/2,H*0.6,H*0.25,W/2,H*0.6,H);
  vg.addColorStop(0,'rgba(20,16,12,0)'); vg.addColorStop(1,'rgba(20,16,12,0.26)');
  ctx.fillStyle=vg; ctx.fillRect(0,0,W,H);
  // 爪あとの木
  const tr=TRUNK;
  ctx.save(); ctx.filter='brightness(0.85) saturate(0.9)';                          // 森の奥なので、少し暗く
  GTDecor.paint.trunk(ctx, tr.x, tr.top, FLOOR, tr.w, 17, { branches:[{y:tr.top+30,dir:-1,len:60},{y:tr.top+20,dir:1,len:62}] });
  GTDecor.paint.canopy(ctx,[ {x:tr.x+tr.w/2,y:tr.top-4,rx:66,ry:46}, {x:tr.x-30,y:tr.top+30,rx:46,ry:34}, {x:tr.x+tr.w+30,y:tr.top+24,rx:48,ry:34} ], 19);
  ctx.restore();
  ctx.strokeStyle='#e8dcc0'; ctx.lineWidth=2.4; ctx.lineCap='round';
  for(let i=0;i<3;i++){ const x=tr.x+10+i*9; ctx.beginPath(); ctx.moveTo(x,300); ctx.quadraticCurveTo(x+4,322,x+2,348); ctx.stroke(); }
  // 足あと（大きな獣の）
  for(let i=0;i<4;i++){ const x=PRINTS.x+12+i*24, y=FLOOR-3+(i%2)*1;
    ell(x,y,6,2.4,'rgba(40,32,24,0.55)');
    for(let k=-1;k<=1;k++) ell(x+5+k*4,y-3,1.6,1.2,'rgba(40,32,24,0.55)'); }
  // 右ページ奥：狼が消えていく脇道（暗いすきま）
  const pg=ctx.createLinearGradient(0,300,0,FLOOR);
  pg.addColorStop(0,'rgba(20,16,12,0)'); pg.addColorStop(1,'rgba(20,16,12,0.22)');
  ctx.fillStyle=pg; ctx.beginPath(); ctx.moveTo(820,FLOOR); ctx.lineTo(850,300); ctx.lineTo(884,300); ctx.lineTo(884,FLOOR); ctx.closePath(); ctx.fill();
  // 影（日ざしが左から当たる：影は右へのびる）
  drawShadows(t);
  ctx.restore();
}
function drawShadows(t){
  const pl=GT.player, h=npc('hood'), w=npc('wolf');
  const plain=(x,len)=>ell(x+len/2,FLOOR-1,len/2,3,'rgba(20,16,12,0.28)');
  if(GT.gravity[GT.currentPage()]===1 && Math.abs(pl.y+pl.h-FLOOR)<4) plain(pl.x+pl.w/2,60);
  if(h && h.x>-100) plain(h.x+16,70);
  if(w && w.x<W && w.x<WOLF_HIDE-20) ell(w.x+16+30,FLOOR-1,40,3.4,'rgba(20,16,12,0.32)');   // 狼の影（ふつうの形）
}

/* 狼が隠れている茂み（狼より手前）と、地面をはう霧 */
function drawFront(){
  const t=performance.now()/1000, pl=GT.player;
  moveActors();
  // 茂み（少年が近づくと揺れる。奥で目が光る）
  const near = st.phase==='walk' && pl.x>280;
  const shake = (st.phase==='appear' ? 4 : near ? 1.6 : 0)*Math.sin(t*28);
  ctx.save(); ctx.translate(shake,0); ctx.filter='brightness(0.7) saturate(0.85)';   // 狼が隠れる、こんもりした茂み（陰になっている）
  GTDecor.paint.bush(ctx, BUSH.x-4, FLOOR-70, BUSH.w+16, 70, 23);
  ctx.restore();
  if(st.phase==='walk' && Math.sin(t*1.3)>0.6){                                      // 茂みのすき間で、目が光る
    ell(BUSH.x+60+shake,FLOOR-34,2.6,1.8,'#c9503f'); ell(BUSH.x+74+shake,FLOOR-34,2.6,1.8,'#c9503f'); }
  // 霧
  ctx.save();
  for(let i=0;i<5;i++){ const x=((t*(10+i*3)+i*240)%(W+300))-150;
    ell(x,FLOOR-10-(i%3)*10,140,12,'rgba(220,214,200,0.10)'); }
  ctx.restore();
}

/* 狼についた血（違和感の3つめ）。狼の絵の上に、口もと・胸・前足の血と、足もとに落ちた血のしずくを重ねる。
   狼は止まっているとき、少年のほうを向く（engine の drawNpc と同じ向きにそろえる） */
function drawBlood(){
  const w=npc('wolf'); if(!w || w.x>=WOLF_HIDE-20 || w.x>W) return;
  const cx=w.x+w.w/2, foot=w.y+w.h, Hh=GT.WOLF_H;
  const moving = w._walkT!=null && performance.now()-w._walkT<120;
  const f = moving ? (w._walkDir||1) : (GT.player.x<w.x?-1:1);
  ctx.save();
  const smear=(x,y,rx,ry,rot,a)=>{ ctx.beginPath(); ctx.ellipse(x,y,rx,ry,rot,0,Math.PI*2); ctx.fillStyle=`rgba(122,20,14,${a})`; ctx.fill(); };
  smear(cx+f*Hh*0.17, foot-Hh*0.55, 3.6, 2.2, f*0.5, 0.85);              // 口もと
  smear(cx+f*Hh*0.19, foot-Hh*0.49, 1.4, 3.0, 0, 0.8);                  //   したたり
  smear(cx+f*Hh*0.05, foot-Hh*0.40, 4.6, 3.2, f*0.3, 0.7);               // 胸
  smear(cx+f*Hh*0.10, foot-Hh*0.07, 2.8, 2.0, 0, 0.8);                   // 前足
  if(!st.leaveT0) for(const [dx,r] of [[58,3.2],[76,2.2],[92,2.8],[110,1.9],[124,2.4]]) smear(WOLF_STAND+dx, FLOOR-2, r*1.7, r*0.7, 0, 0.85);   // 足もとに落ちた血（狼のうしろ）
  ctx.restore();
}

/* 違和感のありか（？）。見つけた数のゲージは出さない */
function drawHud(){
  const t=performance.now()/1000;
  ctx.save();
  // まだ見ていない違和感のありかに、うっすら「？」
  const mark=(x,y)=>{ ctx.globalAlpha=0.7+0.3*Math.sin(t*3+x); ctx.fillStyle='#a8463a';
    ctx.font="700 38px 'Zen Old Mincho',serif"; ctx.textAlign='center';
    ctx.lineWidth=4; ctx.strokeStyle='rgba(255,248,230,0.85)'; ctx.strokeText('？',x,y); ctx.fillText('？',x,y); ctx.globalAlpha=1; };
  // 調べられる場所に立っているときは、「タップ / Enter で しらべる」を出す
  if(st.spot && !st.busy && GT.mode==='play'){
    const pl=GT.player, p=0.5+0.5*Math.sin(t*5), g=GT.gravity[GT.currentPage()];
    ctx.globalAlpha=0.65+0.35*p; ctx.fillStyle='#b08d57'; ctx.font="700 13px 'Zen Old Mincho',serif"; ctx.textAlign='center';
    ctx.lineWidth=3; ctx.strokeStyle='rgba(255,248,230,0.8)';
    const y = g>0 ? pl.y-GT.PLAYER_H+pl.h-12 : pl.y+GT.PLAYER_H+12;
    const msg=GT.ctl('タップ / Enter で しらべる','タップで しらべる'); ctx.strokeText(msg,pl.x+pl.w/2,y); ctx.fillText(msg,pl.x+pl.w/2,y); ctx.globalAlpha=1;
  }
  if(!st.found.prints) mark(PRINTS.x+PRINTS.w/2,FLOOR-24);
  if(!st.found.claws)  mark(TRUNK.x+TRUNK.w/2,290);
  if(!st.found.blood && st.phase==='wolf' && !st.leaveT0) mark(WOLF_STAND+140,FLOOR-30);
  ctx.restore();
}

GT.registerDraw(()=>{ if(!isWolf()) return; drawBack(); }, 'back');
GT.registerDraw(()=>{ if(!isWolf()) return; drawFront(); drawBlood(); drawHud(); }, 'world');   // 血は茂みより手前（足もとのしずくが茂みに隠れないように）
})();
