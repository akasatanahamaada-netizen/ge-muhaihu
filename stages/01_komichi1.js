/* ============================================================================
   ステージ：序章 ── 森の小道 ①  id = 'komichi1'
   種類：play（右へ進んで、右ページの右端まで行くとクリア）
   担当：
   ----------------------------------------------------------------------------
   play ステージの作り方：
     ・clear:'exit'  … 右端まで歩き抜けるとクリア（横スクロール型）
     ・platforms     … 足場。page は 'left' / 'right'、kind は
                        'ledge'(床の足場) か 'ceilingLedge'(天井の足場)
     ・enemies       … 歩く敵（踏まれると往復。箱を落として倒せる）
     ・intro         … ステージ開始時に出るナレーション（省略可）
   ========================================================================== */

GT.defineStage('komichi1', {
platforms:[
    {page:'left', x:310, y:130, w:105, h:60, kind:'ledge'},
    {page:'left', x:350, y:190, w:25, h:275, kind:'ledge'},
    {page:'right', x:790, y:10, w:20, h:145, kind:'ledge'},
    {page:'left', x:180, y:360, w:110, h:100, kind:'ledge'},
    {page:'right', x:680, y:310, w:130, h:150, kind:'ledge'},
    {page:'right', x:760, y:360, w:80, h:100, kind:'ledge'},
    {page:'right', x:650, y:330, w:120, h:130, kind:'ledge'},
    {page:'left', x:290, y:170, w:140, h:90, kind:'ledge'},
    {page:'left', x:140, y:400, w:60, h:60, kind:'ledge'},
  ],
  boxes:[
  ],
  enemies:[
  ],
  items:[   // 見やすいように 36px（中心の位置は元のまま）
    {page:'left', x:217, y:322, w:36, h:36},
    {page:'left', x:212, y:17,  w:36, h:36},
    {page:'right', x:602, y:22, w:36, h:36},
    {page:'right', x:702, y:272, w:36, h:36},
  ],
  mission:['items'],
  bookPage:'komichi',    // ここのかけらは、本の序章「森の小道」のページのもの（全部拾うと、欠けた文字・挿絵が埋まる）
});

GT.registerScene({
  id:'komichi1', type:'play', stage:'komichi1', clear:'exit', label:'序章 ── 森の小道 ①',
  intro:{s:'',c:'narr',t:'右へ進もう。ページのいちばん右の端まで行くと、ページがめくれて次へ進む。'},
});

/* ============================================================================
   見た目（地形・お話のかけら・ミッションは上の defineStage のまま。ここは絵を重ねるだけ）
     ・左の段々の足場        → 苔むした岩
     ・左の高い足場と細い柱  → 大きな木（葉の茂み＋幹）
     ・右上の天井から下がる足場 → 垂れさがる太いつる
     ・右の大きな足場        → 苔むした大岩
     ・床の花ときのこ・木漏れ日・ちょうちょ・舞う葉
   足場の形を変えたら、下の GROUPS の番号（platforms の何番目か）も合わせて直すこと。
   ========================================================================== */
(function(){
const isHere=()=>GT.scene&&GT.scene.id==='komichi1';
const P=i=>GT.STAGE_DEFS.komichi1.platforms[i];
// platforms の何番目を、どの絵にするか
const GROUPS={
  crown:[0,7],      // 木の葉の茂み
  trunk:[1],        // 木の幹
  vine:[2],         // 垂れさがるつる
  rockL:[8,3],      // 左の苔むした岩
  rockR:[6,4,5],    // 右の苔むした大岩
};
const F=GTDecor.forest;   // 森の絵（stages/_decor.js）
const FLOWERS=[[30,0],[48,1],[95,2],[118,3],[402,1],[430,0],[455,2],[500,3],[528,1],[560,0],[598,2],[622,3],[860,1]];
const MUSHROOMS=[[78,1],[415,1.3],[545,0.9]];

/* ============================================================================
   チュートリアル（ステージの解き方に沿って、操作の説明を順に出す）
     0 ジャンプで岩に登る → 1 本を裏返す（木の手前） → 2 天井を歩く
     → 3 右ページも裏返す → 4 つるの手前で裏返して大岩へ → 5 かけらの取りのがし
   先にできてしまった説明は飛ばす（もどらない）。
   ========================================================================== */
const ROCK_L=P(3), ROCK_R=P(4), VINE=P(2);
const tut={ step:0 };
GT.registerSceneReset(()=>{ if(!isHere()) return; tut.step=0;
  // 森の小道に入ったら、本の「森の小道」のページに書きこまれる（虫食いは、ここのかけらを拾うほど読めるようになる）
  GT.fillPage('komichi','――少年は、マリと別れて、森の小道を進んだ。本を裏返すと、そのページの重さの向きが変わる。少年は天井を歩いて大木を越え、木箱を押して道をひらいた。'); });
const STEPS=[
  { done:()=>{ const pl=GT.player; return pl.onGround && Math.abs(pl.y+pl.h-ROCK_L.y)<2; },
    at:[150,230], lines:[[['↑','W'],'ジャンプ'],'岩の段を のぼろう'] },
  { done:()=>GT.gravity.left===-1,
    at:[200,120], lines:['大きな木が 道をふさいでいる',[['F','Space'],'本を裏返す → このページの重力が反転'],'（床や天井に立っているときだけ 裏返せる）'] },
  { done:()=>GT.currentPage()==='right',
    at:[200,300], lines:['天井を歩いて お話のかけらを拾おう','背表紙をこえると、右のページの重力に したがう'] },
  { done:()=>GT.gravity.right===-1,
    at:[640,200], lines:[[['F','Space'],'右のページも 裏返して、天井のかけらへ']] },
  { done:()=>{ const pl=GT.player; return GT.gravity.right===1 && pl.onGround && pl.x+pl.w/2>ROCK_R.x-20 && pl.y+pl.h<=ROCK_R.y+52; },
    at:[600,190], lines:['つるの手前で もう一度裏返すと','大岩の上に 降りられる'] },
  { done:()=>GT.missionDone(),
    at:[450,200], lines:()=>['まだ '+(GT.items.filter(i=>!i.got).length)+' つ、光が残っている','本を裏返せば、届くはず'] },
];
GT.registerUpdate(()=>{
  if(!isHere()) return;
  while(tut.step<STEPS.length && STEPS[tut.step].done()) tut.step++;
});
function drawTutorial(){
  if(GT.mode!=='play' || tut.step>=STEPS.length) return;
  const s=STEPS[tut.step];
  GT.drawHint(s.at[0], s.at[1], typeof s.lines==='function'?s.lines():s.lines);
}

GT.registerDraw(()=>{ if(!isHere()) return; F.ground({flowers:FLOWERS, mushrooms:MUSHROOMS}); }, 'back');
GT.registerDraw(()=>{ if(!isHere()) return;
  F.trunk(P(GROUPS.trunk[0]));
  F.crown(GROUPS.crown.map(P),11);
  F.vine(P(GROUPS.vine[0]));
  F.rock(GROUPS.rockL.map(P),3);
  F.rock(GROUPS.rockR.map(P),7);
}, 'world');
GT.registerDraw(()=>{ if(!isHere()) return; F.air(); drawTutorial(); }, 'overlay');
})();
