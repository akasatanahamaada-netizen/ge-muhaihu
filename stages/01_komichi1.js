/* ============================================================================
   ステージ：序章 ── 森の小道 ①  id = 'komichi1'
   種類：play（右へ進んで、右ページの右端まで行くとクリア）
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
  GT.fillPage('komichi','――少年は、本を裏返して、森の小道を進んだ。'); });
const STEPS=[
  // （ジャンプの説明は、目覚めの場面の階段で出すので、ここではしない）
  { done:()=>GT.gravity.left===-1,
    at:[200,120], lines:[[['F','Space'],'本を裏返す']] },
  // （「背表紙をこえると…」は、説明の枠ではなく、マリが話す）
  { done:()=>GT.gravity.right===-1,
    at:[640,200], lines:[[['F','Space'],'本を裏返す']] },
  { done:()=>{ const pl=GT.player; return GT.gravity.right===1 && pl.onGround && pl.x+pl.w/2>ROCK_R.x-20 && pl.y+pl.h<=ROCK_R.y+52; },
    at:[600,190], lines:[[['F','Space'],'もう一度 裏返す']] },
  { done:()=>GT.missionDone(),
    at:[450,200], lines:()=>['のこり '+(GT.items.filter(i=>!i.got).length)+' つ'] },
];
/* マリの声（姿は見えない）：大きな木の前で「本をひっくり返してみて」。はじめて裏返して着地すると「驚いた？…」 */
const mv={ ask:false, told:false, spine:false };
GT.registerSceneReset(()=>{ if(isHere()){ mv.ask=false; mv.told=false; mv.spine=false; } });
function mariSays(lines){ GT.mode='idle'; GT.player.vx=0; GT.beginDialogue(lines,null,()=>{ GT.hideDialogue(); GT.mode='play'; }); }
GT.registerUpdate(()=>{
  if(!isHere() || GT.mode!=='play') return;
  const pl=GT.player;
  if(!mv.ask && pl.onGround && GT.gravity.left===1 && Math.abs(pl.y+pl.h-ROCK_L.y)<2){ mv.ask=true; mariSays([{s:'',c:'narr',t:'どこからか、マリの声がした。'},{s:'マリ',c:'mari',t:'本をひっくり返してみて。'}]); return; }
  if(!mv.told && GT.gravity.left===-1 && pl.onGround){ mv.ask=true; mv.told=true; mariSays([{s:'マリ',c:'mari',t:'驚いた？　その本は重力を変えることができるの。'}]); return; }
  // 背表紙（まん中）に近づいたら：ページごとに重力がちがうことを、マリが説明する
  if(mv.told && !mv.spine && pl.onGround && pl.x+pl.w/2 > GT.SPINE-90 && GT.gravity.left!==GT.gravity.right){ mv.spine=true;
    mariSays([
      {s:'マリ',c:'mari',t:'待って。右のページに行くと下に落ちるよ。'},
      {s:'マリ',c:'mari',t:'右のページは、まだ裏返してないから。'},
      {s:'マリ',c:'mari',t:'天井に行きたいなら、右のページでもう一度裏返して。'},
    ]); }
});
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
GT.registerDraw(()=>{ if(!isHere()) return; F.air(); }, 'overlay');
GT.registerDraw(()=>{ if(!isHere()) return; drawTutorial(); }, 'speech');   // 説明は、暗さ・色合いがかからないよう、いちばん手前に
})();
