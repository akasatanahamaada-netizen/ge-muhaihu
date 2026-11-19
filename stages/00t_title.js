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
/* 狼の影：今までと同じ右上へ。足もとはふつうの大きさで、上半身から上へいくほど だんだん大きく（頭の影がいちばん大きい）。
   横に細く切った帯を、上へいくほど大きくして積み上げる。一度作ったら取っておく */
let wolfShadowCv=null;
function buildWolfShadow(){
  const img=SIL.wolf, iw=img.naturalWidth, ih=img.naturalHeight, H0=300*1.15, W0=H0*iw/ih, N=60;
  const scaleAt=f=> f<0.4 ? 1 : 1+0.85*Math.pow((f-0.4)/0.6,1.4);   // f … 足もと0 〜 頭1
  let total=0; for(let i=0;i<N;i++) total+=H0/N*scaleAt((i+0.5)/N);
  const maxW=W0*scaleAt(1)+20, cv=document.createElement('canvas'); cv.width=Math.ceil(maxW); cv.height=Math.ceil(total)+4;
  const c=cv.getContext('2d'), cx=cv.width/2; let y=cv.height;
  for(let i=0;i<N;i++){
    const s=scaleAt((i+0.5)/N), sh=H0/N*s, sw=W0*s, sy=ih*(1-(i+1)/N);
    c.drawImage(img, 0, sy, iw, ih/N, cx-sw/2, y-sh-0.5, sw, sh+1); y-=sh;
  }
  c.globalCompositeOperation='source-in'; c.fillStyle='#000'; c.fillRect(0,0,cv.width,cv.height);   // つなぎ目に線が出ないよう、ひとつの影の色にそろえる
  return cv;
}
GT.extraShadow=(ctx)=>{
  if(!isTitle() || GT.titleChapter!==0 || !SIL.wolf.complete || !SIL.wolf.naturalWidth) return;
  const cv=wolfShadowCv||(wolfShadowCv=buildWolfShadow()), foot=GT.H-GT.EDGE+4;
  ctx.save(); ctx.globalAlpha=0.78; ctx.drawImage(cv, 610+55-cv.width/2, foot-10-cv.height); ctx.restore();   // 右上へずらす（今までの角度）
};
/* 章を選びなおしたとき：タイトルの場面ごと、ぺらっとページがめくれる（js/menu.js から呼ぶ） */
GT.titleFlip=(ch,dir)=>{ if(!isTitle()) return; GT.titleChapter=ch; GT.startPageFlip(dir<0?-1:1, GT.scene); };   // 前の章へは、ページも前へもどる
})();
