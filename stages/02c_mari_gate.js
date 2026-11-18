/* ============================================================================
   ステージ：序章 ── 森の出口（チュートリアルのおわり）  id = 'mari_gate'
   種類：story　マリと話すと右の端が開く。右へ進むと、章のとびら（第一章「赤い頭巾」）へ
   見た目は、序章のゴシックの森（stages/00_opening.js の GT.goth）
   ========================================================================== */
(function(){
GT.defineStage('mari_gate', { label:'序章 ── 森の出口', platforms:[], boxes:[], enemies:[],
  decor:[ {layer:'front', kind:'grassFlat', x:420, y:434, w:62, h:30}, {layer:'front', kind:'grassFlat', x:806, y:434, w:56, h:30} ] });

GT.registerScene({
  id:'mari_gate', type:'story', stage:'mari_gate', label:'序章 ── 森の出口',
  npcs:[
    { who:'mari', name:'マリ', page:'right', x:630, required:true, lines:[
      {s:'マリ',c:'mari',t:'……ここが、森の出口。'},
      {s:'マリ',c:'mari',t:'その本の使いかたは、もうわかったでしょ。'},
      {s:'マリ',c:'mari',t:'この先には、絵本の世界が広がってる。'},
      {s:'マリ',c:'mari',t:'物語の中の人たちに会って。ちゃんと見て、ちゃんと話して。'},
      {s:'少年',c:'boy',t:'……きみは？'},
      {s:'マリ',c:'mari',t:'わたしは、ここで待ってる。'},
      {s:'マリ',c:'mari',t:'……行ってらっしゃい。'},
    ] },
  ],
});

const isHere=()=>GT.scene&&(GT.scene.id==='mari_gate'||GT.scene.id==='afterword');   // 赤ずきんのお話のあと（afterword）も、マリが待っている森の出口
GT.registerDraw(()=>{ if(!isHere()||!GT.goth) return; GT.goth.back(); GT.goth.props(); GT.goth.fog(false); }, 'back');
GT.registerDraw(()=>{ if(!isHere()||!GT.goth) return; GT.goth.shrooms(); GT.goth.big(690,72); GT.goth.lantern(); }, 'world');
GT.registerDraw(()=>{ if(!isHere()||!GT.goth) return; GT.goth.fog(true); GT.goth.top(); GT.goth.wisps(); GTDecor.forest.air(); }, 'overlay');
})();
