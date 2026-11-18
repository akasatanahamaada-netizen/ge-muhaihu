/* ============================================================================
   ステージ：序章 ── 森の小道 ②  id = 'komichi2'
   種類：play　チュートリアル：木箱を押して踏み台に → 木箱を押し出して敵を倒す
   担当：
   ========================================================================== */

GT.defineStage('komichi2', {
  platforms:[
    {page:'left', x:340, y:20, w:45, h:180, kind:'ledge'},
    {page:'left', x:270, y:310, w:120, h:150, kind:'ledge'},
    {page:'right', x:650, y:380, w:120, h:30, kind:'ledge'},    // 敵の上の台（ジャンプで乗れるよう、350→380 に下げた）
    {page:'left', x:270, y:290, w:150, h:40, kind:'ledge'},
    {page:'left', x:220, y:340, w:60, h:120, kind:'ledge'},     // 木箱から乗る段（ジャンプで届くよう、320→340 に下げた）
  ],
  boxes:[
    {x:110, y:420, w:40, h:40},
    {x:690, y:350, w:40, h:30},                                   // 台の上の木箱（台に合わせて 320→350）
  ],
  enemies:[
    {page:'right', x:810, y:430, w:40, h:30, dir:-1},
  ],
  mission:['enemies'],
  decor:[
    {layer:'back', kind:'ledgeBack', x:650, y:390, w:120, h:70},  // 台の下の飾り（台に合わせて下げた）
  ],
});

GT.registerScene({
  id:'komichi2', type:'play', stage:'komichi2', clear:'exit', label:'序章 ── 森の小道 ②',
  intro:{s:'',c:'narr',t:'道をふさぐ大きな岩。その先には、敵が歩いている。木箱をうまく使おう。'},
});

/* ============================================================================
   チュートリアル（ステージの解き方に沿って、操作の説明を順に出す）
     0 木箱を押して、段の手前まで動かす → 1 木箱に乗って、ジャンプで段の上へ
     → 2 すきまを通って右のページへ → 3 ジャンプで台に乗る
     → 4 台の木箱を押し出して、下を歩く敵に落とす
   先にできてしまった説明は飛ばす（もどらない）。失敗したら「↺ やり直す」（R）。
   ========================================================================== */
(function(){
const isHere=()=>GT.scene&&GT.scene.id==='komichi2';
const D=()=>GT.STAGE_DEFS.komichi2;
const STEP_L=D().platforms[4], TOP_L=D().platforms[3], LEDGE=D().platforms[2];
const onTop=(p)=>{ const pl=GT.player, cx=pl.x+pl.w/2;
  return pl.onGround && GT.gravity[p.page]===1 && Math.abs(pl.y+pl.h-p.y)<2 && cx>p.x-4 && cx<p.x+p.w+4; };
const tut={ step:0 };
GT.registerSceneReset(()=>{ if(isHere()) tut.step=0; });
// 狼の手下を倒すと、お話のかけら（光の玉）が、倒した場所から本へ飛んでいく
GT.registerUpdate(()=>{
  if(!isHere() || !GT.enemies.length || GT.enemies.some(e=>e.alive)) return;
  const pc=GT.pagePieces&&GT.pagePieces('komichi'); if(pc && pc.foundIds.includes('komichi:foe')) return;
  const e=GT.enemies[GT.enemies.length-1]; GT.addPagePiece('komichi','komichi:foe',{x:e.x,y:e.y-10,w:e.w,h:e.h});
});
const STEPS=[
  { done:()=>GT.boxes[0].x>=165 || onTop(STEP_L) || onTop(TOP_L),
    at:[170,300], lines:[[['→'],'木箱を押す']] },
  { done:()=>onTop(STEP_L) || onTop(TOP_L) || GT.currentPage()==='right',
    at:[170,250], lines:[[['↑','W'],'木箱から ジャンプ']] },
  { done:()=>GT.currentPage()==='right',
    at:[200,230], lines:[[['→'],'右のページへ']] },
  { done:()=>onTop(LEDGE) || GT.missionDone(),
    at:[640,250], lines:[[['↑','W'],'ジャンプ'],'敵にさわると ダメージ'] },
  { done:()=>GT.missionDone(),
    at:[640,250], lines:()=> (GT.boxes[1].y+GT.boxes[1].h>=GT.H-GT.EDGE-1)
      ? [[['R'],'やり直す']]
      : [[['→'],'木箱を押して 敵の上に落とす']] },
];
GT.registerUpdate(()=>{
  if(!isHere()) return;
  while(tut.step<STEPS.length && STEPS[tut.step].done()) tut.step++;
});
/* ============================================================================
   見た目（森の小道①と同じ絵。地形・箱・敵は上の defineStage のまま。絵を重ねるだけ）
     ・天井から下がる柱        → 垂れさがる太いつる
     ・左の段々（3つの足場）   → 苔むした岩
     ・敵の上の台と、その下    → 苔むした大岩（敵はその手前を歩く）
     ・木箱                    → 木目のある木箱
     ・床の花ときのこ・木漏れ日・ちょうちょ・舞う葉
   足場の形を変えたら、下の番号（platforms の何番目か）も合わせて直すこと。
   ========================================================================== */
const F=GTDecor.forest;   // 森の絵（stages/_decor.js）
const P=i=>D().platforms[i];
const FLOWERS=[[34,1],[60,3],[88,0],[150,2],[176,1],[440,0],[470,2],[500,3],[532,1],[566,0],[600,2],[628,3],[790,1],[812,0],[848,2]];
const MUSHROOMS=[[196,1],[520,1.2],[858,0.9]];
// 台の下の大岩（飾り：当たり判定なし。敵はこの手前を歩く）
const BACK_ROCK=()=>{ const d=D().decor[0]; return {x:d.x+6,y:d.y-12,w:d.w-12,h:d.h+12}; };
GT.registerDraw(()=>{ if(!isHere()) return;
  const ctx=GT.ctx;
  F.ground({flowers:FLOWERS, mushrooms:MUSHROOMS, lights:[[120,0.4],[480,1.9],[820,3.3]]});
  // 奥の大岩は「奥」に描く（敵がその手前を歩けるように）
  ctx.save(); ctx.globalAlpha=0.9; F.rock([BACK_ROCK()],21);
  ctx.fillStyle='rgba(40,34,26,0.22)'; const b=BACK_ROCK(); GT.roundRect(b.x,b.y,b.w,b.h,11); ctx.fill(); ctx.restore();
}, 'back');
GT.registerDraw(()=>{ if(!isHere()) return;
  F.rock([P(2)],5);                                                                // 台
  F.vine(P(0));                                                                    // つる
  F.rock([P(4),P(3),P(1)],13);                                                     // 左の段々
  for(const box of GT.boxes) F.crate(box);                                         // 木箱
}, 'world');
GT.registerDraw(()=>{
  if(!isHere()) return;
  F.air();
  if(GT.mode!=='play' || tut.step>=STEPS.length) return;
  const s=STEPS[tut.step];
  GT.drawHint(s.at[0], s.at[1], typeof s.lines==='function'?s.lines():s.lines);
}, 'overlay');
})();
