/* ============================================================================
   ステージ：第一章 ── おばあさんの家の前  id = 'house_front'
   種類：story　家に入る前の場面（分かれ道で選んだ道で、中身が変わる）
   ----------------------------------------------------------------------------
   ◆ このステージの流れ
     近道（flags.route==='shortcut'）
       少年はひとり。戸が少し開いていて、中から物音がする。垣根のそばにマリがいる。
       マリに話しかけると、右の端（戸）から中へ入れる。
     遠回り（flags.route==='detour'）
       赤ずきんと一緒。赤ずきんに話しかけると戸を叩き、中から低い声。
       「赤ずきんを止める／何もしない」を選ぶ（flags.stoppedAtDoor）。
         止められるのは、狼のことを伝えていた（flags.warnedHood）ときだけ。
       伝えていなかったときは、ここで見たものを話しても聞いてくれず、赤ずきんが先に中へ入っていく。
     どちらの道でも、まわりを見ると「気づいたこと」が見つかる（3つ。見なくても進める）
       ・戸口へ続く獣の足あと　・破れたストール　・窓の中（窓の下の樽に乗る）
       近づいただけでは気づかない。その場所で 画面タップ／Enter をしたときだけ調べる。
       見つけた数は flags.houseClues に入る。
   ここで決めた flags.stoppedAtDoor は、次の「おばあさんの家」（12_grannys_house.js）で使われます。

   ◆ このファイルが持っている独自の仕掛け（js/engine/ は触らない）
     act：'front-setup'（はじめの位置）/ 'front-knock'（戸を叩く）/ 'front-run'（少年が駆けよる）
          'front-hood-enter'（赤ずきんが中へ入る）/ 'front-peek-on'・'front-peek-off'（窓の中の大きな映像を開く／閉じる）
     GT.registerUpdate        … はじめの語り・気づいたことの場所を見つける
     GT.registerDraw          … 空気感（昼の木かげ／夕日）・影・水車小屋・垣根・家（窓明かり・ランプ）・飛び石と草花
                                 足あと・ストール・樽・石垣・物音・霧・気づいたことのありか（？）
   ========================================================================== */
(function(){
const ctx=GT.ctx, W=GT.W, H=GT.H, EDGE=GT.EDGE, FLOOR=H-GT.EDGE, SPINE=GT.SPINE;
const WALL ={page:'left',  x:210, y:424, w:96, h:40, kind:'ledge'};   // 石垣
const BUTT ={page:'right', x:560, y:412, w:44, h:52, kind:'ledge'};   // 窓の下の雨水の樽
const WIN  ={x:568, y:322, w:60, h:50};                               // 家の窓
const DOOR ={x:806, y:362, w:52};                                     // 家の戸（右の端）
const PRINTS={x:470, w:300};                                          // 獣の足あと
const STOLE_X=716;                                                    // 落ちているストール
const HOOD_DOOR=742;

// --- 地形 ------------------------------------------------------------------
GT.defineStage('house_front', {
  platforms:[ WALL, BUTT ],
  boxes:[], enemies:[],
  decor:[
    // 森のはずれ（左ページの奥に、木がまばらに並ぶ）
    {layer:'back',  kind:'tree',  x:-24, y:70,  w:100, h:350},
    {layer:'back',  kind:'tree',  x:250, y:130, w:110, h:290},
    {layer:'back',  kind:'tree',  x:392, y:190, w:72,  h:230},
    {layer:'back',  kind:'bush',  x:20,  y:420, w:90,  h:44},
    {layer:'back',  kind:'bush',  x:110, y:424, w:80,  h:40},
    {layer:'back',  kind:'rock',  x:452, y:440, w:30,  h:24},
    {layer:'front', kind:'grass', x:150, y:434, w:60,  h:30},
    {layer:'front', kind:'grass', x:470, y:434, w:60,  h:30},
    {layer:'front', kind:'fern',  x:-8,  y:398, w:76,  h:70},
  ],
});

// --- セリフ ----------------------------------------------------------------
const OPEN={
  shortcut:[
    {s:'',c:'narr',t:'少年は、ひとりで駆けてきた。息が切れる。'},
    {s:'',c:'narr',t:'家の戸が、少しだけ開いている。中から、ガタン、と物音がした。'},
    {s:'',c:'narr',t:'（まわりに、何かがありそうだ）'},
  ],
  detour:()=>[
    {s:'赤ずきん',c:'hood',f:'smile',t:'着いた！　ここが、おばあちゃんのお家。'},
    // 狼のことを伝えていなかったときだけ（伝えていたら、寄り道はしていない）
    ...(GT.flags.warnedHood ? [] : [
      {s:'赤ずきん',c:'hood',t:'ずいぶん時間がかかっちゃった。お花を摘んでいたら、夢中になっちゃって。'} ]),
  ],
};
const KNOCK=[
  {s:'赤ずきん',c:'hood',t:'じゃあ、戸を叩くね。',act:'front-walk'},   // 戸の前まで歩いてから、つぎの語りへ
  {s:'',c:'narr',t:'赤ずきんが、戸を叩く。',act:'front-knock'},
  {s:'赤ずきん',c:'hood',t:'おばあちゃん、わたしよ。カスタードとバターを持ってきたの。'},
  {s:'おばあちゃん？',c:'wolf',sc:'granny',f:'disguise',t:'（しわがれ声で）糸巻きを引いてごらん。掛け金が外れるよ。',act:'bgm-off'},   // ふりをしているあいだは BGM を止める
  {s:'',c:'narr',t:'……おばあさんの声にしては、少しおかしい。'},
  {s:'',c:'narr',t:'赤ずきんが、戸に手を伸ばす。'},
];
const canStop=()=> !!GT.flags.warnedHood;   // 森で狼のことを伝えていなければ、ここで止めても聞いてくれない
const KNOCK_CHOICES=[
  { label:'赤ずきんを止める', set:()=>{ GT.flags.stoppedAtDoor = canStop(); GT.musicMute && GT.musicMute(false); }, after:()=>{
      if(GT.flags.warnedHood) return [
        {s:'',c:'narr',t:'少年は、赤ずきんのもとへ駆けだした。',act:'front-run'},
        {s:'',c:'narr',t:'少年が手を掴む。'},
        {s:'赤ずきん',c:'hood',f:'worried',t:'……どうしたの？'},
        {s:'',c:'narr',t:'少年が戸を指し、首を振る。'},
        {s:'赤ずきん',c:'hood',t:'……分かった。'},
      ];
      // 狼のことを伝えていなかった：見てきたものを話しても、聞いてくれない
      return [
        {s:'',c:'narr',t:'少年は、赤ずきんのもとへ駆けだした。',act:'front-run'},
        ...(clueCount()>0 ? [{s:'',c:'narr',t:'少年が手を掴む。そして、見てきたものを話した。'+foundText()+'。'}]
                          : [{s:'',c:'narr',t:'少年が手を掴む。'}]),
        ...(st.found.stole?[{s:'赤ずきん',c:'hood',t:'ストール？　おばあちゃん、落としちゃったのかな。'}]:[]),
        {s:'赤ずきん',c:'hood',t:'もう、心配しすぎだよ。おばあちゃん、待ってるもの。'},
        {s:'',c:'narr',t:'赤ずきんは手をほどき、掛け金を引いた。'},
        {s:'',c:'narr',t:'止める間もなく、赤ずきんは先に中へ入っていく。',act:'front-hood-enter'},
      ];
    }},
  { label:'何もしない', set:()=>{ GT.flags.stoppedAtDoor=false; GT.musicMute && GT.musicMute(false); }, after:[
      {s:'',c:'narr',t:'赤ずきんが掛け金を引き、中へ入っていく。少年もあとに続いた。',act:'front-hood-enter'},
    ]},
];
const CLUES=[
  { key:'prints', text:'戸口へ続く足あと', lines:()=>[
    {s:'',c:'narr',t:'大きな獣の足あとが、まっすぐ戸口へ続いている。'},
    ...(GT.flags.route==='shortcut'?[{s:'',c:'narr',t:'まだ新しい。土が、湿っている。'}]:[{s:'',c:'narr',t:'足あとの上を、もう落ち葉がおおいはじめている。'}]) ]},
  { key:'stole', text:'破れたストール', lines:()=>[
    {s:'',c:'narr',t:'戸口の前に、ストールが落ちている。端が、何かに引き裂かれたように破れていた。'} ]},
  { key:'window', text:'窓の中', lines:()=> GT.flags.route==='shortcut' ? [
    {s:'',c:'narr',t:'樽の上で背伸びして、窓の中をのぞく。',act:'front-peek-on'},
    {s:'',c:'narr',t:'窓の向こうで、真っ黒な大きな影が、ベッドの上のおばあさんに爪をふりあげている。'},
    {s:'',c:'narr',t:'……急がないと！',act:'front-peek-off'} ] : [
    {s:'',c:'narr',t:'カーテンのすきまから、中をのぞく。からっぽのベッドのそばに、大きな黒い影が立っている。',act:'front-peek-on'},
    {s:'',c:'narr',t:'影は、おばあさんのナイトキャップをかぶっていた。とがった耳が、帽子を突き破っている。'},
    {s:'',c:'narr',t:'……おばあさんにしては、大きすぎる。'},
    {s:'',c:'narr',t:'少年は、そっと窓から離れた。',act:'front-peek-off'} ]},
];
const clueCount=()=>CLUES.filter(c=>st.found[c.key]).length;
const foundText=()=>CLUES.filter(c=>st.found[c.key]).map(c=>c.text).join('、');

// --- シーン ----------------------------------------------------------------
GT.registerScene({
  id:'house_front', type:'story', stage:'house_front', label:'第一章 ── おばあさんの家の前',
  intro:[
    {s:'',c:'narr',t:'森を抜けると、村のいちばん端に、小さな石の家が見えてきた。',act:'front-setup'},
    {s:'',c:'narr',get t(){ return GT.flags.route==='shortcut' ? '日は、まだ高い。' : '遠回りをしているうちに、日が傾きはじめていた。'; }},
  ],
  npcs:[
    // 遠回りのときだけ：赤ずきん（話しかけると戸を叩く）
    { who:'hood', name:'赤ずきん', page:'left', x:-300, lines:KNOCK, choices:KNOCK_CHOICES,
      onEnd:()=>{ st.talked=true; GT.storyPiece&&GT.storyPiece('front','front:story','hood'); GT.fillPage('front', GT.flags.stoppedAtDoor
        ? '――少年は、戸の前で赤ずきんを止めた。'
        : '――赤ずきんは掛け金を引き、おばあさんの家へ入っていった。'); } },
    // （近道のときも、マリは出てこない。着くと右の端（戸）が開く）
  ],
});

/* ==========================================================================
   進行
   ========================================================================== */
const st={ talked:false, busy:false, opened:false, found:{}, hoodEnterT0:0, hoodInside:false, knockT0:0, walkDoor:false, runTo:null, last:performance.now() };
const isFront=()=>GT.scene&&GT.scene.id==='house_front';
const npc=who=>GT.getNpcs().find(n=>n.who===who);
const shortcut=()=>GT.flags.route==='shortcut';
GT.registerSceneReset(()=>{ if(!isFront()) return;
  st.talked=false; st.busy=false; st.opened=false; st.found={}; st.spot=null; st.hoodEnterT0=0; st.hoodInside=false; st.knockT0=0; st.walkDoor=false; st.runTo=null; GT.flags.houseClues=0; });
GT.registerAct('front-setup',()=>{
  const h=npc('hood'), m=npc('mari');
  if(shortcut()){ st.talked=true;                                            // 近道：着いたら、そのまま戸から中へ入れる
    GT.storyPiece&&GT.storyPiece('front','front:story');
    GT.fillPage('front','――少年は、ひとりでおばあさんの家にたどり着いた。戸の向こうから、物音がした。');
    GT.openStoryExit&&GT.openStoryExit(); }
  else { if(h) h.x=EDGE; GT.flags.stoppedAtDoor=false; }
});
GT.registerAct('front-walk',()=>{ st.walkDoor=true; const t0=performance.now(); GT.holdDialogue(()=>{ const h=npc('hood'); return !h || Math.abs(h.x-HOOD_DOOR)<10 || performance.now()-t0>5000; }); });   // （念のため、5秒たったら先へ）   // 赤ずきんが戸の前に着くまで、会話の枠を消して見せる
GT.registerAct('front-knock',()=>{ st.knockT0=performance.now(); });
GT.registerAct('front-hood-enter',()=>{ st.hoodEnterT0=performance.now(); GT.holdDialogue(()=>st.hoodInside); });   // 赤ずきんが戸の中へ入るまで、会話の枠を消して見せる
// 赤ずきんを止める：少年が、戸の前の赤ずきんのそばまで自動で駆けよる
GT.registerAct('front-run',()=>{ const pcx=GT.player.x+GT.player.w/2;
  st.runTo = pcx<HOOD_DOOR ? HOOD_DOOR-30 : HOOD_DOOR+44; GT.holdDialogue(()=>st.runTo==null); });   // 少年が駆けよるまで、会話の枠を消して見せる

function autoTalk(lines){
  st.busy=true; GT.mode='idle'; GT.player.vx=0;
  GT.beginDialogue(lines,null,()=>{ GT.hideDialogue(); GT.mode='play'; st.busy=false; peek.on=false; });   // 会話を飛ばしても、窓の映像は閉じる
}
GT.registerUpdate(()=>{
  if(!isFront() || st.busy) return;
  const pl=GT.player, pcx=pl.x+pl.w/2;
  if(!st.opened){ st.opened=true; autoTalk(shortcut()?OPEN.shortcut:OPEN.detour()); return; }
  // 遠回り：違和感を全部調べるまで、赤ずきんには話しかけられない
  if(!shortcut()){ const h=npc('hood'); if(h && !st.talked) h.talkable = clueCount()>=CLUES.length; }
  // 気づいたこと
  const onFloor = pl.onGround && Math.abs(pl.y+pl.h-FLOOR)<2;
  const spots={
    prints:  onFloor && pcx>PRINTS.x+30 && pcx<PRINTS.x+110,
    stole:   onFloor && Math.abs(pcx-STOLE_X)<22,
    window:  pl.onGround && Math.abs(pl.y+pl.h-BUTT.y)<2 && pcx>BUTT.x-6 && pcx<BUTT.x+BUTT.w+6,
  };
  // 近づいただけでは気づかない。その場所で Enter／画面タップをしたときだけ調べる（下の inspect）
  st.spot=null;
  for(const c of CLUES){ if(!st.found[c.key] && spots[c.key]){ st.spot=c; break; } }
});
function inspect(){
  if(!isFront() || GT.paused || st.busy || !st.spot || st.runTo!=null || GT.mode!=='play' || document.getElementById('dlg').classList.contains('show')) return false;
  const c=st.spot; st.spot=null;
  st.found[c.key]=true; GT.flags.houseClues=clueCount(); autoTalk(c.lines()); return true;
}
window.addEventListener('keydown',e=>{ if((e.key==='Enter'||e.key==='z'||e.key==='Z') && inspect()){ e.preventDefault(); e.stopImmediatePropagation(); } }, true);
GT.canvas.addEventListener('pointerdown',e=>{ if(inspect()){ e.preventDefault(); e.stopImmediatePropagation(); } }, true);

/* 赤ずきんの動き（話す前はついてくる／戸を叩くときは戸の前／止めたあとはついてくる／入るときは戸の中へ） */
function moveHood(){
  const h=npc('hood'); if(!h || shortcut()) return;
  const now=performance.now(), dt=Math.min(0.05,(now-st.last)/1000); st.last=now;
  // 少年が駆けよる（会話中も動く。とちゅうの雨水の樽は、ぴょんと跳びこえる）
  if(st.runTo!=null){ const pl=GT.player, dx=st.runTo-pl.x;
    if(Math.abs(dx)<3){ pl.x=st.runTo; pl.facing=st.runTo<HOOD_DOOR?1:-1; st.runTo=null; pl.vx=0; pl.y=FLOOR-pl.h; }
    else { pl.x+=Math.sign(dx)*Math.min(260*dt,Math.abs(dx)); pl.facing=Math.sign(dx); pl.vx=Math.sign(dx)*1;
      const a=BUTT.x-26, b=BUTT.x+BUTT.w+26, cx=pl.x+pl.w/2;
      const hop = (cx>a && cx<b) ? Math.sin((cx-a)/(b-a)*Math.PI)*(BUTT.h+16) : Math.abs(Math.sin(now/1000*14))*3;
      pl.y=FLOOR-pl.h-hop; } }
  // 家に入る：戸口まで歩いたら、そのまま隠す（一度入ったら、もう出てこない）
  if(st.hoodInside){ h.x=-300; return; }
  if(st.hoodEnterT0){ if(h.x<DOOR.x+10) h.x+=Math.min(140*dt,DOOR.x+10-h.x); else { h.x=-300; st.hoodInside=true; GT.sfx&&GT.sfx('door'); } return; }
  if(h.x<-100) return;
  const pcx=GT.player.x+GT.player.w/2;
  const toDoor=(st.walkDoor||st.knockT0) && !st.talked;
  const target = toDoor ? HOOD_DOOR : pcx+(pcx>h.x+16?-42:42)-16;
  if(GT.mode!=='play' && !toDoor) return;
  GT.npcStep(h,target,200,dt);                              // 石垣や樽は、すり抜けずに跳び乗る
}

/* ==========================================================================
   描画
   ========================================================================== */
function ell(x,y,rx,ry,c){ ctx.beginPath(); ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2); ctx.fillStyle=c; ctx.fill(); }

/* 空気感：昼は森のはずれの木かげ、夕方は西日と暮れていく空（地形より奥） */
function drawAmbient(t){
  const sc=shortcut();
  if(sc){
    const tg=ctx.createLinearGradient(0,0,0,H*0.45);                          // 上は森の葉がかかって、少し暗い
    tg.addColorStop(0,'rgba(24,32,18,0.22)'); tg.addColorStop(1,'rgba(24,32,18,0)');
    ctx.fillStyle=tg; ctx.fillRect(0,0,W,H*0.45);
    ctx.save(); ctx.globalCompositeOperation='lighter';                       // 右上からの日ざし（家を照らす）
    for(let i=0;i<3;i++){ const x=600+i*90, a=0.05+0.02*Math.sin(t*0.7+i);
      const g=ctx.createLinearGradient(x,0,x-160,FLOOR); g.addColorStop(0,`rgba(255,240,200,${a})`); g.addColorStop(1,'rgba(255,240,200,0)');
      ctx.fillStyle=g; ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x+46,0); ctx.lineTo(x-120,FLOOR); ctx.lineTo(x-190,FLOOR); ctx.closePath(); ctx.fill(); }
    ctx.restore();
  } else {
    const sky=ctx.createLinearGradient(0,EDGE,0,FLOOR);                      // 夕焼けの空
    sky.addColorStop(0,'rgba(120,70,110,0.30)'); sky.addColorStop(0.45,'rgba(214,120,90,0.26)'); sky.addColorStop(1,'rgba(240,180,110,0.10)');
    ctx.fillStyle=sky; ctx.fillRect(0,0,W,H);
    ctx.save(); ctx.globalCompositeOperation='lighter';                       // 左の地平に沈んでいく日
    const sg=ctx.createRadialGradient(40,FLOOR-110,6,40,FLOOR-110,260);
    sg.addColorStop(0,'rgba(255,190,110,0.32)'); sg.addColorStop(0.4,'rgba(255,150,90,0.12)'); sg.addColorStop(1,'rgba(255,150,90,0)');
    ctx.fillStyle=sg; ctx.fillRect(0,0,W,H); ctx.restore();
  }
  const vg=ctx.createRadialGradient(W/2,H*0.6,H*0.25,W/2,H*0.6,H);           // 四すみを少し暗く
  vg.addColorStop(0,'rgba(20,16,12,0)'); vg.addColorStop(1, sc?'rgba(20,16,12,0.20)':'rgba(40,18,24,0.32)');
  ctx.fillStyle=vg; ctx.fillRect(0,0,W,H);
}
/* 影（近道の昼は短くくっきり。遠回りの夕方は、西日で右へ長くのびる） */
function drawShadows(){
  const sc=shortcut(), pl=GT.player;
  const sh=(x,len)=>{ const l=sc?len:len*2.2; ell(x+(sc?0:l*0.4),FLOOR-1,l/2,sc?3:2.4, sc?'rgba(20,16,12,0.28)':'rgba(40,20,24,0.22)'); };
  if(GT.gravity[GT.currentPage()]===1 && Math.abs(pl.y+pl.h-FLOOR)<4) sh(pl.x+pl.w/2,56);
  for(const n of GT.getNpcs()) if(n.x>-100 && n.x<W) sh(n.x+16,60);
}
/* 遠くの丘と、通りすぎてきた水車小屋 */
function drawWatermill(t){
  const sc=shortcut();
  ctx.fillStyle= sc?'rgba(110,110,80,0.30)':'rgba(110,80,80,0.32)';
  ctx.beginPath(); ctx.moveTo(0,FLOOR); ctx.quadraticCurveTo(160,300,420,360); ctx.lineTo(420,FLOOR); ctx.closePath(); ctx.fill();
  ctx.fillStyle= sc?'rgba(130,130,96,0.22)':'rgba(130,96,96,0.24)';                        // 手前の、もう一つの低い丘
  ctx.beginPath(); ctx.moveTo(0,FLOOR); ctx.quadraticCurveTo(220,380,470,FLOOR-30); ctx.lineTo(470,FLOOR); ctx.closePath(); ctx.fill();
  GTDecor.paint.watermill(ctx, 118, 344, 1, t, {                                          // 通りすぎてきた水車小屋（夕方は窓に灯り）
    body: sc?'rgba(90,72,56,0.6)':'rgba(70,48,52,0.66)', wheel: sc?'rgba(80,64,50,0.62)':'rgba(64,44,48,0.66)',
    water: sc?'rgba(150,180,190,0.42)':'rgba(190,150,140,0.4)', light: sc?null:`rgba(255,200,120,${0.55+0.15*Math.sin(t*5)})` });
}
/* 戸口への飛び石と、草花（足あと・ストールは、この上に描く） */
function drawGround(){
  for(let i=0;i<7;i++){ const x=478+i*50+(i%2)*6;
    ell(x,FLOOR-2,14,4,'rgba(120,110,95,0.65)'); ell(x-3,FLOOR-3.5,8,1.6,'rgba(255,250,235,0.25)'); }
  GTDecor.paint.grass(ctx, 180, FLOOR-16, 120, 16, 17, {flowers:false});                 // 木の根もとの下草と花
  for(let i=0;i<5;i++) GTDecor.paint.flower(ctx, 190+i*22, FLOOR, 0.9+(i%3)*0.12, [1,0,2,3][i%4], i*7+3);
  GTDecor.paint.grass(ctx, 488, FLOOR-14, 40, 14, 23, {flowers:false});                  // 家の壁ぎわ
  GTDecor.paint.grass(ctx, 862, FLOOR-14, 30, 14, 29, {flowers:false});
}

/* 空・遠くの水車小屋・垣根・家・地面（地形より奥） */
function drawBack(){
  const t=performance.now()/1000;
  ctx.save();
  drawAmbient(t);
  // 垣根と門（左ページ）
  GTDecor.paint.bush(ctx, 316, FLOOR-48, 136, 48, 31, {berries:'#b8423f'});        // 垣根（赤い実）
  ctx.fillStyle='#6b4f36'; ctx.fillRect(312,392,8,FLOOR-392);
  ctx.fillStyle='#4e3a26'; ctx.fillRect(310,388,12,5);                              // 門柱の笠
  ctx.fillStyle='rgba(255,235,200,0.18)'; ctx.fillRect(313,393,2,FLOOR-394);
  drawHouse(t);
  drawGround();
  drawShadows();
  // 足あと
  for(let i=0;i<8;i++){ const x=PRINTS.x+12+i*36, y=FLOOR-3+(i%2);
    ell(x,y,6,2.4,'rgba(40,32,24,0.5)'); for(let k=-1;k<=1;k++) ell(x+5+k*4,y-3,1.6,1.2,'rgba(40,32,24,0.5)'); }
  // ストール（くしゃっと落ちた毛織りの布。右の端が裂けて、ふさがほつれている）
  { const x=STOLE_X, y=FLOOR-1;
    ctx.beginPath(); ctx.moveTo(x-18,y); ctx.quadraticCurveTo(x-16,y-10,x-5,y-9); ctx.quadraticCurveTo(x+4,y-12,x+11,y-6);
    ctx.lineTo(x+14,y-4); ctx.lineTo(x+10,y-2.5); ctx.lineTo(x+16,y-1); ctx.lineTo(x+12,y); ctx.closePath();
    ctx.fillStyle='#8e5f7a'; ctx.fill(); ctx.strokeStyle='#5a3a4c'; ctx.lineWidth=1; ctx.stroke();
    ctx.strokeStyle='rgba(240,220,200,0.55)'; ctx.lineWidth=0.9;                     // 織りのしま
    ctx.beginPath(); ctx.moveTo(x-14,y-3); ctx.quadraticCurveTo(x-3,y-9,x+9,y-4); ctx.stroke();
    ctx.strokeStyle='#5a3a4c'; ctx.lineWidth=0.8;                                    // ふさ（左の端）
    for(let k=0;k<5;k++){ ctx.beginPath(); ctx.moveTo(x-18+k*2,y); ctx.lineTo(x-20+k*2,y+0.6); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(x+15,y-1); ctx.quadraticCurveTo(x+20,y-3,x+24,y); ctx.stroke(); }   // 裂けて、ほつれた糸
  ctx.restore();
}
/* おばあさんの家（石積みの壁・わらぶき屋根・煙突・窓・戸）。
   動かない部分は一度だけ描いて取っておき（houseStatic）、窓の中と戸だけ毎フレーム描く。 */
const HX0=526, HX1=W-EDGE, HTOP=296, RIDGE={x:712,y:190}, EAVE=306;   // 壁の左右・壁の上・屋根の頂・軒の高さ
function hseq(seed){ let s=seed*9973%233280+1; return ()=>{ s=(s*9301+49297)%233280; return s/233280; }; }
let houseCanvas=null;
function houseStatic(){
  if(houseCanvas) return houseCanvas;
  houseCanvas=document.createElement('canvas'); houseCanvas.width=W; houseCanvas.height=H;
  const c=houseCanvas.getContext('2d'), R=hseq(41);
  const E=(x,y,rx,ry,col,rot)=>{ c.beginPath(); c.ellipse(x,y,Math.max(0.1,rx),Math.max(0.1,ry),rot||0,0,Math.PI*2); c.fillStyle=col; c.fill(); };
  const rr=(x,y,w,h,r)=>{ c.beginPath(); c.moveTo(x+r,y); c.arcTo(x+w,y,x+w,y+h,r); c.arcTo(x+w,y+h,x,y+h,r); c.arcTo(x,y+h,x,y,r); c.arcTo(x,y,x+w,y,r); c.closePath(); };

  // ── 煙突（屋根のうしろ）：石を積んだ煙突と、上の笠石 ──
  const CX=756, CW=30, CT=200;
  c.fillStyle='#7a6f60'; c.fillRect(CX,CT,CW,110);
  for(let y=CT, row=0; y<CT+110; y+=11, row++) for(let x=CX-(row%2)*8; x<CX+CW; x+=16){
    const x0=Math.max(CX,x), w=Math.min(x+15,CX+CW)-x0; if(w<=3) continue;
    rr(x0+0.5,y+0.5,w-1,10,3); c.fillStyle=['#8c806e','#978a76','#7f7464','#a39682'][Math.floor(R()*4)]; c.fill();
    c.strokeStyle='rgba(50,42,34,0.45)'; c.lineWidth=0.8; c.stroke(); }
  c.fillStyle='#5f564a'; rr(CX-4,CT-7,CW+8,9,2); c.fill();                       // 笠石
  c.fillStyle='rgba(255,250,235,0.25)'; c.fillRect(CX-3,CT-7,CW+6,2);
  c.fillStyle='#3a332b'; c.fillRect(CX+6,CT-10,CW-12,4);                        // 煙の出口

  // ── 石積みの壁：大きさのちがう丸い石を、目地のあいだに積む ──
  c.save(); c.beginPath(); c.rect(HX0,HTOP,HX1-HX0,FLOOR-HTOP); c.clip();
  const wg=c.createLinearGradient(0,HTOP,0,FLOOR); wg.addColorStop(0,'#6e6658'); wg.addColorStop(1,'#80776a');
  c.fillStyle=wg; c.fillRect(HX0,HTOP,HX1-HX0,FLOOR-HTOP);                       // 目地（モルタル）
  const STONE=['#b3a891','#a89d86','#bdb29b','#9f947e','#c4b9a1','#a3a08a','#b8a88c'];
  for(let y=HTOP; y<FLOOR; ){
    const base=y>FLOOR-34, rh = base ? 17+R()*4 : 12+R()*5;                       // 下のほうは大きな石（土台）
    let x=HX0-R()*20;
    while(x<HX1){
      const sw=(base?30:18)+R()*18;
      const sx=x+1.2, sy=y+1.2, w=sw-2.4, h=rh-2.4;
      rr(sx,sy,w,h,Math.min(6,h*0.45));
      const col=STONE[Math.floor(R()*STONE.length)];
      c.fillStyle=col; c.fill();
      const g=c.createLinearGradient(sx,sy,sx,sy+h); g.addColorStop(0,'rgba(90,80,64,0)'); g.addColorStop(1,'rgba(90,80,64,0.35)');
      c.fillStyle=g; c.fill();
      c.strokeStyle='rgba(60,50,40,0.5)'; c.lineWidth=0.9; c.stroke();
      c.beginPath(); c.moveTo(sx+3,sy+2); c.lineTo(sx+w-4,sy+2); c.strokeStyle='rgba(255,250,232,0.35)'; c.lineWidth=1.1; c.stroke();   // 上のふちの光
      if(R()<0.25){ for(let k=0;k<3;k++) E(sx+w*R(),sy+h*R(),0.8,0.8,'rgba(70,60,48,0.35)'); }                                      // 石の点々
      if(R()<0.12){ c.beginPath(); c.moveTo(sx+w*0.3,sy+1); c.lineTo(sx+w*0.45,sy+h*0.6); c.strokeStyle='rgba(60,50,40,0.35)'; c.lineWidth=0.7; c.stroke(); } // ひび
      x+=sw;
    }
    y+=rh;
  }
  // 軒下の影（屋根が壁に落とす影）
  const sh=c.createLinearGradient(0,HTOP,0,HTOP+40); sh.addColorStop(0,'rgba(40,30,20,0.5)'); sh.addColorStop(1,'rgba(40,30,20,0)');
  c.fillStyle=sh; c.fillRect(HX0,HTOP,HX1-HX0,40);
  // 壁の下の苔と、雨のしみ
  for(let i=0;i<40;i++){ const x=HX0+R()*(HX1-HX0); E(x,FLOOR-2-R()*8,4+R()*8,2+R()*3,R()<0.5?'rgba(96,112,52,0.55)':'rgba(124,138,64,0.45)'); }
  for(let i=0;i<6;i++){ const x=HX0+20+R()*(HX1-HX0-40), g=c.createLinearGradient(0,HTOP,0,HTOP+60+R()*40);
    g.addColorStop(0,'rgba(60,54,44,0.22)'); g.addColorStop(1,'rgba(60,54,44,0)'); c.fillStyle=g; c.fillRect(x,HTOP,6+R()*8,110); }
  c.restore();
  // 壁の角の、大きな隅石
  for(let y=HTOP+4, i=0; y<FLOOR-6; y+=22, i++){ const w=i%2?20:28;
    rr(HX0-2,y,w,20,4); c.fillStyle=i%2?'#c2b69c':'#b1a58c'; c.fill(); c.strokeStyle='rgba(60,50,40,0.55)'; c.lineWidth=1; c.stroke();
    c.beginPath(); c.moveTo(HX0+1,y+2); c.lineTo(HX0+w-4,y+2); c.strokeStyle='rgba(255,250,232,0.4)'; c.stroke(); }

  // ── わらぶき屋根：厚みのある屋根を、わらの段を重ねて描く ──
  const L={x:500,y:EAVE}, Rr={x:W+30,y:EAVE};
  const roofPath=()=>{ c.beginPath(); c.moveTo(L.x,L.y); c.quadraticCurveTo(600,236,RIDGE.x-14,RIDGE.y+4); c.quadraticCurveTo(RIDGE.x,RIDGE.y-6,RIDGE.x+14,RIDGE.y+4);
    c.quadraticCurveTo(830,236,Rr.x,Rr.y); c.lineTo(Rr.x,Rr.y+10); c.lineTo(L.x,L.y+10); c.closePath(); };
  roofPath(); const rg=c.createLinearGradient(0,RIDGE.y,0,EAVE+10); rg.addColorStop(0,'#c9a466'); rg.addColorStop(0.6,'#b48c50'); rg.addColorStop(1,'#8f6c3c');
  c.fillStyle=rg; c.fill();
  c.save(); roofPath(); c.clip();
  // わらの段（上から下へ。段ごとに、下のふちがふさふさ）
  for(let k=0;k<7;k++){
    const y=RIDGE.y+18+k*17;
    c.beginPath(); c.moveTo(L.x-10,y+12);
    for(let x=L.x-10;x<=Rr.x+10;x+=7) c.lineTo(x,y+Math.sin(x*0.07+k)*2+R()*3);
    c.lineTo(Rr.x+10,y-30); c.lineTo(L.x-10,y-30); c.closePath();
    c.fillStyle=k%2?'rgba(212,178,112,0.18)':'rgba(150,112,62,0.16)'; c.fill();
    c.strokeStyle='rgba(110,82,44,0.45)'; c.lineWidth=1.1;
    c.beginPath(); for(let x=L.x-10;x<=Rr.x+10;x+=7){ const yy=y+Math.sin(x*0.07+k)*2; if(x===L.x-10) c.moveTo(x,yy); else c.lineTo(x,yy); } c.stroke();
  }
  // わらの細い線（屋根の流れにそって、頂から斜めに）
  for(let i=0;i<420;i++){
    const x=L.x+R()*(Rr.x-L.x), y=RIDGE.y+R()*(EAVE-RIDGE.y+8), dir=x<RIDGE.x?-1:1, len=4+R()*6;
    c.beginPath(); c.moveTo(x,y); c.lineTo(x+dir*len,y+len*0.55);                  // 屋根の傾きにそって、下へ流れる
    c.strokeStyle=R()<0.5?'rgba(232,206,140,0.32)':'rgba(110,80,42,0.26)'; c.lineWidth=0.8; c.stroke(); }
  // 苔の生えたところ
  for(let i=0;i<10;i++) E(L.x+40+R()*(Rr.x-L.x-80), RIDGE.y+40+R()*80, 10+R()*16, 4+R()*5, 'rgba(110,120,58,0.28)', (R()-0.5)*0.6);
  c.restore();
  // 軒先（ふさふさのわらのふち）
  for(let x=L.x; x<=Rr.x; x+=4){ const len=6+R()*7;
    c.beginPath(); c.moveTo(x,EAVE+6); c.lineTo(x+(R()-0.5)*3,EAVE+6+len); c.strokeStyle=R()<0.5?'#a07a44':'#c49c5c'; c.lineWidth=2; c.stroke(); }
  c.fillStyle='rgba(70,50,26,0.35)'; c.fillRect(L.x,EAVE+4,Rr.x-L.x,3);
  // 棟（屋根のてっぺんを押さえる、わらの束）
  c.beginPath(); c.moveTo(RIDGE.x-70,RIDGE.y+40); c.quadraticCurveTo(RIDGE.x,RIDGE.y-14,RIDGE.x+70,RIDGE.y+40);
  c.strokeStyle='#8a6a3a'; c.lineWidth=9; c.lineCap='round'; c.stroke();
  c.strokeStyle='#b8925a'; c.lineWidth=4; c.stroke();
  for(let i=-3;i<=3;i++){ const x=RIDGE.x+i*18, y=RIDGE.y+11+i*i*1.9;                 // しばった縄
    c.beginPath(); c.moveTo(x-3,y-4); c.lineTo(x+3,y+5); c.strokeStyle='#5e4528'; c.lineWidth=2; c.stroke(); }
  // 屋根の小窓（屋根裏）
  const DX=640, DY=240;
  c.beginPath(); c.moveTo(DX-24,DY+28); c.quadraticCurveTo(DX,DY-16,DX+24,DY+28); c.closePath(); c.fillStyle='#a8834a'; c.fill();
  c.strokeStyle='rgba(90,66,34,0.6)'; c.lineWidth=1.2; c.stroke();
  c.beginPath(); c.moveTo(DX-11,DY+25); c.lineTo(DX-11,DY+13); c.arc(DX,DY+13,11,Math.PI,0); c.lineTo(DX+11,DY+25); c.closePath(); c.fillStyle='#4a3a28'; c.fill();
  c.beginPath(); c.moveTo(DX-8,DY+23); c.lineTo(DX-8,DY+13); c.arc(DX,DY+13,8,Math.PI,0); c.lineTo(DX+8,DY+23); c.closePath(); c.fillStyle='#2f2a2a'; c.fill();
  c.fillStyle='#4a3a28'; c.fillRect(DX-1,DY+5,2,18); c.fillRect(DX-8,DY+15,16,2);

  // ── 窓のまわり：石のまぐさ・よろい戸・花の箱 ──
  const w=WIN;
  rr(w.x-12,w.y-17,w.w+24,10,2); c.fillStyle='#c8bca2'; c.fill(); c.strokeStyle='rgba(60,50,40,0.6)'; c.lineWidth=1; c.stroke();   // まぐさ石
  for(let i=1;i<4;i++){ c.beginPath(); c.moveTo(w.x-12+(w.w+24)*i/4,w.y-17); c.lineTo(w.x-12+(w.w+24)*i/4,w.y-7); c.stroke(); }
  for(const side of [-1,1]){                                                     // よろい戸（緑色、開いている）
    const sx= side<0 ? w.x-31 : w.x+w.w+7, sw=24;
    rr(sx,w.y-4,sw,w.h+8,2); c.fillStyle='#5f7a5a'; c.fill(); c.strokeStyle='#3c4e38'; c.lineWidth=1.4; c.stroke();
    for(let y=w.y+2;y<w.y+w.h+2;y+=6){ c.beginPath(); c.moveTo(sx+3,y); c.lineTo(sx+sw-3,y); c.strokeStyle='rgba(40,56,36,0.7)'; c.lineWidth=1; c.stroke();
      c.beginPath(); c.moveTo(sx+3,y+1.5); c.lineTo(sx+sw-3,y+1.5); c.strokeStyle='rgba(200,220,180,0.3)'; c.stroke(); }
    E(side<0?sx+sw-2:sx+2, w.y+6, 1.6,1.6,'#2a2a2a'); E(side<0?sx+sw-2:sx+2, w.y+w.h-6, 1.6,1.6,'#2a2a2a');   // ちょうつがい
  }
  // 花の箱
  const by=w.y+w.h+5;
  rr(w.x-8,by,w.w+16,12,2); c.fillStyle='#7a5434'; c.fill(); c.strokeStyle='#4a3220'; c.lineWidth=1.2; c.stroke();
  c.beginPath(); c.moveTo(w.x-6,by+6); c.lineTo(w.x+w.w+6,by+6); c.strokeStyle='rgba(40,26,14,0.4)'; c.stroke();
  for(let i=0;i<9;i++){ const fx=w.x-4+i*(w.w+8)/8, fy=by-3-R()*6;
    E(fx,by-1,5,3.5,'#5d7034'); E(fx+2,by-3,3,2,'#7f9040');
    const col=['#c9503f','#e2a3b6','#f2d27a','#ffffff'][i%4];
    for(let p=0;p<5;p++){ const a=p/5*Math.PI*2; E(fx+Math.cos(a)*2.4,fy+Math.sin(a)*2.4,1.8,1.8,col); } E(fx,fy,1.3,1.3,'#d9a53a'); }

  // ── 戸のまわり：アーチの石と、わきの石、踏み石 ──
  const d=DOOR, r=d.w/2, top=d.y+r;
  for(const side of [0,1]) for(let y=top; y<FLOOR-4; y+=14){ const x=side? d.x+d.w+3 : d.x-15;
    rr(x,y,12,13,2); c.fillStyle='#b3a78e'; c.fill(); c.strokeStyle='rgba(60,50,40,0.55)'; c.lineWidth=1; c.stroke(); }
  for(let i=0;i<=8;i++){ const a=Math.PI+i/8*Math.PI, x=d.x+r+Math.cos(a)*(r+9), y=top+Math.sin(a)*(r+9);
    c.save(); c.translate(x,y); c.rotate(a+Math.PI/2); rr(-6,-6,12,13,2); c.fillStyle=i===4?'#d0c4a8':'#b8ac92'; c.fill(); c.strokeStyle='rgba(60,50,40,0.6)'; c.lineWidth=1; c.stroke(); c.restore(); }
  rr(d.x-14,FLOOR-5,d.w+28,6,2); c.fillStyle='#9a917f'; c.fill(); c.strokeStyle='rgba(60,50,40,0.6)'; c.stroke();   // 踏み石
  // 戸の横のランプ（腕木につるす）
  const lx=d.x-34, ly=d.y-2;
  c.strokeStyle='#3a2f26'; c.lineWidth=2; c.beginPath(); c.moveTo(lx+16,ly-14); c.lineTo(lx+6,ly-14); c.lineTo(lx+6,ly-8); c.stroke();
  c.fillStyle='#3a2f26'; c.beginPath(); c.moveTo(lx,ly-8); c.lineTo(lx+12,ly-8); c.lineTo(lx+9,ly-3); c.lineTo(lx+3,ly-3); c.closePath(); c.fill();
  c.fillStyle='#f0d9a0'; c.fillRect(lx+3,ly-3,6,10); c.strokeStyle='#3a2f26'; c.lineWidth=1.4; c.strokeRect(lx+3,ly-3,6,10);
  c.fillStyle='#3a2f26'; c.fillRect(lx+2,ly+7,8,2);
  // 戸の前の植木鉢
  for(const [px,s] of [[d.x-30,1],[d.x+d.w+20,0.85]]){
    c.fillStyle='#b0643e'; c.beginPath(); c.moveTo(px-8*s,FLOOR-16*s); c.lineTo(px+8*s,FLOOR-16*s); c.lineTo(px+6*s,FLOOR); c.lineTo(px-6*s,FLOOR); c.closePath(); c.fill();
    c.fillStyle='#c97a4e'; c.fillRect(px-9*s,FLOOR-18*s,18*s,4*s);
    for(let k=0;k<7;k++) E(px+(R()-0.5)*16*s, FLOOR-22*s-R()*10*s, 5*s,3.5*s, R()<0.5?'#5d7034':'#7f9040', R()*3);
    for(let k=0;k<3;k++) E(px+(R()-0.5)*12*s, FLOOR-26*s-R()*8*s, 2*s,2*s, '#c9503f'); }

  // ── 煙突の上の、素焼きの煙突ポット ──
  c.fillStyle='#a8603e'; c.beginPath(); c.moveTo(CX+9,CT-8); c.lineTo(CX+21,CT-8); c.lineTo(CX+19,CT-24); c.lineTo(CX+11,CT-24); c.closePath(); c.fill();
  rr(CX+8,CT-28,14,5,1.5); c.fillStyle='#c27a52'; c.fill(); c.strokeStyle='rgba(60,30,16,0.5)'; c.lineWidth=0.8; c.stroke();
  c.fillStyle='rgba(255,230,200,0.3)'; c.fillRect(CX+11,CT-22,2,13);
  c.fillStyle='#2a221c'; c.fillRect(CX+10,CT-29,10,2);

  // ── 雨どいと、樽へ水を落とす たてどい ──
  const pipe=pts=>{ c.lineJoin='round'; c.lineCap='round';
    const path=dx=>{ c.beginPath(); pts.forEach(([x,y],i)=>i?c.lineTo(x+dx,y):c.moveTo(x+dx,y)); };
    path(0); c.strokeStyle='#4f4a43'; c.lineWidth=7; c.stroke();
    path(0); c.strokeStyle='#7d776d'; c.lineWidth=5; c.stroke();
    path(-1.5); c.strokeStyle='rgba(255,250,235,0.35)'; c.lineWidth=1.2; c.stroke(); };
  pipe([[528,EAVE+15],[550,EAVE+15]]);
  pipe([[545,EAVE+15],[545,394],[568,408]]);
  for(const y of [344,374]){ c.fillStyle='#3a332b'; c.fillRect(540,y,10,3); }
  E(568,409,4,2.4,'#4f4a43');

  // ── 軒下に干した薬草の束 ──
  c.strokeStyle='#5e4528'; c.lineWidth=3; c.lineCap='round'; c.beginPath(); c.moveTo(670,EAVE+17); c.lineTo(758,EAVE+17); c.stroke();
  for(let i=0;i<5;i++){ const hx=680+i*18, len=12+(i%2)*5;
    const col=[['#6f7f4a','#8a9a5a'],['#7d6a9a','#9a86b8'],['#a08a4a','#c4aa5a']][i%3];
    c.strokeStyle='#8a7a5a'; c.lineWidth=0.8; c.beginPath(); c.moveTo(hx,EAVE+17); c.lineTo(hx,EAVE+22); c.stroke();
    for(let k=0;k<7;k++){ c.save(); c.translate(hx,EAVE+22); c.rotate((k-3)*0.13); E(0,len*0.55,1.8,len*0.5,k%2?col[0]:col[1]); c.restore(); }
    c.fillStyle='#c8b48a'; c.fillRect(hx-2.5,EAVE+21,5,2.4); }

  // ── 壁ぎわの腰かけ（おばあさんの肩掛けと、編みかけの毛糸） ──
  { const bx=668, bw=70, sy=FLOOR-22;
    c.fillStyle='#5a4230'; c.fillRect(bx+6,sy+4,5,18); c.fillRect(bx+bw-11,sy+4,5,18);
    rr(bx,sy,bw,6,2); c.fillStyle='#8a6a48'; c.fill(); c.strokeStyle='#4a3424'; c.lineWidth=1; c.stroke();
    c.fillStyle='rgba(255,235,200,0.25)'; c.fillRect(bx+2,sy+1,bw-4,1.2);
    c.beginPath(); c.moveTo(bx+30,sy); c.quadraticCurveTo(bx+44,sy-8,bx+58,sy); c.lineTo(bx+60,sy+14); c.lineTo(bx+54,sy+8); c.lineTo(bx+48,sy+15);
    c.lineTo(bx+42,sy+7); c.lineTo(bx+34,sy+12); c.closePath(); c.fillStyle='#8a7fa0'; c.fill(); c.strokeStyle='rgba(50,40,70,0.5)'; c.stroke();
    for(let k=0;k<5;k++){ c.beginPath(); c.moveTo(bx+36+k*5,sy+9); c.lineTo(bx+36+k*5,sy+15); c.strokeStyle='#6e6488'; c.lineWidth=1; c.stroke(); }
    E(bx+16,sy-4,5,5,'#c9503f'); c.strokeStyle='rgba(120,30,24,0.6)'; c.lineWidth=0.7; c.beginPath(); c.arc(bx+16,sy-4,3,0.3,2.6); c.stroke();
    c.strokeStyle='#8a6a48'; c.lineWidth=1; c.beginPath(); c.moveTo(bx+12,sy-10); c.lineTo(bx+22,sy); c.moveTo(bx+20,sy-10); c.lineTo(bx+11,sy); c.stroke(); }

  // ── 戸のアーチをはう、つるバラ ──
  c.strokeStyle='#4a5a2a'; c.lineWidth=1.6;
  c.beginPath(); c.moveTo(d.x-12,FLOOR-6); c.bezierCurveTo(d.x-22,d.y+60,d.x-18,top-r,d.x+r-6,top-r-13); c.stroke();
  c.beginPath(); c.moveTo(d.x+r-6,top-r-13); c.bezierCurveTo(d.x+d.w+8,top-r-8,d.x+d.w+16,top,d.x+d.w+12,top+22); c.stroke();
  for(let i=0;i<15;i++){ const a=Math.PI*1.02+i/14*Math.PI*0.96, x=d.x+r+Math.cos(a)*(r+15), y=top+Math.sin(a)*(r+15);
    E(x+(i%2?4:-4),y+(i%2?1:-1),4,2.4,'#5d7034',a); if(i%2===0){ E(x,y,3.8,3.8,'#c9503f'); E(x,y,1.7,1.7,'#e88070'); } }
  for(let i=0;i<5;i++){ const y=FLOOR-16-i*17, x=d.x-15+Math.sin(i*1.3)*3;
    E(x+(i%2?4:-4),y,4,2.4,'#5d7034',i%2?0.5:-0.5); if(i%2){ E(x,y-3,3.2,3.2,'#c9503f'); E(x,y-3,1.4,1.4,'#e88070'); } }
  // ── 戸の上の、幸運の蹄鉄 ──
  c.strokeStyle='#5a5048'; c.lineWidth=3; c.lineCap='round'; c.beginPath(); c.arc(d.x+r,330,5.5,-0.25,Math.PI+0.25); c.stroke();
  E(d.x+r-4,333,0.9,0.9,'#2a221c'); E(d.x+r+4,333,0.9,0.9,'#2a221c');
  return houseCanvas;
}
/* ==========================================================================
   窓の中の部屋と、狼の絵
   drawRoomView は 300×250 の枠に描く。家の小さな窓では縮めて、のぞいたときの大きな映像では広げて使う。
     近道（昼）  … 明かりのついた部屋。ベッドの上でおびえるおばあさんに、狼が覆いかぶさろうとしている
     遠回り（夕）… カーテンのすきま。ベッドで寝ているのは、ナイトキャップをかぶった狼
   ========================================================================== */
const WIN_VIEW={w:300, h:250};
/* 狼（横向き）。(x,y)=足もと、s=大きさ、face=1 で右向き。o.open=口の開き 0〜1、o.col=色、o.eye=目を光らせる */
function wolfShape(x,y,s,face,o){
  o=o||{}; const op=o.open||0;
  ctx.save(); ctx.translate(x,y); ctx.scale(s*(face||1),s);
  if(o.rot){ ctx.translate(-55,40); ctx.rotate(o.rot); ctx.translate(55,-40); }                          // 後ろ足を軸に、身を起こす
  ctx.beginPath();
  ctx.moveTo(-70,-8); ctx.quadraticCurveTo(-100,-30,-118,-14); ctx.quadraticCurveTo(-98,-22,-78,-2);      // しっぽ
  ctx.lineTo(-62,0); ctx.lineTo(-60,40); ctx.lineTo(-50,40); ctx.lineTo(-46,6);                           // 後ろ足
  ctx.lineTo(20,6); ctx.lineTo(24,40); ctx.lineTo(34,40); ctx.lineTo(36,0);                                // 前足
  ctx.quadraticCurveTo(48,-14,50,-30);
  ctx.lineTo(76,-26+op*12); ctx.lineTo(72,-22+op*12); ctx.lineTo(56,-35);                                  // 下あご
  ctx.lineTo(84,-38-op*4); ctx.lineTo(80,-45); ctx.lineTo(56,-48);                                         // 上あご・鼻先
  ctx.lineTo(52,-64); ctx.lineTo(44,-50); ctx.lineTo(38,-62); ctx.lineTo(32,-46);                         // 耳
  ctx.quadraticCurveTo(0,-36,-70,-30); ctx.closePath();
  ctx.fillStyle=o.col||'#2f2622'; ctx.fill();
  if(o.alpha==null){
    ctx.strokeStyle='rgba(20,14,8,0.8)'; ctx.lineWidth=2; ctx.stroke();
    ctx.strokeStyle='rgba(120,100,84,0.55)'; ctx.lineWidth=1.4;                                         // 背中の毛並み
    for(let i=0;i<9;i++){ const bx=-62+i*11, by=-31-i*1.4; ctx.beginPath(); ctx.moveTo(bx,by+5); ctx.lineTo(bx+5,by-2); ctx.lineTo(bx+7,by+5); ctx.stroke(); }
    ctx.fillStyle='#e8dcc0';                                                                              // 牙
    for(let i=0;i<4;i++){ const k=i/4, tx=60+k*20, ty=-36.5-k*(1.5+op*4);
      ctx.beginPath(); ctx.moveTo(tx,ty); ctx.lineTo(tx+2.2,ty+4.5); ctx.lineTo(tx+4.4,ty); ctx.closePath(); ctx.fill(); }
    if(op>0.2) for(let i=0;i<3;i++){ const tx=60+i*5, ty=-34+op*4*(i/3+0.6);
      ctx.beginPath(); ctx.moveTo(tx,ty); ctx.lineTo(tx+2,ty-4); ctx.lineTo(tx+4,ty); ctx.closePath(); ctx.fill(); }
    ell(82,-43,2.4,2,'#14100c');                                                                         // 鼻
    if(o.eye!==false){ ell(52,-42,3.4,2.4,'#f2c14e'); ctx.globalAlpha=0.35; ell(52,-42,9,7,'#f2c14e'); ctx.globalAlpha=1; ell(53,-42,1,1.8,'#14100c'); }
  }
  ctx.restore();
}
/* 狼の大きな絵（assets/character/狡猾な人狼の立ち姿.webp）を黒くぬりつぶした影絵。窓の中は、ミニではなくこちらを使う。
   読みこんだときに一度だけ作る（毎フレーム大きな絵を縮めると重いため）。読みこみ前は wolfShape で代わりに描く */
const WOLF_SRC={ src:'assets/character/狡猾な人狼の立ち姿.webp', w:1024, h:1520, eye:{x:266,y:406} };   // 絵の大きさ（下の余白をのぞく）・目の位置（幅 1024 のときの座標。ファイルの大きさがちがっても、幅に合わせて縮める）
let wolfSil=null;
{ const im=new Image();
  im.onload=()=>{ const h=640, w=Math.round(h*WOLF_SRC.w/WOLF_SRC.h);
    const cv=document.createElement('canvas'); cv.width=w; cv.height=h; const c=cv.getContext('2d');
    c.imageSmoothingQuality='high';
    const sc=im.naturalWidth/WOLF_SRC.w;                                                          // 絵のファイルを縮めて作りなおしても、同じ形に切りとる
    c.drawImage(im,0,0,WOLF_SRC.w*sc,WOLF_SRC.h*sc,0,0,w,h);
    c.globalCompositeOperation='source-in'; c.fillStyle='#0e0a08'; c.fillRect(0,0,w,h);           // 形だけを残して黒くぬる
    wolfSil=cv; };
  im.src=encodeURI(WOLF_SRC.src); }
/* 狼の影絵を置く。(x,footY)=足もと、hgt=高さ、face=-1 で左向き（もとの絵の向き）。
   o.alpha=濃さ、o.rot=足もとを軸にかたむける、o.eye=目を光らせる、o.cap=おばあさんのナイトキャップをかぶせる、o.blur=ぼかす */
function wolfSilhouette(x,footY,hgt,face,o){
  o=o||{}; if(!wolfSil) return false;
  const k=hgt/WOLF_SRC.h, wd=WOLF_SRC.w*k, t=performance.now()/1000;
  ctx.save(); ctx.translate(x,footY); if(o.rot) ctx.rotate(o.rot); ctx.scale(face>0?-1:1,1);
  if(o.alpha!=null) ctx.globalAlpha*=o.alpha;
  if(o.blur) ctx.filter=`blur(${o.blur}px)`;
  ctx.drawImage(wolfSil,-wd/2,-hgt,wd,hgt);
  ctx.filter='none';
  const ix=v=>-wd/2+v*k, iy=v=>-hgt+v*k;                                 // もとの絵の座標 → いまの座標
  if(o.cap){                                                              // ナイトキャップ（耳だけ突き出ている）
    ctx.beginPath(); ctx.ellipse(ix(250),iy(232),118*k,84*k,-0.12,0,Math.PI*2); ctx.fillStyle='#e6dccb'; ctx.fill();
    ctx.strokeStyle='rgba(110,92,74,0.5)'; ctx.lineWidth=Math.max(0.6,5*k);
    for(let i=0;i<3;i++){ ctx.beginPath(); ctx.arc(ix(300),iy(220),(30+i*28)*k,Math.PI*0.65,Math.PI*1.45); ctx.stroke(); }   // ギャザー
    for(let i=0;i<12;i++){ const a=Math.PI*0.55+i/11*Math.PI*0.95;                                                         // 顔のまわりのフリル
      ell(ix(250)+Math.cos(a)*120*k, iy(232)+Math.sin(a)*86*k, 16*k, 13*k, '#f6f0e2'); }
    ctx.fillStyle='#0e0a08';                                                                                                 // 帽子を突き破った耳
    ctx.beginPath(); ctx.moveTo(ix(118),iy(40)); ctx.lineTo(ix(150),iy(196)); ctx.lineTo(ix(228),iy(176)); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(ix(318),iy(20)); ctx.lineTo(ix(262),iy(170)); ctx.lineTo(ix(352),iy(170)); ctx.closePath(); ctx.fill();
    ctx.strokeStyle='#e2a3b6'; ctx.lineWidth=Math.max(0.8,7*k); ctx.beginPath(); ctx.moveTo(ix(170),iy(300)); ctx.quadraticCurveTo(ix(200),iy(560),ix(250),iy(600)); ctx.stroke();   // あごひも
  }
  if(o.eye){                                                              // 光る目
    const ex=ix(WOLF_SRC.eye.x), ey=iy(WOLF_SRC.eye.y), p=0.75+0.25*Math.sin(t*3);
    ctx.globalAlpha*=p; ell(ex,ey,30*k*1.6,22*k*1.6,'rgba(242,193,78,0.35)'); ell(ex,ey,30*k,16*k,'#f2c14e'); ell(ex+4*k,ey,7*k,14*k,'#14100c'); }
  ctx.restore(); return true;
}
/* 遠回りの部屋の、閉じたカーテン（gapL〜gapR のすきまだけ開いている） */
function drawCurtains(gapL,gapR,fl){
  const V=WIN_VIEW;
  for(const [x0,x1] of [[0,gapL],[gapR,V.w]]){ if(x1-x0<1) continue;
    const g=ctx.createLinearGradient(x0,0,x1,0);
    for(let k=0;k<=8;k++) g.addColorStop(k/8, k%2?'#9b6a6f':'#74494f');
    ctx.fillStyle=g; ctx.fillRect(x0,0,x1-x0,V.h);
    ctx.fillStyle=`rgba(255,190,110,${0.16*fl})`; ctx.fillRect(x0,0,x1-x0,V.h);                        // 向こうの灯りが、すけて見える
    const edge= x0===0 ? x1 : x0, d= x0===0 ? -1 : 1;                                                  // すきまのふちの影
    const eg=ctx.createLinearGradient(edge,0,edge+d*16,0); eg.addColorStop(0,'rgba(30,16,20,0.5)'); eg.addColorStop(1,'rgba(30,16,20,0)');
    ctx.fillStyle=eg; ctx.fillRect(Math.min(edge,edge+d*16),0,16,V.h); }
  ctx.fillStyle='#5e3a28'; ctx.fillRect(0,0,V.w,10);                                                   // カーテンレール
  for(let x=8;x<V.w;x+=22) ell(x,9,3,3,'#3a2a1c');
}
function drawRoomView(c,t,sc,big){
  const V=WIN_VIEW, FL=212, fl=0.85+0.1*Math.sin(t*7)+0.05*Math.sin(t*13);
  // 壁と床
  const wall=ctx.createRadialGradient(60,120,10,60,120,320);
  if(sc){ wall.addColorStop(0,'#f6dfaa'); wall.addColorStop(1,'#b3845a'); } else { wall.addColorStop(0,'#8a6a5a'); wall.addColorStop(1,'#2e2430'); }
  ctx.fillStyle=wall; ctx.fillRect(0,0,V.w,V.h);
  ctx.strokeStyle= sc?'rgba(120,84,48,0.25)':'rgba(20,10,16,0.3)'; ctx.lineWidth=1;
  for(let x=18;x<V.w;x+=30){ ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,FL); ctx.stroke(); }          // 板壁
  ctx.fillStyle= sc?'#5e432c':'#2e2018'; ctx.fillRect(0,0,V.w,12);                                        // 天井の梁
  ctx.fillStyle= sc?'#8a6440':'#3e2c22'; ctx.fillRect(0,FL,V.w,V.h-FL);                                   // 床
  ctx.strokeStyle='rgba(30,18,10,0.35)'; for(let x=0;x<V.w;x+=40){ ctx.beginPath(); ctx.moveTo(x,FL); ctx.lineTo(x-8,V.h); ctx.stroke(); }
  // 壁の棚（つぼと、本）・額の絵
  ctx.fillStyle= sc?'#6b5b46':'#3a2e26'; ctx.fillRect(196,58,80,5);
  [['#b0704a',204,16],['#57644a',224,12],['#8b5e63',240,14],['#b08d57',258,18]].forEach(([col,x,h])=>{ ctx.fillStyle=col; ctx.fillRect(x,58-h,12,h); });
  ctx.fillStyle= sc?'#7a5434':'#3a2a1e'; ctx.fillRect(116,34,46,36); ctx.fillStyle= sc?'#c9d8c0':'#4a5048'; ctx.fillRect(120,38,38,28);   // 額（森の絵）
  ctx.fillStyle= sc?'#6f8a5a':'#2e3a2e'; ctx.beginPath(); ctx.moveTo(120,66); ctx.lineTo(132,46); ctx.lineTo(142,58); ctx.lineTo(150,48); ctx.lineTo(158,66); ctx.closePath(); ctx.fill();
  // 枕もとの台と、ランプ
  ctx.fillStyle= sc?'#6b4f36':'#2e2018'; ctx.fillRect(4,150,24,62); ctx.fillRect(0,146,32,6);
  const lg=ctx.createRadialGradient(16,128,2,16,128,sc?150:110);
  lg.addColorStop(0,`rgba(255,200,110,${(sc?0.45:0.32)*fl})`); lg.addColorStop(1,'rgba(255,200,110,0)');
  ctx.fillStyle=lg; ctx.fillRect(0,0,V.w,V.h);
  ctx.fillStyle='#3a2f26'; ctx.fillRect(11,138,10,8); ell(16,130,6,9,`rgba(255,214,130,${0.9*fl})`); ctx.fillStyle='#3a2f26'; ctx.fillRect(10,120,12,4);
  // ベッド（頭板・足板・ふとん）
  ctx.fillStyle= sc?'#6b4f36':'#2e2018';
  GT.roundRect(34,120,16,92,6); ctx.fill(); GT.roundRect(238,150,12,62,5); ctx.fill();
  ctx.fillStyle= sc?'#efe4c8':'#8a8070'; ctx.fillRect(42,170,204,22);                                    // しきぶとん
  ctx.fillStyle= sc?'#6b4f36':'#2e2018'; ctx.fillRect(40,190,210,8);
  if(sc){
    // おばあさん（ベッドの上で身をすくめる）
    const shv=Math.sin(t*30)*0.9;
    ell(68,166,20,9,'#f6eed8');                                                                         // 枕
    if(!GT.drawCharSprite('grannyScared',78+shv,184,84,1,1,null,true)){   // 怯えたおばあさん（ミニ）
      ctx.fillStyle='#8a7fa0'; GT.roundRect(64+shv,140,28,44,10); ctx.fill(); ell(78+shv,132,13,13,'#ecd0a8'); ell(78+shv,124,15,8,'#f6eed8'); }
    quilt(70,172,176,26,'#8b5e63');
    // 壁に映る狼の大きな影（ランプの光で）
    const lean=Math.sin(t*1.6);
    if(!wolfSilhouette(150+lean*6,FL+30,300,-1,{alpha:0.22,blur:big?3:0,rot:-0.1})){
      ctx.save(); ctx.globalAlpha=0.24; wolfShape(176+lean*5,160,1.45,-1,{col:'#2a1810',alpha:0.24,rot:-0.42}); ctx.restore(); }
    // 狼（黒い影絵。右から、爪をふりあげて、おばあさんに覆いかぶさる）
    if(!wolfSilhouette(214+lean*5,FL+2,196,-1,{eye:true,rot:-0.1-lean*0.04}))
      wolfShape(196+lean*5,FL-2,1.02,-1,{open:0.6+0.4*Math.sin(t*2.2),rot:-0.38-lean*0.04});
  } else {
    const gL=big?24:174, gR=big?236:240, sway=Math.sin(t*0.9)*3;
    if(wolfSil){
    // ベッドはからっぽ（ふとんがめくれている）。そばに、おばあさんのナイトキャップをかぶった大きな黒い影が立っている
    ell(70,162,22,9,'#b8b0a0');                                                                         // 枕
    quilt(56,168,150,22,'#6e4a52');
    ctx.fillStyle='#5e3e46'; ctx.beginPath(); ctx.moveTo(198,170); ctx.quadraticCurveTo(232,172,242,206); ctx.lineTo(214,208); ctx.closePath(); ctx.fill();   // めくれて、たれたふとん
    wolfSilhouette(196+sway,FL+2,200,-1,{eye:(t%4)<2.6,cap:true,rot:-0.04});
    } else {
    // ナイトキャップの狼（ふとんの山が、ゆっくり上下する）
    const br=1+0.06*Math.sin(t*1.4);
    ell(78,160,24,10,'#b8b0a0');                                                                        // 枕
    quilt(60,180-34*br,190,34*br+14,'#6e4a52',true);
    // 頭（枕の上、左を向いて寝ている）
    ctx.save(); ctx.translate(92,150); ctx.scale(1.35,1.35);
    // おばあさんのナイトキャップ（頭のうしろをすっぽり包む。とがった耳だけ突き出ている）
    ctx.beginPath(); ctx.ellipse(8,-4,19,17,0,0,Math.PI*2); ctx.fillStyle='#ece4d2'; ctx.fill();
    ctx.strokeStyle='rgba(120,100,80,0.45)'; ctx.lineWidth=0.8;
    for(let i=0;i<4;i++){ ctx.beginPath(); ctx.arc(14,-4,6+i*4,Math.PI*0.6,Math.PI*1.5); ctx.stroke(); }          // ギャザーのしわ
    ctx.fillStyle='#3a2f2a';
    ctx.beginPath(); ctx.moveTo(-2,-16); ctx.lineTo(0,-36); ctx.lineTo(8,-17); ctx.closePath(); ctx.fill();         // とがった耳（帽子を突き破っている）
    ctx.beginPath(); ctx.moveTo(10,-18); ctx.lineTo(18,-36); ctx.lineTo(21,-15); ctx.closePath(); ctx.fill();
    ctx.fillStyle='#7a5a50'; ctx.beginPath(); ctx.moveTo(1,-18); ctx.lineTo(1.5,-30); ctx.lineTo(6,-18); ctx.closePath(); ctx.fill();
    // 顔（毛むくじゃら・長い鼻先）
    ell(-4,0,14,12,'#3a2f2a');
    ctx.fillStyle='#3a2f2a'; ctx.beginPath(); ctx.moveTo(-10,-6); ctx.lineTo(-40,0); ctx.lineTo(-40,5); ctx.lineTo(-10,9); ctx.closePath(); ctx.fill();
    ctx.fillStyle='#5a4a40'; ctx.beginPath(); ctx.moveTo(-12,6); ctx.lineTo(-38,5); ctx.lineTo(-12,9); ctx.closePath(); ctx.fill();
    ell(-40,1.5,2.8,2.4,'#14100c');
    ctx.fillStyle='#e8dcc0'; for(let i=0;i<3;i++){ const tx=-34+i*7; ctx.beginPath(); ctx.moveTo(tx,5); ctx.lineTo(tx+2,9); ctx.lineTo(tx+4,5); ctx.closePath(); ctx.fill(); }   // はみ出した牙
    // 帽子のフリル（顔のまわり）
    for(let i=0;i<11;i++){ const a=-Math.PI*0.62+i/10*Math.PI*1.1; ell(8+Math.cos(a+Math.PI)*17,-4+Math.sin(a+Math.PI)*15,3,2.6,'#f8f2e4'); }
    // あごの下のリボン
    ell(2,13,4,2.6,'#e2a3b6'); ell(9,14,4,2.6,'#e2a3b6'); ell(5.5,13.5,1.8,1.8,'#c97a90');
    const awake=(t%5)<1.3;                                                                               // ときどき、片目が開く
    if(awake){ ell(-8,-3,3.4,2.4,'#f2c14e'); ell(-7.5,-3,1,1.8,'#14100c'); ctx.globalAlpha=0.35; ell(-8,-3,9,7,'#f2c14e'); ctx.globalAlpha=1; }
    else { ctx.strokeStyle='#e8dcc0'; ctx.lineWidth=1.1; ctx.beginPath(); ctx.arc(-8,-4,3.2,0.2,Math.PI-0.2); ctx.stroke(); }
    ctx.restore();
    // ふとんから出た、毛むくじゃらの手（おばあさんの寝巻きの袖から）
    ctx.fillStyle='#ece4d2'; GT.roundRect(104,166-30*br+22,24,12,5); ctx.fill();
    ell(132,174-30*br+22,9,6,'#3a2f2a');
    ctx.fillStyle='#e8dcc0'; for(let i=0;i<3;i++){ const cx=138+i*0.5, cy=170-30*br+22+i*4; ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(cx+6,cy+1.5); ctx.lineTo(cx,cy+3); ctx.closePath(); ctx.fill(); }
    }
    drawCurtains(gL, gR, fl);
    // カーテンの布に、向こうの狼の影がうつる（ランプの光で）
    if(wolfSil){ ctx.save(); ctx.beginPath(); ctx.rect(0,10,gL,V.h); ctx.rect(gR,10,V.w-gR,V.h); ctx.clip();
      wolfSilhouette(196+sway,FL+2,200,-1,{alpha:0.5,blur:big?2:0,rot:-0.04}); ctx.restore(); }
  }
  // 窓ガラスの光
  ctx.fillStyle='rgba(255,255,255,0.08)';
  ctx.beginPath(); ctx.moveTo(30,0); ctx.lineTo(90,0); ctx.lineTo(0,110); ctx.lineTo(0,50); ctx.closePath(); ctx.fill();
}
/* パッチワークのふとん。lump=true で、ふくらんだ山の形 */
function quilt(x,y,w,h,base,lump){
  ctx.save();
  ctx.beginPath();
  if(lump){ ctx.moveTo(x,y+h); ctx.quadraticCurveTo(x+6,y+8,x+w*0.35,y); ctx.quadraticCurveTo(x+w*0.75,y-6,x+w,y+h*0.55); ctx.lineTo(x+w,y+h); ctx.closePath(); }
  else { GT.roundRect(x,y,w,h,8); }
  ctx.fillStyle=base; ctx.fill(); ctx.clip();
  const cols=['rgba(255,240,220,0.16)','rgba(40,20,20,0.14)','rgba(232,195,90,0.18)','rgba(87,100,74,0.2)'];
  for(let i=0;i*16<w+16;i++) for(let j=0;j*16<h+40;j++){ ctx.fillStyle=cols[(i*3+j)%4]; ctx.fillRect(x+i*16,y-20+j*16,15,15); }
  ctx.strokeStyle='rgba(255,240,220,0.35)'; ctx.setLineDash([3,3]); ctx.lineWidth=1;
  for(let i=1;i*16<w;i++){ ctx.beginPath(); ctx.moveTo(x+i*16,y-20); ctx.lineTo(x+i*16,y+h); ctx.stroke(); }
  ctx.setLineDash([]); ctx.restore();
}

/* 屋根の上の風見鶏（風で、ゆっくり向きを変える） */
function drawVane(t){
  const x=RIDGE.x, y=RIDGE.y-4;
  ctx.save();
  ctx.strokeStyle='#2e2620'; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x,y-44); ctx.stroke();
  ctx.lineWidth=1.2; ctx.beginPath(); ctx.moveTo(x-9,y-20); ctx.lineTo(x+9,y-20); ctx.stroke();                     // 方角の腕
  ell(x-10,y-20,1.6,1.6,'#2e2620'); ell(x+10,y-20,1.6,1.6,'#2e2620'); ell(x,y-2,3.2,3.2,'#2e2620'); ell(x,y-30,2.2,2.2,'#2e2620');
  const sw=Math.cos(Math.sin(t*0.45)*1.1+0.35);                                                             // 回る向き（横から見た幅）
  ctx.translate(x,y-44); ctx.scale(sw,1); ctx.fillStyle='#2e2620';
  ctx.beginPath(); ctx.moveTo(-10,0); ctx.lineTo(-5,-5); ctx.quadraticCurveTo(-1,-14,4,-13); ctx.lineTo(5,-17); ctx.lineTo(7,-14);   // 鶏の体・とさか
  ctx.lineTo(9,-16); ctx.lineTo(9,-12); ctx.lineTo(13,-10); ctx.lineTo(9,-8); ctx.quadraticCurveTo(10,1,3,2); ctx.lineTo(-8,2); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-6,-3); ctx.quadraticCurveTo(-15,-17,-19,-6); ctx.quadraticCurveTo(-15,-8,-11,0); ctx.closePath(); ctx.fill();   // しっぽ
  ctx.fillRect(-1,2,2,3);
  ctx.beginPath(); ctx.moveTo(-22,6); ctx.lineTo(18,6); ctx.lineTo(14,3); ctx.moveTo(18,6); ctx.lineTo(14,9); ctx.strokeStyle='#2e2620'; ctx.lineWidth=1.4; ctx.stroke();   // 矢
  ctx.restore();
}

/* 窓をのぞいたときの、大きな映像（最前面） */
const peek={ on:false, alpha:0, last:performance.now() };
GT.registerAct('front-peek-on', ()=>{ peek.on=true; });
GT.registerAct('front-peek-off',()=>{ peek.on=false; });
GT.registerSceneReset(()=>{ peek.on=false; peek.alpha=0; });
function drawPeek(){
  const now=performance.now(), dt=Math.min(0.1,(now-peek.last)/1000); peek.last=now;
  if(!isFront()){ peek.on=false; peek.alpha=0; return; }
  peek.alpha += ((peek.on?1:0)-peek.alpha)*Math.min(1,dt*6);
  if(!peek.on && peek.alpha<0.01){ peek.alpha=0; return; }
  const t=now/1000, sc=shortcut(), S=1.2, FX=450-WIN_VIEW.w*S/2, FY=26, FW=WIN_VIEW.w*S, FH=WIN_VIEW.h*S;
  ctx.save(); ctx.globalAlpha=peek.alpha;
  ctx.fillStyle= sc?'rgba(24,20,14,0.96)':'rgba(22,14,20,0.97)'; ctx.fillRect(0,0,W,H);
  // 石の壁（窓のまわり）
  ctx.save(); ctx.beginPath(); ctx.rect(FX-70,FY-20,FW+140,FH+60); ctx.clip();
  const R=hseq(77);
  for(let y=FY-20, row=0; y<FY+FH+40; y+=22, row++) for(let x=FX-70-(row%2)*18; x<FX+FW+70; ){ const sw=34+R()*20;
    GT.roundRect(x+1.5,y+1.5,sw-3,19,7); ctx.fillStyle=['#7d7464','#867c6a','#746b5c','#8e8470'][Math.floor(R()*4)]; ctx.fill(); x+=sw; }
  const vg=ctx.createRadialGradient(450,FY+FH/2,FW*0.45,450,FY+FH/2,FW*0.9); vg.addColorStop(0,'rgba(20,14,10,0)'); vg.addColorStop(1,'rgba(20,14,10,0.9)');
  ctx.fillStyle=vg; ctx.fillRect(0,0,W,H);
  ctx.restore();
  // 部屋の中
  ctx.save(); ctx.beginPath(); ctx.rect(FX,FY,FW,FH); ctx.clip();
  ctx.translate(FX,FY); ctx.scale(S,S); drawRoomView(ctx,t,sc,true);
  ctx.restore();
  // 窓わく・十字の桟・よろい戸・花の箱
  ctx.beginPath(); ctx.rect(FX-14,FY-14,FW+28,FH+28); ctx.rect(FX,FY,FW,FH); ctx.fillStyle='#4a3a28'; ctx.fill('evenodd');
  ctx.fillStyle='#4a3a28'; ctx.fillRect(FX+FW/2-4,FY,8,FH); ctx.fillRect(FX,FY+FH/2-3,FW,6);
  ctx.strokeStyle='rgba(232,220,192,0.16)'; ctx.lineWidth=1; ctx.strokeRect(FX+0.5,FY+0.5,FW-1,FH-1);
  for(const side of [-1,1]){ const sx= side<0 ? FX-62 : FX+FW+16, sw=46;
    GT.roundRect(sx,FY-8,sw,FH+16,3); ctx.fillStyle='#5f7a5a'; ctx.fill(); ctx.strokeStyle='#3c4e38'; ctx.lineWidth=2; ctx.stroke();
    for(let y=FY+2;y<FY+FH+4;y+=10){ ctx.beginPath(); ctx.moveTo(sx+5,y); ctx.lineTo(sx+sw-5,y); ctx.strokeStyle='rgba(40,56,36,0.7)'; ctx.lineWidth=1.4; ctx.stroke(); } }
  GT.roundRect(FX-24,FY+FH+12,FW+48,18,3); ctx.fillStyle='#7a5434'; ctx.fill(); ctx.strokeStyle='#4a3220'; ctx.lineWidth=1.5; ctx.stroke();
  for(let i=0;i<16;i++){ const fx=FX-14+i*(FW+28)/15, fy=FY+FH+6-(i%3)*3;
    ell(fx,FY+FH+12,8,5,'#5d7034'); ell(fx+4,FY+FH+9,5,3,'#7f9040');
    const col=['#c9503f','#e2a3b6','#f2d27a','#ffffff'][i%4];
    for(let p=0;p<5;p++){ const a=p/5*Math.PI*2; ell(fx+Math.cos(a)*3.4,fy+Math.sin(a)*3.4,2.6,2.6,col); } ell(fx,fy,1.8,1.8,'#d9a53a'); }
  ctx.restore();
}
GT.registerDraw(drawPeek,'overlay');

function drawHouse(t){
  // 煙（煙突ポットから、ゆらゆらのぼる）
  for(let i=0;i<6;i++){ const k=((t*0.18)+i/6)%1; ctx.globalAlpha=0.32*(1-k);
    ell(771+k*26+Math.sin(t+i)*4,172-k*120,5+k*14,4+k*11,'#efe6d2'); }
  ctx.globalAlpha=1;
  ctx.drawImage(houseStatic(),0,0);
  drawVane(t);
  // つた（壁の左はしをはう）
  ctx.strokeStyle='#4a4a24'; ctx.lineWidth=2.2;
  ctx.beginPath(); ctx.moveTo(532,FLOOR); ctx.quadraticCurveTo(548,380,538,320); ctx.stroke();
  ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(540,400); ctx.quadraticCurveTo(552,370,560,352); ctx.stroke();
  for(let i=0;i<11;i++){ const y=FLOOR-8-i*13, x=536+((i%2)?9:-3)+Math.sin(i)*2, s=i%2?1:-1;   // つたの葉（ハートの形）
    ctx.save(); ctx.translate(x,y); ctx.rotate(s*0.5+Math.sin(t*1.5+i)*0.06);
    ctx.beginPath(); ctx.moveTo(0,4); ctx.bezierCurveTo(-7,-1,-4,-7,0,-3); ctx.bezierCurveTo(4,-7,7,-1,0,4); ctx.closePath();
    ctx.fillStyle=i%3?'#5d7034':'#7f9040'; ctx.fill(); ctx.strokeStyle='rgba(40,30,14,0.6)'; ctx.lineWidth=0.7; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0,3); ctx.lineTo(0,-3); ctx.strokeStyle='rgba(220,230,160,0.4)'; ctx.stroke(); ctx.restore(); }
  // 窓（中のようすは、分かれ道で選んだ道で変わる）
  const w=WIN, sc=shortcut(), fl=0.85+0.1*Math.sin(t*7)+0.05*Math.sin(t*13);
  ctx.save(); ctx.globalCompositeOperation='lighter';                                    // 外にもれる明かり（夕方はカーテンごしに、かすかに）
  const wgl=ctx.createRadialGradient(w.x+w.w/2,w.y+w.h/2,10,w.x+w.w/2,w.y+w.h/2,90);
  wgl.addColorStop(0,`rgba(255,190,100,${(sc?0.24:0.12)*fl})`); wgl.addColorStop(1,'rgba(255,190,100,0)');
  ctx.fillStyle=wgl; ctx.fillRect(w.x-90,w.y-90,w.w+180,w.h+180);
  if(!sc){ const lx=DOOR.x-28, ly=DOOR.y;                                                // 夕方は、戸の横のランプに灯がともる
    const lg=ctx.createRadialGradient(lx,ly,2,lx,ly,60); lg.addColorStop(0,`rgba(255,200,110,${0.34*fl})`); lg.addColorStop(1,'rgba(255,200,110,0)');
    ctx.fillStyle=lg; ctx.fillRect(lx-60,ly-60,120,120); }
  ctx.restore();
  if(!sc){ ctx.fillStyle=`rgba(255,214,130,${0.85*fl})`; ctx.fillRect(DOOR.x-31,DOOR.y-5,6,10); }
  ctx.fillStyle='#4a3a28'; ctx.fillRect(w.x-5,w.y-5,w.w+10,w.h+10);
  ctx.save(); ctx.beginPath(); ctx.rect(w.x,w.y,w.w,w.h); ctx.clip();
  // 窓の中の部屋（同じ絵を、のぞいたときの大きな映像でも使う）
  ctx.translate(w.x,w.y); ctx.scale(w.w/WIN_VIEW.w, w.h/WIN_VIEW.h);
  drawRoomView(ctx,t,sc,false);
  ctx.restore();
  if(sc){ // レースのカーテン（左右にたばねてある）
    for(const side of [0,1]){ const x0= side? w.x+w.w : w.x, dir= side?-1:1;
      ctx.beginPath(); ctx.moveTo(x0,w.y); ctx.lineTo(x0+dir*14,w.y); ctx.quadraticCurveTo(x0+dir*5,w.y+w.h*0.45,x0+dir*3,w.y+w.h); ctx.lineTo(x0,w.y+w.h); ctx.closePath();
      ctx.fillStyle='rgba(250,244,228,0.55)'; ctx.fill(); }
  }
  ctx.fillStyle='#4a3a28'; ctx.fillRect(w.x+w.w/2-2,w.y,4,w.h); ctx.fillRect(w.x,w.y+w.h/2-1.5,w.w,3);   // 窓の桟（十字）
  ctx.fillStyle='rgba(255,255,255,0.18)';                                                                   // ガラスの光
  ctx.beginPath(); ctx.moveTo(w.x+4,w.y+w.h/2-4); ctx.lineTo(w.x+12,w.y+3); ctx.lineTo(w.x+17,w.y+3); ctx.lineTo(w.x+9,w.y+w.h/2-4); ctx.closePath(); ctx.fill();
  drawDoor(t);
}
function drawDoor(t){
  const d=DOOR, r=d.w/2, top=d.y+r;
  const arch=()=>{ ctx.beginPath(); ctx.moveTo(d.x,FLOOR); ctx.lineTo(d.x,top); ctx.arc(d.x+r,top,r,Math.PI,0); ctx.lineTo(d.x+d.w,FLOOR); ctx.closePath(); };
  ctx.fillStyle='#5a4630'; ctx.fillRect(d.x-5,d.y-4,d.w+10,FLOOR-d.y+4);
  // 開く量：近道ははじめから少し開いている。赤ずきんが入るときは大きく開く
  let open = shortcut() ? 0.25 : 0;
  if(st.hoodEnterT0){ const k=(performance.now()-st.hoodEnterT0)/1000; open=Math.max(open, k<0.4?k/0.4:k<2.2?1:Math.max(0,1-(k-2.2)/0.5)); }
  arch(); ctx.fillStyle = shortcut() ? '#ffcf86' : '#2a221a'; ctx.fill();
  ctx.save(); arch(); ctx.clip();
  const pw=d.w*(1-open*0.8);
  ctx.fillStyle='#5e3a28'; ctx.fillRect(d.x,d.y,pw,FLOOR-d.y);
  ctx.strokeStyle='rgba(30,18,10,0.4)'; ctx.lineWidth=1.5;
  for(let i=1;i<4;i++){ const x=d.x+pw*i/4; ctx.beginPath(); ctx.moveTo(x,d.y); ctx.lineTo(x,FLOOR); ctx.stroke(); }
  ctx.fillStyle='rgba(255,230,190,0.08)'; for(let i=0;i<4;i++) ctx.fillRect(d.x+pw*i/4+2,d.y,2,FLOOR-d.y);   // 板の光
  for(const y of [top+4, FLOOR-24]){ ctx.fillStyle='#2e2620'; ctx.fillRect(d.x,y,pw*0.7,4); ell(d.x+pw*0.7,y+2,2.4,2.4,'#2e2620');   // 鉄のちょうつがい
    for(let k=1;k<4;k++) ell(d.x+pw*0.7*k/4,y+2,0.9,0.9,'#6a5a48'); }
  ctx.strokeStyle='#2e2620'; ctx.lineWidth=1.6; ctx.beginPath(); ctx.arc(d.x+pw-8,d.y+56,5,0,Math.PI*2); ctx.stroke();   // 戸をたたく輪っか
  ell(d.x+pw-8,d.y+56,2.6,2.6,'#d9b877');
  ctx.restore();
}

/* 樽と石垣の見た目・物音・気づいたことの表示（プレイヤーより奥） */
function drawFront(){
  moveHood();
  const t=performance.now()/1000;
  ctx.save();
  // 雨水の樽（たが・板・水面）
  const b=BUTT, bcx=b.x+b.w/2;
  ctx.save(); GT.roundRect(b.x,b.y,b.w,b.h,9); ctx.clip();
  const bg=ctx.createLinearGradient(b.x,0,b.x+b.w,0);
  bg.addColorStop(0,'#5e3f26'); bg.addColorStop(0.35,'#8f6642'); bg.addColorStop(0.7,'#7a5434'); bg.addColorStop(1,'#4a3220');
  ctx.fillStyle=bg; ctx.fillRect(b.x,b.y,b.w,b.h);
  ctx.strokeStyle='rgba(40,26,14,0.45)'; ctx.lineWidth=1;                            // 板のすじ（ふくらみにそって曲がる）
  for(let i=1;i<5;i++){ const x=b.x+b.w*i/5; ctx.beginPath(); ctx.moveTo(x,b.y); ctx.quadraticCurveTo(x+(x-bcx)*0.25,b.y+b.h/2,x,b.y+b.h); ctx.stroke(); }
  for(const y of [b.y+8,b.y+b.h-14]){ ctx.fillStyle='#3a332b'; ctx.fillRect(b.x,y,b.w,5);   // 鉄のたが
    ctx.fillStyle='rgba(220,210,190,0.28)'; ctx.fillRect(b.x,y,b.w,1.2);
    for(let k=0;k<4;k++) ell(b.x+6+k*(b.w-12)/3,y+2.6,0.9,0.9,'#8a8070'); }
  for(let i=0;i<5;i++) ell(b.x+4+i*9,b.y+b.h-2,5,2.6,'rgba(96,112,52,0.6)');             // 根もとの苔
  ctx.restore();
  GT.roundRect(b.x,b.y,b.w,b.h,9); ctx.strokeStyle='#3a2818'; ctx.lineWidth=1.2; ctx.stroke();
  ell(bcx,b.y+3,b.w/2-1,3.6,'#3e2c1c');                                                // 水面
  ell(bcx,b.y+3.4,b.w/2-4,2.4, shortcut()?'rgba(120,150,160,0.95)':'rgba(170,130,120,0.95)');
  ell(bcx-6+Math.sin(t*1.2)*3,b.y+3,5,0.8,'rgba(255,255,255,0.5)');
  // 石垣（丸い石を積んで、上に苔）
  const s=WALL, R=hseq(17);
  ctx.save(); GT.roundRect(s.x,s.y,s.w,s.h,6); ctx.fillStyle='#6e6658'; ctx.fill(); ctx.clip();
  for(let y=s.y, row=0; y<s.y+s.h; y+=14, row++){ let x=s.x-(row%2)*10;
    while(x<s.x+s.w){ const sw=18+R()*12;
      GT.roundRect(x+1,y+1,sw-2,12,5); ctx.fillStyle=['#b3a891','#a89d86','#bdb29b','#9f947e'][Math.floor(R()*4)]; ctx.fill();
      ctx.strokeStyle='rgba(60,50,40,0.5)'; ctx.lineWidth=0.9; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x+4,y+2.5); ctx.lineTo(x+sw-5,y+2.5); ctx.strokeStyle='rgba(255,250,232,0.35)'; ctx.lineWidth=1; ctx.stroke();
      x+=sw; } }
  ctx.restore();
  for(let i=0;i<8;i++){ const R2=hseq(i+3)(); ell(s.x+6+i*12,s.y+1.5,6+R2*4,2.6,i%2?'rgba(96,112,52,0.75)':'rgba(124,138,64,0.7)'); }   // 上の苔
  GTDecor.paint.grass(ctx, s.x-8, FLOOR-14, 24, 14, 41, {flowers:false});                 // 足もとの草
  GTDecor.paint.grass(ctx, s.x+s.w-14, FLOOR-12, 22, 12, 43, {flowers:false});
  // 近道：戸の向こうの物音
  if(shortcut() && (t%3.2)<0.7){
    ctx.globalAlpha=1-(t%3.2)/0.7; ctx.font="700 16px 'Zen Old Mincho',serif"; ctx.textAlign='center'; ctx.fillStyle='#8b3a2f';
    ctx.fillText((Math.floor(t/3.2)%2)?'ガタン！':'ドン……',DOOR.x+DOOR.w/2,DOOR.y-14); ctx.globalAlpha=1; }
  // 赤ずきんが戸を叩く音
  if(st.knockT0){ const k=(performance.now()-st.knockT0)/1000; if(k<1.2){
    ctx.globalAlpha=1-k/1.2; ctx.font="700 15px 'Zen Old Mincho',serif"; ctx.textAlign='center'; ctx.fillStyle='#5a4630';
    ctx.fillText('コン、コン',DOOR.x+DOOR.w/2-10,DOOR.y-14-k*10); ctx.globalAlpha=1; } }
  // 地面をはう霧（夕方は濃く、赤みがかる）
  const fc= shortcut() ? 'rgba(220,214,200,0.08)' : 'rgba(236,200,190,0.13)';
  for(let i=0;i<5;i++){ const x=((t*(10+i*3)+i*240)%(W+300))-150;
    ell(x,FLOOR-10-(i%3)*10,140,12,fc); }
  ctx.restore();
}

/* 気づいたことのありか（？）。見つけた数のゲージは出さない */
function drawHud(){
  if(!st.opened) return;
  const t=performance.now()/1000;
  ctx.save();
  // まだ見ていない気づいたことのありかに、うっすら「？」
  const mark=(x,y)=>{ ctx.globalAlpha=0.7+0.3*Math.sin(t*3+x); ctx.fillStyle='#a8463a';
    ctx.font="700 38px 'Zen Old Mincho',serif"; ctx.textAlign='center';
    ctx.lineWidth=4; ctx.strokeStyle='rgba(255,248,230,0.85)'; ctx.strokeText('？',x,y); ctx.fillText('？',x,y); ctx.globalAlpha=1; };
  // 調べられる場所に立っているときは、「タップ / Enter で しらべる」を出す
  if(st.spot && !st.busy && st.runTo==null && GT.mode==='play'){
    const pl=GT.player, p=0.5+0.5*Math.sin(t*5), g=GT.gravity[GT.currentPage()];
    ctx.globalAlpha=0.65+0.35*p; ctx.fillStyle='#b08d57'; ctx.font="700 13px 'Zen Old Mincho',serif"; ctx.textAlign='center';
    ctx.lineWidth=3; ctx.strokeStyle='rgba(255,248,230,0.8)';
    const y = g>0 ? pl.y-GT.PLAYER_H+pl.h-12 : pl.y+GT.PLAYER_H+12;
    const msg=GT.ctl('タップ / Enter で しらべる','タップで しらべる'); ctx.strokeText(msg,pl.x+pl.w/2,y); ctx.fillText(msg,pl.x+pl.w/2,y); ctx.globalAlpha=1;
  }
  if(!st.found.prints)  mark(PRINTS.x+70,FLOOR-24);
  if(!st.found.stole) mark(STOLE_X,FLOOR-24);
  if(!st.found.window)  mark(WIN.x+WIN.w/2,WIN.y-20);
  ctx.restore();
}

GT.registerDraw(()=>{ if(!isFront()) return; drawWatermill(performance.now()/1000); }, 'backpre');   // 遠くの水車小屋と丘は、影を落とさない（木や茂みより奥）
GT.registerDraw(()=>{ if(!isFront()) return; drawBack(); }, 'back');
GT.registerDraw(()=>{ if(!isFront()) return; drawFront(); drawHud(); }, 'world');
})();
