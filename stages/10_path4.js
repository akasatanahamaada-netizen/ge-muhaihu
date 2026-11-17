/* ============================================================================
   ステージ：第一章 ── 遠回りの道 ②  id = 'path4'
   種類：play　分かれ道で「遠回り」を選んだときだけ遊ぶ（近道のときは飛ばす）
   担当：
   ========================================================================== */

GT.defineStage('path4', {
   platforms:[
    {page:'left', x:190, y:160, w:100, h:65, kind:'ledge'},
    {page:'left', x:230, y:270, w:25, h:195, kind:'ledge'},
    {page:'left', x:380, y:20, w:55, h:110, kind:'ledge'},
    {page:'right', x:690, y:20, w:60, h:90, kind:'ledge'},
    {page:'left', x:420, y:20, w:20, h:210, kind:'ledge'},
    {page:'right', x:770, y:390, w:60, h:70, kind:'ledge'},
    {page:'right', x:700, y:320, w:110, h:140, kind:'ledge'},
    {page:'right', x:610, y:20, w:100, h:130, kind:'ledge'},
    {page:'left', x:170, y:220, w:140, h:90, kind:'ledge'},
    {page:'left', x:320, y:430, w:50, h:30, kind:'ledge'},
    {page:'left', x:430, y:20, w:20, h:170, kind:'ledge'},
    {page:'right', x:570, y:20, w:70, h:60, kind:'ledge'},
  ],
  boxes:[
  ],
  enemies:[
    {page:'left', x:210, y:140, w:35, h:20, dir:-1},
    {page:'right', x:630, y:430, w:40, h:30, dir:-1},
  ],
  swamps:[
    {page:'right', x:360, y:440, w:250, h:20},
  ],
  decor:[
    {layer:'front', kind:'fern', x:90, y:390, w:60, h:70},
    {layer:'front', kind:'fern', x:510, y:390, w:70, h:70},
    {layer:'front', kind:'fern', x:250, y:390, w:70, h:70},
    {layer:'front', kind:'fern', x:600, y:380, w:80, h:80},
    {layer:'front', kind:'fern', x:420, y:390, w:70, h:70},
  ],
});

GT.registerScene({
  id:'path4', type:'play', stage:'path4', clear:'exit',
  label:'第一章 ── 遠回りの道 ②',
  intro:{s:'',c:'narr',t:'右へ進もう。'},
  dynamic:'detourOnly',     // 遠回りのときだけ遊ぶ（07_crossroads.js）
});

/* ============================================================================
   見た目（森の小道①と同じ森の絵。地形・箱・敵は上の defineStage のまま。絵を重ねるだけ）
     ・左の柱と上の足場（1 / 0,8）  → 木（幹＋葉の茂み）
     ・左の天井の足場（2）と細い柱（4,10） → 上から垂れる茂みと、太いつる
     ・右の天井の足場（11,3,7）     → 上から垂れる葉の茂み
     ・右の床の段（6,5）・左の小さな段（9） → 苔むした岩
     ・床の花ときのこ・木漏れ日・ちょうちょ・舞う葉
   足場の形を変えたら、下の番号（platforms / decor の何番目か）も合わせて直すこと。
   ========================================================================== */
(function(){
const isHere=()=>GT.scene&&GT.scene.id==='path4';
const D=()=>GT.STAGE_DEFS.path4;
const P=i=>D().platforms[i], Dc=i=>D().decor[i];
const F=GTDecor.forest;   // 森の絵（stages/_decor.js）
const FLOWERS=[[40,1],[70,3],[160,0],[292,2],[642,1],[682,3],[848,0],[872,2]];
const MUSHROOMS=[[120,1],[660,1]];
GT.registerDraw(()=>{ if(!isHere()) return;
  F.ground({flowers:FLOWERS, mushrooms:MUSHROOMS, lights:[[130,0.5],[300,1.9],[860,3.1]]});
}, 'back');
GT.registerDraw(()=>{ if(!isHere()) return;
  F.trunk(P(1)); F.crown([P(0),P(8)],9);                                            // 左の木
  F.crown([P(2)],15); F.vine(P(4)); F.vine(P(10));                                  // 左の天井
  F.crown([P(11),P(3),P(7)],25);                                                    // 右の天井
  F.rock([P(6),P(5)],33);                                                           // 右の岩
  F.rock([P(9)],3);                                                                 // 左の小さな岩
}, 'world');
GT.registerDraw(()=>{ if(!isHere()) return; F.air(); }, 'overlay');
})();
