/* ============================================================================
   Gravity Tale ── 共通エンジン (engine.js)
   ----------------------------------------------------------------------------
   ここは「ゲームの土台」です。物理・移動・会話・ページめくり・描画などの
   仕組みが入っています。ふつうステージを作るときは、このファイルは触りません。

   ステージ側（stages/ の各ファイル）からは、下の GT.* の関数を呼ぶだけで
   自分のステージを登録できます。主なものは：

     GT.defineStage(id, def)     … ステージの地形（足場・箱・敵）を登録
     GT.registerScene(scene)     … シーン（1画面ぶんの進行）を登録
     GT.definePages(list)        … 「本」に並ぶページ見出しを登録（まとめて）
     GT.fillPage(key, text)      … そのページに文章を書き込む（進行中に呼ぶ）

   拡張したい人向け（ボス戦などの特別な仕掛けを足すとき）：
     GT.registerSceneType(type, fn)  GT.registerDynamic(name, fn)
     GT.registerUpdate(fn)           GT.registerDraw(fn, phase)
     GT.registerAct(name, fn)        GT.registerLineHook(fn)
     GT.registerSceneReset(fn)       GT.registerFlipIntercept(fn)
     GT.registerModeUpdate(mode, fn) GT.physicsModes / GT.flipModes
   ========================================================================== */
(function(){
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
GT.definePages        = (list)=>{ GT.pageBases={}; GT.pageInfo={}; list.forEach(p=>{ GT.pageBases[p.key]=p.base||''; GT.pageInfo[p.key]={title:p.title, chapter:p.chapter||'', extra:p.extraPieces||[]}; });   // もとの文章（セーブから戻したページにも使えるよう、別に持っておく）
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

/* ---- 入力 ---------------------------------------------------------------- */
/* 指で触る画面（スマホ・タブレット）か。css の .touch-ui を出す条件と同じ。
   GT.isTouch()          … 指で触る画面なら true
   GT.ctl('PC用','タッチ用') … 案内の文を、画面に合わせて出しわける */
const touchMQ=window.matchMedia ? matchMedia('(hover:none), (pointer:coarse)') : null;
GT.isTouch=()=>!!(touchMQ && touchMQ.matches);
GT.ctl=(pc,touch)=>GT.isTouch()?touch:pc;
// drawHint のキーを、タッチ用ボタンの名前に置きかえる（同じボタンになるものは1つにまとめる）
const TOUCH_KEY={'←':'◀','A':'◀','→':'▶','D':'▶','↑':'▲','W':'▲','F':'本を裏返す','Space':'本を裏返す','Enter':'タップ'};
const touchKeys=ks=>GT.isTouch() ? [...new Set(ks.map(k=>TOUCH_KEY[k]||k))] : ks;
window.addEventListener('keydown',e=>{ keys[e.key]=true;
  if(e.key.startsWith('Arrow')) e.preventDefault();   // 矢印キーで画面がスクロールしないように
  if(e.key==='f'||e.key==='F'||e.code==='Space'){ onFlipKey(); e.preventDefault(); } });
window.addEventListener('keyup',e=>keys[e.key]=false);

function flipCurrentPage(){ const p=GT.currentPage(); GT.gravity[p]*=-1; flashPage[p]=1; updateHud(); GT.sfx&&GT.sfx('flip');
  // 本を裏返して床⇔天井へ落ちていくあいだは、横には動けない（着地するまで、まっすぐ落ちる）
  GT.player.flipFall=true; GT.player.vx=0; }
/* 本を裏返せるのは、床（反転中は天井）に立っているときだけ。
   空中で押したときは、すぐには裏返さず 0.35 秒だけ覚えておき、そのあいだに着地したら裏返す
   （スマホでは、着地の少し前にボタンを押してしまいやすいため）。間に合わなければ、ボタンが小さく首をふる */
const FLIP_BUFFER=0.35;
let flipBuffered=0;
function canFlipNow(){ return !flipping && !dlg.classList.contains('show') && !storyTalking && GT.flipModes.has(GT.mode); }
function onFlipKey(){
  if(flipping) return;
  for(const f of flipIntercepts){ if(f()) return; }     // QTE などが横取り
  if(dlg.classList.contains('show') || storyTalking) return;   // 会話のあいだは、本を裏返せない
  if(!GT.flipModes.has(GT.mode)) return;
  if(GT.player.onGround){ flipBuffered=0; flipCurrentPage(); }
  else flipBuffered=FLIP_BUFFER;
}
function updateFlipBuffer(dt){
  if(flipBuffered<=0) return;
  if(!canFlipNow()){ flipBuffered=0; return; }
  if(GT.player.onGround){ flipBuffered=0; flipCurrentPage(); return; }
  flipBuffered-=dt;
  if(flipBuffered<=0){ const b=document.getElementById('btnFlip'); b.classList.remove('deny'); void b.offsetWidth; b.classList.add('deny'); }
}
// （裏返せなかったときは、ボタンが小さく首をふるだけ。文字の知らせは出さない）
GT.onFlipKey = onFlipKey;

function updateHud(){
  document.getElementById('hudLeft').textContent='← 左：'+(GT.gravity.left===1?'通常':'反転');
  document.getElementById('hudRight').textContent='右：'+(GT.gravity.right===1?'通常':'反転')+' →';
}
function setHudStage(t){ document.getElementById('hudStage').textContent=t;
  // 画面上の題字の下も、いまの章に合わせる（序章のあいだは「序章」、それより後は「第一章「赤い頭巾」」）
  const sub=document.querySelector('.flourish .sub'), ch=(GT.chapters||[]).find(c=>String(t).startsWith(c.name));
  if(sub && ch) sub.textContent = ch.name==='序章' ? '序章' : `${ch.name}「${ch.sub}」`; }
GT.setHudStage=setHudStage;

function bindHold(id,on,off){ const el=document.getElementById(id);
  el.addEventListener('pointerdown',e=>{e.preventDefault();on();});
  // 指を離した・ボタンの外へずれた・電話などで中断された、のどれでも止める（押しっぱなしにならないように）
  for(const ev of ['pointerup','pointerleave','pointercancel']) el.addEventListener(ev,()=>off&&off());
  el.addEventListener('contextmenu',e=>e.preventDefault()); }   // 長押しでメニューが出ないように
bindHold('btnLeft',()=>keys['ArrowLeft']=true,()=>keys['ArrowLeft']=false);
bindHold('btnRight',()=>keys['ArrowRight']=true,()=>keys['ArrowRight']=false);
bindHold('btnJump',()=>keys['ArrowUp']=true,()=>keys['ArrowUp']=false);
document.getElementById('btnFlip').addEventListener('pointerdown',e=>{e.preventDefault();onFlipKey();});
document.getElementById('btnFlip').addEventListener('contextmenu',e=>e.preventDefault());
// ほかのアプリに切りかえたときは、押していたボタンを離したことにする
window.addEventListener('blur',()=>{ for(const k in keys) keys[k]=false; });
document.addEventListener('visibilitychange',()=>{ if(document.hidden) for(const k in keys) keys[k]=false; });

/* ---- シーン進行 ---------------------------------------------------------- */
const sceneStartHooks=[];
GT.onSceneStart=fn=>{ sceneStartHooks.push(fn); };      // シーンが始まるたびに呼ばれる（menu.js のセーブ用）
/* ---- 体力（ハート 3つ）とゲームオーバー -------------------------------------
   敵や狼にぶつかると、ハートが 1つ減って、はじき飛ばされる（少しのあいだ無敵）。
   3回ダメージを受けると、ゲームオーバー → ページが前へ もどって、そのステージを最初からやり直す。
   ハートは、ページ（ステージ）を進んでも、やり直しても、そのまま。
   3つにもどるのは、ゲームオーバーのあとと、メニューから始めたとき（はじめから・つづきから・ステージをえらぶ）だけ。 */
GT.MAX_HP=3; GT.hp=GT.MAX_HP;
let gameOver=null, heartLost=0;            // gameOver … {t:経過秒, cause, dur}（ゲームオーバーの演出中）
/* やられ方ごとのゲームオーバー演出。ステージ側で登録する（例：12 おばあさんの家の 'wolf'）。
   GT.registerGameOver('名前', { dur:秒, start(go){…}, draw(go){…} })
   GT.damagePlayer(x, '名前') でハートが 0 になると、その演出になる（登録がなければ、ふつうのゲームオーバー） */
const gameOverStyles={};
GT.registerGameOver=(name,style)=>{ gameOverStyles[name]=style; };
/* 画面ゆれ：GT.shake(強さpx, 秒)。キャンバスごと、こきざみに揺らす */
let shakeT=0, shakeDur=0, shakePow=0;
GT.shake=(pow,dur)=>{ if(pow>=shakePow*(shakeDur>0?shakeT/shakeDur:0)){ shakePow=pow; shakeDur=shakeT=dur; } };
function applyShake(dt){
  if(shakeT<=0) return;
  shakeT=Math.max(0,shakeT-dt); const k=shakeDur>0?shakeT/shakeDur:0, a=shakePow*k*k;
  canvas.style.transform = shakeT>0 ? `translate(${((Math.random()*2-1)*a).toFixed(1)}px,${((Math.random()*2-1)*a).toFixed(1)}px)` : '';
}
GT.damagePlayer=function(fromX,cause){
  if(gameOver || flipping || GT.invincible>0) return false;
  GT.hp=Math.max(0,GT.hp-1); heartLost=1;
  GT.sfx&&GT.sfx('hit'); GT.hurtFlash=1;
  const pl=GT.player, g=GT.gravity[GT.currentPage()];
  if(GT.hp<=0){                                             // ゲームオーバー
    const st=cause&&gameOverStyles[cause];
    gameOver={t:0, cause:st?cause:null, dur:st&&st.dur?st.dur:1.6}; GT.mode='idle'; pl.vx=0; pl.vy=0; pl.squash=0.5;
    hideDialogue(); if(st&&st.start) st.start(gameOver); return true;
  }
  const away = fromX!=null ? ((pl.x+pl.w/2)<fromX?-1:1) : -pl.facing;   // ぶつかった相手と反対へ、はじき飛ばされる
  pl.vx=away*380; pl.vy=-360*g; pl.squash=0.6; GT.invincible=1.4;
  return true;
};
GT.isGameOver=()=>!!gameOver;
function startScene(idx){
  if(gameOver){ GT.hp=GT.MAX_HP; heartLost=0; }               // ゲームオーバーのあとだけ、ハートは 3つにもどる（ページを進んでもそのまま）
  gameOver=null;
  const direct = idx && typeof idx==='object';                 // シーンそのものを渡したとき（タイトル画面のうしろの場面など。playlist の外）
  GT.sceneIndex = direct ? GT.SCENES.indexOf(idx) : idx;   // （playlist にあるシーンなら、その番号）
  GT.scene = direct ? idx : GT.SCENES[idx]; const scene=GT.scene; if(!scene) return;
  for(const r of sceneResets) r();                      // 例：窓のぞき映像を閉じる
  for(const fn of sceneStartHooks) fn(scene, idx);
  if(scene.dynamic && dynamicHandlers[scene.dynamic]){ dynamicHandlers[scene.dynamic](scene); return; }
  if(sceneTypeHandlers[scene.type]){ sceneTypeHandlers[scene.type](scene); return; }
  if(scene.type==='talk'){
    if(scene.stage) GT.loadStageDef(GT.STAGE_DEFS[scene.stage]); GT.mode='idle';
    setHudStage(scene.label||'');
    beginDialogue(scene.lines||[], scene.choices, ()=>{ if(scene.onEnd) scene.onEnd(); advanceScene(); });
  } else if(scene.type==='play'){
    GT.loadStageDef(GT.STAGE_DEFS[scene.stage], {exit: scene.clear==='exit'});
    const cw=typeof scene.companion==='function'?scene.companion(GT.flags):scene.companion;
    if(cw){ const pl=GT.player; companion={who:cw, name:cw==='hood'?'赤ずきん':cw, page:'left', x:Math.max(EDGE,pl.x-40), w:32, h:40, y:H-EDGE-40, vy:0, g:1, talkable:false, onGround:true}; }   // うしろから ついてくる
    setHudStage((scene.label||'')+'　·　p.'+pageNo);
    if(scene.intro){ GT.mode='idle'; beginDialogue(Array.isArray(scene.intro)?scene.intro:[scene.intro],null,()=>{ hideDialogue(); GT.mode='play'; }); }   // 何行でも書ける
    else { GT.mode='play'; }
  } else if(scene.type==='story'){
    GT.loadStageDef(GT.STAGE_DEFS[scene.stage], {exit:false});
    storyStage=true; setupNpcs(scene.npcs);
    setHudStage((scene.label||'')+'　·　p.'+pageNo);
    const intro = scene.intro ? (Array.isArray(scene.intro)?scene.intro:[scene.intro]) : null;
    if(intro){ GT.mode='idle'; beginDialogue(intro,null,()=>{ hideDialogue(); GT.mode='play'; }); }
    else { GT.mode='play'; }
  } else {
    // 未知のタイプ：とりあえず会話だけ流す
    GT.mode='idle'; beginDialogue(scene.lines||[], scene.choices, ()=>advanceScene());
  }
}
function advanceScene(){ startScene(GT.sceneIndex+1); }
function injectSceneAfterCurrent(sc){ GT.SCENES.splice(GT.sceneIndex+1,0,sc); }
GT.storyPiece=(key,id,who)=>{ const n=who&&npcs.find(m=>m.who===who), ok=n&&n.x>-40&&n.x<W+40, r=ok?n:GT.player;
  GT.addPagePiece(key,id,{x:r.x,y:r.y,w:r.w,h:r.h}); };   // 大事な会話のあと・敵を倒したあと：お話のかけらが光の玉になって本へ
GT.openExit=()=>{ exitWanted=true; stageExit=true; goHint=true; GT.platforms=GT.platforms.filter(p=>!(p.page==='right'&&p.kind==='wallEdge')); };   // 右の端を開く（自分で歩いて、次のページへ）
GT.openStoryExit=()=>{ exitWanted=true; storyExitReady=true; updateExitGate(); };   // 話しかけなくても、右の端を開く
GT.startScene=startScene; GT.advanceScene=advanceScene; GT.injectSceneAfterCurrent=injectSceneAfterCurrent;
GT.getPageNo=()=>pageNo;
/* メニューなどから、好きなシーンへ飛ぶ（ページめくり・会話・QTE をいったん片づけてから始める） */
/* ページをめくる演出をはさんで、好きなシーンへ（メニューの「はじめから」など）。めくり終わりの半分で、そのシーンが始まる */
GT.flipToScene=function(idx, page){
  GT.hp=GT.MAX_HP; heartLost=0;           // メニューから始めるときは、ハートを 3つに
  flipping=false; flipT=0; flipSwapped=false;
  hideDialogue(); document.getElementById('qte').classList.remove('show');
  for(const k in keys) keys[k]=false;
  GT.mode='idle'; GT.player.vx=0;
  GT.sceneIndex=idx-1;                   // めくりの途中で advanceScene() → idx のシーンが始まる
  if(page) pageNo=page-1;                // めくると pageNo が 1 つ進む
  startPageFlip();
};
GT.jumpToScene=function(idx, page){
  GT.hp=GT.MAX_HP; heartLost=0;           // メニューから始めるときは、ハートを 3つに
  flipping=false; flipT=0; flipSwapped=false; setFlipHide(false);
  if(page) pageNo=page;
  hideDialogue(); document.getElementById('qte').classList.remove('show');
  for(const k in keys) keys[k]=false;
  startScene(idx);
};

/* ---- ステージ上のキャラ（NPC）に話しかけて進むしくみ --------------------- */
GT.getNpcs=()=>npcs;   // 動作確認用に公開
GT.dbg=()=>({storyStage,storyTalking,flipping,stageExit,storyExitReady,exitWanted,mission:missionReq});
/* 人物も、いるページの重力にしたがって床か天井へ落ちる（赤ずきん・マリ・狼・おばあさんなど）。
   b={x,y,w,h,vy}。y が無ければ床に立たせる。足場（ledge / ceilingLedge）の上や下にも止まる。
   結果：b.g（1=床に立つ / -1=天井に立つ）, b.onGround */
GT.fallBody=function(b,dt){
  const page=(b.x+b.w/2)<SPINE?'left':'right', g=GT.gravity[page]||1;
  if(b.y==null){ b.y=H-EDGE-b.h; b.vy=0; }
  b.g=g;
  const prevTop=b.y, prevBot=b.y+b.h;
  b.vy=Math.max(-1400,Math.min(1400,(b.vy||0)+GRAVITY*g*dt)); b.y+=b.vy*dt;
  b.onGround=false;
  const ov=p=>(p.kind==='ledge'||p.kind==='ceilingLedge') && p.x<b.x+b.w-2 && p.x+p.w>b.x+2;
  if(g>0){ let gy=H-EDGE; for(const p of GT.platforms) if(ov(p) && p.y>=prevBot-1) gy=Math.min(gy,p.y);
    if(b.y+b.h>=gy){ b.y=gy-b.h; b.vy=0; b.onGround=true; } }
  else { let cy=EDGE; for(const p of GT.platforms) if(ov(p) && p.y+p.h<=prevTop+1) cy=Math.max(cy,p.y+p.h);
    if(b.y<=cy){ b.y=cy; b.vy=0; b.onGround=true; } }
};
/* 人物を横に歩かせる（ついてくる赤ずきんなど）。GT.npcStep(b, 目標x, 速さ, dt)
   足場（切り株・石垣・樽など）にぶつかったら、すり抜けずに、ぴょんと跳び乗って越える。
   越えられないほど高いとき（NPC_HOP_MAX より高い）は、その手前で止まる。動いた向きを返す（0＝動いていない） */
const NPC_HOP_MAX=120;
GT.npcStep=function(b,target,speed,dt){
  const dx=target-b.x; if(Math.abs(dx)<=6) return 0;
  const nx=b.x+Math.sign(dx)*Math.min(speed*dt,Math.abs(dx));
  const g=b.g||1;
  let wall=null;
  for(const p of GT.platforms){
    if(p.kind!=='ledge'&&p.kind!=='ceilingLedge') continue;
    if(nx<p.x+p.w && nx+b.w>p.x && b.y<p.y+p.h-1 && b.y+b.h>p.y+1){ wall=p; break; } }   // 横からぶつかる
  if(!wall){ b.x=Math.max(EDGE,Math.min(W-EDGE-b.w,nx)); return Math.sign(dx); }
  if(b.onGround && !b.noGravity){                                     // 床（天井）に立っていれば、跳び乗る
    const rise = g>0 ? b.y+b.h-wall.y : wall.y+wall.h-b.y;
    if(rise<=NPC_HOP_MAX){ b.vy=-g*Math.sqrt(2*GRAVITY*(rise+14)); b.onGround=false; } }
  return 0;                                                           // この瞬間は横に進まない（跳んで上に出たら進める）
};
/* 何回も逆さにされると、人物が怒る。
   GT.grumble(b, who) … b が重力で上下ひっくり返ったときに呼ぶ。回数（b.anger）に応じてセリフが変わる。
     1回目は何も言わない。しばらく（8秒ごと）反転しないと、怒りが1つずつおさまる。
   GT.GRUMBLE で、キャラごとのセリフを変えられる（だんだん怒っていく順に5つ）。 */
GT.GRUMBLE={
  hood:  ['わっ！','きゃっ、また！？','ちょ、ちょっと……目が回るよ〜！','もう！　わざとやってるでしょ！','……知らないっ。（ぷいっ）'],
  mari:  ['……わ。','ねえ、遊んでるでしょ。','ちょっと。わたしで遊ばないで。','……怒るよ？','……。'],
  wolf:  ['うおっ！？','な、なんだこの森は……','おい小僧、やめろ。','グルルル……！','……覚えてろよ。'],
  granny:['あれまあ！','ひいっ、目が回る……','年寄りをからかうんじゃないよ！','こ、腰が……腰がぁ……','……あとで、お説教だよ。'],
};
GT.grumble=function(b,who){
  const now=performance.now()/1000;
  if(b.angerT!=null) b.anger=Math.max(0,(b.anger||0)-Math.floor((now-b.angerT)/8));
  b.angerT=now; b.anger=(b.anger||0)+1;
  if(b.anger<2) return null;                                   // 1回目は、まだ何も言わない
  const L=GT.GRUMBLE[who]||GT.GRUMBLE.hood, a=b.anger;
  const lv = a<=2?0 : a<=4?1 : a<=6?2 : a<=8?3 : 4;
  b.speech={ text:L[lv], t:2.6, angry:lv>=2 };
  return b.speech;
};
/* 吹き出し（人物の頭の側に出す）。below=true なら頭の下（天井に立っているとき）。angry で怒りマーク */
const speechQueue=[];   // 吹き出しは、描く順番に関係なく、最後（最前面）にまとめて描く
GT.drawSpeech=function(cx,headY,text,alpha,below,angry){ speechQueue.push([cx,headY,text,alpha,below,angry]); };
function paintSpeech(cx,headY,text,alpha,below,angry){
  ctx.save(); ctx.globalAlpha=Math.max(0,Math.min(1,alpha));
  ctx.font="700 13px 'Zen Old Mincho',serif"; ctx.textAlign='center'; ctx.textBaseline='middle';
  const w=ctx.measureText(text).width+20, h=26;
  const bx=Math.max(EDGE+4,Math.min(W-EDGE-4-w,cx-w/2)), by= below ? headY+18 : headY-18-h;
  const tx=Math.max(bx+10,Math.min(bx+w-10,cx)), ty= below ? by : by+h;
  roundRect(bx,by,w,h,12); ctx.fillStyle='rgba(250,244,228,0.96)'; ctx.fill();
  ctx.strokeStyle=angry?'#a8463a':'rgba(90,74,51,0.8)'; ctx.lineWidth=1.6; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(tx-6,ty); ctx.lineTo(tx,ty+(below?-9:9)); ctx.lineTo(tx+6,ty); ctx.closePath();
  ctx.fillStyle='rgba(250,244,228,0.96)'; ctx.fill(); ctx.stroke();
  ctx.fillStyle='rgba(250,244,228,0.96)'; ctx.fillRect(tx-5,ty+(below?0.5:-2.5),10,2);   // しっぽのつけ根の線を消す
  ctx.fillStyle=angry?'#8b2f26':'#3a2f2a'; ctx.fillText(text,bx+w/2,by+h/2+1);
  if(angry){                                                    // 怒りマーク
    const mx=bx+w-4, my=by+(below?h+4:-4);
    ctx.strokeStyle='#c9503f'; ctx.lineWidth=2.2; ctx.lineCap='round';
    for(const [sx,sy] of [[-1,-1],[1,-1],[1,1],[-1,1]]){ ctx.beginPath(); ctx.moveTo(mx+sx*2,my+sy*7); ctx.quadraticCurveTo(mx+sx*2,my+sy*2,mx+sx*7,my+sy*2); ctx.stroke(); }
  }
  ctx.restore();
};
function setupNpcs(defs){
  npcs=(defs||[]).map(d=>({
    who:d.who, name:d.name||'', page:d.page||'right', x:d.x, w:d.w||32, h:d.h||40, y:H-EDGE-(d.h||40), vy:0, g:1,
    lines:d.lines||null, choices:d.choices||null, onEnd:d.onEnd||null, noExit:!!d.noExit, required:d.required, noLift:!!d.noLift,
    talkable:!!(d.lines), talked:false
  }));
  activeNpc=null; storyTalking=false;
}
// 人物のほうから話しかけてくる（近づかなくても、その人との会話を始める）。話し終えたあとの扱いは tryTalk と同じ
GT.talkTo=(n)=>{ if(!n) return; activeNpc=n; tryTalk(); };
let talkCooldown=0;   // 会話が終わった直後は、同じキー・タップでまた話しかけないように、少し待つ
function tryTalk(){
  if(!storyStage || storyTalking || flipping || performance.now()<talkCooldown) return;
  const n=activeNpc; if(!n || !n.lines) return;
  storyTalking=true; GT.player.vx=0;
  beginDialogue(n.lines, n.choices, ()=>{
    storyTalking=false; hideDialogue(); talkCooldown=performance.now()+450;
    if(n.onEnd) n.onEnd();
    n.talked=true; n.talkedOnce=true;
    // 自動ではめくらない。右端まで自分で歩いたら次ページへ。（noExit の人と話しても、右端は開かない）
    if(!n.noExit){ exitWanted=true; storyExitReady=true; updateExitGate(); }
  });
}

/* ---- ページめくり演出 ---------------------------------------------------- */
/* めくる紙には、ページの絵がそのまま描いてある（白紙ではない）。
   めくりはじめに、いまの見開きを写しとっておき（flipOld）、すぐ次のシーンを始める。
   ・左ページ … 紙が倒れてくるまでは、前のページのまま
   ・右ページ … めくった紙のうしろから、次のページが見える
   ・めくれる紙 … 前半は表（前の右ページ）、背表紙を越えたら裏（次の左ページ）
   めくっているあいだ、会話の枠・立ち絵は隠しておき、めくり終わってから出す。 */
const flipOld=document.createElement('canvas'); flipOld.width=W; flipOld.height=H;
const flipLive=document.createElement('canvas'); flipLive.width=W; flipLive.height=H;
/* めくる紙は、ゲーム画面のまわりのページのふくらみ（js/page.js の .gt-pages）までふくめた大きさで描く。
   ・ページの大きさ：ゲーム画面の左右に PAGE_PAD_X、上に PAGE_PAD_TOP、下に PAGE_PAD_BOT ずつ広い（EW×EH）
   ・めくりは、ゲーム画面より一回り大きい専用の層（flipCv。.gt-pages と同じ位置・大きさ。座標も同じ）に描く */
/* ゴシックの色合い（タイトル画面の、霧の薔薇の森に合わせる）
   GRADE_MUL … ゲーム画面の最後に、全体へ「乗算」でかぶせる色。まわりのページの紙（js/page.js）にも同じ色をかけて、さかいを合わせる
   GRADE_HUE … 世界（背景・地形・人物）を、色みに寄せる強さ（0 で元の色）。GRADE_VIG … 四すみの暗さ */
const GRADE_MUL=[212,205,196], GRADE_HUE=0, GRADE_VIG=0.5;
GT.PAGE_TINT=GRADE_MUL;
const tintHex=h=>{ const n=parseInt(h.slice(1),16); return '#'+[n>>16&255,n>>8&255,n&255].map((v,i)=>Math.round(v*GRADE_MUL[i]/255).toString(16).padStart(2,'0')).join(''); };
GT.tintHex=tintHex;
const PAGE_PAD_X=42, PAGE_PAD_TOP=20, PAGE_PAD_BOT=36, PAGE_COLOR=tintHex('#efe7da');
const EW=W+PAGE_PAD_X*2, EH=H+PAGE_PAD_TOP+PAGE_PAD_BOT, ESP=EW/2;
GT.PAGE_PAD={x:PAGE_PAD_X, top:PAGE_PAD_TOP, bot:PAGE_PAD_BOT};
const extOld=document.createElement('canvas'); extOld.width=EW; extOld.height=EH;
const extLive=document.createElement('canvas'); extLive.width=EW; extLive.height=EH;
// ページの形（js/page.js の .gt-pages と同じ線。上下のふちがゆるく曲がっている）。座標は、ページの紙（EW×EH）の中
function pagePath(g){ const X=x=>x+PAGE_PAD_X, Y=y=>y+PAGE_PAD_TOP;
  g.beginPath(); g.moveTo(X(-40),Y(-20)); g.bezierCurveTo(X(140),Y(-26),X(340),Y(-24),X(446),Y(-13)); g.lineTo(X(454),Y(-13));
  g.bezierCurveTo(X(560),Y(-24),X(760),Y(-26),X(940),Y(-20)); g.lineTo(X(942),Y(504)); g.bezierCurveTo(X(760),Y(499),X(560),Y(500),X(454),Y(509));
  g.lineTo(X(446),Y(509)); g.bezierCurveTo(X(340),Y(500),X(140),Y(499),X(-42),Y(504)); g.closePath(); }
function toPage(dst){ const g=dst.getContext('2d'); g.clearRect(0,0,EW,EH); g.save(); pagePath(g); g.clip();   // ゲーム画面を、ページの形の紙に写す（形の外は透明）
  if(GT.pageSheet) g.drawImage(GT.pageSheet,0,0,EW,EH);           // まわりのページと同じ紙の絵（js/page.js）
  else { g.fillStyle=PAGE_COLOR; g.fillRect(0,0,EW,EH); }
  g.drawImage(canvas,PAGE_PAD_X,PAGE_PAD_TOP); g.restore(); }
const flipCv=document.createElement('canvas'); flipCv.width=1100; flipCv.height=620;   // viewBox「-100 -70 1100 620」と同じ
flipCv.className='gt-flipcv'; flipCv.setAttribute('aria-hidden','true');
Object.assign(flipCv.style,{ position:'absolute', left:'-11.111%', top:'-14.583%', width:'122.222%', height:'129.167%', pointerEvents:'none', zIndex:'3' });
canvas.parentNode.appendChild(flipCv);
const fctx=flipCv.getContext('2d');
let flipCvDirty=false;
function setFlipHide(on){ document.body.classList.toggle('gt-flipping',on); }
(function(){ const st=document.createElement('style');
  st.textContent='.gt-flipping #dlg, .gt-flipping .dialogue, .gt-flipping #qte{ visibility:hidden !important; } .gt-flipping img[alt=""]:not(.gtm-logo){ visibility:hidden; }';
  document.head.appendChild(st); })();
let flipFromId=null;
GT.flipGlowFrom=new Set(['mari_gate','afterword']);   // この場面からめくるとき、めくれる紙の下から光がもれ出す
let flipDir=1;                                          // 1=次のページへ / -1=前のページへもどる（ゲームオーバーのやり直し）
function startPageFlip(dir,toScene){   // toScene … めくったうしろで始めるシーン（playlist の外のシーンなど）
  if(flipping) return;
  flipOld.getContext('2d').drawImage(canvas,0,0);       // いまの見開きを写しとる
  toPage(extOld);                                         // ページの大きさの紙にも写しておく（めくる紙の絵）
  flipDir = dir===-1 ? -1 : 1;
  if(flipDir===1 && !toScene && GT.scene && GT.scene.onClear){ try{ GT.scene.onClear(); }catch(e){ console.error(e); } }   // ステージを抜けたとき（本のページに書きこむ など）
  flipFromId = GT.scene ? GT.scene.id : null;            // どの場面からめくったか（森の出口なら、光がもれる）
  FLIP_DUR = (flipFromId && GT.flipGlowFrom.has(flipFromId)) ? 2.2 : FLIP_DUR_BASE;   // 光がもれるめくりは、ゆっくり
  flipping=true; flipT=0; flipSwapped=true; GT.sfx&&GT.sfx('page');
  GT.player.vx=0; GT.player.vy=0;
  setFlipHide(true);
  if(toScene){ startScene(toScene); }
  else if(flipDir>0){ pageNo++; advanceScene(); }             // 次のシーンは、めくった紙のうしろで始まっている
  else { startScene(GT.sceneIndex); }                    // 前へもどる：同じステージを、最初から
}
GT.startPageFlip=startPageFlip;

/* ========================================================================== */
/*  会話エンジン                                                              */
/* ========================================================================== */
const dlg=document.getElementById('dlg');
const dlgSpeaker=document.getElementById('dlgSpeaker');
const dlgLine=document.getElementById('dlgLine');
const dlgChoices=document.getElementById('dlgChoices');
const dlgHint=document.getElementById('dlgHint');
let dq=[], dChoices=null, dOnComplete=null;
let typing=false, typeTarget='', typeI=0, typeAcc=0;
let choicesShown=false;

function beginDialogue(lines,choices,onComplete){
  dq=(lines||[]).slice(); dChoices=choices||null; dOnComplete=onComplete||null;
  choicesShown=false;
  dlg.classList.add('show'); dlgChoices.innerHTML=''; nextLine();
}
function nextLine(){
  dlgChoices.innerHTML='';
  if(dq.length===0){
    if(dChoices){ showChoices(dChoices); return; } dlgHint.style.display='none'; finishDialogue(); return;
  }
  const line=dq.shift();
  for(const h of lineHooks) h(line);
  if(line.act && actHooks[line.act]) actHooks[line.act]();
  if(holdFn){ startHold(line); return; }      // 人物が動いているあいだは、会話の枠を消して待つ
  showLine(line);
}
/* 動いているところを見せる：act の中で GT.holdDialogue(終わったか) を呼ぶと、
   その動き（赤ずきんが駆けだす・狼が去る など）が終わるまで、会話の枠と立ち絵を消して待ち、終わってからその行の文を出す。
   待っているあいだは、タップしても進まない（いつまでも終わらないときのために、最長 HOLD_MAX 秒で先へ進む） */
const HOLD_MAX=6;
let holdFn=null, holdWait=null;
GT.holdDialogue=fn=>{ holdFn=fn; };
function startHold(line){
  const f=holdFn, t0=performance.now(); holdFn=null;
  dlg.classList.add('hold'); showPortrait(null); dlgLine.textContent=''; dlgSpeaker.textContent='';
  holdWait=()=>{ if(f() || performance.now()-t0>HOLD_MAX*1000){ holdWait=null; dlg.classList.remove('hold'); showLine(line); } };
}
function endHold(){ if(holdWait){ holdWait=null; dlg.classList.remove('hold'); } }
/* 主人公の名前（序で入力する。GT.flags.playerName にしまうので、セーブにも入る）。
   セリフの t に {name} と書くと、その名前に置きかわる。主人公のセリフ（c:'boy'）の名前の欄にも出る */
GT.playerName=()=>(GT.flags && GT.flags.playerName) || '少年';
/* 名前を名乗るまでは「？？？」と出す人（マリ）。flags.mariNamed が false のあいだ（序章で「わたしは、マリ」と名乗るまで）。
   古いセーブで mariNamed が無いときは、名乗ったあととみなす */
GT.speakerName=(c,name)=> (c==='mari' && GT.flags && GT.flags.mariNamed===false) ? '？？？' : name;
const withName=t=>String(t||'').replace(/\{name\}/g, GT.playerName());
function showLine(line){
  // sc … 名前の色だけ別の人にする（正体をかくすとき）
  dlgSpeaker.className='speaker '+(line.sc||line.c||''); dlgSpeaker.textContent = line.c==='boy' ? GT.playerName() : GT.speakerName(line.c, line.s||'');
  showPortrait(line.c, line);
  dlgLine.classList.toggle('big', !!line.big);   // セリフに big:true と書くと、太く大きな文字（叫ぶところなど）
  typing=true; typeTarget=withName(line.t); typeI=0; typeAcc=0; dlgLine.textContent=''; dlgHint.style.display='block';
  if(line.ask==='name') showNameAsk();
}
/* 名前を入力する（セリフに ask:'name' と書くと、その行で入力欄を出して、決めるまで先へ進まない） */
function showNameAsk(){
  choicesShown=true; dlgHint.style.display='none'; dlgChoices.innerHTML='';
  const box=document.createElement('div'); box.className='name-ask';
  box.innerHTML='<input type="text" maxlength="8" placeholder="なまえ（8文字まで）" aria-label="主人公の名前"><button class="choice ui-en" type="button">OK</button>';
  const input=box.querySelector('input'), ok=box.querySelector('button');
  input.value=(GT.flags && GT.flags.playerName) || '';
  const decide=()=>{
    const v=input.value.trim().slice(0,8);
    if(!v){ input.focus(); input.classList.add('shake'); setTimeout(()=>input.classList.remove('shake'),400); return; }
    GT.flags.playerName=v; choicesShown=false; nextLine();   // （名前を決めたときは、音を鳴らさない）
  };
  // 名前を打っているあいだは、ゲームのキー操作（R でやり直す・S でスキップなど）に渡さない
  input.addEventListener('keydown',e=>{ e.stopPropagation(); if(e.key==='Enter' && !e.isComposing && e.keyCode!==229){ e.preventDefault(); decide(); } });
  input.addEventListener('keyup',e=>e.stopPropagation());
  ok.addEventListener('click',decide);
  dlgChoices.appendChild(box);
  setTimeout(()=>input.focus({preventScroll:true}),50);
}
/* 選択肢：when:()=>true/false を書くと、そのときだけ選べる。
   選べないときは、lockedLabel を書いていれば「選べない選択肢」として うすく出す（書いていなければ出さない） */
function showChoices(choices){
  choicesShown=true; showPortrait(null);
  dlgSpeaker.textContent=''; dlgLine.textContent=''; dlgHint.style.display='none'; dlgChoices.innerHTML='';
  choices.forEach(ch=>{
    const open=!ch.when || ch.when();
    if(!open){ if(!ch.lockedLabel) return;
      const b=document.createElement('button'); b.className='choice locked'; b.disabled=true;
      b.textContent=typeof ch.lockedLabel==='function'?ch.lockedLabel():ch.lockedLabel; dlgChoices.appendChild(b); return; }
    const b=document.createElement('button'); b.className='choice'; b.textContent=ch.label;
    b.addEventListener('click',()=>{ if(ch.set) ch.set(); dChoices=null; choicesShown=false;
      const resolvedAfter = typeof ch.after==='function' ? ch.after() : ch.after;
      dq = resolvedAfter ? resolvedAfter.slice() : []; if(dq.length){ nextLine(); } else { finishDialogue(); } });
    dlgChoices.appendChild(b);
  });
}
function finishDialogue(){ showPortrait(null); const cb=dOnComplete; dOnComplete=null; if(cb) cb(); }   // 会話が終わったら、立ち絵はかならず消す（飛ばしたときに残らないように）
function hideDialogue(){ dlg.classList.remove('show'); }
function tryAdvanceDialogue(){
  if(!dlg.classList.contains('show')) return false;
  if(holdWait) return true;                     // 動きを見せているあいだは進まない
  if(choicesShown) return false;
  if(typing){ dlgLine.textContent=typeTarget; typing=false; return true; }
  nextLine(); return true;
}
/* ストーリースキップ：残りの行を一気に飛ばす（選択肢があればそこで止まる）。
   飛ばした行の act（窓のぞきの開閉など）も順番どおりに実行するので、ステージの状態はずれない。 */
function skipDialogue(){
  if(!dlg.classList.contains('show') || choicesShown) return;
  typing=false; endHold(); holdFn=null;
  while(dq.length){
    const line=dq.shift();
    for(const h of lineHooks) h(line);
    if(line.act && actHooks[line.act]) actHooks[line.act]();
    holdFn=null;                                // 飛ばすときは、動きを待たない
    if(line.ask){ showLine(line); typing=false; dlgLine.textContent=typeTarget; return; }   // 名前の入力では止まる
  }
  if(dChoices){ showChoices(dChoices); return; }
  dlgHint.style.display='none'; finishDialogue();
}
GT.skipDialogue=skipDialogue;
// 会話の枠の右上に「スキップ」ボタンを置く（index.html は触らずに、ここで作る）
const skipBtn=document.createElement('button');
skipBtn.textContent='Skip ≫';
skipBtn.title='会話を飛ばす（S キー）';
Object.assign(skipBtn.style,{ position:'absolute', top:'1.1cqw', right:'1.33cqw', padding:'0.33em 1em',
  background:'rgba(120,40,70,0.25)', border:'1px solid rgba(201,160,112,0.55)', borderRadius:'14px',
  color:'#e8dcc0', fontFamily:"'Caveat',cursive", fontSize:'clamp(15px,1.85cqw,44px)', lineHeight:'1', letterSpacing:'0.02em', cursor:'pointer' });   // ボタンの文字は英語の筆記体
skipBtn.addEventListener('pointerdown',e=>{ e.preventDefault(); e.stopPropagation(); skipDialogue(); });
dlg.appendChild(skipBtn);
// 選択肢を出しているあいだは、スキップボタンを隠す
new MutationObserver(()=>{ skipBtn.style.display = choicesShown ? 'none' : ''; })
  .observe(dlgChoices,{childList:true});

/* 立ち絵：しゃべっているキャラの絵を、会話の枠の右うしろに出す。
   どのキャラ（セリフの c）にどの画像を使うかは playlist.js の GT.portraits で決める。
   GT.portraits に無いキャラのときは出さない。関数にすると、そのセリフ（{s,c,t}）を受けとって絵を選べる。 */
GT.portraits = GT.portraits || {};
const portrait=document.createElement('img');
portrait.alt='';
Object.assign(portrait.style,{ position:'absolute', right:'2%', bottom:'0', height:'92%', maxWidth:'45%',
  objectFit:'contain', objectPosition:'bottom right', pointerEvents:'none', opacity:'0',
  transition:'opacity .18s ease', filter:'drop-shadow(0 4px 10px rgba(0,0,0,0.35))' });
dlg.parentNode.insertBefore(portrait, dlg);   // 会話の枠より奥（枠が手前に重なる）
let portraitKey=null, portraitToken=0;
/* 立ち絵の読みこみ：GT.preloadPortraits([...]) で、ゲームの起動時に全部読みこんでおく（playlist.js の GT.portraitFiles）。
   img の src を差しかえると、ブラウザは新しい絵の用意ができるまで前の絵を出したままにする。
   そのままだと、別の人に切りかわる一瞬だけ、前の人の絵が見えてしまう。
   なので、絵が変わるときは いったん消して、新しい絵の用意（decode）ができてから出す */
const portraitCache={};
function portraitImage(src){ let im=portraitCache[src];
  if(!im){ im=new Image(); im.src=encodeURI(src); portraitCache[src]=im; if(im.decode) im.decode().catch(()=>{}); }
  return im; }
GT.preloadPortraits=list=>{ for(const s of list||[]) portraitImage(s); };
function showPortrait(c, line){
  let src = c ? GT.portraits[c] : null;
  if(typeof src==='function') src=src(line||{});  // 向きやセリフの中身で絵を変えるとき（playlist.js の mari・narr など）
  if(!src || !dlg.classList.contains('show')){ portrait.style.transition='none'; portrait.style.opacity='0'; portraitKey=null; portraitToken++; return; }   // すぐに消す（うすく残らないように）
  // 右向きに描かれた絵は、左右反転して左向きにする（GT.portraitMirror に入っている絵。playlist.js）
  const flip = (GT.portraitMirror||[]).includes(src) ? 'scaleX(-1)' : '';
  if(portraitKey===src){ portrait.style.transform=flip; portrait.style.opacity='1'; return; }
  portraitKey=src; const tok=++portraitToken;
  portrait.style.transition='none'; portrait.style.opacity='0';          // 前の絵は、すぐに消す
  portraitImage(src);
  portrait.src=encodeURI(src); portrait.style.transform=flip;
  const show=()=>{ if(tok!==portraitToken) return;                        // そのあいだに別の絵になっていたら出さない
    portrait.style.transition='opacity .18s ease'; portrait.style.opacity='1'; };
  (portrait.decode ? portrait.decode() : Promise.resolve()).then(show,show);
}
// 会話の枠が閉じたら、立ち絵も消す
new MutationObserver(()=>{ if(!dlg.classList.contains('show')) showPortrait(null); })
  .observe(dlg,{attributes:true, attributeFilter:['class']});
GT.showPortrait=showPortrait;

/* やり直す：いまのステージを最初からやり直す（詰んだとき用。R キーでも）。
   ステージの地形・箱・敵・重力・会話は、ステージに入ったときの状態にもどる。 */
function restartStage(){
  if(flipping || !GT.scene) return;
  hideDialogue(); document.getElementById('qte').classList.remove('show');
  for(const k in keys) keys[k]=false;
  startScene(GT.sceneIndex);
}
GT.restartStage=restartStage;
const resetBtn=document.createElement('button');
resetBtn.textContent='↺ Reset';
resetBtn.title='このステージを最初からやり直す（R キー）';
Object.assign(resetBtn.style,{ position:'absolute', top:'0.67cqw', right:'0.9cqw', padding:'0.25em 0.85em', zIndex:'2',
  background:'rgba(34,12,24,0.78)', border:'1px solid rgba(201,160,112,0.6)', borderRadius:'12px',
  color:'#e8dcc0', fontFamily:"'Caveat',cursive", fontSize:'clamp(15px,1.85cqw,44px)', lineHeight:'1', letterSpacing:'0.02em', cursor:'pointer' });
// 1回目のタップでは「もう一度で やり直す」と出すだけ。2.5 秒以内にもう一度押したら、やり直す
// （スマホで会話を進めようと画面の端をタップしたとき、うっかりやり直さないように）
let resetArmT=0;
// 表示の文字は dataset で変えられる（js/page.js が「Reset」の旗にする）。押した1回目は .armed が付く
const resetLabel=()=>{ resetBtn.textContent=resetBtn.dataset.label||'↺ Reset'; resetBtn.classList.remove('armed');
  if(!resetBtn.dataset.label) resetBtn.style.background='rgba(34,12,24,0.78)'; };
resetBtn.addEventListener('pointerdown',e=>{ e.preventDefault(); e.stopPropagation();
  resetArmT=0; resetLabel(); restartStage(); });   // 1回押すだけで、やり直す
canvas.parentNode.appendChild(resetBtn); resetBtn.id='resetBtn';
window.addEventListener('keydown',e=>{ if(e.key==='r'||e.key==='R'){ e.preventDefault(); restartStage(); } });

/* 操作の説明の枠（チュートリアル用）。ステージ側から GT.drawHint(中心x, 中心y, 行の配列) で描く。
   行は '文字' か [['キー','キー'], '説明'] の形。キーはキーボードのキーの形で描く。 */
function drawKeycapBright(x,y,label){   // 明るい絵本のころのキー（チュートリアル）
  ctx.font="700 12px 'Zen Old Mincho',serif";
  const w=Math.max(20,ctx.measureText(label).width+12);
  roundRect(x,y-11,w,22,5); ctx.fillStyle='#f3ead0'; ctx.fill();
  ctx.strokeStyle='#8a7a5a'; ctx.lineWidth=1.2; ctx.stroke();
  ctx.fillStyle='#3a2f2a'; ctx.textAlign='center'; ctx.fillText(label,x+w/2,y+1);
  return w;
}
function drawKeycap(x,y,label){                     // ゴシック：暗い板に、くすんだ金のふち（下に厚み）
  ctx.font="700 12px 'Zen Old Mincho',serif";
  const w=Math.max(20,ctx.measureText(label).width+12);
  roundRect(x,y-9,w,22,4); ctx.fillStyle='#100c08'; ctx.fill();                       // 厚み
  roundRect(x,y-11,w,21,4); const g=ctx.createLinearGradient(0,y-11,0,y+10); g.addColorStop(0,'#3e3226'); g.addColorStop(1,'#241c14');
  ctx.fillStyle=g; ctx.fill(); ctx.strokeStyle='rgba(214,176,118,0.85)'; ctx.lineWidth=1.1; ctx.stroke();
  ctx.fillStyle='#f3dfb0'; ctx.textAlign='center'; ctx.fillText(label,x+w/2,y);
  return w;
}
/* 案内の枠のかざり：すみの、いばらの巻きひげ（dx,dy … 向き） */
function hintCorner(x,y,dx,dy){
  ctx.save(); ctx.translate(x,y); ctx.scale(dx,dy); ctx.strokeStyle='rgba(214,176,118,0.9)'; ctx.lineWidth=1.2; ctx.lineCap='round';
  ctx.beginPath(); ctx.moveTo(0,16); ctx.quadraticCurveTo(0,0,16,0); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(5,13); ctx.bezierCurveTo(5,4,13,4,13,9); ctx.bezierCurveTo(13,12,9,12,9,9); ctx.stroke();   // 巻きひげ
  ctx.beginPath(); ctx.moveTo(18,0); ctx.lineTo(22,-2); ctx.moveTo(0,18); ctx.lineTo(-2,22); ctx.stroke();                 // とげ
  ctx.restore();
}
/* 虫食い：古い本のページが、虫に食べられたあと。
   GT.wormEaten(ctx, x, y, 幅, 高さ, 種, {edges:['left','top','bottom'], under:'#色', count:6, avoid:[{x,y,w,h}]})
     ・食べ跡の穴 … 穴の向こうに「次のページ」が見える（under の淡い紙の色。黒くはしない）。ふちに切り口の影だけ
     ・ページのはしの劣化 … edges のふちが黄ばみ、波うつように よれて、ところどころ かじられて欠ける
     （avoid … 文字などのために、食べないでおく場所）
   本を読みかえす画面（bookview.js）と、序章の本の場面（00_opening.js）が使う。 */
GT.wormEaten=function(c,x,y,w,h,seed,o){
  o=o||{};
  let s=Math.abs(Math.floor((seed||1)*9973))%233280+1; const R=()=>{ s=(s*9301+49297)%233280; return s/233280; };
  const S=Math.min(w,h)/260, under=o.under||'#e3d6b4';
  const keep=o.avoid||[];
  const free=(px,py,r)=>!keep.some(k=>px+r>k.x && px-r<k.x+k.w && py+r>k.y && py-r<k.y+k.h);
  const edges=o.edges||[];
  c.save(); c.beginPath(); c.rect(x,y,w,h); c.clip();

  // ── ページのはしの劣化：黄ばみ（ふちほど濃い） ──
  for(const e of edges){
    const d=(e==='left'||e==='right'?w:h)*0.16;
    const g = e==='left'  ? c.createLinearGradient(x,0,x+d,0)
            : e==='right' ? c.createLinearGradient(x+w,0,x+w-d,0)
            : e==='top'   ? c.createLinearGradient(0,y,0,y+d)
            :               c.createLinearGradient(0,y+h,0,y+h-d);
    g.addColorStop(0,'rgba(176,136,78,0.38)'); g.addColorStop(0.4,'rgba(176,136,78,0.14)'); g.addColorStop(1,'rgba(176,136,78,0)');
    c.fillStyle=g; c.fillRect(x,y,w,h);
  }
  // しみ（うすい茶色のまだら）
  for(let i=0;i<5;i++){ const px=x+w*R(), py=y+h*R(), r=(10+R()*26)*S;
    const g=c.createRadialGradient(px,py,0,px,py,r); g.addColorStop(0,'rgba(170,128,70,0.12)'); g.addColorStop(1,'rgba(170,128,70,0)');
    c.fillStyle=g; c.beginPath(); c.arc(px,py,r,0,Math.PI*2); c.fill(); }

  // ── 食べ跡の穴（次のページが見える） ──
  const holes=[];
  const addHole=(bx,by,r0,edge)=>{                  // ふちが、かじったように でこぼこした1つの形
    const n=16, rx=r0*(0.8+R()*0.5), ry=r0*(0.65+R()*0.4), rot=R()*Math.PI, pts=[];
    const b1=R()*Math.PI*2, b2=R()*Math.PI*2;          // かじった所（2か所）が、少し大きくへこむ
    for(let i=0;i<n;i++){ const a=i/n*Math.PI*2;
      const k=0.82+R()*0.3+0.22*Math.max(0,Math.cos(a-b1))**4+0.16*Math.max(0,Math.cos(a-b2))**4;
      const ex=Math.cos(a)*rx*k, ey=Math.sin(a)*ry*k;
      pts.push([bx+ex*Math.cos(rot)-ey*Math.sin(rot), by+ex*Math.sin(rot)+ey*Math.cos(rot)]); }
    if(pts.every(([px,py])=>free(px,py,3*S))) holes.push({pts,edge}); };
  for(let i=0;i<(o.count!=null?o.count:6);i++) addHole(x+w*(0.14+R()*0.72), y+h*(0.12+R()*0.76), (5+R()*10)*S, false);
  for(const e of edges){ for(let i=0;i<1+Math.floor(R()*2);i++){ let t=0.15+R()*0.7; const r0=(5+R()*7)*S;
    if((e==='top'||e==='bottom') && o.seam) t = o.seam==='right' ? t*0.8 : 0.2+t*0.8;   // 背表紙のそばは かじらない
    addHole(e==='left'?x:e==='right'?x+w:x+w*t, e==='top'?y:e==='bottom'?y+h:y+h*t, r0, true); } }
  const holePath=(hl)=>{ const p=hl.pts, m=(a,b)=>[(a[0]+b[0])/2,(a[1]+b[1])/2]; c.beginPath();   // 角をなめらかに
    let s0=m(p[p.length-1],p[0]); c.moveTo(s0[0],s0[1]);
    for(let i=0;i<p.length;i++){ const q=m(p[i],p[(i+1)%p.length]); c.quadraticCurveTo(p[i][0],p[i][1],q[0],q[1]); } c.closePath(); };
  for(const hl of holes){
    holePath(hl); c.strokeStyle='rgba(150,112,64,0.35)'; c.lineWidth=1.6*S; c.stroke();   // 穴のふちの、少し焼けた紙
    c.fillStyle=under; c.fill();                                                          // 穴の向こうの、次のページ
    c.save(); holePath(hl); c.clip();                                                     // 切り口の影（上と左だけ、うすく）
    c.translate(1.8*S,1.8*S); holePath(hl); c.lineWidth=3*S; c.strokeStyle='rgba(110,80,46,0.25)'; c.stroke();
    c.restore();
  }
  c.restore();

  // ── ページのはしの よれ：ふちが波うって、外側が少し欠ける（under の色で欠けたところを見せる） ──
  c.save();
  for(const e of edges){
    const horiz=(e==='top'||e==='bottom'), len=horiz?w:h, n=Math.max(8,Math.round(len/(14*S)));
    const base = e==='left'?x : e==='right'?x+w : e==='top'?y : y+h, sign=(e==='left'||e==='top')?1:-1;
    // seam（'left' / 'right'）… 背表紙側。上下のふちの よれを、つなぎ目に向かって 0 にして、となりのページと高さをそろえる
    const seamK=t=>{ if(!horiz || !o.seam) return 1; const u=Math.min(1,(o.seam==='right'?1-t:t)/0.12); return u*u*(3-2*u); };
    const pts=[]; for(let i=0;i<=n;i++){ const t=i/n, wob=((Math.sin(t*9+seed)*0.5+0.5)*2.2*S + R()*1.8*S)*seamK(t);
      pts.push([t, wob]); }
    const P=(t,d)=> horiz ? [x+w*t, base+sign*d] : [base+sign*d, y+h*t];
    // 欠けた部分（よれて内側に入りこんだところ）
    c.beginPath(); let [sx,sy]=P(0,0); c.moveTo(sx,sy);
    for(const [t,d] of pts){ const [px,py]=P(t,d); c.lineTo(px,py); }
    const [ex,ey]=P(1,0); c.lineTo(ex,ey); c.closePath();
    c.fillStyle=o.outside||'rgba(0,0,0,0)'; if(o.outside) c.fill();
    // よれたふちの線（紙のめくれ・しわ）
    c.beginPath(); pts.forEach(([t,d],i)=>{ const [px,py]=P(t,d+0.6*S); i?c.lineTo(px,py):c.moveTo(px,py); });
    c.strokeStyle='rgba(120,88,50,0.45)'; c.lineWidth=1.1*S; c.stroke();
    // 小さなしわ（ふちから内側へ、短い線）
    for(let i=0;i<Math.round(len/(60*S));i++){ const t=0.05+R()*0.9, l=(4+R()*8)*S, [px,py]=P(t,1.5*S), [qx,qy]=P(t+(R()-0.5)*0.02,1.5*S+l);
      c.beginPath(); c.moveTo(px,py); c.lineTo(qx,qy); c.strokeStyle='rgba(120,88,50,0.22)'; c.lineWidth=0.8*S; c.stroke(); }
  }
  // 角のめくれ（edges の2本が交わる角）
  const corners=[]; const has=e=>edges.includes(e);
  if(has('top')&&has('left')) corners.push([x,y,1,1]); if(has('top')&&has('right')) corners.push([x+w,y,-1,1]);
  if(has('bottom')&&has('left')) corners.push([x,y+h,1,-1]); if(has('bottom')&&has('right')) corners.push([x+w,y+h,-1,-1]);
  for(const [cx,cy,dx,dy] of corners){ if(R()<0.35) continue; const r=(10+R()*8)*S;
    c.beginPath(); c.moveTo(cx+dx*r,cy); c.lineTo(cx,cy+dy*r); c.lineTo(cx,cy); c.closePath();
    c.fillStyle=o.outside||under; c.fill();                                           // めくれて見える裏
    c.beginPath(); c.moveTo(cx+dx*r,cy); c.lineTo(cx,cy+dy*r); c.lineTo(cx+dx*r*0.7,cy+dy*r*0.7); c.closePath();
    const g=c.createLinearGradient(cx+dx*r*0.5,cy+dy*r*0.5,cx+dx*r*0.75,cy+dy*r*0.75);
    g.addColorStop(0,'#efe3c2'); g.addColorStop(1,'#d8c79c'); c.fillStyle=g; c.fill();
    c.strokeStyle='rgba(120,88,50,0.5)'; c.lineWidth=0.9*S; c.stroke(); }
  c.restore();
};

function drawHintBright(cx,cy,lines){   // 明るい絵本のころの案内の枠（チュートリアル）
  ctx.save(); ctx.textBaseline='middle';
  const FONT="700 14px 'Zen Old Mincho',serif";
  const widths=lines.map(l=>{ ctx.font=FONT; if(typeof l==='string') return ctx.measureText(l).width;
    ctx.font="700 12px 'Zen Old Mincho',serif"; const kw=touchKeys(l[0]).reduce((a,k)=>a+Math.max(20,ctx.measureText(k).width+12)+14,0);
    ctx.font=FONT; return kw+ctx.measureText(l[1]).width+6; });
  const bw=Math.max(...widths)+28, bh=lines.length*26+16;
  const bx=Math.max(EDGE+6,Math.min(W-EDGE-6-bw,cx-bw/2)), by=Math.max(EDGE+30,Math.min(H-EDGE-6-bh,cy-bh/2));
  ctx.globalAlpha=0.88+0.12*Math.sin(performance.now()/300);
  roundRect(bx,by,bw,bh,12); ctx.fillStyle='rgba(43,36,24,0.82)'; ctx.fill();
  ctx.strokeStyle='rgba(232,195,90,0.7)'; ctx.lineWidth=1.5; ctx.stroke();
  lines.forEach((l,i)=>{ const y=by+20+i*26; let x=bx+14; ctx.textAlign='left';
    if(typeof l==='string'){ ctx.font=FONT; ctx.fillStyle='#f3ead0'; ctx.fillText(l,x,y); return; }
    const ks=touchKeys(l[0]);
    ks.forEach((k,j)=>{ x+=drawKeycapBright(x,y,k)+4;
      if(j<ks.length-1){ ctx.fillStyle='#cbb98f'; ctx.font="700 12px serif"; ctx.textAlign='left'; ctx.fillText('/',x,y); x+=10; } });
    ctx.font=FONT; ctx.textAlign='left'; ctx.fillStyle='#e8c35a'; ctx.fillText(l[1],x+4,y); });
  ctx.restore();
}
/* 説明の枠（チュートリアル）：キャンバスではなく、ゲーム画面の上に重ねた HTML で出す。
   ステージ側は、これまでどおり毎フレーム GT.drawHint(中心x, 中心y, 行) を呼ぶ。描いたフレームだけ表示される */
const hintEl=document.createElement('div'); hintEl.id='gtHint'; canvas.parentElement.appendChild(hintEl);
(function(){ const st=document.createElement('style'); st.textContent=`
  #gtHint{ position:absolute; z-index:1; display:none; transform:translate(-50%,-50%); pointer-events:none; white-space:nowrap;
    padding:0.55em 1.05em; border-radius:0.45em; background:rgba(43,36,24,0.9); color:#f1e8d6;
    font-family:'Zen Old Mincho',serif; font-weight:700; font-size:clamp(10px,1.55cqw,36px); line-height:1.75; letter-spacing:0.02em;
    box-shadow:0 0.25em 0.9em rgba(0,0,0,0.45), inset 0 0 0 1px rgba(214,176,118,0.85), inset 0 0 0 0.3em rgba(43,36,24,0.9), inset 0 0 0 calc(0.3em + 1px) rgba(214,176,118,0.35);
    animation:gtHintPulse 1.6s ease-in-out infinite; }
  #gtHint.show{ display:block; }
  #gtHint .row{ display:flex; align-items:center; gap:0.35em; }
  #gtHint kbd{ display:inline-block; min-width:1.5em; padding:0 0.4em; border-radius:0.25em; text-align:center; font:inherit; font-size:0.85em; line-height:1.55;
    background:linear-gradient(#3e3226,#241c14); color:#f3dfb0; box-shadow:inset 0 0 0 1px rgba(214,176,118,0.85), 0 0.15em 0 #100c08; }
  #gtHint .sl{ color:#b9a27a; font-size:0.85em; }
  #gtHint .lb{ color:#e8c88a; margin-left:0.25em; }
  #gtHint.bright{ background:rgba(43,36,24,0.82); color:#f3ead0; box-shadow:inset 0 0 0 1.5px rgba(232,195,90,0.7); border-radius:0.8em; }
  #gtHint.bright kbd{ background:#f3ead0; color:#3a2f2a; box-shadow:inset 0 0 0 1px #8a7a5a; }
  #gtHint.bright .lb{ color:#e8c35a; }
  @keyframes gtHintPulse{ 0%,100%{ opacity:0.92; } 50%{ opacity:1; } }`; document.head.appendChild(st); })();
let hintReq=null, hintKey='';
const escH=t=>String(t).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
function flushHint(){
  if(!hintReq || flipping || GT.paused){ hintEl.classList.remove('show'); hintReq=null; return; }
  const {cx,cy,lines}=hintReq; hintReq=null;
  const html=lines.map(l=>{ if(typeof l==='string') return `<div class="row">${escH(l)}</div>`;
    const ks=touchKeys(l[0]).map(k=>`<kbd>${escH(k)}</kbd>`).join('<span class="sl">/</span>');
    return `<div class="row">${ks}<span class="lb">${escH(l[1])}</span></div>`; }).join('');
  const key=html+(GT.isBright&&GT.isBright()?'b':'g');
  if(key!==hintKey){ hintEl.innerHTML=html; hintEl.classList.toggle('bright',!!(GT.isBright&&GT.isBright())); hintKey=key; }
  hintEl.style.left=(Math.max(EDGE+60,Math.min(W-EDGE-60,cx))/W*100)+'%';
  hintEl.style.top=(Math.max(EDGE+40,Math.min(H-EDGE-40,cy))/H*100)+'%';
  hintEl.classList.add('show');
}
GT.drawHint=function(cx,cy,lines){ hintReq={cx,cy,lines}; return; };   // （下の、キャンバスに描くしくみは使わない）
GT.drawHintCanvas=function(cx,cy,lines){
  if(GT.isBright&&GT.isBright()) return drawHintBright(cx,cy,lines);   // チュートリアル（明るい場面）は、前の枠のまま
  ctx.save(); ctx.textBaseline='middle';
  const FONT="700 14px 'Zen Old Mincho',serif";
  const widths=lines.map(l=>{ ctx.font=FONT; if(typeof l==='string') return ctx.measureText(l).width;
    ctx.font="700 12px 'Zen Old Mincho',serif"; const kw=touchKeys(l[0]).reduce((a,k)=>a+Math.max(20,ctx.measureText(k).width+12)+14,0);
    ctx.font=FONT; return kw+ctx.measureText(l[1]).width+6; });
  const bw=Math.max(...widths)+40, bh=lines.length*26+26;
  const bx=Math.max(EDGE+6,Math.min(W-EDGE-6-bw,cx-bw/2)), by=Math.max(EDGE+34,Math.min(H-EDGE-6-bh,cy-bh/2));
  const pulse=0.5+0.5*Math.sin(performance.now()/420);
  // 枠：赤紫の黒（上ほど少し明るい）、影、くすんだ金の二重のふち、すみのいばら、上のまん中に薔薇
  ctx.save(); ctx.shadowColor='rgba(8,2,6,0.7)'; ctx.shadowBlur=14; ctx.shadowOffsetY=4;
  roundRect(bx,by,bw,bh,6); const bg=ctx.createLinearGradient(0,by,0,by+bh); bg.addColorStop(0,'rgba(43,36,24,0.9)'); bg.addColorStop(1,'rgba(43,36,24,0.9)');   // 地の色は、元の茶色（明るい場面の説明の枠と同じ）
  ctx.fillStyle=bg; ctx.fill(); ctx.restore();
  roundRect(bx,by,bw,bh,6); ctx.strokeStyle=`rgba(214,176,118,${0.7+0.25*pulse})`; ctx.lineWidth=1.4; ctx.stroke();
  roundRect(bx+4,by+4,bw-8,bh-8,3); ctx.strokeStyle='rgba(214,176,118,0.35)'; ctx.lineWidth=1; ctx.stroke();
  hintCorner(bx+3,by+3,1,1); hintCorner(bx+bw-3,by+3,-1,1); hintCorner(bx+3,by+bh-3,1,-1); hintCorner(bx+bw-3,by+bh-3,-1,-1);
  { const rx=bx+bw/2, ry=by;                                                               // 薔薇と葉
    ctx.fillStyle='#2a3624'; ctx.beginPath(); ctx.ellipse(rx-9,ry+1,6,2.6,-0.3,0,Math.PI*2); ctx.ellipse(rx+9,ry+1,6,2.6,0.3,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(rx,ry,5.5,0,Math.PI*2); ctx.fillStyle='#6e1024'; ctx.fill();
    ctx.beginPath(); ctx.arc(rx-1,ry-1,3.4,0,Math.PI*2); ctx.fillStyle='#b3263f'; ctx.fill();
    ctx.beginPath(); ctx.arc(rx-0.6,ry-0.6,1.8,0.5,5.6); ctx.strokeStyle='#4a0816'; ctx.lineWidth=0.8; ctx.stroke(); }
  lines.forEach((l,i)=>{ const y=by+24+i*26; let x=bx+20; ctx.textAlign='left';
    if(typeof l==='string'){ ctx.font=FONT; ctx.fillStyle='#f1e8d6'; ctx.fillText(l,x,y); return; }
    const ks=touchKeys(l[0]);
    ks.forEach((k,j)=>{ x+=drawKeycap(x,y,k)+4;
      if(j<ks.length-1){ ctx.fillStyle='#b9a27a'; ctx.font="700 12px serif"; ctx.textAlign='left'; ctx.fillText('/',x,y); x+=10; } });
    ctx.font=FONT; ctx.textAlign='left'; ctx.fillStyle='#e8c88a'; ctx.fillText(l[1],x+4,y); });
  ctx.restore();
};

GT.beginDialogue=beginDialogue; GT.hideDialogue=hideDialogue;
/* 吹き出しマーク（話しかけられる人の頭の上）。(cx,cy)＝マークの中心、g＝重力（-1 なら しっぽが上を向く）、
   near＝話しかけられる近さにいる（金色にして、少し大きく） */
function drawTalkMark(cx,cy,g,near,must){
  const t=performance.now()/1000, bob=Math.sin(t*3)*2.5, k=near?1.15+0.06*Math.sin(t*6):1;
  ctx.save(); ctx.translate(cx,cy+bob*g); ctx.scale(k,k);
  const w=30, h=20;
  const fill = near ? '#fff4d6' : '#fffaf0', line = near ? '#c0902a' : '#8a7a5a';
  const GOLD='#c0902a';   // 「！」「…」の色（金色）
  ctx.beginPath(); roundRectPath(-w/2,-h/2,w,h,9);
  ctx.fillStyle=fill; ctx.fill(); ctx.lineWidth=1.6; ctx.strokeStyle=line; ctx.stroke();
  // しっぽ（人のほうへ向ける）。枠の線をまたいで塗り、つなぎ目を消す
  const ty=g>0 ? h/2 : -h/2, tip=g>0 ? h/2+8 : -h/2-8, d=g>0?-2:2;
  ctx.beginPath(); ctx.moveTo(-5,ty+d); ctx.lineTo(-1,tip); ctx.lineTo(4,ty+d); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-5,ty); ctx.lineTo(-1,tip); ctx.lineTo(4,ty); ctx.stroke();
  if(must){                                                                            // 「！」（話さないと進めない）
    ctx.fillStyle=GOLD;
    ctx.beginPath(); ctx.moveTo(-2.6,-6.5); ctx.lineTo(2.6,-6.5); ctx.lineTo(1.4,2.5); ctx.lineTo(-1.4,2.5); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.arc(0,5.6,1.9,0,Math.PI*2); ctx.fill();
  } else {
    ctx.fillStyle=GOLD;
    for(let i=-1;i<=1;i++){ ctx.beginPath(); ctx.arc(i*7, 0, 2.2, 0, Math.PI*2); ctx.fill(); }   // 「…」（話さなくても進める）
  }
  ctx.restore();
}

canvas.addEventListener('pointerdown',e=>{
  if(dlg.classList.contains('show')){ e.preventDefault(); tryAdvanceDialogue(); return; }
  if(activeNpc && !storyTalking && !flipping){ e.preventDefault(); tryTalk(); }
});
dlg.addEventListener('pointerdown',e=>{
  if(e.target.closest('.choice, .name-ask')) return;
  e.preventDefault(); tryAdvanceDialogue();
});
window.addEventListener('keydown',e=>{
  if((e.key==='Enter'||e.key==='z'||e.key==='Z')){
    if(dlg.classList.contains('show')){ e.preventDefault(); tryAdvanceDialogue(); }
    else if(activeNpc && !storyTalking && !flipping){ e.preventDefault(); tryTalk(); }
  }
  if((e.key==='s'||e.key==='S') && dlg.classList.contains('show')){ e.preventDefault(); skipDialogue(); }
});

/* タイプライター表示 */
function typeTick(dt){
  if(!typing) return; typeAcc+=dt; const cps=42;
  while(typeAcc>1/cps && typeI<typeTarget.length){ typeAcc-=1/cps; typeI++; }
  dlgLine.textContent=typeTarget.slice(0,typeI); if(typeI>=typeTarget.length) typing=false;
}
let ttLast=performance.now();
function typeLoop(now){ const dt=(now-ttLast)/1000; ttLast=now; if(holdWait) holdWait(); typeTick(dt); requestAnimationFrame(typeLoop); }

/* ========================================================================== */
/*  物理                                                                      */
/* ========================================================================== */
let lastTime=performance.now();
GT.paused=false;                     // true のあいだ、ゲームは止まる（メニューを開いているときなど）
function loop(now){ let dt=(now-lastTime)/1000; dt=Math.min(dt,1/30); lastTime=now; if(!GT.paused){ update(dt); updateFlipBuffer(dt); } else if(flipping){ flipT+=dt; if(flipT>=FLIP_DUR){ flipping=false; setFlipHide(false); } } applyShake(dt); render(); requestAnimationFrame(loop); }   // メニューを開いたまま めくるとき（タイトルの章えらび）も、めくりを進める

function update(dt){
  const player=GT.player, gravity=GT.gravity, boxes=GT.boxes, enemies=GT.enemies;
  goalPulse+=dt;
  flashPage.left=Math.max(0,flashPage.left-dt*2.2);
  flashPage.right=Math.max(0,flashPage.right-dt*2.2);
  GT.hurtFlash=Math.max(0,GT.hurtFlash-dt*2.5);
  GT.invincible=Math.max(0,GT.invincible-dt);

  if(flipping){
    if(GT.flipFreeze!=null) flipT=GT.flipFreeze*FLIP_DUR; else flipT+=dt;   // flipFreeze（0〜1）… 確認用に、めくりの途中で止める
    if(flipT>=FLIP_DUR){ flipping=false; setFlipHide(false); }
    return;
  }
  heartLost=Math.max(0,heartLost-dt*1.6);
  if(gameOver){                                               // ゲームオーバー：少し見せてから、ページを前へもどしてやり直す
    gameOver.t+=dt;
    if(gameOver.t>gameOver.dur) startPageFlip(-1);
    return;
  }

  if(storyStage) for(const n of npcs){                       // 人物も、ページの重力にしたがう
    if(n.noGravity){ n.g=1; n.vy=0; n.y=H-EDGE-n.h; if(n.speech){ n.speech.t-=dt; if(n.speech.t<=0) n.speech=null; } continue; }   // 重力の影響を受けない人（床を歩きつづける）
    const before=n.g; GT.fallBody(n,dt);
    if(before!==n.g && n.x>-100) GT.grumble(n,n.who);          // 逆さにされた（何回もされると怒る）
    if(n.speech){ n.speech.t-=dt; if(n.speech.t<=0) n.speech=null; } }
  if(companion){ const c=companion, before=c.g; GT.fallBody(c,dt);
    if(before!==c.g) { const sp=GT.grumble(c,c.who); }                  // 逆さにされた（何回もされると怒る）
    if(c.speech){ c.speech.t-=dt; if(c.speech.t<=0) c.speech=null; }
    if(GT.physicsModes.has(GT.mode) && !flipping){
      const pl=player, back=pl.facing>=0?-38:38, target=pl.x+back;
      if(Math.abs(c.x-pl.x)>380 && pl.onGround){ c.x=Math.max(EDGE,Math.min(W-EDGE-c.w,pl.x+back)); c.y=pl.y+pl.h-c.h; c.vy=0; }   // はなれすぎたら、そばへ
      else if(Math.abs(target-c.x)>22) GT.npcStep(c,target,175,dt); } }
  if(modeUpdaters[GT.mode]){ modeUpdaters[GT.mode](dt); return; }
  if(!GT.physicsModes.has(GT.mode)) return;
  if(storyTalking) return;
  // 押し戻しの向きを決めるため、このフレームのはじめの位置を覚えておく（resolveBodyCollisions が使う）
  for(const b of [player,...boxes,...enemies]){ b.px=b.x; b.py=b.y; }
  updateExitGate();                           // ミッションが終わっていれば右端を開ける
  missionFlash=Math.max(0,missionFlash-dt);

  if(storyStage){
    activeNpc=null; let best=1e9;
    const pcx=player.x+player.w/2, pcy=player.y+player.h/2;
    for(const n of npcs){ if(!n.talkable||n.talked) continue;
      const nx=n.x+n.w/2, ny=n.y+n.h/2;
      const d=Math.hypot(pcx-nx, pcy-ny);
      if(d<TALK_RANGE && d<best){ best=d; activeNpc=n; }
    }
  } else activeNpc=null;
  GT.activeNpc=activeNpc;   // 動作確認用に公開

  const page=GT.currentPage(); const g=gravity[page];
  const canSteer=!player.flipFall;            // 本を裏返して落ちているあいだは、左右のボタンが効かない
  const left=canSteer&&(keys['ArrowLeft']||keys['a']||keys['A']);
  const right=canSteer&&(keys['ArrowRight']||keys['d']||keys['D']);
  if(left&&!right){ player.vx-=ACCEL*dt; player.facing=-1; }
  else if(right&&!left){ player.vx+=ACCEL*dt; player.facing=1; }
  else{ const d=FRICTION*dt; if(Math.abs(player.vx)<=d) player.vx=0; else player.vx-=Math.sign(player.vx)*d; }
  // 沼に触れている間は最高速度が下がる（slow を書けば沼ごとに変えられる）
  const maxSpeed=MAX_SPEED*swampFactor(player);
  player.vx=Math.max(-maxSpeed,Math.min(maxSpeed,player.vx));

  player.vy+=GRAVITY*g*dt;
  const jump=keys['ArrowUp']||keys['w']||keys['W'];
  // 話しかけるのは、画面タップか Enter だけ（↑ はキャラの近くでもジャンプ）
  if(jump&&player.onGround){ player.vy=-JUMP_SPEED*swampFactor(player,'jump')*g; player.onGround=false; }

  for(const box of boxes){
    const bg=gravity[GT.pageOf(box)]; box.vy+=GRAVITY*bg*dt;
    const d=FRICTION*dt; if(Math.abs(box.vx)<=d) box.vx=0; else box.vx-=Math.sign(box.vx)*d;
    box.vx=Math.max(-MAX_SPEED,Math.min(MAX_SPEED,box.vx));
  }

  const prevX=player.x; player.x+=player.vx*dt; const dx=player.x-prevX;
  if(dx!==0){ for(const box of boxes){ if(GT.rectsOverlap(player,box)){ box.x+=dx; box.vx=player.vx; } } }
  for(const box of boxes) resolveBodyCollisions(box,'x',GT.pagePlatforms(GT.pageOf(box)));
  resolveBodyCollisions(player,'x',boxes.concat(GT.pagePlatforms(page)));   // 箱→地形の順（地形の中に残らない）

  for(const en of enemies){
    if(!en.alive){ en.deathT+=dt; en.squash+=(1-en.squash)*Math.min(1,dt*4); continue; }
    const active=(en.page===GT.currentPage()); const eg=gravity[en.page];
    // 足場・壁に加えて、同じページの木の箱も通り抜けられない
    const enPlats=GT.pagePlatforms(en.page).concat(boxes.filter(b=>GT.pageOf(b)===en.page));
    if(active){ en.x+=en.dir*ENEMY_SPEED*swampFactor(en)*dt;   // 沼の中では敵も遅くなる
      if(en.x<en.minX){ en.x=en.minX; en.dir=1; }
      if(en.x+en.w>en.maxX){ en.x=en.maxX-en.w; en.dir=-1; }
      for(const plat of enPlats){ if(!GT.rectsOverlap(en,plat)) continue;   // 足場・壁・箱にぶつかったら折り返す
        if(en.dir>0){ en.x=plat.x-en.w; en.dir=-1; } else { en.x=plat.x+plat.w; en.dir=1; } } }
    en.vy+=GRAVITY*eg*dt; en.onGround=false;
    // 速く落ちても薄い足場をすり抜けないよう、1回 8px 以下に刻んで判定する
    const steps=Math.max(1,Math.ceil(Math.abs(en.vy*dt)/8));
    for(let i=0;i<steps&&en.vy!==0;i++){ en.y+=en.vy*dt/steps; resolveBodyCollisions(en,'y',enPlats); }
    en.squash+=(1-en.squash)*Math.min(1,dt*10);
  }

  for(const box of boxes){
    box.onGround=false;
    // 速く落ちても薄い足場や敵をすり抜けないよう、1回 8px 以下に刻んで判定する
    const steps=Math.max(1,Math.ceil(Math.abs(box.vy*dt)/8)), vy0=box.vy;
    for(let i=0;i<steps&&box.vy!==0;i++){
      box.y+=vy0*dt/steps;
      resolveBodyCollisions(box,'y',GT.pagePlatforms(GT.pageOf(box)));
      const bg=gravity[GT.pageOf(box)];
      if(GT.rectsOverlap(box,player)&&box.vy*bg>0){       // 落ちてきた箱はプレイヤーの頭に乗る（めり込まない）
        box.y=(bg===1)?player.y-box.h:player.y+player.h; box.vy=0; box.onGround=true; }
      for(const en of enemies){
        if(!en.alive||en.page!==GT.pageOf(box)) continue; const eg=gravity[en.page];
        if(GT.rectsOverlap(box,en)&&box.vy*eg>150){ GT.sfx&&GT.sfx('hit'); en.alive=false; en.squash=0.18; en.vy=0; en.deathT=0;
          box.y=(eg===1)?en.y-box.h:en.y+en.h; box.vy=0; box.onGround=true; box.squash=1.3; }
        else if(GT.rectsOverlap(box,en)&&box.vy*eg>0){   // ゆっくり落ちてきた箱は敵の上に乗る（めり込まない）
          box.y=(eg===1)?en.y-box.h:en.y+en.h; box.vy=0; box.onGround=true; }
      }
    }
    box.squash+=(1-box.squash)*Math.min(1,dt*10);
  }

  // 速く落ちても薄い足場をすり抜けないよう、1回 8px 以下に刻んで判定する
  player.onGround=false;
  const pSteps=Math.max(1,Math.ceil(Math.abs(player.vy*dt)/8)), pCols=boxes.concat(GT.pagePlatforms(page));
  for(let i=0;i<pSteps&&player.vy!==0;i++){ player.y+=player.vy*dt/pSteps; resolveBodyCollisions(player,'y',pCols); }
  if(player.onGround) player.flipFall=false;   // 着地したら、また左右に動ける

  for(const it of GT.items){ if(!it.got&&!it.hidden&&GT.rectsOverlap(player,GT.itemHitbox(it))){ it.got=true; it.gotT=0;   // アイテムを取る（hidden のあいだは取れない）
    if(itemLook==='page'){ hudPulse=1; chime(); flyScrapToBook(it); if(curStageDef&&curStageDef.itemsOptional&&GT.items.every(i=>i.got)) missionFlash=2.2; }
    const bp=curStageDef&&curStageDef.bookPage&&GT.pageRecord.find(p=>p.key===curStageDef.bookPage);   // 本のページに記録
    if(bp){ bp.found=bp.found||[]; if(!bp.found.includes(it.pid)) bp.found.push(it.pid); } } }
  hudPulse=Math.max(0,hudPulse-dt*1.8);
  for(const it of GT.items) if(it.got) it.gotT+=dt;

  if(GT.invincible<=0){ for(const en of enemies){ if(en.alive&&GT.rectsOverlap(player,en)){ GT.damagePlayer(en.x+en.w/2); break; } } }   // ぶつかったらハートが減る

  for(const fn of updatePasses) fn(dt);     // ボス戦など拡張の更新

  if(GT.goal&&GT.rectsOverlap(player,GT.goal)&&missionDone()){ startPageFlip(); }
  if(GT.mode==='play'&&stageExit&&!flipping&&(player.x+player.w/2)>=W-8){ startPageFlip(); }

  player.x=Math.max(-40,Math.min(W+40,player.x));
  player.y=Math.max(-400,Math.min(H+400,player.y));
  player.squash+=(1-player.squash)*Math.min(1,dt*10);
}

GT.respawnPlayer=function(){ const pl=GT.player; GT.sfx&&GT.sfx('hit');
  pl.x=player_start.x; pl.y=player_start.y; pl.vx=0; pl.vy=0; pl.squash=0.6; GT.hurtFlash=1; GT.invincible=1.0; };

/* 沼に触れていれば倍率（いちばん効きの強い沼のもの）、触れていなければ 1
   what='slow' … 歩く速さ（沼の slow / 標準 SWAMP_SLOW）
   what='jump' … ジャンプの勢い（沼の jump / 標準 SWAMP_JUMP） */
function swampFactor(body,what){
  const key=what||'slow', def=key==='jump'?SWAMP_JUMP:SWAMP_SLOW;
  let f=1;
  for(const sw of GT.swamps){ if(GT.rectsOverlap(body,sw)) f=Math.min(f,sw[key]!=null?sw[key]:def); }
  return f;
}
GT.swampFactor=swampFactor;

/* めり込みを押し戻す。L=左へ R=右へ U=上へ D=下へ
   body.px / body.py（そのフレームのはじめの位置。update の最初に記録）があれば、
   「はじめにいた側」へ戻す。箱にはさまれても、壁や床の反対側へは決して抜けない。 */
function resolveBodyCollisions(body,axis,colliders){
  for(const plat of colliders){
    if(plat===body) continue; if(!GT.rectsOverlap(body,plat)) continue;
    const side=pickSide(body,axis,plat);
    if(side) pushOut(body,plat,side); else if(axis==='x') body.vx=0;
  }
}
function pickSide(body,axis,plat){
  if(body.px!==undefined){
    const E=0.01;
    const l=body.px+body.w<=plat.x+E, r=body.px>=plat.x+plat.w-E;
    const u=body.py+body.h<=plat.y+E, d=body.py>=plat.y+plat.h-E;
    if(axis==='x'){ if(l) return 'L'; if(r) return 'R'; if(u) return 'U'; if(d) return 'D'; }
    else          { if(u) return 'U'; if(d) return 'D'; if(l) return 'L'; if(r) return 'R'; }
    // はじめから重なっていた（はさまれていた）：一番浅い向きへ。ただし本の外側へは出さない
    const need={ L:body.x+body.w-plat.x, R:plat.x+plat.w-body.x, U:body.y+body.h-plat.y, D:plat.y+plat.h-body.y };
    if(plat.kind==='floorEdge') need.D=Infinity; else if(plat.kind==='ceilingEdge') need.U=Infinity;
    else if(plat.kind==='wallEdge'){ if(plat.x<SPINE) need.L=Infinity; else need.R=Infinity; }
    return ['L','R','U','D'].reduce((a,b)=>need[b]<need[a]?b:a);
  }
  // はじめの位置が分からない体（拡張側の独自キャラなど）は、動いてきた向きの反対へ
  return axis==='x' ? (body.vx>0?'L':body.vx<0?'R':null) : (body.vy>0?'U':body.vy<0?'D':null);
}
const LAND_SQUASH_SPEED=150;   // これより速く落ちてきて着地したときだけ、つぶれる（px/秒）
function pushOut(body,plat,side){
  if(side==='L'){ body.x=plat.x-body.w; body.vx=0; return; }
  if(side==='R'){ body.x=plat.x+plat.w; body.vx=0; return; }
  const g = GT.gravity[GT.pageOf(body)];
  // つぶれる演出（squash）は、勢いよく着地したときだけ。床に置いてあるだけの箱は、毎フレーム少しだけ沈んで押し戻されるので、
  // そこでつぶすと、ずっと横に広がったまま ぷるぷる震えて見える
  const impact = body.vy*g;
  if(side==='U'){ body.y=plat.y-body.h; body.vy=0; if(g===1){ body.onGround=true; if(impact>LAND_SQUASH_SPEED) body.squash=1.28; } }
  else          { body.y=plat.y+plat.h; body.vy=0; if(g===-1){ body.onGround=true; if(impact>LAND_SQUASH_SPEED) body.squash=1.28; } }
}
GT.resolveBodyCollisions=resolveBodyCollisions;

/* ========================================================================== */
/*  描画                                                                      */
/* ========================================================================== */
function roundRect(x,y,w,h,r){ ctx.beginPath(); roundRectPath(x,y,w,h,r); }
function roundRectPath(x,y,w,h,r){ ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r); ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath(); }
GT.roundRect=roundRect; GT.roundRectPath=roundRectPath;

function drawGravityIcon(cx,cy,dir,glow){
  ctx.save(); ctx.translate(cx,cy);
  if(glow>0){ ctx.shadowColor='rgba(176,141,87,0.9)'; ctx.shadowBlur=14*glow; }
  ctx.strokeStyle='#5a4a2e'; ctx.lineWidth=2.2; ctx.beginPath();
  if(dir===1){ ctx.moveTo(0,-8); ctx.lineTo(0,8); ctx.moveTo(-5,3); ctx.lineTo(0,8); ctx.lineTo(5,3); }
  else{ ctx.moveTo(0,8); ctx.lineTo(0,-8); ctx.moveTo(-5,-3); ctx.lineTo(0,-8); ctx.lineTo(5,-3); }
  ctx.stroke(); ctx.restore();
}
function drawPageEdges(){
  ctx.save(); const T=22;
  function eb(x,y,w,h,gx0,gy0,gx1,gy1,color){ const g=ctx.createLinearGradient(gx0,gy0,gx1,gy1); g.addColorStop(0,color); g.addColorStop(1,'rgba(58,50,38,0)'); ctx.fillStyle=g; ctx.fillRect(x,y,w,h); }
  // ふちの色づけと、遊べる範囲のふちの線は、ごく薄く（まわりのページとのさかいを目立たせない。床・天井の目安だけ）
  eb(0,H-T,W,T,0,H,0,H-T,'rgba(87,100,74,0.12)');
  eb(0,0,W,T,0,0,0,T,'rgba(43,46,74,0.08)');
  ctx.strokeStyle='rgba(58,50,38,0.14)'; ctx.lineWidth=1.5; ctx.lineCap='round';
  ctx.beginPath(); ctx.moveTo(EDGE,EDGE); ctx.lineTo(SPINE,EDGE); ctx.moveTo(EDGE,H-EDGE); ctx.lineTo(SPINE,H-EDGE); ctx.moveTo(EDGE,EDGE); ctx.lineTo(EDGE,H-EDGE); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(SPINE,EDGE); ctx.lineTo(W-EDGE,EDGE); ctx.moveTo(SPINE,H-EDGE); ctx.lineTo(W-EDGE,H-EDGE); ctx.moveTo(W-EDGE,EDGE); ctx.lineTo(W-EDGE,H-EDGE); ctx.stroke();
  ctx.restore();
}
/* 主人公：ちびキャラの絵（assets/character/syuzinkou1.webp＝立ち姿、syuzinkou2.png＝歩く姿）。足もとを当たり判定の箱の下にそろえて描く。
   歩いているあいだは、赤ずきんと同じように立ち姿と歩く姿を交互に出す。右へ向くときは左右反転する。
   絵は箱（26×34）より上に大きくはみ出す（頭が大きいため）。GT.PLAYER_H で高さを変えられる。
   ほかのキャラと同じく、ゆっくり上下にゆれる（絵はつぶさない）。倒れているとき（序の最初）は横に寝かせる。 */
GT.PLAYER_H=64;           // 58 の約1.1倍。マリ・赤ずきん・おばあさんもこの高さにそろう。絵の大きさだけで、当たり判定・ジャンプ力は変わらない
function drawPlayer(){
  const player=GT.player; const page=GT.currentPage(); const g=GT.gravity[page];
  const walking=player.onGround && Math.abs(player.vx)>40 && player.squash<=1.4;
  const BOY_STEP=0.16;                                       // 一歩ぶんの時間（秒）。歩く姿 → 立ち姿 → 歩く姿 … と入れかえる
  const step=walking && Math.floor(performance.now()/1000/BOY_STEP)%2===0;
  const img=GT.sprite(step?'boyWalk':'boyStand') || GT.sprite('boyStand');
  if(img){
    ctx.save(); if(GT.invincible>0){ ctx.globalAlpha=(Math.floor(GT.invincible*16)%2===0)?0.4:1; }
    const h=GT.PLAYER_H, w=h*img._cw/img._ch;
    ctx.translate(player.x+player.w/2, g>0 ? player.y+player.h : player.y); ctx.scale(player.facing>0?-1:1,g);   // 足もとが原点。天井ではさかさま。絵は左向きなので、右向きは反転
    ctx.imageSmoothingQuality='high';
    if(player.squash>1.4){                                   // 倒れている：横に寝かせる
      ctx.translate(0,-(player.h/2)*(player.squash-1)-w*0.42); ctx.rotate(-Math.PI/2);   // 平たい箱の底（＝地面）に寝かせる
      GT.drawSprite(img,-w/2,-h*0.75,w,h);
    } else {
      const t=performance.now()/1000;
      if(walking){
        // 歩く：足を踏み出した絵（歩く姿）で沈み、足をそろえた絵（立ち姿）で少し伸び上がる。進む向きへ少し前のめり
        ctx.translate(0, step?0:-3); ctx.rotate(-0.05);   // 絵は左向きの座標なので、-0.05 で進む向きへ傾く
      } else {
        // 立ち止まっているとき：ほかのキャラと同じように、ゆっくり上下にゆれる（絵はつぶさない）
        ctx.translate(0,-Math.abs(Math.sin(t*2.2))*2.2*0.6);
      }
      GT.drawSprite(img,-w/2,-h,w,h);
    }
    ctx.restore(); return;
  }
  // 絵が読みこめていないときは、前の形で描く
  ctx.save(); if(GT.invincible>0){ ctx.globalAlpha=(Math.floor(GT.invincible*16)%2===0)?0.4:1; }
  ctx.translate(player.x+player.w/2,player.y+player.h/2); ctx.scale(player.facing,g);
  const sx=player.squash, sy=2-player.squash; const hw=(player.w/2)*sx, hh=(player.h/2)*sy;
  ctx.beginPath(); ctx.fillStyle='#2b2e4a'; roundRectPath(-hw,-hh,hw*2,hh*2,9); ctx.fill();
  ctx.fillStyle='#b08d57'; ctx.beginPath(); ctx.moveTo(-4,-hh); ctx.lineTo(0,-hh-9); ctx.lineTo(4,-hh); ctx.closePath(); ctx.fill();
  ctx.fillStyle='#e8dcc0'; ctx.beginPath(); ctx.arc(-5,-2,2.4,0,Math.PI*2); ctx.arc(5,-2,2.4,0,Math.PI*2); ctx.fill();
  ctx.restore();
}
function drawEnemy(en){
  const eg=GT.gravity[en.page]; ctx.save();
  const sx=en.squash, sy=2-en.squash; const hw=(en.w/2)*sx, hh=(en.h/2)*sy;
  ctx.translate(en.x+en.w/2,en.y+en.h/2); ctx.scale(en.dir>=0?1:-1,eg);
  if(!en.alive){ ctx.globalAlpha=Math.max(0.25,1-en.deathT*0.6); ctx.beginPath(); roundRectPath(-hw*1.3,-hh*0.35,hw*2.6,hh*0.7,5); ctx.fillStyle='#4a4e6d'; ctx.fill(); ctx.restore(); return; }
  // 見やすいように、白いふちで囲む（からだと耳をひとつの形にして、外がわに白い線）
  const shape=()=>{ ctx.beginPath(); roundRectPath(-hw,-hh,hw*2,hh*2,7); ctx.moveTo(hw-6,-hh+1); ctx.lineTo(hw-2,-hh-8); ctx.lineTo(hw+2,-hh+1); ctx.closePath(); };
  shape(); ctx.strokeStyle='rgba(255,255,255,0.95)'; ctx.lineWidth=4; ctx.lineJoin='round'; ctx.stroke();
  ctx.beginPath(); roundRectPath(-hw,-hh,hw*2,hh*2,7); ctx.fillStyle='#3a2f2a'; ctx.fill();
  ctx.fillStyle='#3a2f2a'; ctx.beginPath(); ctx.moveTo(hw-6,-hh); ctx.lineTo(hw-2,-hh-8); ctx.lineTo(hw+2,-hh); ctx.closePath(); ctx.fill();
  ctx.fillStyle='#c9503f'; ctx.beginPath(); ctx.arc(hw-8,-2,2.2,0,Math.PI*2); ctx.fill();
  ctx.restore();
}
function drawGoal(){
  const goal=GT.goal; if(!goal) return; const g=GT.gravity[goal.page]; const pulse=0.5+0.5*Math.sin(goalPulse*3);
  ctx.save(); ctx.translate(goal.x+goal.w/2,goal.y+goal.h/2); ctx.scale(1,g);
  ctx.shadowColor='rgba(176,141,87,0.9)'; ctx.shadowBlur=10+6*pulse;
  const hw=goal.w/2,hh=goal.h/2; ctx.beginPath();
  ctx.moveTo(-hw,-hh); ctx.lineTo(hw,-hh); ctx.lineTo(hw,hh); ctx.lineTo(0,hh-6); ctx.lineTo(-hw,hh); ctx.closePath();
  ctx.fillStyle='#b08d57'; ctx.fill(); ctx.strokeStyle='rgba(58,50,38,0.6)'; ctx.lineWidth=1.5; ctx.stroke();
  ctx.restore();
}
/* ミッションのアイテム（ふつうは光るお話のかけら。itemLook:'star' なら金色の星）。かけらは取ると「本を開く」ボタンへ飛んでいく */
function drawStar(cx,cy,r){
  ctx.beginPath();
  for(let i=0;i<10;i++){ const a=-Math.PI/2+i*Math.PI/5, rr=i%2?r*0.45:r; ctx.lineTo(cx+Math.cos(a)*rr, cy+Math.sin(a)*rr); }
  ctx.closePath();
}
/* お話のかけら：まるくて、ふちがびりびりに破れた紙きれ。seed ごとに、破れ方がちがう。
   (0,0) を中心に、幅 w・高さ h の形の点を返す（画面の外へ飛んでいくかけら＝HTML の clip-path でも、同じ形を使う） */
function scrapPoints(w,h,seed){
  let s=seed*9301+49297; const R=()=>{ s=(s*9301+49297)%233280; return s/233280; };
  const rx=w/2, ry=h/2, pts=[];
  // 大きなゆがみ（ちぎった形のいびつさ）は、低い波を 3つ重ねて作る
  const p1=R()*6.28, p2=R()*6.28, p3=R()*6.28, a1=0.06+R()*0.05, a2=0.04+R()*0.04;
  let t=0, drift=0;
  while(t<Math.PI*2){
    let k=1+a1*Math.sin(t*2+p1)+a2*Math.sin(t*3+p2)+0.03*Math.sin(t*7+p3);
    drift=drift*0.5+(R()-0.5)*0.1;                  // 破れ目は、となりと少しずつつながってゆれる（規則的なぎざぎざにしない）
    k += drift - R()*R()*0.17;                       // 細かいけば立ち。ときどき深く欠ける
    pts.push([Math.cos(t)*rx*k, Math.sin(t)*ry*k]);
    t += (0.03+R()*0.08);                            // 点の間かくも、ふぞろいに
  }
  return pts;
}
function pageScrapPath(w,h,seed){
  const pts=scrapPoints(w,h,seed);
  ctx.beginPath(); pts.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y)); ctx.closePath();
}

/* ---- 拾ったかけらは、画面の下の「本を開く」ボタンへ飛んでいき、本に吸いこまれる ----
   ボタンの本の絵は、このステージで集めたぶんだけ、下から金色に埋まっていく。 */
(function(){
  const st=document.createElement('style');
  st.textContent=`@keyframes gtBookAbsorb{0%{transform:scale(1);box-shadow:0 0 0 0 rgba(255,214,110,.9)}
    30%{transform:scale(1.1);box-shadow:0 0 20px 6px rgba(255,214,110,.75)} 100%{transform:scale(1);box-shadow:0 0 0 0 rgba(255,214,110,0)}}
    #openBook.gt-absorb{animation:gtBookAbsorb .75s ease-out}`;
  document.head.appendChild(st);
  const svg=document.querySelector('#openBook svg'), path=svg&&svg.querySelector('path');
  if(path) svg.insertAdjacentHTML('afterbegin',
    `<defs><clipPath id="gtBookClip"><path d="${path.getAttribute('d')}"/></clipPath></defs>`+
    `<rect id="gtBookFill" x="0" y="20" width="24" height="0" fill="#e8c35a" stroke="none" opacity="0.9" clip-path="url(#gtBookClip)" style="transition:all .6s ease"/>`);
})();
let bookShown=0;                                     // ボタンの本に、もう吸いこまれたかけらの数
function updateBookFill(){
  const r=document.getElementById('gtBookFill'); if(!r) return;
  const bp=curStageDef&&curStageDef.bookPage, all=bp ? GT.pagePieces(bp).total : GT.items.length;   // ページのピース（かけら＋会話など）の数
  const f=all? Math.min(1,bookShown/all) : 0;
  r.setAttribute('y', String(20-16*f)); r.setAttribute('height', String(16*f));   // 本の絵は y=4〜20
}
function flyScrapToBook(it){
  const host=document.fullscreenElement||document.body;
  const btn=document.getElementById('openBook'), icon=btn&&(btn.querySelector('svg')||btn);
  const cr=canvas.getBoundingClientRect(), sc=cr.width/W;
  const br=icon ? icon.getBoundingClientRect() : null;
  const done=()=>{ bookShown++; updateBookFill(); if(btn){ btn.classList.remove('gt-absorb'); void btn.offsetWidth; btn.classList.add('gt-absorb'); } };
  if(!br || !br.width || !el_visible(btn)){ done(); return; }  // ボタンが見えていないときは、すぐ埋める
  const {w,h}=GT.pageScrapSize(it), pw=w*sc, ph=h*sc;
  const x0=cr.left+(it.x+it.w/2)*sc, y0=cr.top+(it.y+it.h/2)*sc;
  const x1=br.left+br.width/2, y1=br.top+br.height/2, dx=x1-x0, dy=y1-y0;
  const D=Math.max(16,Math.min(pw,ph)*0.8);
  const el=document.createElement('div');
  Object.assign(el.style,{position:'fixed',left:(x0-D/2)+'px',top:(y0-D/2)+'px',width:D+'px',height:D+'px',borderRadius:'50%',pointerEvents:'none',zIndex:60,
    background:'radial-gradient(circle at 40% 38%, #fffff5 0%, #fff0be 40%, rgba(255,200,110,0.7) 70%, rgba(255,200,110,0) 100%)',
    boxShadow:'0 0 12px 6px rgba(255,220,140,0.75), 0 0 28px 12px rgba(255,200,110,0.35)'});
  host.appendChild(el);
  const lift=-Math.min(140, 50+Math.abs(dy)*0.35), kf=[], DUR=1000, path=[];
  for(let i=0;i<=16;i++){ const t=i/16, e=t*t*(3-2*t);                          // ふわっと浮いてから、弧をえがいて栞へ
    const px=dx*e, py=dy*e+lift*Math.sin(Math.PI*Math.min(1,t*1.2)); path.push([px,py]);
    kf.push({transform:`translate(${px}px,${py}px) scale(${1-0.45*e})`, opacity:t>0.9?1-(t-0.9)/0.1*0.7:1}); }
  // 光の粒の尾（とちゅうの位置に、小さな光を置いていき、すっと消える）
  const sparks=[]; for(let i=1;i<path.length-1;i++){ const [px,py]=path[i];
    setTimeout(()=>{ for(let k=0;k<2;k++){ const sp=document.createElement('div'), s=3+Math.random()*4;
      Object.assign(sp.style,{position:'fixed',left:(x0+px-s/2+(Math.random()-0.5)*10)+'px',top:(y0+py-s/2+(Math.random()-0.5)*10)+'px',width:s+'px',height:s+'px',borderRadius:'50%',
        pointerEvents:'none',zIndex:59,background:'#fff3c8',boxShadow:'0 0 6px 2px rgba(255,214,130,0.8)'});
      host.appendChild(sp); sparks.push(sp);
      if(sp.animate) sp.animate([{opacity:1,transform:'translateY(0) scale(1)'},{opacity:0,transform:`translateY(${6+Math.random()*10}px) scale(0.3)`}],{duration:520,easing:'ease-out'}).onfinish=()=>sp.remove();
      else setTimeout(()=>sp.remove(),520); } }, DUR*i/16); }
  const burst=()=>{ for(let k=0;k<14;k++){ const sp=document.createElement('div'), a=k/14*Math.PI*2, d=18+Math.random()*26, s=3+Math.random()*4;   // 栞のまわりで、光がはじける
      Object.assign(sp.style,{position:'fixed',left:(x1-s/2)+'px',top:(y1-s/2)+'px',width:s+'px',height:s+'px',borderRadius:'50%',pointerEvents:'none',zIndex:61,
        background:'#fff6d6',boxShadow:'0 0 8px 3px rgba(255,220,140,0.85)'});
      host.appendChild(sp);
      if(sp.animate) sp.animate([{opacity:1,transform:'translate(0,0) scale(1)'},{opacity:0,transform:`translate(${Math.cos(a)*d}px,${Math.sin(a)*d}px) scale(0.2)`}],{duration:650,easing:'cubic-bezier(.2,.7,.3,1)'}).onfinish=()=>sp.remove();
      else setTimeout(()=>sp.remove(),650); } };
  let ended=false; const finish=()=>{ if(ended) return; ended=true; el.remove(); burst(); done(); };
  if(el.animate){ el.animate(kf,{duration:DUR,easing:'linear'}).onfinish=finish; }
  setTimeout(finish,DUR+150);                                      // 念のため（アニメーションが止まっていても、かならず埋まる）
}
GT.flyScrapToBook=flyScrapToBook; GT.scrapPoints=scrapPoints;   // ステージ側からも使える（拾った扱いにしたかけらを、本へ飛ばす）
function el_visible(e){ if(!e) return false; const s=getComputedStyle(e); return s.display!=='none' && s.visibility!=='hidden'; }

/* お話のかけら：ふわふわ浮かぶ、光の玉。まわりにやわらかい光、中は白く明るい芯、まわりを小さな光の粒が回る。
   （もとは紙きれ。呼びかたは同じ：drawPageScrap(中心x, 中心y, 幅, 高さ, 回転, 種, 光の強さ)） */
function drawPageScrap(cx,cy,w,h,rot,seed,glow){
  const t=performance.now()/1000+seed*0.37, R=Math.min(w,h)*0.42, pulse=0.85+0.15*Math.sin(t*3.1);
  ctx.save(); ctx.translate(cx,cy);
  ctx.globalCompositeOperation='lighter';
  let g=ctx.createRadialGradient(0,0,0,0,0,R*3.2*pulse);                       // 外の、やわらかい光
  g.addColorStop(0,'rgba(255,236,170,0.55)'); g.addColorStop(0.35,'rgba(255,214,120,0.22)'); g.addColorStop(1,'rgba(255,200,100,0)');
  ctx.fillStyle=g; ctx.beginPath(); ctx.arc(0,0,R*3.2*pulse,0,Math.PI*2); ctx.fill();
  ctx.globalCompositeOperation='source-over';
  g=ctx.createRadialGradient(-R*0.25,-R*0.3,0,0,0,R);                            // 玉（白い芯 → 金色のふち）
  g.addColorStop(0,'rgba(255,255,245,1)'); g.addColorStop(0.45,'rgba(255,240,190,0.95)'); g.addColorStop(1,'rgba(255,200,110,0.55)');
  ctx.fillStyle=g; ctx.beginPath(); ctx.arc(0,0,R*pulse,0,Math.PI*2); ctx.fill();
  ctx.globalCompositeOperation='lighter';
  for(let i=0;i<5;i++){ const a=t*(1.4+i*0.15)+i*1.26, rr=R*(1.35+0.35*Math.sin(t*2+i));   // まわりを回る、小さな光の粒
    const x=Math.cos(a)*rr, y=Math.sin(a)*rr*0.75, s=1.1+0.7*Math.sin(t*5+i*2);
    ctx.fillStyle=`rgba(255,246,210,${0.55+0.35*Math.sin(t*4+i)})`; ctx.beginPath(); ctx.arc(x,y,Math.max(0.4,s),0,Math.PI*2); ctx.fill(); }
  ctx.restore();
}
/* 拾ったときの、小さな鈴の音（その場で作る。効果音の音量にしたがう） */
let chimeAC=null;
function chime(){
  const vol=GT.volume?GT.volume.se:1; if(vol<=0) return;
  try{ chimeAC=chimeAC||new (window.AudioContext||window.webkitAudioContext)(); if(chimeAC.state==='suspended') chimeAC.resume(); }catch(e){ return; }
  // 光の魔法の音「しゅわーん」＋鈴のきらめき：空気の音の、ひびく高さが すーっと上がってから ゆるやかに下りる。うすく、すきとおった音が上へすべって重なる
  const a=chimeAC, t=a.currentTime, D=1.15, out=a.createGain(); out.gain.value=vol; out.connect(a.destination);
  const dl=a.createDelay(1), fb=a.createGain(), wet=a.createGain(); dl.delayTime.value=0.11; fb.gain.value=0.3; wet.gain.value=0.4;   // こだま
  dl.connect(fb).connect(dl); dl.connect(wet).connect(out);
  // ① しゅわー：雑音を、するどく ひびく帯で通し、その高さを動かす（2本を少しずらして、きらめかせる）
  const n=a.createBufferSource(), b=a.createBuffer(1,Math.ceil(a.sampleRate*D),a.sampleRate), d=b.getChannelData(0);
  for(let i=0;i<d.length;i++) d[i]=Math.random()*2-1; n.buffer=b;
  const ng=a.createGain(); ng.gain.setValueAtTime(0.0001,t); ng.gain.exponentialRampToValueAtTime(0.16,t+0.22); ng.gain.setValueAtTime(0.16,t+0.32); ng.gain.exponentialRampToValueAtTime(0.0001,t+D);
  [[1,6],[1.33,9]].forEach(([k,q])=>{ const bp=a.createBiquadFilter(); bp.type='bandpass'; bp.Q.value=q;
    bp.frequency.setValueAtTime(700*k,t); bp.frequency.exponentialRampToValueAtTime(5200*k,t+0.38); bp.frequency.exponentialRampToValueAtTime(2600*k,t+D);
    n.connect(bp).connect(ng); });
  ng.connect(out); ng.connect(dl); n.start(t); n.stop(t+D);
  // ③ 魔法のきらめき：小さな鈴（ベルの音色）が、しゅわーんの上で ちりちりと鳴る。上がっていく音の並びで、ところどころ ばらつかせる
  const NOTES=[1568,1760,2093,2349,2637,3136,3520,4186];
  for(let i=0;i<9;i++){ const f=NOTES[Math.min(NOTES.length-1,Math.floor(i*0.9+Math.random()*1.5))], tt=t+0.08+i*0.075+Math.random()*0.03, amp=0.05*(1-i*0.06);
    const g=a.createGain(); g.gain.setValueAtTime(0.0001,tt); g.gain.exponentialRampToValueAtTime(amp,tt+0.004); g.gain.exponentialRampToValueAtTime(0.0001,tt+0.6);
    [[1,1],[2.76,0.25],[5.4,0.08]].forEach(([m,v])=>{ const o=a.createOscillator(), og=a.createGain(); o.type='sine'; o.frequency.value=f*m; og.gain.value=v;   // ベルの音色（上の倍音を少し）
      o.connect(og).connect(g); o.start(tt); o.stop(tt+0.62); });
    g.connect(out); g.connect(dl); }
  setTimeout(()=>{ try{ out.disconnect(); dl.disconnect(); fb.disconnect(); }catch(e){} }, 2600);   // こだまを止める
}
GT.chime=chime;
GT.drawPageScrap=drawPageScrap;   // ステージ側からも使う（落ちてくるかけらなど）
GT.pageScrapSeed=it=>Math.round(it.x*7+it.y*3);
GT.pageScrapSize=it=>{ const s=Math.max(it.w,32); return {w:s*1.12, h:s*1.0}; };   // 小さいアイテムでも見えるように、少し大きめに描く
function drawItem(it){
  if(it.hidden) return;
  const cx=it.x+it.w/2, r=Math.min(it.w,it.h)/2;
  if(itemLook==='page'){
    const seed=GT.pageScrapSeed(it), sw=GT.pageScrapSize(it).w, sh=GT.pageScrapSize(it).h;
    if(it.got){
      if(it.gotT>1.3) return;
      const sx=cx, sy=it.y+it.h/2;
      if(it.gotT<0.35){ const k=it.gotT/0.35;                        // 拾った瞬間、ぱっと光の輪（かけらは本のボタンへ飛んでいく）
        ctx.save(); ctx.globalAlpha=1-k; ctx.strokeStyle='#ffe9a0'; ctx.lineWidth=2;
        ctx.beginPath(); ctx.arc(sx,sy,sw*0.5*(1+k*1.4),0,Math.PI*2); ctx.stroke(); ctx.restore(); }
      return;                                                       // 「お話のかけら ＋1」の文字は出さない
      const a=Math.min(1,(1.3-it.gotT)/0.4);
      ctx.save(); ctx.globalAlpha=Math.max(0,a); ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.font="700 14px 'Zen Old Mincho',serif"; const txt=itemLabel+' ＋1', ty2=sy-62-it.gotT*24;   // 少年の頭より上に出す
      ctx.lineWidth=4; ctx.strokeStyle='rgba(43,36,24,0.75)'; ctx.strokeText(txt,sx,ty2);
      ctx.fillStyle='#ffe9a0'; ctx.fillText(txt,sx,ty2); ctx.restore();
      return;
    }
    const bob=Math.sin(goalPulse*2.0+it.x*0.07)*5;                                 // ふわふわ浮かぶ光の玉
    drawPageScrap(cx,it.y+it.h/2+bob,sw,sh,0,seed,1);
    return;
  }
  if(itemLook==='flower'){ drawFlowerItem(it,cx,r); return; }
  if(it.got){ if(it.gotT>0.5) return; const t=it.gotT/0.5;
    ctx.save(); ctx.globalAlpha=1-t; ctx.strokeStyle='#e8c35a'; ctx.lineWidth=2;
    ctx.beginPath(); ctx.arc(cx,it.y+it.h/2,r*(1+t*1.6),0,Math.PI*2); ctx.stroke(); ctx.restore(); return; }
  const cy=it.y+it.h/2+Math.sin(goalPulse*3+it.x*0.07)*2.5;
  ctx.save();
  ctx.shadowColor='rgba(232,195,90,0.8)'; ctx.shadowBlur=10;
  drawStar(cx,cy,r); ctx.fillStyle='#e8c35a'; ctx.fill();
  ctx.shadowBlur=0; ctx.strokeStyle='#8a6a2a'; ctx.lineWidth=1.5; ctx.stroke();
  ctx.restore();
}
/* お花（itemLook:'flower'）：茎と葉のある、5枚花びらの花。天井に近いものは、さかさまに（天井から）咲いている。
   摘むと、花びらが舞って「お花 ＋1」 */
const FLOWER_COLS=[['#e2738a','#f6c1cc'],['#e8c35a','#f8e7a8'],['#8f8be0','#d4d0f6'],['#f3ead0','#ffffff'],['#e88a5a','#f8c9a8']];
function drawFlowerItem(it,cx,r){
  const up = it.ceil!=null ? !!it.ceil : it.y < EDGE+20;   // 天井に咲く花だけ、さかさま（高い崖や丸太の上の花は、上向き）
  const base = up ? it.y : it.y+it.h, d = up ? 1 : -1;      // 根もと（床か天井）と、のびる向き
  const [c1,c2]=FLOWER_COLS[Math.abs(Math.round(it.x/7+it.y/11))%FLOWER_COLS.length];
  const sway=Math.sin(goalPulse*2+it.x*0.05)*2.2;
  if(it.got){
    if(it.gotT>1.2) return;
    const k=it.gotT;
    ctx.save(); ctx.globalAlpha=Math.max(0,1-k/1.2);
    for(let i=0;i<6;i++){ const a=i*1.05+k*2, rr=8+k*40;          // 花びらが舞う
      ctx.fillStyle=i%2?c1:c2; ctx.beginPath(); ctx.ellipse(cx+Math.cos(a)*rr, base+d*it.h*0.7+Math.sin(a)*rr*0.6-k*20, 4, 2.4, a, 0, Math.PI*2); ctx.fill(); }
    ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.font="700 14px 'Zen Old Mincho',serif";
    const ty=base+d*it.h-40*(up?-1:1)-k*20, txt=itemLabel+' ＋1';
    ctx.lineWidth=4; ctx.strokeStyle='rgba(43,36,24,0.75)'; ctx.strokeText(txt,cx,ty); ctx.fillStyle='#ffe9a0'; ctx.fillText(txt,cx,ty);
    ctx.restore(); return;
  }
  const top=base+d*it.h*0.95, fx=cx+sway;
  ctx.save();
  ctx.strokeStyle='#5e7d44'; ctx.lineWidth=2.2; ctx.beginPath(); ctx.moveTo(cx,base); ctx.quadraticCurveTo(cx+sway*0.4,base+d*it.h*0.5,fx,top); ctx.stroke();   // 茎
  ctx.fillStyle='#6f9a4e'; ctx.beginPath(); ctx.ellipse(cx+5,base+d*it.h*0.35,6,2.6,-0.5*d,0,Math.PI*2); ctx.fill();              // 葉
  ctx.shadowColor='rgba(255,236,170,0.8)'; ctx.shadowBlur=8;                                                                        // ほんのり光って、見つけやすく
  for(let i=0;i<5;i++){ const a=i*Math.PI*2/5+goalPulse*0.3; ctx.fillStyle=c1;
    ctx.beginPath(); ctx.ellipse(fx+Math.cos(a)*r*0.42, top+Math.sin(a)*r*0.42, r*0.34, r*0.22, a, 0, Math.PI*2); ctx.fill(); }
  ctx.shadowBlur=0; ctx.fillStyle=c2; for(let i=0;i<5;i++){ const a=i*Math.PI*2/5+goalPulse*0.3; ctx.beginPath(); ctx.ellipse(fx+Math.cos(a)*r*0.36, top+Math.sin(a)*r*0.36, r*0.16, r*0.1, a, 0, Math.PI*2); ctx.fill(); }
  ctx.fillStyle='#c98a2a'; ctx.beginPath(); ctx.arc(fx,top,r*0.17,0,Math.PI*2); ctx.fill();
  ctx.restore();
}
/* ミッション中は右端に「閉じた扉」を描いて、通れないことを見せる */
function drawExitGate(){
  ctx.save(); ctx.fillStyle='rgba(107,91,70,0.55)'; ctx.fillRect(W-EDGE,EDGE,EDGE,H-EDGE*2);
  ctx.strokeStyle='rgba(201,80,63,0.7)'; ctx.lineWidth=2; ctx.setLineDash([6,5]);
  ctx.beginPath(); ctx.moveTo(W-EDGE,EDGE); ctx.lineTo(W-EDGE,H-EDGE); ctx.stroke(); ctx.restore();
}
/* 画面上部のミッション表示 */
/* ハート（体力）：敵や狼がいるステージだけ、左上に出す。減ったハートは、ふるえてから空になる */
function heartPath(cx,cy,r){ ctx.beginPath(); ctx.moveTo(cx,cy+r*0.9);
  ctx.bezierCurveTo(cx-r*1.6,cy-r*0.1,cx-r*0.8,cy-r*1.3,cx,cy-r*0.45);
  ctx.bezierCurveTo(cx+r*0.8,cy-r*1.3,cx+r*1.6,cy-r*0.1,cx,cy+r*0.9); ctx.closePath(); }
function drawHearts(){
  const sc=GT.scene; if(!sc) return;
  if(!(GT.enemies.length>0 || sc.type==='boss') || flipping) return;
  ctx.save();
  for(let i=0;i<GT.MAX_HP;i++){
    const full=i<GT.hp, justLost=(i===GT.hp && heartLost>0);
    const shake = justLost ? Math.sin(heartLost*40)*3*heartLost : 0;
    const cx=40+i*40+shake, cy=58, r=14*(justLost?1+0.25*heartLost:1);   // ハートの大きさ（前は r=9・間隔 26）
    heartPath(cx,cy,r);
    ctx.fillStyle = full ? '#c9503f' : justLost ? `rgba(201,80,63,${heartLost})` : 'rgba(243,234,208,0.55)'; ctx.fill();
    ctx.strokeStyle='rgba(58,40,30,0.85)'; ctx.lineWidth=2.2; ctx.stroke();
    if(full){ ctx.fillStyle='rgba(255,240,225,0.6)'; ctx.beginPath(); ctx.ellipse(cx-r*0.4,cy-r*0.35,r*0.22,r*0.14,-0.6,0,Math.PI*2); ctx.fill(); }
  }
  ctx.restore();
}
/* ゲームオーバー：画面が暗くなって文字が出る → ページが前へもどる */
function drawGameOver(){
  const t=gameOver.t, k=Math.min(1,t/0.5);
  ctx.save();
  ctx.fillStyle=`rgba(30,14,10,${0.55*k})`; ctx.fillRect(0,0,W,H);
  ctx.globalAlpha=k; ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillStyle='#f3ead0'; ctx.font="700 54px 'Caveat',cursive"; ctx.fillText('Game Over',W/2,H/2-18);
  ctx.globalAlpha=Math.min(1,Math.max(0,(t-0.5)/0.4));
  // （「ページをもどって、やりなおす」などの文は出さない）
  ctx.restore();
}
/* ミッションの表示（HTML）。文字がくっきり出る。位置はキャンバスの上から 48/480 */
const missionEl=document.createElement('div'); missionEl.id='gtMission';
missionEl.innerHTML='<svg class="ic" viewBox="0 0 20 20" aria-hidden="true"><defs><radialGradient id="gtOrbIc" cx="0.42" cy="0.4" r="0.6"><stop offset="0" stop-color="#fffff5"/><stop offset="0.45" stop-color="#fff0be"/><stop offset="1" stop-color="#ffc86e" stop-opacity="0"/></radialGradient></defs><circle cx="10" cy="10" r="9.5" fill="url(#gtOrbIc)"/><circle cx="10" cy="10" r="4.6" fill="#fffbe8"/></svg><span class="tx"></span>';
canvas.parentElement.appendChild(missionEl);
(function(){ const st=document.createElement('style'); st.textContent=`
  #gtMission{ position:absolute; left:50%; top:${(48/480*100).toFixed(2)}%; transform:translate(-50%,-50%); z-index:1; display:none; align-items:center; gap:0.5em;
    padding:0.28em 1.1em; border-radius:2em; background:rgba(43,36,24,0.78); color:#f3ead0; white-space:nowrap; pointer-events:none;
    font-family:'Zen Old Mincho',serif; font-weight:700; font-size:clamp(11px,1.6cqw,38px); letter-spacing:0.04em; box-shadow:0 0 0 0 rgba(255,226,140,0); }
  #gtMission.show{ display:flex; }
  #gtMission.done{ background:rgba(176,141,87,0.92); }
  #gtMission.done .tx{ font-family:'Caveat',cursive; font-size:1.35em; letter-spacing:0.04em; line-height:1; }
  #gtMission .ic{ width:1.35em; height:1.35em; flex:none; filter:drop-shadow(0 0 4px rgba(255,214,130,0.9)); }
  #gtMission.nopage .ic{ display:none; }`; document.head.appendChild(st); })();
let missionTxt=null;
function missionDom(txt,page,done,pulse){
  if(txt!==missionTxt){ missionEl.querySelector('.tx').textContent=txt; missionTxt=txt; }
  missionEl.classList.add('show'); missionEl.classList.toggle('done',done); missionEl.classList.toggle('nopage',!page);
  missionEl.style.opacity = done ? Math.min(1,0.35+missionFlash) : 1;
  missionEl.style.transform = `translate(-50%,-50%) scale(${(1+0.18*pulse).toFixed(3)})`;   // 拾った直後は、ぽんと大きくなる
  missionEl.style.boxShadow = pulse>0 ? `0 0 0 2px rgba(255,226,140,${pulse.toFixed(2)})` : 'none';
}
function drawMissionHud(){
  const c=missionCount(), parts=[];
  const page=itemLook==='page', verb = page?'を集める':itemLook==='flower'?'を摘む':null;   // 見出しの言いかた
  if(missionReq.items) parts.push(verb ? `${itemLabel}${verb} ${c.items}/${c.itemsAll}` : `${itemLabel} ${c.items}/${c.itemsAll}`);
  if(missionReq.enemies) parts.push(`狼の手下を倒す ${c.enemies}/${c.enemiesAll}`);
  const done = (curStageDef&&curStageDef.itemsOptional) ? (c.items>=c.itemsAll && (!missionReq.enemies||c.enemies>=c.enemiesAll)) : missionDone();
  // そろったときの言葉（絵本の語りのように）
  const doneTxt = 'Complete';   // 全部そろったとき（英語の筆記体）
  const txt = done ? doneTxt : parts.join('　');
  // キャンバスに描くと、画面を大きくしたときに文字がぼやけるので、ゲーム画面の上に重ねた HTML（#gtMission）で出す
  missionDom(txt, page, done, hudPulse); return;
  ctx.save(); ctx.font="700 14px 'Zen Old Mincho',serif"; ctx.textAlign='center'; ctx.textBaseline='middle';
  const icon=page?26:0, w=ctx.measureText(txt).width+28+icon, y=48;
  ctx.globalAlpha = done ? Math.min(1,0.35+missionFlash) : 1;
  ctx.translate(W/2,y); const sc=1+0.18*hudPulse; ctx.scale(sc,sc); ctx.translate(-W/2,-y);   // 拾った直後は、ぽんと大きくなる
  roundRect(W/2-w/2,y-13,w,26,13); ctx.fillStyle=done?'rgba(176,141,87,0.92)':'rgba(43,36,24,0.78)'; ctx.fill();
  if(hudPulse>0){ ctx.strokeStyle=`rgba(255,226,140,${hudPulse})`; ctx.lineWidth=2; ctx.stroke(); }
  if(page) drawPageScrap(W/2-w/2+20,y,16,13,-0.12,7,hudPulse);   // かけらの小さな絵
  ctx.fillStyle='#f3ead0'; ctx.fillText(txt,W/2+icon/2,y+1);
  ctx.restore();
}
function drawSwamp(sw0){
  const SINK=7, sw={...sw0, y:sw0.y+(sw0.y+sw0.h/2<H/2?-SINK:SINK)};   // 見た目は、地面より少し下に沈める（天井がわの沼は上へ）。当たりはそのまま
  ctx.save(); roundRect(sw.x,sw.y,sw.w,sw.h,Math.min(10,sw.h/2));
  ctx.fillStyle='rgba(63,72,46,0.82)'; ctx.fill();
  ctx.clip();
  ctx.fillStyle='rgba(120,132,84,0.35)';               // 水面のにぶい光
  const inv=GT.gravity[GT.pageOf(sw)]===-1;
  ctx.fillRect(sw.x+6, inv?sw.y+sw.h-5:sw.y+2, sw.w-12, 3);
  ctx.strokeStyle='rgba(176,184,130,0.55)'; ctx.lineWidth=1.4;   // ぷくぷく浮かぶ泡
  const n=Math.max(2,Math.floor(sw.w/40));
  for(let i=0;i<n;i++){
    const t=(goalPulse*0.6+i*0.37)%1, bx=sw.x+(i+0.5)*sw.w/n+Math.sin(i*2.1)*6;
    const by=inv?sw.y+sw.h*(0.2+0.6*t):sw.y+sw.h*(0.8-0.6*t);
    ctx.globalAlpha=1-t; ctx.beginPath(); ctx.arc(bx,by,2+2*t,0,Math.PI*2); ctx.stroke();
  }
  ctx.restore();
}
function drawBox(box){
  if(GT.boxSkinned && GT.boxSkinned()) return;   // ステージが箱を自分の絵（家具など）で描くときは、ふつうの箱は描かない
  ctx.save(); const sx=box.squash, sy=2-box.squash; const hw=(box.w/2)*sx, hh=(box.h/2)*sy;
  ctx.translate(box.x+box.w/2,box.y+box.h/2);
  ctx.beginPath(); roundRectPath(-hw,-hh,hw*2,hh*2,6); ctx.fillStyle='#8b5e63'; ctx.fill();
  ctx.strokeStyle='rgba(43,46,74,0.35)'; ctx.lineWidth=1.5; ctx.stroke();
  ctx.strokeStyle='rgba(232,220,192,0.5)'; ctx.lineWidth=2; ctx.beginPath();
  ctx.moveTo(-hw+4,-hh+4); ctx.lineTo(hw-4,hh-4); ctx.moveTo(hw-4,-hh+4); ctx.lineTo(-hw+4,hh-4); ctx.stroke();
  ctx.restore();
}
/* キャラクターの絵（赤ずきん・マリ・お母さん・おばあさん・狼・少年）は js/sprites.js */

/* ステージ上のキャラ（NPC） */
function drawNpc(n){
  const g=n.g||1;                                         // 1=床に立つ / -1=天井に立つ（上下さかさま）
  const bob=Math.sin(goalPulse*2.2 + n.x*0.05)*2.2;
  const cx=n.x+n.w/2, midY=n.y+n.h/2;
  const face=(GT.player.x<n.x)?-1:1;
  let headY = g>0 ? n.y+bob : n.y+n.h-bob;                // 頭のある側（名前・「はなす」はその外側に出す）
  ctx.save();
  if(n.who==='hood' && GT.sprite('front')){
    // 近くにいるときは主人公のほうを向き、離れているときは正面を向く
    // 動いているときは、進む方向を向いて歩く（ステージが x を動かす）
    const dx=n._lastX==null?0:n.x-n._lastX; n._lastX=n.x;
    if(Math.abs(dx)>0.05){ n._walkDir=Math.sign(dx); n._walkT=performance.now(); }
    const walking=n._walkT!=null && performance.now()-n._walkT<120;
    const near=Math.abs((GT.player.x+GT.player.w/2)-cx)<140;
    const sb=walking?0:Math.abs(bob)*0.6;
    GT.drawHoodSprite(cx, g>0 ? n.y+n.h-sb : n.y+sb, GT.HOOD_H, walking?n._walkDir:(near?face:0), g, null, walking);
    headY += g>0 ? -(GT.HOOD_H-n.h) : (GT.HOOD_H-n.h);
  } else if(n.who==='mari' && GT.sprite('mariLeft')){
    // マリは、いつも主人公のほうを向く
    const sb=Math.abs(bob)*0.6;
    GT.drawMariSprite(cx, g>0 ? n.y+n.h-sb : n.y+sb, GT.MARI_H, face, g);
    headY += g>0 ? -(GT.MARI_H-n.h) : (GT.MARI_H-n.h);
  } else if(n.who==='granny' && GT.sprite('grannyLeft')){
    // おばあさん（二頭身の絵）。主人公のほうを向く
    const sb=Math.abs(bob)*0.6;
    GT.drawCharSprite('granny', cx, g>0 ? n.y+n.h-sb : n.y+sb, GT.GRANNY_H, face, g);
    headY += g>0 ? -(GT.GRANNY_H-n.h) : (GT.GRANNY_H-n.h);
  } else if(n.who==='granny'){
    // おばあさん（ふくらんだ服・白い髪とずきん・めがね）
    ctx.translate(cx,g>0?n.y+n.h:n.y); ctx.scale(1,g); ctx.translate(0,bob*0.5);
    ctx.fillStyle='#8a7fa0'; ctx.beginPath(); ctx.moveTo(-15,0); ctx.quadraticCurveTo(-17,-26,-9,-30); ctx.lineTo(9,-30); ctx.quadraticCurveTo(17,-26,15,0); ctx.closePath(); ctx.fill();
    ctx.fillStyle='#e8dcc0'; ctx.fillRect(-9,-14,18,12);                                           // エプロン
    ctx.fillStyle='#ecd0a8'; ctx.beginPath(); ctx.arc(0,-38,10,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#f6eed8'; ctx.beginPath(); ctx.ellipse(0,-44,12,7,0,0,Math.PI*2); ctx.fill();   // ずきん
    ctx.strokeStyle='#5a4630'; ctx.lineWidth=1; ctx.beginPath(); ctx.arc(-4*face,-38,2.6,0,Math.PI*2); ctx.arc(4*face,-38,2.6,0,Math.PI*2); ctx.stroke();
    ctx.fillStyle='#6b4f36'; ctx.fillRect(14*face-1,-22,2,22);                                      // つえ
    headY += g>0 ? -(52-n.h) : (52-n.h);
  } else if(n.who==='wolf' && GT.sprite('wolfLeft')){
    // 狼（ミニの絵）。動いているときは走る絵で進む方向を、止まっているときは主人公のほうを向く
    const dx=n._lastX==null?0:n.x-n._lastX; n._lastX=n.x;
    if(Math.abs(dx)>0.05){ n._walkDir=Math.sign(dx); n._walkT=performance.now(); }
    const running=n._walkT!=null && performance.now()-n._walkT<120;
    const sb=running?0:Math.abs(bob)*0.6;
    ctx.translate(cx, g>0 ? n.y+n.h-sb : n.y+sb);
    const step=GT.wolfRunPose(running, running?n._walkDir:face, g);
    const ok=GT.drawCharSprite(step?'wolfRun':'wolf', 0, 0, GT.WOLF_H, running?n._walkDir:face, g);
    if(ok) headY += g>0 ? -(GT.WOLF_H-n.h) : (GT.WOLF_H-n.h);
  } else if(n.who==='wolf'){
    const bw=n.w+8, bh=n.h*0.62;
    ctx.translate(cx,midY); ctx.scale(face,g); ctx.translate(0,n.h/2-bh/2-6+bob);
    ctx.fillStyle='#3a2f2a';
    ctx.fillRect(-bw/2+4,bh/2-2,6,10); ctx.fillRect(bw/2-10,bh/2-2,6,10);
    ctx.beginPath(); roundRectPath(-bw/2,-bh/2,bw,bh,8); ctx.fill();
    ctx.beginPath(); ctx.moveTo(bw/2-12,-bh/2); ctx.lineTo(bw/2-6,-bh/2-11); ctx.lineTo(bw/2,-bh/2); ctx.closePath(); ctx.fill();
    ctx.beginPath(); roundRectPath(bw/2-8,-bh*0.12,bw*0.38,bh*0.34,4); ctx.fillStyle='#2c231f'; ctx.fill();
    ctx.fillStyle='#c9503f'; ctx.beginPath(); ctx.arc(bw/2-12,-bh*0.14,2.6,0,Math.PI*2); ctx.fill();
  } else {
    const hw=n.w/2, hh=n.h/2;
    ctx.translate(cx,midY); ctx.scale(1,g); ctx.translate(0,bob);
    const col=(n.who==='mari')?'#4a4e6d':'#2b2e4a';
    ctx.beginPath(); roundRectPath(-hw,-hh,n.w,n.h,9); ctx.fillStyle=col; ctx.fill();
    if(n.who==='hood'){
      ctx.fillStyle='#b8423f';
      ctx.beginPath(); ctx.moveTo(-hw,-hh*0.1); ctx.lineTo(hw,-hh*0.1); ctx.lineTo(hw*0.7,hh*0.9); ctx.lineTo(-hw*0.7,hh*0.9); ctx.closePath(); ctx.globalAlpha=0.92; ctx.fill(); ctx.globalAlpha=1;
      ctx.beginPath(); ctx.arc(0,-hh,hw*0.95,Math.PI,0); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-hw*0.9*face,-hh*1.0); ctx.lineTo(-hw*1.7*face,-hh*0.7); ctx.lineTo(-hw*0.9*face,-hh*0.55); ctx.closePath(); ctx.fill();
    } else if(n.who==='mari'){
      ctx.fillStyle='#a9b0d6'; ctx.beginPath(); ctx.moveTo(-4,-hh); ctx.lineTo(0,-hh-9); ctx.lineTo(4,-hh); ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle='#e8dcc0'; ctx.beginPath();
    ctx.arc(-5*face,-hh*0.35,2.4,0,Math.PI*2); ctx.arc(5*face,-hh*0.35,2.4,0,Math.PI*2); ctx.fill();
  }
  ctx.restore();
  if(n.name){ ctx.save(); ctx.font="600 11px 'Zen Old Mincho',serif"; ctx.textAlign='center';
    ctx.fillStyle='rgba(74,70,60,0.85)'; ctx.fillText(GT.speakerName(n.who, n.name), cx, g>0 ? headY-12 : headY+20); ctx.restore(); }
  // 話しかけられる人：頭の上に吹き出しマーク（まだ話していない人だけ。会話中は出さない）
  const canTalk = n.talkable && !n.talked && n.lines && !storyTalking && !dlg.classList.contains('show') && GT.mode==='play';
  // 話しかけないと先へ進めない人は「！」、話さなくても進める人（ヒント・寄り道の会話）は「…」
  //   ふつうは、話し終えると右の端が開く人（noExit でない人）で、まだ一度も話していない人が「！」。
  //   ステージ側で n.required = true / false と書けば、そちらが優先
  const must = n.required!=null ? !!n.required : (!n.noExit && !n.talkedOnce);
  if(canTalk) drawTalkMark(cx, g>0 ? headY-38 : headY+44, g, n===activeNpc, must);
  if(n===activeNpc && !storyTalking){
    const p=0.5+0.5*Math.sin(goalPulse*5);
    ctx.save(); ctx.textAlign='center'; ctx.globalAlpha=0.65+0.35*p;
    ctx.fillStyle='#b08d57'; ctx.font="700 19px 'Caveat',cursive";
    ctx.fillText(GT.ctl('Tap / Enter to talk','Tap to talk'), cx, g>0 ? headY-66 : headY+74);
    ctx.restore();
  }
  if(n.speech) GT.drawSpeech(cx, g>0 ? headY-14 : headY+14, n.speech.text, n.speech.t/0.4, g<0, n.speech.angry);
}

function render(){
  try{ renderBody(); } finally { flushHint(); }
}
/* ---- 影（明るい場面）：光は左下から。物の影は、うしろの背景の右上へのびる ----
   奥の飾り・足場や人物・手前の飾りを、それぞれ別の層に描いてから、背景の上に「影→物」の順に重ねる。
   影は、層をそのまま小さな画面に写し（右上へずらし、上ほど右へかたむける）、影の色でぬって、大きくのばして重ねる（のばすと自然にぼける）。
   手前の層ほど、影は遠く・大きくかたむき・よくぼける（奥行き）。ぼかしの計算を物ごとにしないので、軽い */
let layeredNow=false;   // このフレームを、層に分けて描いたか
const layerB=document.createElement('canvas'), layerM=document.createElement('canvas'), layerF=document.createElement('canvas'), layerB2=document.createElement('canvas'), layerB0=document.createElement('canvas');
for(const c of [layerB,layerM,layerF,layerB2,layerB0]){ c.width=W; c.height=H; }
const shadowSmall=[document.createElement('canvas'),document.createElement('canvas')];
function grabLayer(L){ const g=L.getContext('2d'); g.clearRect(0,0,W,H); g.drawImage(canvas,0,0); ctx.clearRect(0,0,W,H); }
GT.SHADOW={ dx:10, dy:6, alpha:0.82 };   // 影の基本の量（depth で、遠く・うすくなる）
/* 影を、受ける物ごとに分けて落とす：
   すぐうしろの物（奥の層 layerB の木や家）に映る影は、近く（nearDepth）に。そのさらに奥の背景に映る影は、遠く（depth）に */
function castLayerSplit(L,depth,nearDepth){
  const sc=shadowSmall[1]; if(sc.width!==W){ sc.width=W; sc.height=H; }
  const s=sc.getContext('2d'), S=GT.SHADOW, dk=(gradeK||0)>0.02?0.25:0;
  for(const [d,inside] of [[depth,false],[nearDepth,true]]){
    s.setTransform(1,0,0,1,0,0); s.globalCompositeOperation='source-over'; s.clearRect(0,0,W,H);
    s.drawImage(L, Math.round(S.dx+46*d), -Math.round(S.dy+30*d));
    s.globalCompositeOperation='source-in';
    s.fillStyle=`rgba(10,6,4,${Math.min(0.92,S.alpha-0.36*d+dk).toFixed(3)})`;
    s.fillRect(0,0,W,H);
    s.globalCompositeOperation = inside ? 'destination-in' : 'destination-out';   // 奥の物の上だけ／それ以外だけ
    s.drawImage(layerB,0,0);
    ctx.drawImage(sc,0,0);
  }
  s.globalCompositeOperation='source-over';
}
function castLayer(L,depth){
  // 影は、かたむけず、そのまま右上へずらす。ふちは、まっすぐ くっきり（画面と同じ大きさで写し、ぼかさない）
  const d=depth, sc=shadowSmall[0], S=GT.SHADOW;
  if(sc.width!==W){ sc.width=W; sc.height=H; }
  const s=sc.getContext('2d');
  s.setTransform(1,0,0,1,0,0); s.globalCompositeOperation='source-over'; s.clearRect(0,0,W,H);
  s.drawImage(L, Math.round(S.dx+46*d), -Math.round(S.dy+30*d));          // 手前の層ほど、遠くへ（差を大きく）
  // 影の色でぬる（奥の層ほど濃く、手前ほどうすい。暗い森では、さらに濃く）
  const dk=(gradeK||0)>0.02?0.25:0;
  s.globalCompositeOperation='source-in';
  s.fillStyle=`rgba(10,6,4,${Math.min(0.92,S.alpha-0.36*d+dk).toFixed(3)})`;
  s.fillRect(0,0,W,H);
  ctx.drawImage(sc,0,0);
}
function drawBookBase(gravity){
  ctx.drawImage(GT.paperArt.paper,0,0);
  drawStageBackground();
  ctx.fillStyle='rgba(87,100,74,0.05)'; ctx.fillRect(0,0,SPINE,H);
  ctx.fillStyle='rgba(139,94,99,0.05)'; ctx.fillRect(SPINE,0,SPINE,H);
  if(gravity.left===-1){ ctx.fillStyle='rgba(43,46,74,0.06)'; ctx.fillRect(0,0,SPINE,H); }
  if(gravity.right===-1){ ctx.fillStyle='rgba(43,46,74,0.06)'; ctx.fillRect(SPINE,0,SPINE,H); }
  const sg=ctx.createLinearGradient(SPINE-16,0,SPINE+16,0);
  sg.addColorStop(0,'rgba(58,50,38,0)'); sg.addColorStop(0.5,'rgba(58,50,38,0.35)'); sg.addColorStop(1,'rgba(58,50,38,0)');
  ctx.fillStyle=sg; ctx.fillRect(SPINE-16,0,32,H);
}
function drawGoText(){
  if(missionReq && exitWanted && !stageExit) drawExitGate();
  if((storyStage||missionReq||goHint) && stageExit && !flipping && !storyTalking){
    const p=0.5+0.5*Math.sin(goalPulse*4);
    ctx.save(); ctx.textAlign='right'; ctx.globalAlpha=0.55+0.45*p;
    ctx.fillStyle='#b08d57'; ctx.font="700 22px 'Caveat',cursive";
    ctx.fillText('Go to the right edge →', W-26, H/2);
    ctx.restore();
  }
}
function renderBody(){
  const gravity=GT.gravity;
  ctx.clearRect(0,0,W,H);
  layeredNow = GT.shadowsOn!==false && !(GT.scene && GT.scene.id==='chapter1');   // 影は、序章の暗い森もふくめて、すべての場面で（章のとびらは除く）
  if(layeredNow){
    const hasBP=drawBackPre.length>0; if(hasBP){ for(const fn of drawBackPre) fn(); grabLayer(layerB0); }   // いちばん奥の、影を落とさない物
    for(const fn of drawBack) fn();                                   // 奥の層
    grabLayer(layerB);
    const hasBF=drawBackFlat.length>0; if(hasBF){ for(const fn of drawBackFlat) fn(); grabLayer(layerB2); }   // 影を落とさない奥の物（地面の道など）
    for(const plat of GT.platforms){ if(plat.kind!=='ledge'&&plat.kind!=='ceilingLedge') continue; drawLedge(plat, gravity[plat.page]===-1); }
    drawGoal();
    for(const box of GT.boxes) drawBox(box);
    for(const en of GT.enemies) drawEnemy(en);
    if(storyStage) for(const n of npcs) drawNpc(n);
    if(companion) drawNpc(companion);
    for(const fn of drawWorld) fn();
    drawPlayer();
    grabLayer(layerM);                                                // 足場・人物・少年の層
    for(const fn of drawOverlay) fn();
    grabLayer(layerF);                                                // 手前の層
    drawBookBase(gravity);
    // 影は、その層より奥にあるもの すべての上に落ちる（少年の影は、うしろの家や木の上にも映る）。
    // 奥の層ほど影は近く・濃く、手前の層ほど遠く・うすく。空気の遠近：奥の層は少しかすみ、手前の層は少し暗く くっきり
    if(hasBP){ ctx.save(); ctx.filter='saturate(0.8) brightness(1.04) contrast(0.9)'; ctx.drawImage(layerB0,0,0); ctx.restore(); }
    castLayer(layerB,0.25);
    ctx.save(); ctx.filter='saturate(0.8) brightness(1.04) contrast(0.9)'; ctx.drawImage(layerB,0,0); if(hasBF) ctx.drawImage(layerB2,0,0); ctx.restore();
    if(GT.extraShadow) GT.extraShadow(ctx);   // 場面ごとの特別な影（タイトルの狼の大きな影など）。うしろの木の上にも映る
    drawPageEdges();
    for(const fn of drawFlat) fn();                                   // 影を落とさない物（水たまりなど）。少年や人物の影は、この上に落ちる
    castLayerSplit(layerM,0.6,0.12);                                  // 少年や足場の影：うしろの木や家には近く、背景には遠く
    castLayerSplit(layerF,1,0.3);                                              // 手前の草などの影は、少年や人物より うしろに落とす（少年にかぶらない）
    ctx.drawImage(layerM,0,0);
    for(const sw of GT.swamps) drawSwamp(sw);                         // 沼は影を落とさない（少年の足元を隠すよう、少年より手前に）
    ctx.save(); ctx.filter='brightness(0.86) saturate(1.08) contrast(1.05)'; ctx.drawImage(layerF,0,0); ctx.restore();
    if(!(GT.scene&&(GT.scene.id==='title'||GT.scene.id==='chapter_select'))){ drawGravityIcon(SPINE/2,20,gravity.left,flashPage.left);
    drawGravityIcon(SPINE+SPINE/2,20,gravity.right,flashPage.right); }   // タイトル画面では、重力の矢印を出さない
    for(const it of GT.items) drawItem(it);
    drawGoText();
  } else {
  drawBookBase(gravity);
  for(const fn of drawBackPre) fn();
  for(const fn of drawBack) fn();           // 奥の飾り（地形より後ろ・判定なし）
  for(const fn of drawBackFlat) fn();
  drawPageEdges();
  for(const plat of GT.platforms){
    if(plat.kind!=='ledge'&&plat.kind!=='ceilingLedge') continue;
    drawLedge(plat, gravity[plat.page]===-1);
  }
  drawGravityIcon(SPINE/2,20,gravity.left,flashPage.left);
  drawGravityIcon(SPINE+SPINE/2,20,gravity.right,flashPage.right);
  drawGoal();
  for(const box of GT.boxes) drawBox(box);
  for(const en of GT.enemies) drawEnemy(en);
  if(storyStage) for(const n of npcs) drawNpc(n);
  if(companion) drawNpc(companion);
  for(const it of GT.items) drawItem(it);
  drawGoText();
  for(const fn of drawFlat) fn();
  for(const fn of drawWorld) fn();          // ボスなど（プレイヤーより後ろ）
  drawPlayer();
  for(const sw of GT.swamps) drawSwamp(sw);   // 沼はプレイヤーの足元を隠すよう手前に描く
  for(const fn of drawOverlay) fn();         // 手前の木・窓のぞきなど（ゴシックの色合いをかけるため、色合いより先に描く）
  }
  drawGothicWorld();                                                                                                // 世界を暗く・色を抜く（不気味さに合わせて）
  liftCharacters();                                                                                                 // 少年と人物は、暗くしない（色合いの上に描きなおす）
  if(itemLook==='page') for(const it of GT.items) if(!it.got&&!it.hidden) drawItem(it);                            // 光の玉（お話のかけら）は、色合いの上にも重ねて、くっきり光らせる
  ctx.save(); ctx.globalCompositeOperation='multiply'; ctx.drawImage(GT.paperArt.agedPaper,0,0); ctx.restore();   // 古い紙の色むら・しみ（表示類より奥）
  drawEdgeFade();                                                                                                   // ふちを、まわりのページの色へ ぼかす（ページのふくらみとのさかいを目立たせない）
  drawGradeMul();   // 全体の色合い（まわりのページと同じ色）
  if(missionReq && !flipping && !gameOver && !GT.paused && !GT.missionHidden && !document.querySelector('.gtm.show')) drawMissionHud(); else missionEl.classList.remove('show');   // メニュー・ページめくりのあいだは出さない
  if(GT.hurtFlash>0){ ctx.fillStyle=`rgba(139,20,20,${GT.hurtFlash*0.35})`; ctx.fillRect(0,0,W,H); }
  drawHearts();
  if(gameOver){ const st=gameOver.cause&&gameOverStyles[gameOver.cause]; if(st&&st.draw) st.draw(gameOver); else drawGameOver(); }
  for(const fn of drawSpeechFns) fn();       // ステージ独自の吹き出し（最前面）
  for(const a of speechQueue.splice(0)) paintSpeech(...a);   // 人物の吹き出し（最前面）
  if(flipping) drawFlip();                   // ページめくり（いちばん手前。ページの大きさの層 flipCv に描く）
  else if(flipCvDirty){ fctx.setTransform(1,0,0,1,0,0); fctx.clearRect(0,0,flipCv.width,flipCv.height); flipCvDirty=false; }
}

/* ゴシックの色合い：世界（背景・地形・人物）を赤紫の色みに寄せ、少し色を抜き、四すみを暗くする（表示類・ふちのぼかしより奥） */
let gothVig=null;
/* 不気味さ（0〜1）：お話が進むほど暗く・色が抜け・霧が出る。値は js/playlist.js の GT.sceneMood（シーンの id ごと。'@種類' でも決められる） */
let moodCur=null;
function sceneMood(){
  const sc=GT.scene; if(!sc) return 0.3; const T=GT.sceneMood||{};
  let v = sc.id!=null && T[sc.id]!=null ? T[sc.id] : T['@'+sc.type]!=null ? T['@'+sc.type] : 0.5;
  if(typeof v==='function') v=v(GT.flags);
  return Math.max(0,Math.min(1,+v||0));
}
GT.moodNow=()=>moodCur; GT.moodTarget=sceneMood;
GT.moodSnap=()=>{ moodCur=null; gradeK=null; };   // 次の画面で、ゆっくりではなく一気に、そのシーンの色合いにする
GT.isBright=()=>!!(GT.scene && sceneMood()===0);   // 不気味さ 0 の場面は、ゴシックにする前と同じ見た目
let gradeK=null;   // ゴシックの色合いのかかり具合（0＝前と同じ明るさ、1＝ゴシック）   // いまの不気味さ／このシーンの不気味さ
function drawMoodFog(m){   // 地面をはう霧（不気味さが 0.45 をこえると出てくる）
  const a=(m-0.45)*0.3; if(a<=0) return; const t=performance.now()/1000;
  for(let k=0;k<2;k++){ const y=H-GT.EDGE-8-k*30, sp=9+k*5;
    for(let i=0;i<6;i++){ const x=((i*210+t*sp+k*120)%(W+380))-190;
      const g=ctx.createRadialGradient(x,y,0,x,y,190); g.addColorStop(0,`rgba(205,202,204,${a*(1-k*0.35)})`); g.addColorStop(1,'rgba(205,202,204,0)');
      ctx.save(); ctx.translate(x,y); ctx.scale(1,0.22); ctx.translate(-x,-y); ctx.fillStyle=g; ctx.fillRect(x-190,y-190,380,380); ctx.restore(); } }
}
let dimNow=0;   // そのステージだけ暗くする量（背景の spec.dim）。ゴシックの色合いとは別（色は変えず、暗くするだけ）
function drawGothicWorld(){
  const spd=stageBackgroundSpec(); dimNow=(spd&&spd.dim)||0;
  if(dimNow>0){ ctx.save(); ctx.globalCompositeOperation='multiply'; ctx.fillStyle=`rgba(40,38,44,${dimNow})`; ctx.fillRect(0,0,W,H); ctx.restore(); }
  const target=sceneMood(); moodCur = moodCur==null ? target : moodCur+(target-moodCur)*0.04;   // ゆっくり変わる
  const m=moodCur;
  const gk=GT.isBright()?0:1; gradeK = gradeK==null ? gk : gradeK+(gk-gradeK)*0.04; const K=gradeK;
  if(K<0.005) return;
  ctx.save(); ctx.globalAlpha=K;
  drawMoodFog(m);
  ctx.globalCompositeOperation='saturation'; ctx.globalAlpha=(0.16+0.3*m)*K; ctx.fillStyle='#808080'; ctx.fillRect(0,0,W,H);   // 色を抜く（進むほど、色が消えていく）
  if(m>0.3){ ctx.globalCompositeOperation='color'; ctx.globalAlpha=(m-0.3)*0.16*K; ctx.fillStyle='#4a5a5e'; ctx.fillRect(0,0,W,H); }   // 進むと、冷たく青ざめた色みに
  ctx.globalCompositeOperation='color'; ctx.globalAlpha=GRADE_HUE; ctx.fillStyle='#8a3d62'; ctx.fillRect(0,0,W,H);  // 赤紫の色みに寄せる（明るさはそのまま）
  ctx.globalCompositeOperation='source-over'; ctx.globalAlpha=1;
  const sp=stageBackgroundSpec();                                                     // 背景の shade（0〜1）… そのステージだけ、世界ぜんたいを暗くする（暗い森など）
  ctx.globalAlpha=K;
  const shade=(sp&&sp.shade||0)+0.5*m;                                               // 進むほど、世界ぜんたいが暗くなる
  if(shade>0){ ctx.globalCompositeOperation='multiply'; ctx.fillStyle=`rgba(16,14,12,${Math.min(0.85,shade)})`; ctx.fillRect(0,0,W,H); ctx.globalCompositeOperation='source-over'; }
  const vig=ctx.createRadialGradient(W/2,H*0.5,H*(0.42-0.12*m),W/2,H*0.5,W*0.62);       // 四すみの暗さも、進むほど強く・内がわへ
  vig.addColorStop(0,'rgba(10,8,6,0)'); vig.addColorStop(1,`rgba(10,8,6,${GRADE_VIG*(0.55+0.75*m)})`);
  ctx.fillStyle=vig; ctx.fillRect(0,0,W,H);
  ctx.restore();
}
/* 少年と人物は、ゴシックの色合い（暗さ・色抜け）をかけない。色合いをかけたあとに、同じ場所へもう一度描く。
   ・木の陰に隠れているなど、まわりの絵に隠したい人は n.noLift=true（ステージ側で決める）
   ・沼に入っているときの少年は、足もとを沼で隠すので描きなおさない */
function liftCharacters(){
  if((gradeK==null || gradeK<0.02) && !(dimNow>0)) return;
  ctx.save(); ctx.globalAlpha=dimNow>0?1:Math.min(1,gradeK);
  if(storyStage) for(const n of npcs){ if(n.noLift || n.x<-100 || n.x>W+100) continue; drawNpc(n); }
  if(companion) drawNpc(companion);
  const pl=GT.player, inSwamp=(GT.swamps||[]).some(s=>GT.rectsOverlap&&GT.rectsOverlap(pl,s));
  for(const en of GT.enemies) drawEnemy(en);   // 敵も、暗さに沈まないように
  if(!inSwamp && !gameOver) drawPlayer();
  ctx.restore();
  for(const fn of drawLiftFns) fn();
  // 暗くした場面（近道）で人物を描きなおしたあと、手前の層（手前の木や岩）を、同じ暗さで上に重ねなおす（人物が手前の木より前に出ないように）
  if(layeredNow && dimNow>0){
    const sc=shadowSmall[1]; if(sc.width!==W){ sc.width=W; sc.height=H; }
    const s=sc.getContext('2d'); s.setTransform(1,0,0,1,0,0); s.globalCompositeOperation='source-over'; s.clearRect(0,0,W,H);
    s.filter='brightness(0.86) saturate(1.08) contrast(1.05)'; s.drawImage(layerF,0,0); s.filter='none';
    s.globalCompositeOperation='source-atop'; s.fillStyle=`rgba(0,0,0,${(0.84*dimNow).toFixed(3)})`; s.fillRect(0,0,W,H);
    ctx.drawImage(sc,0,0);
  }
}
/* 全体の色合い（乗算）。明るい場面（gradeK＝0）では、まん中にはかけず、ふちだけにかける（まわりのページの紙の色と、さかいを合わせる） */
function drawGradeMul(){
  const K=gradeK==null?1:gradeK, col=GRADE_MUL.join(',');
  ctx.save(); ctx.globalCompositeOperation='multiply';
  if(K>0.005){ ctx.fillStyle=`rgba(${col},${K})`; ctx.fillRect(0,0,W,H); }
  if(K<0.995){ const F=EDGE_FADE*2.4, a=1-K;
    for(const e of ['left','right','top','bottom']){
      const g = e==='left'?ctx.createLinearGradient(0,0,F,0) : e==='right'?ctx.createLinearGradient(W,0,W-F,0) : e==='top'?ctx.createLinearGradient(0,0,0,F) : ctx.createLinearGradient(0,H,0,H-F);
      g.addColorStop(0,`rgba(${col},${a})`); g.addColorStop(1,`rgba(${col},0)`); ctx.fillStyle=g;
      if(e==='left') ctx.fillRect(0,0,F,H); else if(e==='right') ctx.fillRect(W-F,0,F,H); else if(e==='top') ctx.fillRect(0,0,W,F); else ctx.fillRect(0,H-F,W,F); } }
  ctx.restore();
}
/* ゲーム画面のふちを、まわりのページ（js/page.js の .gt-pages。色は PAGE_COLOR）へ だんだん溶けこませる */
const EDGE_FADE=22;
function drawEdgeFade(){
  ctx.save();
  for(const e of ['left','right','top','bottom']){
    const g = e==='left'?ctx.createLinearGradient(0,0,EDGE_FADE,0) : e==='right'?ctx.createLinearGradient(W,0,W-EDGE_FADE,0)
            : e==='top'?ctx.createLinearGradient(0,0,0,EDGE_FADE) : ctx.createLinearGradient(0,H,0,H-EDGE_FADE);
    g.addColorStop(0,'rgba(239,231,218,0.95)'); g.addColorStop(0.5,'rgba(239,231,218,0.45)'); g.addColorStop(1,'rgba(239,231,218,0)');
    ctx.fillStyle=g;
    if(e==='left') ctx.fillRect(0,0,EDGE_FADE,H); else if(e==='right') ctx.fillRect(W-EDGE_FADE,0,EDGE_FADE,H);
    else if(e==='top') ctx.fillRect(0,0,W,EDGE_FADE); else ctx.fillRect(0,H-EDGE_FADE,W,EDGE_FADE);
  }
  ctx.restore();
}
/* ページめくり演出 */
/* ページめくり：紙がしなるように、やわらかくめくれる。
   紙を背表紙から外へ細い短冊に分けて、外がわ（つまんだふち）ほど先に持ち上がって倒れる（紙がまるくたわむ）。
   立ち上がったところは少し手前に来るので、ほんの少し大きく見える（寝ている紙は、ページとぴったり同じ大きさ）。向きによって、紙に陰と光が入る。
   めくれた紙は、下のページに やわらかい影を落とす。動きは ゆっくり始まって、ゆっくり着地する。 */
const FLIP_STRIPS=48;
function drawFlip(){
  const p=Math.min(1,flipT/FLIP_DUR);
  toPage(extLive);                                                    // 次のシーン（いま描いたもの）を、ページの大きさの紙に写しとる
  const W=EW, H=EH, SPINE=ESP, flipOld=extOld, flipLive=extLive;      // ここでは、ページのふくらみまでふくめた大きさで描く
  const ctx=fctx; ctx.setTransform(1,0,0,1,0,0); ctx.clearRect(0,0,flipCv.width,flipCv.height);
  ctx.setTransform(1,0,0,1,100-PAGE_PAD_X,70-PAGE_PAD_TOP); flipCvDirty=true;   // ページの左上が、ゲーム画面の (-PAGE_PAD_X, -PAGE_PAD_TOP)
  const ease = p<0.5 ? 4*p*p*p : 1-Math.pow(-2*p+2,3)/2;            // ゆっくり始まって、ゆっくり着地
  const lift=Math.sin(p*Math.PI);                                     // 紙が いちばん持ち上がるのは まん中
  const base=ease*Math.PI, lead=1.35*lift;                            // 背表紙側の角度と、外がわが先に進む量
  // 短冊ごとの角度 → 位置（背表紙から積み上げる）・高さ（持ち上がるほど少し大きく）
  const N=FLIP_STRIPS, pts=[];
  let x=SPINE, z=0;
  const d=flipDir;                                                    // 1=次へ（右の紙が左へ） / -1=前へ（左の紙が右へ）
  for(let i=0;i<=N;i++){
    const u=i/N, a=Math.max(0,Math.min(Math.PI, base + lead*Math.pow(u,1.6)));     // 外がわほど先に倒れる（紙がまるくたわむ）
    pts.push({u,a,x,z});
    if(i<N){ x+=d*Math.cos(a)*SPINE/N; z+=Math.sin(a)*SPINE/N; }
  }
  ctx.save();
  ctx.save(); pagePath(ctx); ctx.clip();                              // 下のページ・暗さ・影は、ページの形の中だけ
  if(d>0) ctx.drawImage(flipOld,0,0,SPINE,H,0,0,SPINE,H);            // 紙が倒れてくる側のページは、倒れてくるまで前のまま
  else    ctx.drawImage(flipOld,SPINE,0,SPINE,H,SPINE,0,SPINE,H);
  ctx.fillStyle=`rgba(28,22,14,${0.22*lift})`; ctx.fillRect(0,0,W,H);  // 見開きが少し暗くなる
  // 下のページに落ちる やわらかい影（紙のいちばん外のふちのまわり）
  const tip=pts[N], tipX=tip.x;
  const shW=40+70*lift, sg=ctx.createLinearGradient(tipX,0, tipX+(tipX>=SPINE?shW:-shW),0);   // 紙の外がわへ落ちる影
  sg.addColorStop(0,`rgba(30,22,12,${0.35*lift})`); sg.addColorStop(1,'rgba(30,22,12,0)');
  ctx.fillStyle=sg; ctx.fillRect(Math.min(tipX,tipX+(tipX>=SPINE?shW:-shW)),0,shW,H);
  ctx.restore();                                                      // （ページの形の切り抜き、ここまで）
  // 光がもれ出す（森の出口から、次のページへ）：めくれる紙の下の、新しいページから光があふれる
  const glow = flipFromId && GT.flipGlowFrom.has(flipFromId) ? Math.sin(Math.min(1,p*1.15)*Math.PI) : 0;
  if(glow>0.01){
    const gx = d>0 ? SPINE+SPINE*0.35 : SPINE-SPINE*0.35, gy=H*0.5, t=performance.now()/1000;
    ctx.save(); ctx.globalCompositeOperation='lighter';
    const rg=ctx.createRadialGradient(gx,gy,0,gx,gy,SPINE*1.1);
    rg.addColorStop(0,`rgba(255,242,200,${0.6*glow})`); rg.addColorStop(0.45,`rgba(255,220,160,${0.3*glow})`); rg.addColorStop(1,'rgba(255,200,120,0)');
    ctx.fillStyle=rg; ctx.fillRect(0,0,W,H);
    const rk=glow*Math.max(0,Math.min(1,(0.7-p)/0.25));             // 光の筋は、ページが開ききるより前に消える（半分すぎから うすくなり、7割で消える）
    if(rk>0.01) for(let k=0;k<14;k++){                              // 光の筋（ゆっくりゆれる）
      const a=(k/14)*Math.PI*2+Math.sin(t*0.6+k)*0.08, len=SPINE*(0.7+0.3*Math.sin(t*1.3+k*2.1)), wd=0.006+0.004*Math.sin(k*1.7);   // とても細い筋
      const lg=ctx.createRadialGradient(gx,gy,0,gx,gy,len);
      lg.addColorStop(0,`rgba(255,246,210,${0.14*rk})`); lg.addColorStop(1,'rgba(255,230,170,0)');
      ctx.fillStyle=lg; ctx.beginPath(); ctx.moveTo(gx,gy); ctx.arc(gx,gy,len,a-wd,a+wd); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }
  // 紙（短冊を背表紙から順に。奥の短冊が先、手前の短冊があと）
  const order=[...Array(N).keys()];
  for(const i of order){
    const p0=pts[i], p1=pts[i+1], am=(p0.a+p1.a)/2;
    const front = am<Math.PI/2;                                        // 表（前の右ページ）か、裏（次の左ページ）か
    const x0=p0.x, x1=p1.x, w=x1-x0; if(Math.abs(w)<0.05) continue;
    const sc=1+0.012*Math.sin(am);                                    // 立ち上がったところだけ、ほんの少し大きく（寝ている紙はページと同じ大きさ）
    const hh=H*sc, top=(H-hh)/2;
    const srcX = d>0 ? (front ? SPINE+p0.u*SPINE : SPINE-p1.u*SPINE)          // 次へ：表=前の右ページ / 裏=次の左ページ
                     : (front ? SPINE-p1.u*SPINE : SPINE+p0.u*SPINE), srcW=SPINE/N;   // 前へ：表=前の左ページ / 裏=やり直す右ページ
    const src = front ? flipOld : flipLive;
    const dx=Math.min(x0,x1), dw=Math.abs(w)+0.6;                       // すき間ができないよう、少し重ねる
    if(front) ctx.drawImage(src, srcX,0,srcW,H, dx,top,dw,hh);
    else      ctx.drawImage(src, srcX,0,srcW,H, dx,top,dw,hh);
    // 陰と光：紙が立つほど暗く、ゆるやかに傾いたところに やわらかい光
    const facing=Math.abs(Math.cos(am));
    ctx.fillStyle=`rgba(40,28,14,${0.5*Math.pow(1-facing,0.8)})`; ctx.fillRect(dx,top,dw,hh);
    const shine=Math.max(0,Math.sin(am*2))*0.16*lift;
    if(shine>0.002){ ctx.fillStyle=`rgba(255,248,230,${shine})`; ctx.fillRect(dx,top,dw,hh); }
  }
  // 背表紙のくぼみの影
  const spg=ctx.createLinearGradient(SPINE-18,0,SPINE+18,0);
  spg.addColorStop(0,'rgba(58,45,30,0)'); spg.addColorStop(0.5,`rgba(58,45,30,${0.25*lift})`); spg.addColorStop(1,'rgba(58,45,30,0)');
  ctx.fillStyle=spg; ctx.fillRect(SPINE-18,0,36,H);
  // めくれていくふちの、紙の厚みの光
  if(lift>0.02){ const sc=1+0.012*Math.sin(tip.a), hh=H*sc, top=(H-hh)/2;
    ctx.strokeStyle=`rgba(255,250,235,${0.5*lift})`; ctx.lineWidth=1.6;
    ctx.beginPath(); ctx.moveTo(tipX,top+2); ctx.lineTo(tipX,top+hh-2); ctx.stroke(); }
  // 光がもれ出す：紙のふちからあふれる光と、舞う光の粒（紙の上にも重ねる）
  if(glow>0.01){
    const t=performance.now()/1000;
    ctx.save(); ctx.globalCompositeOperation='lighter';
    const eg=ctx.createLinearGradient(tipX-60*d,0,tipX+40*d,0);
    eg.addColorStop(0,'rgba(255,236,180,0)'); eg.addColorStop(0.6,`rgba(255,240,200,${0.55*glow})`); eg.addColorStop(1,'rgba(255,236,180,0)');
    ctx.fillStyle=eg; ctx.fillRect(Math.min(tipX-60*d,tipX+40*d),0,100,H);
    for(let k=0;k<40;k++){
      const r=(k*97.3)%1, q=(k*57.1)%1, life=((t*0.5+r)%1);
      const px=tipX+d*(10+q*SPINE*0.6)*life, py=H*(0.1+0.8*((k*31.7)%1))-life*60;
      ctx.fillStyle=`rgba(255,244,200,${0.8*glow*(1-life)})`; ctx.beginPath(); ctx.arc(px,py,1.2+2*(1-life),0,Math.PI*2); ctx.fill();
    }
    ctx.restore();
  }
  ctx.restore();
}

/* ========================================================================== */
/*  本モーダル（読み返し）                                                    */
/* ========================================================================== */
const bookModal=document.getElementById('bookModal');
function openBookModal(){
  const list=document.getElementById('pageList'); list.innerHTML='';
  GT.pageRecord.forEach(p=>{
    const div=document.createElement('div'); div.className='page-entry'+(p.filled?'':' empty');
    const worm=p.filled?'':'<span class="wormhole">◌ ◌ ◌ ◌ ◌ ◌</span>';
    div.innerHTML=`<div class="title">${p.title}</div><div class="body">${ p.filled?escapeHtml(p.text):'（虫食い ── まだ埋まっていない）<br>'+worm }</div>`;
    list.appendChild(div);
  });
  bookModal.classList.add('show');
}
function escapeHtml(s){ return s.replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])); }
GT.openBookModal=openBookModal;
document.getElementById('openBook').addEventListener('click',()=>GT.openBookModal());   // bookview.js が差し替える
document.getElementById('closeBook').addEventListener('click',()=>bookModal.classList.remove('show'));
bookModal.addEventListener('click',e=>{ if(e.target===bookModal) bookModal.classList.remove('show'); });

/* ========================================================================== */
/*  起動（全ステージとplaylistが読み込まれた後に自動で走る）                  */
/* ========================================================================== */
GT.boot=function(){
  // playlist の id 順に、登録済みシーンを並べて SCENES を作る
  GT.SCENES = GT.playlist.map(id=>{
    const s=GT.sceneRegistry[id];
    if(!s) console.warn('[Gravity Tale] playlist のID「'+id+'」に対応するシーンが登録されていません');
    return s;
  }).filter(Boolean);
  if(GT.sceneRegistry.title){ startScene(GT.sceneRegistry.title); GT.mode='idle'; }   // タイトル画面のうしろに映す場面（stages/00t_title.js）
  if(GT.showMenu) GT.showMenu();      // メニュー画面（menu.js）があれば、そこから始める
  else startScene(0);
  requestAnimationFrame(loop);
  requestAnimationFrame(typeLoop);
};
document.addEventListener('DOMContentLoaded',()=>GT.boot());

})();
