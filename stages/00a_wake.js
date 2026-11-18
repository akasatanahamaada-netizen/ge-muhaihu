/* ============================================================================
   ステージ：序章 ── 暗い森で目覚める  id = 'wake'
   種類：play（右の端まで歩くと、ページがめくれて、マリのいる次のページへ）
   ----------------------------------------------------------------------------
   ◆ このステージの流れ
     1) 少年が、空から落ちてくる（act:'wake-fall'）。地面にたたきつけられて、画面がゆれる
     2) 暗い森。まわりには、誰もいない
     3) そばに落ちている本を拾う（act:'wake-pick'）
     4) 「→ 右へ進む」の説明だけを出す。右の端まで走ると、ページがめくれる
   見た目は、ゴシックの森（stages/00_opening.js の GT.goth を使う）
   ========================================================================== */
(function(){
const ctx=GT.ctx, W=GT.W, H=GT.H, EDGE=GT.EDGE, FLOOR=H-GT.EDGE;
const START_X=150, BOOK_X=206;

GT.defineStage('wake', {
  platforms:[], boxes:[], enemies:[], items:[],
  decor:[
    {layer:'front', kind:'grassFlat', x:380, y:434, w:62, h:30},
    {layer:'front', kind:'grassFlat', x:760, y:434, w:56, h:30},
  ],
});
GT.setLedgeStyle && GT.setLedgeStyle('wake','flat');

GT.registerScene({
  id:'wake', type:'play', stage:'wake', clear:'exit', label:'序章 ── 暗い森',
  intro:[
    {s:'',c:'narr',t:'――落ちていく。どこまでも、暗いところへ。',act:'wake-pre'},     // まだ少年は見えない
    {s:'',c:'narr',t:'背中に衝撃を受け、少年は目を覚ました。',act:'wake-fall'},       // 落ちてきて、着地してから、この語りが出る
    {s:'',c:'narr',t:'霧の深い、暗い森。あたりには、誰もいない。'},
    {s:'',c:'narr',t:'すぐそばに、一冊の本が落ちている。'},
    {s:'',c:'narr',t:'少年は、本を拾い上げた。ところどころ、虫に食われたように文字が欠けている。',act:'wake-pick'},
  ],
});

const st={ fallT0:0, landed:false, landT:0, picked:false, dust:[] };
const isWake=()=>GT.scene&&GT.scene.id==='wake';
GT.registerSceneReset(()=>{ if(!isWake()) return; st.fallT0=0; st.landed=false; st.landT=0; st.picked=false; st.dust=[]; });

const FALL_DUR=0.95;
GT.registerAct('wake-fall',()=>{
  const pl=GT.player; pl.x=START_X; pl.y=-140; pl.vx=0; pl.vy=0;
  st.fallT0=performance.now(); st.landed=false;
  GT.holdDialogue(()=>st.landed && performance.now()-st.landT>900);   // 落ちて、しばらくしてから語りを出す
});
GT.registerAct('wake-pre',()=>{ const pl=GT.player; pl.x=START_X; pl.y=-300; pl.vx=0; pl.vy=0; });
GT.registerAct('wake-pick',()=>{ st.picked=true; GT.sfx&&GT.sfx('page'); });

/* 落ちる動き（会話中は物理が止まっているので、ここで動かす） */
function updateFall(){
  if(!st.fallT0) return;
  const pl=GT.player;
  if(!st.landed){
    const k=Math.min(1,(performance.now()-st.fallT0)/1000/FALL_DUR);
    const y0=-140, y1=FLOOR-pl.h;
    pl.y=y0+(y1-y0)*k*k;                                  // だんだん速く
    pl.squash=1-0.18*k;                                   // 落ちるにつれて、たてに のびる
    if(k>=1){ st.landed=true; st.landT=performance.now();
      GT.shake&&GT.shake(9,0.35); GT.sfx&&GT.sfx('land');
      for(let i=0;i<14;i++){ const a=Math.PI*(i/13); st.dust.push({x:pl.x+pl.w/2, y:FLOOR-2, vx:Math.cos(a)*(60+Math.random()*80)*(i%2?1:-1), vy:-Math.sin(a)*(30+Math.random()*50), t:0}); } }
  } else if(GT.mode!=='play'){
    const sq=1.65; pl.squash=sq; pl.y=FLOOR-pl.h/2-(pl.h/2)*(2-sq);   // 倒れている（操作できると起き上がる）
  }
}

/* 描画 */
function drawStreaks(){   // 落ちてくるときの、風を切る線
  if(!st.fallT0 || st.landed) return;
  const pl=GT.player, cx=pl.x+pl.w/2, k=(performance.now()-st.fallT0)/1000/FALL_DUR;
  ctx.save(); ctx.strokeStyle='rgba(225,220,230,0.35)'; ctx.lineWidth=1.4;
  for(let i=0;i<6;i++){ const x=cx-18+i*7, y=pl.y-30-((i*37+k*400)%60);
    ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x,y-26-k*30); ctx.stroke(); }
  ctx.restore();
}
function drawDust(){
  if(!st.dust.length) return;
  const dt=1/60;
  ctx.save();
  for(const d of st.dust){ d.t+=dt; d.x+=d.vx*dt; d.y+=d.vy*dt; d.vy+=60*dt; d.vx*=0.96;
    const a=Math.max(0,0.5-d.t*0.6); if(a<=0) continue;
    ctx.globalAlpha=a; ctx.fillStyle='#8e8a88'; ctx.beginPath(); ctx.ellipse(d.x,d.y,5+d.t*10,3+d.t*5,0,0,Math.PI*2); ctx.fill(); }
  ctx.restore();
  st.dust=st.dust.filter(d=>d.t<1);
}
function drawBook(){   // 地面に落ちている本（拾うまで）
  if(st.picked) return;
  const t=performance.now()/1000, x=BOOK_X, y=FLOOR-6;
  ctx.save(); ctx.translate(x,y); ctx.rotate(-0.12);
  ctx.globalCompositeOperation='lighter';
  const g=ctx.createRadialGradient(0,-4,2,0,-4,34); g.addColorStop(0,`rgba(255,220,150,${0.25+0.1*Math.sin(t*2)})`); g.addColorStop(1,'rgba(255,220,150,0)');
  ctx.fillStyle=g; ctx.fillRect(-40,-40,80,70); ctx.globalCompositeOperation='source-over';
  ctx.fillStyle='#3a2418'; ctx.fillRect(-20,-9,40,12);                       // 表紙
  ctx.fillStyle='#e9dcc0'; ctx.fillRect(-18,-7,36,4);                        // ページのふち
  ctx.strokeStyle='#c9a45a'; ctx.lineWidth=1; ctx.strokeRect(-17,-8,34,10);  // 金の線
  ctx.restore();
}
function drawHintMove(){   // 説明は「→ 右へ進む」だけ
  if(!isWake() || GT.mode!=='play' || !st.picked) return;
  const pl=GT.player; if(pl.x>W*0.62) return;
  GT.drawHint(W/2, 190, [[['→','D'],'右へ進む']]);
}

GT.registerDraw(()=>{ if(!isWake()||!GT.goth) return; GT.goth.back(); GT.goth.props(); GT.goth.fog(false); }, 'back');
GT.registerDraw(()=>{ if(!isWake()) return; updateFall(); GT.goth&&GT.goth.shrooms(); drawBook(); drawStreaks(); drawDust(); }, 'world');
GT.registerDraw(()=>{ if(!isWake()||!GT.goth) return; GT.goth.fog(true); GT.goth.top(); GT.goth.wisps(); }, 'overlay');
GT.registerDraw(()=>{ drawHintMove(); }, 'speech');

/* チュートリアル（森の小道①②）も、序章のゴシックの森の空気に：地面の霧・上のすみのいばら・ただよう光の粒 */
const isTutorial=()=>GT.scene&&(GT.scene.id==='komichi1'||GT.scene.id==='komichi2');
GT.registerDraw(()=>{ if(!isTutorial()||!GT.goth) return; GT.goth.back(); GT.goth.fog(false); }, 'back');   // 奥にゴシックの枯れ木
GT.registerDraw(()=>{ if(!isTutorial()||!GT.goth) return; GT.goth.fog(true); GT.goth.top(); GT.goth.wisps(); }, 'overlay');
})();
