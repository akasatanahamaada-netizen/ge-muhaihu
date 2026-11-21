/* ============================================================================
   Gravity Tale ── エンジン：土台（画面・定数・共有する状態・登録のしくみ・本のページ・背景・ステージ読みこみ・ミッション）
   ----------------------------------------------------------------------------
   ここは「ゲームの土台」です。ふつうステージを作るときは、エンジンのファイルは触りません。
   ステージ側（stages/ の各ファイル）からは、下の GT.* の関数を呼ぶだけで、自分のステージを登録できます。
     GT.defineStage(id, def)     … ステージの地形（足場・箱・敵）を登録
     GT.registerScene(scene)     … シーン（1画面ぶんの進行）を登録
     GT.definePages(list)        … 「本」に並ぶページを登録（まとめて）
     GT.fillPage(key, text)      … そのページに文章を書き込む（進行中に呼ぶ）
   拡張したい人向け（ボス戦などの特別な仕掛けを足すとき）：
     GT.registerSceneType(type, fn)  GT.registerDynamic(name, fn)
     GT.registerUpdate(fn)           GT.registerDraw(fn, phase)
     GT.registerAct(name, fn)        GT.registerLineHook(fn)
     GT.registerSceneReset(fn)       GT.registerFlipIntercept(fn)
     GT.registerModeUpdate(mode, fn) GT.physicsModes / GT.flipModes
   エンジンのファイルは js/engine/ にあり、index.html で core.js → … → boot.js の順に読む。
   どのファイルも、いちばん外側の const / let / function を共有している（ふつうの <script> なので）。
   ========================================================================== */
"use strict";

const GT = (window.GT = window.GT || {});

/* ---- 画面・定数 ---------------------------------------------------------- */
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const W = canvas.width, H = canvas.height, SPINE = W/2;
const EDGE = 16;
const GRAVITY=2200, ACCEL=3400, FRICTION=3000, MAX_SPEED=300, JUMP_SPEED=640;
const ENEMY_SPEED=90;
const SWAMP_SLOW=0.4;                // 沼の中の速さ（ふだんの何倍か）
const SWAMP_JUMP=0.7;                // 沼の中のジャンプの勢い（0.7 で高さは約半分）
const TALK_RANGE=74;                 // この距離まで近づくと「はなす」が出る
const FLIP_DUR_BASE=1.2;
let FLIP_DUR=FLIP_DUR_BASE;      // いまのめくりの長さ（光がもれるめくりは、ゆっくり）                  // ページめくり演出の長さ(秒)

GT.canvas=canvas; GT.ctx=ctx; GT.W=W; GT.H=H; GT.SPINE=SPINE; GT.EDGE=EDGE;
GT.GRAVITY=GRAVITY; GT.ENEMY_SPEED=ENEMY_SPEED;

/* ---- 共有する状態（ステージ/拡張側からも読み書きする） ------------------ */
GT.gravity   = {left:1, right:1};
GT.player    = {x:60,y:H-EDGE-34,w:26,h:34,vx:0,vy:0,onGround:false,facing:1,squash:1};
GT.platforms = [];
GT.boxes     = [];
GT.enemies   = [];
GT.goal      = null;
GT.swamps    = [];                   // 沼（触れている間だけ遅くなる。乗れない）
GT.items     = [];                   // ミッションで集めるアイテム（got=true で取った）
GT.mode      = 'talk';               // 'play' / 'boss' / 'qte' / 'idle' など
GT.scene     = null;
GT.sceneIndex= 0;
GT.SCENES    = [];
GT.invincible= 0;
GT.hurtFlash = 0;
GT.flags     = {};                   // ストーリー分岐のフラグ（ステージ側が自由に使う）

const player_start = {x:60,y:H-EDGE-34};

/* ---- 登録テーブル（各ステージ・拡張がここに積む） ------------------------ */
GT.STAGE_DEFS      = {};             // id -> 地形定義
GT.sceneRegistry   = {};             // id -> シーン定義
GT.playlist        = [];             // シーンidの並び順（playlist.js が設定）
GT.pageRecord      = [];             // 本のページ一覧

const sceneTypeHandlers = {};        // type -> fn(scene)
const dynamicHandlers   = {};        // name -> fn(scene)
const updatePasses      = [];        // fn(dt) 物理モード中に毎フレーム
const modeUpdaters      = {};        // mode -> fn(dt) そのモード専用の更新
const drawBack          = [];        // fn() 最背面に描く（地形より奥。判定なしの飾り用）
const drawWorld         = [];        // fn() プレイヤーより後ろに描く
const drawBackPre       = [];        // fn() いちばん奥の、影を落とさない物（遠くの水車小屋と丘など）。奥の飾りより うしろに描く
const drawBackFlat      = [];        // fn() 奥の層のうち、影を落とさない物（地面の道など）。奥の飾りの上に描く
const drawFlat          = [];        // fn() 影を落とさない物（水たまりなど）。奥の層の上・人物や足場の影より下に描く
const drawOverlay       = [];        // fn() 画面の最前面に描く
const drawLiftFns      = [];        // fn() 人物を色合いの上に描きなおしたあと（人物に重ねる印など）
const drawSpeechFns     = [];        // fn() 吹き出し（overlay よりさらに前。木や手前の飾りに隠れない）
const actHooks          = {};        // name -> fn()  会話行の act 合図
const lineHooks         = [];        // fn(line)      会話行が表示される度
const sceneResets       = [];        // fn()          シーン開始時に呼ぶ
const flipIntercepts    = [];        // fn()->bool    反転キーを横取りする

GT.physicsModes = new Set(['play']); // この mode のとき物理を動かす
GT.flipModes    = new Set(['play']); // この mode のとき本を裏返せる

GT.defineStage        = (id,def)=>{ def.id=id; GT.STAGE_DEFS[id]=def; };
GT.registerScene      = (s)=>{ if(s&&s.id) GT.sceneRegistry[s.id]=s; };
GT.definePages        = (list)=>{ GT.pageBases={}; GT.pageInfo={}; list.forEach(p=>{ GT.pageBases[p.key]=p.base||''; GT.pageInfo[p.key]={title:p.title, chapter:p.chapter||'', extra:p.extraPieces||[], fillOn:p.fillOn||[]}; });   // もとの文章（セーブから戻したページにも使えるよう、別に持っておく）
  GT.pageRecord = list.map(p=>({key:p.key,title:p.title,base:p.base||'',filled:false,text:'',found:[]})); };   // found … 拾ったお話のかけら（'ステージid:番号'）
/* お話のかけらと、本のページ：ステージの定義に bookPage:'prologue' のように書くと、そのステージのかけらは、そのページのもの。
   そのページのかけらを全部拾うと、本を読みかえす画面で、そのページの欠けた文字・挿絵が埋まる。
   GT.pagePieces(key) → {found:拾った数, total:全部の数} */
GT.pagePieces         = (key)=>{ const p=GT.pageRecord.find(p=>p.key===key), ids=[];
  for(const id in GT.STAGE_DEFS){ const d=GT.STAGE_DEFS[id]; if(d.bookPage===key) (d.items||[]).forEach((_,i)=>{ const pid=(d.pieceKey||id)+':'+i; if(!ids.includes(pid)) ids.push(pid); }); }   // pieceKey が同じステージ（近道と遠回りなど）は、同じかけらを数える
  const info=GT.pageInfo&&GT.pageInfo[key], extra=(info&&info.extra)||[];
  extra.forEach(e=>ids.push(e.id));                                   // 会話などで手に入るピースは、いちばん後ろ
  const got=new Set((p&&p.found)||[]), foundIds=ids.filter(id=>got.has(id));
  return {found:foundIds.length, total:ids.length, ids, foundIds, extra}; };
/* かけら以外のピース（会話など）を手に入れる。from:{x,y,w,h}（ゲーム画面の位置）があれば、そこから本のボタンへ飛んでいく */
GT.addPagePiece       = (key,id,from)=>{ const p=GT.pageRecord.find(p=>p.key===key); if(!p) return;
  p.found=p.found||[]; if(p.found.includes(id)) return; p.found.push(id);
  (GT.chime?GT.chime():GT.sfx&&GT.sfx('page')); if(from && GT.flyScrapToBook) GT.flyScrapToBook({...from, pid:id}); };
GT.fillPage           = (key,text)=>{ const p=GT.pageRecord.find(p=>p.key===key); if(p){ p.filled=true;p.text=text;} };
GT.registerSceneType  = (t,fn)=>{ sceneTypeHandlers[t]=fn; };
GT.registerDynamic    = (n,fn)=>{ dynamicHandlers[n]=fn; };
GT.registerUpdate     = (fn)=>{ updatePasses.push(fn); };
GT.registerModeUpdate = (m,fn)=>{ modeUpdaters[m]=fn; };
GT.registerDraw       = (fn,phase)=>{ (phase==='back'?drawBack:phase==='overlay'?drawOverlay:phase==='speech'?drawSpeechFns:phase==='lift'?drawLiftFns:phase==='flat'?drawFlat:phase==='backflat'?drawBackFlat:phase==='backpre'?drawBackPre:drawWorld).push(fn); };   // 'speech' … 吹き出し（最前面）
GT.registerAct        = (n,fn)=>{ actHooks[n]=fn; };
GT.registerLineHook   = (fn)=>{ lineHooks.push(fn); };
GT.registerSceneReset = (fn)=>{ sceneResets.push(fn); };
GT.registerFlipIntercept = (fn)=>{ flipIntercepts.push(fn); };

/* ---- 本のへりに置く不可視の壁（ページの外に出ないようにする） ------------ */
const edges=[
  {page:'left', x:0,       y:0,       w:SPINE, h:EDGE, kind:'ceilingEdge'},
  {page:'left', x:0,       y:H-EDGE,  w:SPINE, h:EDGE, kind:'floorEdge'},
  {page:'left', x:0,       y:0,       w:EDGE,  h:H,    kind:'wallEdge'},
  {page:'right',x:SPINE,   y:0,       w:SPINE, h:EDGE, kind:'ceilingEdge'},
  {page:'right',x:SPINE,   y:H-EDGE,  w:SPINE, h:EDGE, kind:'floorEdge'},
  {page:'right',x:W-EDGE,  y:0,       w:EDGE,  h:H,    kind:'wallEdge'},
];

/* 本の紙（紙のテクスチャ・古い紙のしみ・ふちのよれ）は js/paper.js → GT.paperArt */

/* 足場：古い挿絵ふう（手描きのゆらぎ・水彩のぬり・茶色いインクの輪郭と斜線の陰影） */
const ledgeRnd=i=>{ const s=Math.sin(i*127.1+311.7)*43758.5453; return s-Math.floor(s); };
function wobblyRectPath(x,y,w,h,seed){
  const r=Math.min(8,w/2,h/2), pts=[];
  const edge=(x0,y0,x1,y1,k)=>{ const n=Math.max(2,Math.round(Math.hypot(x1-x0,y1-y0)/12));
    for(let i=0;i<n;i++){ const t=i/n; pts.push([x0+(x1-x0)*t+(ledgeRnd(seed+k*31+i)-0.5)*1.8, y0+(y1-y0)*t+(ledgeRnd(seed+k*57+i)-0.5)*1.8]); } };
  const corner=(cx,cy,a0)=>{ for(let i=0;i<4;i++){ const a=a0+i*Math.PI/8; pts.push([cx+Math.cos(a)*r, cy+Math.sin(a)*r]); } };   // 角は丸く
  corner(x+r,y+r,Math.PI); edge(x+r,y,x+w-r,y,1); corner(x+w-r,y+r,-Math.PI/2); edge(x+w,y+r,x+w,y+h-r,2);
  corner(x+w-r,y+h-r,0); edge(x+w-r,y+h,x+r,y+h,3); corner(x+r,y+h-r,Math.PI/2); edge(x,y+h-r,x,y+r,4);
  ctx.beginPath(); ctx.moveTo(pts[0][0],pts[0][1]); for(const [px,py] of pts) ctx.lineTo(px,py); ctx.closePath();
}
/* 足場の見た目をステージごとに変える：GT.setLedgeStyle('ステージid','flat')
   'flat' … 輪郭線なしの、平らな茶色（シンプルな絵本ふう） */
const ledgeStyles={};
GT.setLedgeStyle=(id,style)=>{ ledgeStyles[id]=style; };
function drawLedgeFlat(plat,inv){
  const {x,y,w,h}=plat, r=Math.min(7,w/2,h/2);
  ctx.save();
  ctx.beginPath(); roundRectPath(x,y,w,h,r); ctx.fillStyle='#6b5642'; ctx.fill();
  ctx.save(); ctx.beginPath(); roundRectPath(x,y,w,h,r); ctx.clip();
  ctx.fillStyle='rgba(255,240,215,0.10)'; ctx.fillRect(x, inv?y+h-4:y, w, 4);          // 上の面がほんのり明るい
  ctx.fillStyle='rgba(40,28,16,0.10)';  ctx.fillRect(x, inv?y:y+h-6, w, 6);            // 下側の影
  ctx.restore();
  ctx.restore();
}
function drawLedge(plat,inv){
  if(GT.scene && ledgeStyles[GT.scene.stage]==='flat') return drawLedgeFlat(plat,inv);
  const {x,y,w,h}=plat, seed=x*7+y*13+w;
  ctx.save();
  wobblyRectPath(x,y,w,h,seed);
  const g=ctx.createLinearGradient(0,y,0,y+h); g.addColorStop(0,inv?'#7c6449':'#a08463'); g.addColorStop(1,inv?'#a08463':'#7c6449');
  ctx.fillStyle=g; ctx.fill();
  ctx.save(); ctx.clip();
  for(let i=0;i<Math.max(2,w*h/1800);i++){ const px=x+ledgeRnd(seed+i)*w, py=y+ledgeRnd(seed+i+9)*h, r=6+ledgeRnd(seed+i+3)*14;   // 水彩のむら
    ctx.fillStyle=`rgba(${i%2?'190,160,120':'95,72,48'},0.16)`; ctx.beginPath(); ctx.ellipse(px,py,r,r*0.6,0,0,Math.PI*2); ctx.fill(); }
  ctx.strokeStyle='rgba(58,40,24,0.28)'; ctx.lineWidth=0.8;                                    // 斜線の陰影（影になる側）
  const y0 = inv ? y : y+h*0.45, y1 = inv ? y+h*0.55 : y+h;
  for(let sx=x-h; sx<x+w; sx+=5){ ctx.beginPath(); ctx.moveTo(sx,y1); ctx.lineTo(sx+(y1-y0),y0); ctx.stroke(); }
  ctx.restore();
  ctx.strokeStyle='rgba(255,246,222,0.45)'; ctx.lineWidth=1.4;                                // 光の当たる縁
  ctx.beginPath(); const hy = inv ? y+h-3 : y+3; ctx.moveTo(x+6,hy+(ledgeRnd(seed)-0.5)); ctx.lineTo(x+w-6,hy+(ledgeRnd(seed+1)-0.5)); ctx.stroke();
  wobblyRectPath(x,y,w,h,seed); ctx.strokeStyle='#3a2a1a'; ctx.lineWidth=1.6; ctx.stroke(); // インクの輪郭
  ctx.restore();
}

/* ---- ステージの背景画像（絵本の挿絵のように、片方のページに部分的に置く） ----
   どのステージにどの画像を使うかは playlist.js の GT.stageBackgrounds で決める
   （ステージの地形定義に background:'…' と書いても使える）。
     'assets/background/xxx.jpg'                          … 右ページに置く
     {src:'assets/background/xxx.jpg', page:'left'}       … 左ページに置く
     {src:…, page:…, w:380, h:270, y:56}           … 大きさ・上からの位置も変えられる
     {src:'assets/background/xxx.jpg', page:'spread'}     … 見開き全体に敷く
   画像は刷毛で塗ったような ふち で切りぬき、まわりは紙のまま見せる。 */
GT.stageBackgrounds = GT.stageBackgrounds || {};
const BG_DEFAULT={ page:'right', w:380, h:270, y:56 };   // 挿絵の標準の大きさと位置
const BG_WASH='rgba(244,240,230,0.28)';    // 挿絵にかぶせる紙の色（濃くすると絵が薄くなる。前は 0.14）
const BG_FILTER='saturate(0.75) blur(0.8px)'; // 背景を少し後ろに下げて、キャラを見やすくする（色を少しおさえ、ほんの少しぼかす。'none' で元どおり）
const bgImages={}, bgVignettes={};
function stageBackgroundSpec(){
  const id=GT.scene && GT.scene.stage; if(!id) return null;
  let raw=(GT.STAGE_DEFS[id]&&GT.STAGE_DEFS[id].background) || GT.stageBackgrounds[id];
  if(typeof raw==='function') raw=raw(GT.flags);      // 分岐で背景を変えるとき（例：近道なら昼、遠回りなら夕方）
  if(!raw) return null;
  return Object.assign({}, BG_DEFAULT, typeof raw==='string' ? {src:raw} : raw);
}
function loadBgImage(src){
  let img=bgImages[src];
  if(!img){ img=bgImages[src]=new Image(); img.src=encodeURI(src); }
  return (img.complete && img.naturalWidth) ? img : null;
}
/* 刷毛で塗った形（白黒のマスク）：横向きの筆あとを重ね、ふちに毛先のかすれを出す */
function brushMask(w,h,seed){
  const m=document.createElement('canvas'); m.width=w; m.height=h;
  const p=m.getContext('2d');
  let s=seed||1; const R=()=>((s=(s*16807)%2147483647)/2147483647);
  const pad=16;
  p.strokeStyle='#000'; p.fillStyle='#000'; p.lineCap='round';
  for(let y=pad+6; y<h-pad-4; y+=9){                                   // 筆あと（横に何本も重ねる）
    const t=Math.abs(y-h/2)/(h/2-pad);                                 // 上下のふちほど短く、長さもふぞろいに
    const cut=t*t*w*0.16;
    const x0=pad+cut+R()*(18+40*t), x1=w-pad-cut-R()*(18+40*t);
    p.globalAlpha=0.7+R()*0.3; p.lineWidth=13+R()*10;
    p.beginPath(); p.moveTo(x0,y+(R()-0.5)*5);
    p.bezierCurveTo(x0+(x1-x0)*0.33,y+(R()-0.5)*9, x0+(x1-x0)*0.66,y+(R()-0.5)*9, x1,y+(R()-0.5)*5); p.stroke();
  }
  for(const yy of [pad, h-pad]) for(let i=0;i<5;i++){                   // 上下のふちの、かすれた塗り
    const x0=pad+40+R()*(w*0.35), x1=x0+40+R()*(w*0.35);
    p.globalAlpha=0.25+R()*0.25; p.lineWidth=5+R()*6;
    p.beginPath(); p.moveTo(x0,yy+(R()-0.5)*8); p.quadraticCurveTo((x0+x1)/2,yy+(R()-0.5)*10,x1,yy+(R()-0.5)*8); p.stroke();
  }
  p.lineCap='butt';
  for(let i=0;i<130;i++){                                              // 筆の入りと抜けの、毛先のかすれ（先ほど細く薄く）
    const y=pad+10+R()*(h-pad*2-20), left=R()<0.5, len=10+R()*30;
    const t=Math.abs(y-h/2)/(h/2-pad), cut=t*t*w*0.16;
    let x = left? pad+cut+18+R()*20 : w-pad-cut-18-R()*20;
    const dir=left?-1:1, a0=0.25+R()*0.45, lw=0.6+R()*1.8, dy=(R()-0.5)*0.12;
    for(let k=0;k<4;k++){ const seg=len/4;
      p.globalAlpha=a0*(1-k/4); p.lineWidth=lw*(1-k*0.18);
      p.beginPath(); p.moveTo(x,y+dy*seg*k); p.lineTo(x+dir*seg,y+dy*seg*(k+1)); p.stroke(); x+=dir*seg; }
  }
  p.lineCap='round';
  p.globalAlpha=1; p.beginPath();                                      // まん中はしっかり塗る（すき間ができないように）
  p.ellipse(w/2,h/2,w/2-pad-34,h/2-pad-18,0,0,Math.PI*2); p.fill();
  return m;
}
/* 挿絵（画像を大きさに合わせて切り取り、紙の色をかぶせて、刷毛の形で切りぬいたもの）を作っておく */
function bgVignette(spec,img){
  const key=spec.src+'|'+spec.w+'|'+spec.h;
  if(bgVignettes[key]) return bgVignettes[key];
  const c=document.createElement('canvas'); c.width=spec.w; c.height=spec.h;
  const p=c.getContext('2d');
  const sc=Math.max(spec.w/img.naturalWidth, spec.h/img.naturalHeight);   // 枠を覆う大きさで、まん中を使う
  const dw=img.naturalWidth*sc, dh=img.naturalHeight*sc;
  p.filter=BG_FILTER;
  p.drawImage(img,(spec.w-dw)/2,(spec.h-dh)/2,dw,dh);
  p.filter='none';
  p.fillStyle=BG_WASH; p.fillRect(0,0,spec.w,spec.h);
  let seed=7; for(const ch of key) seed=(seed*31+ch.charCodeAt(0))%2147483647;
  p.globalCompositeOperation='destination-in'; p.drawImage(brushMask(spec.w,spec.h,seed||7),0,0);
  return (bgVignettes[key]=c);
}
/* page:'spread' … 見開き全体に敷く（ふちの切りぬきなし）。spec.wash で、かぶせる紙の色の濃さを背景ごとに変えられる（暗い森は薄く） */
function bgSpread(spec,img){
  const key=spec.src+'|spread|'+(spec.wash||'')+'|'+(spec.filter||'')+'|'+(spec.tint||'');
  if(bgVignettes[key]) return bgVignettes[key];
  const c=document.createElement('canvas'); c.width=W; c.height=H;
  const p=c.getContext('2d');
  const sc=Math.max(W/img.naturalWidth, H/img.naturalHeight);
  const dw=img.naturalWidth*sc, dh=img.naturalHeight*sc;
  p.filter=spec.filter||BG_FILTER;                                    // spec.filter … 背景ごとの色の直し（明るい森を暗くする など）
  p.drawImage(img,(W-dw)/2,(H-dh)/2,dw,dh);
  p.filter='none';
  if(spec.tint){ p.globalCompositeOperation='multiply'; p.fillStyle=spec.tint; p.fillRect(0,0,W,H); p.globalCompositeOperation='source-over'; }   // spec.tint … 乗算でかぶせる色
  p.fillStyle=spec.wash||BG_WASH; p.fillRect(0,0,W,H);
  return (bgVignettes[key]=c);
}
function drawStageBackground(){
  const spec=stageBackgroundSpec(); if(!spec) return;
  if(spec.paper && GT.paperBackdrop){ ctx.drawImage(GT.paperBackdrop(spec.paper),0,0); return; }   // 紙を切って重ねた森（stages/_paperforest.js）
  const img=loadBgImage(spec.src); if(!img) return;
  if(spec.page==='spread'){ ctx.drawImage(bgSpread(spec,img),0,0); return; }
  const v=bgVignette(spec,img);
  const x = spec.page==='left' ? (SPINE-spec.w)/2 : SPINE+(SPINE-spec.w)/2;
  ctx.drawImage(v, x, spec.y);
}

/* ---- エンジン内部の状態 -------------------------------------------------- */
let goalPulse=0;
let goHint=false;                    // GT.openExit で開けたとき、「右の端へ」の案内を出す
let stageExit=false;                 // 右端が開いていて、歩いて抜けるとクリアになる状態か
let exitWanted=false;                // ミッションさえ終われば右端が開くステージか（play の exit / story の話したあと）
let curStageDef=null;                // いまのステージの定義（拾ったかけらを、本のページに記録するため）
let itemLook='page', itemLabel='お話のかけら', hudPulse=0;   // 集めるアイテムの見た目・呼び名、拾った直後のミッション表示のはずみ
let missionReq=null;                // ミッション {items, enemies}（無いステージは null）
let missionFlash=0;                  // 「ミッション達成！」の表示時間
let flipping=false, flipT=0, flipSwapped=false;
let pageNo=1;                        // 何ページ目まで進んだか
let storyStage=false, npcs=[], activeNpc=null, storyTalking=false;
let storyExitReady=false;
let companion=null;                  // いっしょに歩く人（play のステージで少年についてくる。scene.companion で決める）
GT.getCompanion=()=>companion;            // 話し終えて、右端へ歩けば次へ進める状態か
const flashPage={left:0,right:0};
const keys={};

/* ---- ステージ読み込み ---------------------------------------------------- */
GT.loadStageDef = function(def, opt){
  opt=opt||{};
  def=def||{};
  exitWanted=!!opt.exit; stageExit=false; goHint=false;
  storyStage=false; npcs=[]; activeNpc=null; storyTalking=false; storyExitReady=false; companion=null;
  GT.gravity={left:1,right:1};
  GT.platforms = edges.concat((def.platforms||[]).map(p=>({...p})));   // 右端の壁は updateExitGate が外す
  GT.boxes = (def.boxes||[]).map(b=>({x:b.x,y:b.y,w:b.w,h:b.h,vx:0,vy:0,onGround:false,squash:1}));
  GT.enemies = (def.enemies||[]).map(e=>({page:e.page,x:e.x,y:e.y,w:e.w,h:e.h,dir:e.dir,
    minX:e.page==='left'?EDGE:SPINE, maxX:e.page==='left'?SPINE:(W-EDGE),
    vy:0,onGround:false,alive:true,squash:1,deathT:0}));
  GT.goal = (def.goal && !exitWanted)?{...def.goal}:null;
  GT.swamps = (def.swamps||[]).map(s=>({...s}));
  curStageDef=def;
  GT.missionHidden=!!def.missionHiddenUntilTalk;   // 人と話すまで、画面の上の「〜を集める」を出さない（ステージ側で false にする）
  const bp=def.bookPage && GT.pageRecord.find(p=>p.key===def.bookPage);
  if(bp && !bp.found) bp.found=[];
  // 前に拾ったかけらは、拾ったまま（やり直しても、もう一度は出てこない）
  GT.items = (def.items||[]).map((it,i)=>{ const pid=(def.pieceKey||def.id)+':'+i, had=!!(bp && bp.found.includes(pid));
    return {...it,pid,got:had,gotT:had?99:0}; });
  bookShown=def.bookPage ? GT.pagePieces(def.bookPage).found : GT.items.filter(i=>i.got).length; updateBookFill();         // 「本を開く」ボタンの本の絵（集めたぶんだけ埋まる）は、ステージごとに空から
  itemLook  = def.itemLook||'page';      // 'page'（光るお話のかけら。ふつうはこれ）／'flower'（お花。摘むと消える）／'star'（前の★）
  itemLabel = def.itemLabel||(itemLook==='page'?'お話のかけら':itemLook==='flower'?'お花':'★');   // 画面上のミッション表示での呼び名
  hudPulse=0;
  const m=def.mission||[];
  missionReq = m.length ? {items:m.includes('items'), enemies:m.includes('enemies')} : null;
  missionFlash=0;
  updateExitGate();
  const pl=GT.player;
  pl.x=player_start.x; pl.y=player_start.y; pl.vx=0; pl.vy=0; pl.squash=1; pl.flipFall=false;
  flashPage.left=0; flashPage.right=0; updateHud();
};

/* ---- ミッション ---------------------------------------------------------
   def.mission:['items','enemies'] … アイテムを全部取る／敵を全部倒すまで、
   右端（exit）は開かず、ゴール旗（goal）も反応しない。 */
function missionCount(){
  return { items:GT.items.filter(i=>i.got).length, itemsAll:GT.items.length,
           enemies:GT.enemies.filter(e=>!e.alive).length, enemiesAll:GT.enemies.length };
}
function missionDone(){
  if(!missionReq) return true;
  if(missionReq.items && !(curStageDef&&curStageDef.itemsOptional) && GT.items.some(i=>!i.got)) return false;   // itemsOptional … かけらは拾わなくても進める
  if(missionReq.enemies && GT.enemies.some(e=>e.alive)) return false;
  return true;
}
/* 右端を開けてよければ開ける（毎フレームのはじめに呼ぶ） */
function updateExitGate(){
  if(!exitWanted || stageExit || !missionDone()) return;
  stageExit=true;
  GT.platforms = GT.platforms.filter(p=>!(p.page==='right'&&p.kind==='wallEdge'));
  if(missionReq) missionFlash=2.2;
}
GT.missionDone=missionDone; GT.missionCount=missionCount;
// アイテムの当たり判定は、見た目の星形に合わせて四角の内側 20% にしぼる（角をかすっただけでは取れない）
const ITEM_INSET=0.2;
GT.itemHitbox = it=>{ const ix=it.w*ITEM_INSET, iy=it.h*ITEM_INSET; return {x:it.x+ix, y:it.y+iy, w:it.w-2*ix, h:it.h-2*iy}; };

/* ---- ちいさなユーティリティ（拡張側からも使う） ------------------------- */
GT.pageOf        = e => (e.x+e.w/2)<SPINE ? 'left' : 'right';
GT.currentPage   = () => (GT.player.x+GT.player.w/2)<SPINE ? 'left' : 'right';
GT.pagePlatforms = page => GT.platforms.filter(p=>p.page===page);
// ぴったり接しているだけのものが、小数の計算誤差で「重なった」ことにならないよう 0.000001px の遊びを持たせる
const OVERLAP_EPS=1e-6;
GT.rectsOverlap  = (a,b)=> a.x<b.x+b.w-OVERLAP_EPS && a.x+a.w>b.x+OVERLAP_EPS && a.y<b.y+b.h-OVERLAP_EPS && a.y+a.h>b.y+OVERLAP_EPS;

