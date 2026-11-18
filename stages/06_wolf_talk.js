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
    {layer:'front', kind:'grass', x:560, y:436, w:50,  h:28},
    {layer:'front', kind:'grass', x:270, y:436, w:60,  h:28},
  ],
});

// --- セリフ ----------------------------------------------------------------
const APPEAR=[
  {s:'',c:'narr',t:'鳥の声も、風の音も、ふっと消えた。'},
  {s:'',c:'narr',t:'茂みの奥で、赤い目が光る。――狼が、のそりと現れた。'},
  {s:'',c:'narr',t:'口のはしから、白い牙がのぞいている。'},
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
    {s:'',c:'narr',t:'どこかから、だれかに見られている気がした。'},
  ],
  npcs:[
    { who:'hood', name:'赤ずきん', page:'right', x:560 },   // その場にいる（会話相手は狼）。位置は update で動かす
    { who:'wolf', name:'狼', page:'right', x:WOLF_STAND, noLift:true, lines:[
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
          {s:'少年',c:'boy',f:'disgust',t:'……あの狼、なんだか変だよ。'},
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
  st.phase='walk'; st.busy=false; st.rustled=false; st.leapt=false; FX.reset(); st.found={}; st.appearT0=0; st.leaveT0=0; GT.flags.wolfClues=0; });
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
  if(w) w.noLift = st.phase==='walk' || (st.phase==='appear' && (performance.now()-st.appearT0)/1000<LEAP);   // 茂みの中にいるあいだは、茂みに隠れたまま
  if(st.busy) return;

  // 狼が現れる
  if(st.phase==='walk' && pl.x>280 && !st.rustled){ st.rustled=true; GT.sfx&&GT.sfx('bush'); }   // 少年が近づくと、茂みがガサガサ
  if(st.phase==='walk' && pcx>SPINE+30){ GT.sfx&&GT.sfx('bush'); st.phase='appear'; st.appearT0=performance.now(); GT.mode='idle'; pl.vx=0; GT.musicHush&&GT.musicHush(APPEAR_T+1.5); return; }   // 曲も止まる

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
  const toWolf = st.phase==='wolf' || (st.phase==='appear' && now-st.appearT0>3000);
  if(toWolf || (GT.mode==='play' && !st.busy)){
    const pcx=GT.player.x+GT.player.w/2;
    const target = toWolf ? HOOD_BY_WOLF : pcx+(pcx>h.x+16?-42:42)-16;
    GT.npcStep(h,target,toWolf?150:220,dt);                 // 切り株などは、すり抜けずに跳び乗る
  }
  if(st.phase==='appear'){
    const k=(now-st.appearT0)/1000;
    const u=Math.min(1,Math.max(0,(k-LEAP)/0.35));                       // 一気に飛び出す
    w.x = WOLF_HIDE-(WOLF_HIDE-WOLF_STAND)*(1-(1-u)*(1-u));
    if(k>LEAP && !st.leapt){ st.leapt=true; GT.shake&&GT.shake(9,0.45); GT.sfx&&GT.sfx('bush'); FX.flash=1; }
    if(k>APPEAR_T){ st.phase='wolf'; GT.mode='play'; autoTalk(APPEAR); }
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
  FX.bigShadow();                                                             // 木に映る、大きな狼の影
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
  const ak=st.phase==='appear'?(performance.now()-st.appearT0)/1000:0;
  const shake = (st.phase==='appear' ? (ak<LEAP?2+ak*3:1) : near ? 1.6 : 0)*Math.sin(t*28);
  ctx.save(); ctx.translate(shake,0); ctx.filter='brightness(0.7) saturate(0.85)';   // 狼が隠れる、こんもりした茂み（陰になっている）
  GTDecor.paint.bush(ctx, BUSH.x-4, FLOOR-70, BUSH.w+16, 70, 23);
  ctx.restore();
  FX.bushShake=shake;
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

/* ==========================================================================
   こわい演出
   ・近づくほど、まわりが暗くなる（少年のまわりだけ見える）。闇の中に、いくつもの赤い目
   ・茂みの前に来ると曲が止まり、心臓の音。茂みの奥で大きな赤い目 → うなり声 → 狼が飛び出す（画面ゆれ・赤い光）
   ・狼のうしろの木に、牙をむいた大きな狼の影が映る。狼が笑う・顔をしかめるセリフで、影が口を開く
   ========================================================================== */
const LEAP=2.0, APPEAR_T=3.8;   // 飛び出す時間・話しはじめる時間（秒）
let goCv=null;
function gothTrees(){
  if(goCv) return goCv;
  goCv=document.createElement('canvas'); goCv.width=W; goCv.height=H; const c=goCv.getContext('2d');
  const P=GT.goth&&GT.goth.paint, tr=TRUNK;
  if(P){ P.farTrees(c);
    for(const [x,h,sd,l] of [[318,330,51,-8],[486,370,53,12],[620,300,57,-10],[880,350,59,6]]) P.tree(c,x,FLOOR+6,h,sd,l); }
  c.save(); c.filter='brightness(0.45) saturate(0.4)';                 // 爪あとの木（枝に乗れる。葉はない）
  GTDecor.paint.trunk(c, tr.x, tr.top, FLOOR, tr.w, 17, { branches:[{y:tr.top+30,dir:-1,len:60},{y:tr.top+20,dir:1,len:62}] });
  c.restore();
  if(P){ c.strokeStyle='#22141b'; c.lineCap='round'; const R=P.R(77);
    P.branch(c,R,tr.x+tr.w*0.3,tr.top+6,80,-Math.PI/2-0.6,9,4); P.branch(c,R,tr.x+tr.w*0.7,tr.top+6,84,-Math.PI/2+0.6,9,4);
    P.vine(c,R,tr.x+tr.w/2,FLOOR,tr.top+60,tr.w*0.4,0); }
  return goCv;
}
const FX=(()=>{
  const fx={ dk:0, flash:0, scareT:0, nextBeat:0, growled:false, bushShake:0 };
  fx.reset=()=>{ fx.dk=0; fx.flash=0; fx.scareT=0; fx.nextBeat=0; fx.growled=false; };
  // ── 音（その場で作る：心臓の音・うなり声）──
  let ac=null; const A=()=>{ try{ ac=ac||new (window.AudioContext||window.webkitAudioContext)(); if(ac.state==='suspended') ac.resume(); }catch(e){ ac=null; } return ac; };
  const vol=()=>(GT.volume?GT.volume.se:1);
  fx.beat=(g=1)=>{ const a=A(); if(!a||vol()<=0) return; const t0=a.currentTime;
    for(const [d,k] of [[0,1],[0.2,0.65]]){ const o=a.createOscillator(), gn=a.createGain(), t=t0+d;
      o.type='sine'; o.frequency.setValueAtTime(75,t); o.frequency.exponentialRampToValueAtTime(36,t+0.16);
      gn.gain.setValueAtTime(0.0001,t); gn.gain.exponentialRampToValueAtTime(0.9*g*k*vol(),t+0.012); gn.gain.exponentialRampToValueAtTime(0.0001,t+0.24);
      o.connect(gn).connect(a.destination); o.start(t); o.stop(t+0.3); } };
  fx.growl=(dur=1.8)=>{ const a=A(); if(!a||vol()<=0) return; const t=a.currentTime;
    const n=a.createBufferSource(), b=a.createBuffer(1,a.sampleRate*dur,a.sampleRate), d=b.getChannelData(0);
    for(let i=0;i<d.length;i++) d[i]=Math.random()*2-1; n.buffer=b;
    const lp=a.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=260; lp.Q.value=6;
    const o=a.createOscillator(); o.type='sawtooth'; o.frequency.setValueAtTime(58,t); o.frequency.linearRampToValueAtTime(46,t+dur);
    const og=a.createGain(); og.gain.value=0.35;
    const trem=a.createGain(), lfo=a.createOscillator(), lg=a.createGain(); lfo.frequency.value=19; lg.gain.value=0.5; trem.gain.value=0.5;
    lfo.connect(lg).connect(trem.gain);
    const env=a.createGain(); env.gain.setValueAtTime(0.0001,t); env.gain.exponentialRampToValueAtTime(0.8*vol(),t+0.35); env.gain.setValueAtTime(0.8*vol(),t+dur-0.5); env.gain.exponentialRampToValueAtTime(0.0001,t+dur);
    n.connect(lp); o.connect(og).connect(lp); lp.connect(trem).connect(env).connect(a.destination);
    n.start(t); o.start(t); lfo.start(t); n.stop(t+dur); o.stop(t+dur); lfo.stop(t+dur); };
  // セリフで影が口を開く・心臓が鳴る
  GT.registerLineHook(line=>{ if(!isWolf()) return;
    if(/笑み|眉|不快|不愉快|表情を崩/.test(line.t||'')){ fx.scareT=performance.now(); fx.beat(1); setTimeout(()=>fx.beat(0.8),700); if(/笑み/.test(line.t)) fx.growl(1.2); } });

  // どのくらいこわいか（0〜1）
  function dread(){ const pl=GT.player;
    if(st.phase==='walk') return Math.max(0,Math.min(1,(pl.x-200)/(SPINE+30-200)))*0.4;   // 近づくと、少し暗く
    if(st.phase==='appear') return 0.85;                                              // 狼が出てくる瞬間だけ、ぐっと暗く
    if(st.phase==='wolf') return st.leaveT0?0.25:0.4;
    return 0.2; }
  function appearK(){ return st.phase==='appear' ? (performance.now()-st.appearT0)/1000 : -1; }

  // 時間で鳴る音（描画のついでに見る）
  fx.tick=()=>{ const now=performance.now(), k=appearK();
    fx.dk += (dread()-fx.dk)*0.04;
    if(k>=0){ if(now>fx.nextBeat){ fx.beat(0.7+Math.min(0.3,k*0.15)); fx.nextBeat=now+Math.max(420,820-k*140); }   // だんだん速くなる
      if(k>0.8 && !fx.growled){ fx.growled=true; fx.growl(2.2); } }
    else if(st.phase==='walk' && fx.dk>0.45 && now>fx.nextBeat){ fx.beat(0.45); fx.nextBeat=now+1100; }
    fx.flash=Math.max(0,fx.flash-0.035); };

  // 牙をむいた狼の頭の影（左向き）。jaw 0〜1 で口が開く
  function wolfHead(c,cx,base,s,jaw,f){
    c.save(); c.translate(cx,base); c.scale(s*f,s);
    const j=jaw*26;
    c.beginPath();
    c.moveTo(70,0); c.quadraticCurveTo(84,-80,66,-150);                 // 首のうしろ
    c.lineTo(70,-212); c.lineTo(44,-176);                               // 耳（うしろ）
    c.lineTo(30,-226); c.lineTo(14,-182);                               // 耳（前）
    c.quadraticCurveTo(-20,-184,-60,-164); c.lineTo(-104,-150);         // 額 → 鼻すじ
    c.lineTo(-108,-140); c.lineTo(-30,-130);                            // 上あご
    c.lineTo(-94,-124+j); c.lineTo(-88,-114+j);                         // 下あご
    c.quadraticCurveTo(-40,-96+j*0.4,-20,-80); c.quadraticCurveTo(-34,-40,-40,0); c.closePath();
    c.fill();
    c.restore(); }
  function teeth(c,cx,base,s,jaw,f){ if(jaw<0.15) return; c.save(); c.translate(cx,base); c.scale(s*f,s); const j=jaw*26;
    c.fillStyle='rgba(225,215,215,0.55)';
    for(let i=0;i<5;i++){ const x=-98+i*13; c.beginPath(); c.moveTo(x,-139+i*1.6); c.lineTo(x+4,-139+i*1.6+7+(i===0?5:0)); c.lineTo(x+8,-139+i*1.6); c.fill(); }
    for(let i=0;i<4;i++){ const x=-86+i*13; const y=-122+j-i*1.5; c.beginPath(); c.moveTo(x,y); c.lineTo(x+4,y-6-(i===0?4:0)); c.lineTo(x+8,y); c.fill(); }
    c.restore(); }
  fx.bigShadow=()=>{ const w=npc('wolf'); if(!w) return; const now=performance.now(), k=appearK();
    let a=0; if(k>=LEAP) a=Math.min(1,(k-LEAP)/0.3)*(0.85-Math.min(0.45,(k-LEAP)*0.25)); else if(st.phase==='wolf') a=0.38; else if(st.phase==='done') a=0;
    const sk=fx.scareT?Math.max(0,1-(now-fx.scareT)/1800):0; a=Math.max(a,0.75*sk);
    if(st.leaveT0) a*=Math.max(0,1-(now-st.leaveT0)/1500);
    if(a<=0.01 || w.x>W) return;
    const breathe=1+0.02*Math.sin(now/600), jaw=Math.max(k>=LEAP?Math.max(0,1-(k-LEAP)/1.2):0.12, sk);
    const f = GT.player.x<w.x?1:-1;
    const hx=w.x+w.w/2+f*70, sc=1.55*breathe;
    ctx.save(); ctx.globalAlpha=a; ctx.globalCompositeOperation='lighter';      // 影のうしろの、うす明かり（影が見えるように）
    const bg=ctx.createRadialGradient(hx-f*sc*20,FLOOR-sc*150,10,hx-f*sc*20,FLOOR-sc*150,sc*190);
    bg.addColorStop(0,'rgba(120,100,110,0.45)'); bg.addColorStop(1,'rgba(120,100,110,0)');
    ctx.fillStyle=bg; ctx.fillRect(hx-sc*260,FLOOR-sc*360,sc*520,sc*380); ctx.restore();
    ctx.save(); ctx.globalAlpha=a; ctx.fillStyle='#050203';
    ctx.shadowColor='rgba(150,10,20,0.9)'; ctx.shadowBlur=14;                   // ふちが赤くにじむ
    ctx.filter='blur(1.5px)'; wolfHead(ctx,hx,FLOOR+4,sc,jaw,f); ctx.filter='none'; ctx.shadowBlur=0;
    teeth(ctx,w.x+w.w/2+f*70,FLOOR+4,1.55*breathe,jaw,f);
    ctx.restore();
    fx.shadowEye={x:w.x+w.w/2+f*70-f*1.55*breathe*34, y:FLOOR+4-1.55*breathe*166, a}; };

  // 暗さ（少年のまわりだけ見える）：グレーディングの前に描く
  fx.dark=()=>{ const pl=GT.player, cx=pl.x+pl.w/2, cy=pl.y+pl.h/2, d=fx.dk; if(d<0.02) return;
    const rad=320-150*d;
    const g=ctx.createRadialGradient(cx,cy,rad*0.35,cx,cy,rad*2.2);
    g.addColorStop(0,'rgba(4,2,3,0)'); g.addColorStop(0.45,`rgba(4,2,3,${0.45*d})`); g.addColorStop(1,`rgba(4,2,3,${0.88*d})`);
    ctx.fillStyle=g; ctx.fillRect(0,0,W,H); };

  // 赤い目・赤い光（色を抜かれないよう、グレーディングのあとに描く）
  const EYES=[[520,220,0],[600,300,1.7],[860,250,3.1],[420,330,4.4],[690,190,5.2],[790,340,2.4],[350,240,6.1]];
  const eye=(x,y,r,a,gap)=>{ ctx.save(); ctx.globalCompositeOperation='lighter';
    for(const dx of [-gap/2,gap/2]){ const g=ctx.createRadialGradient(x+dx,y,0,x+dx,y,r*5); g.addColorStop(0,`rgba(255,40,30,${a*0.5})`); g.addColorStop(1,'rgba(255,40,30,0)');
      ctx.fillStyle=g; ctx.fillRect(x+dx-r*5,y-r*5,r*10,r*10); }
    ctx.restore();
    for(const dx of [-gap/2,gap/2]){ ctx.beginPath(); ctx.ellipse(x+dx,y,r,r*0.55,dx<0?0.25:-0.25,0,Math.PI*2); ctx.fillStyle=`rgba(255,70,50,${a})`; ctx.fill();
      ctx.beginPath(); ctx.ellipse(x+dx,y,r*0.25,r*0.5,0,0,Math.PI*2); ctx.fillStyle=`rgba(40,0,0,${a})`; ctx.fill(); } };
  fx.glow=()=>{ const now=performance.now(), t=now/1000, k=appearK();
    // 闇の中の目（近づくほど増える。狼が出ると消える）
    if(st.phase==='walk' || (k>=0 && k<LEAP)){ const fade=k>=0?Math.max(0,1-k/0.8):1;
      EYES.forEach(([x,y,ph],i)=>{ if(i/EYES.length>fx.dk*1.3) return; const bl=Math.sin(t*0.9+ph); if(bl<0.1) return;   // ときどき、まばたきして消える
        eye(x+Math.sin(t*0.3+ph)*3,y,2.2,Math.min(1,bl*1.6)*0.8*fade,11); }); }
    // 茂みの奥の目：近づくと見え、登場のときは大きく光る
    const near=st.phase==='walk' && GT.player.x>280;
    if((near && Math.sin(t*1.3)>0.3) || (k>=0 && k<LEAP+0.1)){
      const big=k>=0?Math.min(1,k/1.2):0; eye(BUSH.x+67+fx.bushShake,FLOOR-36,2.6+big*2.2,0.9,14+big*6); }
    // 影の目
    if(fx.shadowEye && fx.shadowEye.a>0.05){ const e=fx.shadowEye; eye(e.x,e.y,2.6,Math.min(1,e.a*1.3),0.01); }
    // 赤い光（飛び出した瞬間）と、心臓に合わせて赤くなる四すみ（ページのふちには かからないよう、ふちをぼかした別の層に描く）
    const sk=fx.scareT?Math.max(0,1-(now-fx.scareT)/1500):0;
    const pulse=(k>=0?0.55:st.phase==='wolf'&&!st.leaveT0?0.22:0)+sk*0.5;
    if(fx.flash<=0 && pulse<=0) return;
    const L=redLayer(), c=L.getContext('2d');
    c.globalCompositeOperation='source-over'; c.clearRect(0,0,W,H);
    if(fx.flash>0){ c.fillStyle=`rgba(150,0,10,${0.45*fx.flash})`; c.fillRect(0,0,W,H); }
    if(pulse>0){ const hb=Math.pow(Math.max(0,Math.sin(now/1000*Math.PI*1.6)),6);
      const g=c.createRadialGradient(W/2,H/2,H*0.35,W/2,H/2,H*0.95); g.addColorStop(0,'rgba(90,0,8,0)'); g.addColorStop(1,`rgba(90,0,8,${Math.min(0.9,pulse*(0.45+0.55*hb))})`);
      c.fillStyle=g; c.fillRect(0,0,W,H); }
    c.globalCompositeOperation='destination-in'; c.drawImage(edgeMask(),0,0);
    ctx.drawImage(L,0,0); };
  let redCv=null, maskCv=null;
  const redLayer=()=>{ if(!redCv){ redCv=document.createElement('canvas'); redCv.width=W; redCv.height=H; } return redCv; };
  const edgeMask=()=>{ if(maskCv) return maskCv; maskCv=document.createElement('canvas'); maskCv.width=W; maskCv.height=H; const c=maskCv.getContext('2d'), F=56;
    c.fillStyle='#fff'; c.fillRect(0,0,W,H); c.globalCompositeOperation='destination-out';
    for(const [x0,y0,x1,y1,rx,ry,rw,rh] of [[0,0,F,0,0,0,F,H],[W,0,W-F,0,W-F,0,F,H],[0,0,0,F,0,0,W,F],[0,H,0,H-F,0,H-F,W,F]]){
      const g=c.createLinearGradient(x0,y0,x1,y1); g.addColorStop(0,'rgba(0,0,0,1)'); g.addColorStop(1,'rgba(0,0,0,0)'); c.fillStyle=g; c.fillRect(rx,ry,rw,rh); }
    return maskCv; };
  return fx;
})();

GT.registerDraw(()=>{ if(!isWolf()) return; drawBack(); }, 'back');
GT.registerDraw(()=>{ if(!isWolf()) return; FX.tick(); FX.dark(); }, 'overlay');
GT.registerDraw(()=>{ if(!isWolf()) return; drawBlood(); }, 'lift');   // 描きなおした狼の上にも、血を重ねる
GT.registerDraw(()=>{ if(!isWolf()) return; FX.glow(); drawHud(); }, 'speech');   // 「？」は暗さに隠れないよう、いちばん手前に
GT.registerDraw(()=>{ if(!isWolf()) return; drawFront(); drawBlood(); }, 'world');   // 血は茂みより手前（足もとのしずくが茂みに隠れないように）
})();
