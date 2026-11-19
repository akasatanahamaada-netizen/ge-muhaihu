/* ============================================================================
   タイトル画面のうしろに映す場面  id = 'title'（playlist には入れない）
   ----------------------------------------------------------------------------
   ゲームと同じ描き方（明るい絵本の森・物の影）で、メニューのうしろに見せる。
   赤ずきんが森の道に立ち、少年がそれを見ている。右の木の陰から、狼がのぞいている。
   メニューを開いているあいだは止まっている（js/menu.js がメニューの背景をすかす）。
   「New Game」を押すと、この場面からページがめくれて、本編がはじまる。
   ========================================================================== */
(function(){
GT.defineStage('title_view', {
  platforms:[], boxes:[], enemies:[], items:[],
  decor:[
    {layer:'back',  kind:'tree',  x:-30, y:40,  w:150, h:430},
    {layer:'back',  kind:'tree',  x:120, y:130, w:100, h:340},
    {layer:'back',  kind:'tree',  x:330, y:170, w:80,  h:300},
    {layer:'back',  kind:'tree',  x:560, y:150, w:90,  h:320},
    {layer:'back',  kind:'tree',  x:700, y:60,  w:140, h:410},
    {layer:'back',  kind:'tree',  x:830, y:120, w:100, h:350},
    {layer:'back',  kind:'bush',  x:640, y:420, w:110, h:50},
    {layer:'back',  kind:'rock',  x:250, y:430, w:46,  h:36},
    {layer:'front', kind:'fern',  x:-16, y:390, w:110, h:80},
    {layer:'front', kind:'grass', x:420, y:434, w:70,  h:32},
    {layer:'front', kind:'fern',  x:820, y:396, w:100, h:76},
  ],
});
GT.registerScene({
  id:'title', type:'story', stage:'title_view', label:'Gravity Tales',
  npcs:[],
});
/* 章ごとの見せかた：第一章は、赤ずきん（左・右向き）と狼（右・左向き）のシルエットが向かい合う。まだ書かれていない章は、なにもいない森 */
GT.titleChapter=0;
const SIL={ hood:new Image(), wolf:new Image() };
SIL.hood.src='assets/character/赤いシルエットの赤ずきん少女.webp'; SIL.wolf.src='assets/character/黒い狼獣のシルエット.webp';
const isTitle=()=>GT.scene && (GT.scene.id==='title'||GT.scene.id==='chapter_select');   // 章をえらぶ画面（02d_chapter_select.js）も同じ場面
GT.registerDraw(()=>{ if(isTitle()){ const p=GT.player; p.x=-600; p.y=GT.H-GT.EDGE-p.h; p.vx=0; p.vy=0; } },'back');   // 少年は見せない（ステージを読みこんだあとも、毎回 画面の外へ）
function sil(img,cx,h,mirror){
  if(!img.complete||!img.naturalWidth) return;
  const w=h*img.naturalWidth/img.naturalHeight, ctx=GT.ctx, foot=GT.H-GT.EDGE+4;
  ctx.save(); ctx.translate(cx,foot); if(mirror) ctx.scale(-1,1);
  ctx.drawImage(img,-w/2,-h,w,h); ctx.restore();
}
GT.registerDraw(()=>{
  if(!isTitle() || GT.titleChapter!==0) return;
  const t=performance.now()/1000;
  sil(SIL.hood, 300, 236+Math.sin(t*1.6)*1.5, true);    // 赤ずきん（左がわ・右向き）。影は、ほかの物と同じ
},'world');
// 狼：本体はそのままの大きさ。影だけ、うしろの森に大きく映す（ふつうの影は落とさないよう、影を作る層のあとに描く）
GT.registerDraw(()=>{ if(!isTitle() || GT.titleChapter!==0) return; sil(SIL.wolf, 610, 300, false); },'speech');
GT.extraShadow=(ctx)=>{
  if(!isTitle() || GT.titleChapter!==0 || !SIL.wolf.complete || !SIL.wolf.naturalWidth) return;
  const img=SIL.wolf, h=300*1.4, w=h*img.naturalWidth/img.naturalHeight, foot=GT.H-GT.EDGE+4;
  ctx.save(); ctx.globalAlpha=0.78; ctx.translate(610, foot); ctx.transform(1,0,0.55,1,0,0);   // 足もとから、赤ずきんのほう（左上）へ ななめに のびる（光は右から）
  ctx.drawImage(img,-w/2,-h,w,h); ctx.restore();
};
/* 章を選びなおしたとき：タイトルの場面ごと、ぺらっとページがめくれる（js/menu.js から呼ぶ） */
GT.titleFlip=(ch,dir)=>{ if(!isTitle()) return; GT.titleChapter=ch; GT.startPageFlip(dir<0?-1:1, GT.scene); };   // 前の章へは、ページも前へもどる
})();
