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
  npcs:[
    { who:'hood', name:'', page:'left',  x:360 },
    { who:'wolf', name:'', page:'right', x:690, noLift:true },
  ],
});
// 少年の位置と向き（赤ずきんを見ている）
GT.registerSceneReset(()=>{ if(GT.scene && GT.scene.id==='title'){ const p=GT.player; p.x=250; p.facing=1; p.vx=0; GT.mode='idle'; } });
})();
