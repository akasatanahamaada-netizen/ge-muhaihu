/* ============================================================================
   Gravity Tale ── 本を読みかえす画面 (bookview.js)
   ----------------------------------------------------------------------------
   本の見開きで、1枚ずつページをめくって読む。
     ・いちばん最初は、序章の章のとびら（題名だけのとびらのページは入れない）
     ・そのあとは GT.pageRecord（playlist.js の GT.definePages）の順に 1ページずつ
     ・どのページにも、最初から文章が書いてある（playlist.js の base。ステージで書き込まれる文章と同じ）。虫食いでところどころ読めない
   ・分岐のあるページは、たどり着くと、選んだ道の文章になる
   ・埋まったページでも、そのページの「お話のかけら」がそろうまでは、ところどころ欠けている
     （文字がにじんで読めない・ページのふちの虫食い。挿絵には穴をあけない）。かけらを拾うたびに少しずつ読めるようになり、
     全部そろうと、文字も挿絵も元どおりになる（engine.js の GT.pagePieces）
   操作：◀ ▶ ボタン / ページの左右をクリック / ← → キー / スワイプ でめくる。Esc・閉じる で閉じる。
   開いているあいだ、ゲームは止まる。

   埋まったページには、その場面の挿絵が入る（bookart.js）。
   GT.openBookModal() を差し替えるので、本を開くボタン・メニュー・結末の選択肢から、そのまま使える。
   読み込む順番：playlist.js のあと、menu.js の前。
   ========================================================================== */
(function(){
"use strict";
const TURN_MS=950;          // 1枚めくる時間（ゲームのページめくりと同じ長さ）

const css=`
#bookModal.bv{ padding:12px; flex-direction:column; gap:14px; overflow:auto; }   /* 万一はみ出しても、スクロールでボタンまで行ける */
/* 本の大きさ・形は、ゲームの見開き（900×480）とそろえる。幅は開くときにゲーム画面と同じにする */
.bv-book{ position:relative; width:min(900px,96vw); aspect-ratio:900/480; container-type:inline-size; }
@supports not (aspect-ratio:1){ .bv-book{ height:51vw; } }
.bv-cover{ position:absolute; inset:-1.6% -1.4%; border-radius:10px;
  background:linear-gradient(135deg,#6a4a33,#4a3222 60%,#3a2618); box-shadow:0 24px 60px rgba(0,0,0,0.6), inset 0 0 0 2px rgba(176,141,87,0.35); }
.bv-page, .bv-face{ position:absolute; top:0; width:50%; height:100%; box-sizing:border-box; overflow:hidden;
  padding:4.5% 7% 6%; color:#2b2418; font-family:'Zen Old Mincho',serif; }
.bv-page.l, .bv-face.l{ left:0;  border-radius:4px 0 0 4px;
  background:linear-gradient(90deg,#efe5c9 0%,#f3ead3 70%,#ddcfa9 96%,#cbbb92 100%); }
.bv-page.r, .bv-face.r{ left:50%; border-radius:0 4px 4px 0;
  background:linear-gradient(90deg,#cbbb92 0%,#ddcfa9 4%,#f3ead3 30%,#efe5c9 100%); }
.bv-face{ left:0 !important; width:100%; backface-visibility:hidden; -webkit-backface-visibility:hidden; }
.bv-leaf{ position:absolute; top:0; width:50%; height:100%; z-index:3; pointer-events:none; }
.bv-leaf .bv-face{ backface-visibility:visible; -webkit-backface-visibility:visible; }
.bv-leaf .shade{ position:absolute; inset:0; pointer-events:none; }
.bv-fx{ position:absolute; pointer-events:none; }
.bv-fx.under{ z-index:2; } .bv-fx.over{ z-index:4; }
.bv-spine{ position:absolute; top:0; bottom:0; left:calc(50% - 3%); width:6%; z-index:4; pointer-events:none;
  background:linear-gradient(90deg,rgba(58,50,38,0),rgba(58,50,38,0.28) 50%,rgba(58,50,38,0)); }

/* ページの中身 */
.bv-h{ font-size:clamp(12px,2.1cqw,50px); font-weight:700; letter-spacing:0.12em; color:#3a2f2a;
  border-bottom:1px solid rgba(120,92,52,0.4); padding-bottom:0.5em; margin:0 0 0.9em; }
.bv-h small{ display:block; font-size:0.6em; letter-spacing:0.3em; color:#9a8462; font-weight:500; margin-bottom:0.3em; }
.bv-body{ font-size:clamp(11px,1.75cqw,42px); line-height:2.0; white-space:pre-line; color:#3a3550; }
.bv-no{ position:absolute; bottom:3.5%; left:0; right:0; text-align:center; font-size:clamp(9px,1.2cqw,30px); color:#9a8462; letter-spacing:0.15em; }
.bv-art{ display:block; width:78%; aspect-ratio:600/330; margin:0 auto 0.4em; }
.bv-empty .bv-body{ color:#5a5040; }   /* まだたどり着いていないページ（もとの絵本の文章。少し色あせている） */
.bv-worm{ position:absolute; inset:0; width:100%; height:100%; pointer-events:none; }
.bv-title{ text-align:center; display:flex; flex-direction:column; justify-content:center; height:100%; gap:0.6em; }
.bv-title .t1{ font-family:'Cormorant Garamond',serif; font-weight:700; letter-spacing:0.16em; font-size:clamp(18px,4.4cqw,105px); color:#3a2a1a; line-height:1.1; }
.bv-title .t2{ font-size:clamp(11px,1.9cqw,45px); letter-spacing:0.14em; color:#5a4a33; }
.bv-title .orn{ color:#b08d57; font-size:clamp(12px,2.2cqw,50px); }
.bv-title .t3{ font-size:clamp(10px,1.45cqw,35px); color:#8a7350; letter-spacing:0.08em; margin-top:1em; }
.bv-artwrap{ position:relative; width:78%; margin:0 auto 0.4em; }
.bv-artwrap .bv-art{ width:100%; margin:0; }
.bv-arthole{ position:absolute; inset:0; width:100%; height:100%; pointer-events:none; }
.bv-blot, .bv-gap{ color:transparent; }   /* 読めないところは、ぼかさず空白にする（文字の幅だけ、あいている） */
.bv-pieces{ color:#b08d57; letter-spacing:0.08em; }
.bv-title .t1.bv-chap{ font-family:'Zen Old Mincho',serif; letter-spacing:0.3em; }
.bv-blank{ display:flex; align-items:center; justify-content:center; height:100%; color:#c2b18a; font-size:clamp(14px,2.4cqw,55px); }

/* 操作 */
.bv-bar{ display:flex; align-items:center; gap:14px; color:#cbb98f; font-family:'Zen Old Mincho',serif; font-size:13px; letter-spacing:0.08em; }
.bv-bar button{ background:rgba(232,220,192,0.08); border:1px solid rgba(203,185,143,0.45); color:#e8dcc0; border-radius:20px;
  padding:5px 16px; font-family:'Caveat',cursive; font-size:20px; line-height:1.1; letter-spacing:0.03em; cursor:pointer; }   /* ボタンは英語の筆記体 */
.bv-bar button:hover:not([disabled]){ background:rgba(232,220,192,0.2); }
.bv-bar button[disabled]{ opacity:0.35; cursor:default; }
.bv-go{ position:absolute; z-index:6; right:7%; bottom:8%; font-family:'Caveat',cursive; font-size:clamp(14px,1.8cqw,42px); line-height:1.1; color:#f3ead0; cursor:pointer;
  background:#7a2e28; border:none; border-radius:2em; padding:0.45em 1.1em; letter-spacing:0.06em; box-shadow:0 2px 4px rgba(0,0,0,0.25); }
.bv-go:hover{ background:#9a3a32; }
/* ページの下：このページのステージへ行くボタンを並べる（多いときは折りかえす） */
.bv-gos{ position:absolute; z-index:6; left:7%; right:7%; bottom:8%; display:flex; flex-wrap:wrap-reverse; justify-content:flex-end; align-items:center; gap:0.4em 0.45em; }
.bv-gos-h{ font-family:'Caveat',cursive; font-size:clamp(14px,1.8cqw,42px); color:#7a5a3a; margin-right:auto; align-self:flex-end; }
.bv-gos .bv-go{ position:static; font-family:'Zen Old Mincho',serif; font-size:clamp(10px,1.2cqw,28px); padding:0.45em 0.95em; letter-spacing:0.04em; }
.bv-gos .bv-go.armed{ font-family:'Caveat',cursive; font-size:clamp(13px,1.55cqw,37px); padding:0.2em 0.95em; background:#9a3a32; }
.bv-hit{ position:absolute; top:0; height:100%; width:50%; z-index:5; cursor:pointer; background:none; border:none; padding:0; }
.bv-hit.l{ left:0; } .bv-hit.r{ left:50%; }
.bv-hit[disabled]{ cursor:default; }

/* 開く・閉じるときの表紙（背表紙を軸に、くるりと回る） */
#bookModal.bv{ transition:opacity .25s ease; }
.bv-bar{ transition:opacity .3s ease; }
.bv-lid{ position:absolute; z-index:7; transform-origin:0 50%; transform-style:preserve-3d; pointer-events:none; }
.bv-lid-front, .bv-lid-back{ position:absolute; inset:0; overflow:hidden; backface-visibility:hidden; -webkit-backface-visibility:hidden;
  background:linear-gradient(135deg,#6a4a33,#4a3222 60%,#3a2618); }
.bv-lid-front{ border-radius:0 10px 10px 0; box-shadow:inset 0 0 0 2px rgba(176,141,87,0.35), inset 10px 0 14px -6px rgba(0,0,0,0.5); }
.bv-lid-front::before{ content:''; position:absolute; inset:5% 6% 5% 9%; border:1px solid rgba(214,178,110,0.55); border-radius:4px;
  box-shadow:inset 0 0 0 5px rgba(214,178,110,0.10); }
.bv-lid-deco{ position:absolute; inset:0 0 0 3%; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:0.5em; text-align:center; }
.bv-lid-deco .t1{ font-family:'Cormorant Garamond',serif; font-weight:700; letter-spacing:0.16em; font-size:clamp(18px,4.4cqw,105px); line-height:1.1;
  color:#d6b26e; text-shadow:0 1px 0 rgba(0,0,0,0.55), 0 0 12px rgba(214,178,110,0.25); }
.bv-lid-deco .orn{ color:#b08d57; font-size:clamp(12px,2.2cqw,50px); }
.bv-lid-back{ transform:rotateY(180deg); border-radius:10px 0 0 10px; }
.bv-lid-shade{ position:absolute; inset:0; background:#140e08; opacity:0; pointer-events:none; }

/* ---- 新しい見た目：メニュー画面とそろえる（すけた背景・羊皮紙・茶色のインク・赤いリボンの栞） ---- */
#bookModal.bv{ background:transparent !important; backdrop-filter:sepia(0.55) saturate(0.75) brightness(0.5) blur(2px); -webkit-backdrop-filter:sepia(0.55) saturate(0.75) brightness(0.5) blur(2px); }
#bookModal.bv::before{ content:''; position:fixed; inset:0; pointer-events:none; z-index:-1;
  background:radial-gradient(ellipse at 50% 45%, rgba(30,20,10,0) 35%, rgba(20,12,6,0.7) 100%); }
.bv-page, .bv-face{ box-shadow:inset 0 0 0 1px rgba(120,86,48,0.0); }
.bv-page::after, .bv-face::after{ content:''; position:absolute; inset:2.2% 3%; border:1px solid rgba(120,86,48,0.35); pointer-events:none;
  box-shadow:inset 0 0 0 4px rgba(239,227,198,0.0), inset 0 0 0 5px rgba(120,86,48,0.16); border-radius:2px; }   /* ページのふちの、細い二重の罫 */
.bv-page.l, .bv-face.l{ background:#efe3c6 linear-gradient(90deg, rgba(255,250,236,0.5) 0%, rgba(255,250,236,0.25) 70%, rgba(190,160,110,0.35) 96%, rgba(150,118,72,0.5) 100%); }
.bv-page.r, .bv-face.r{ background:#efe3c6 linear-gradient(90deg, rgba(150,118,72,0.5) 0%, rgba(190,160,110,0.35) 4%, rgba(255,250,236,0.25) 30%, rgba(255,250,236,0.5) 100%); }
.bv-h{ color:#5a3f1c; border-bottom-color:rgba(120,86,48,0.4); }
.bv-h small{ color:#8a7350; }
.bv-body{ color:#3a2a18; }
.bv-no{ color:#8a7350; font-family:'Cormorant Garamond',serif; }
.bv-title .t1{ color:#3a2a18; }
.bv-title .t2{ color:#5a3f1c; }
.bv-title .orn{ color:#9e2a32; }
.bv-pieces{ color:#9e2a32; }
.bv-ribbon{ position:absolute; z-index:6; top:-2.4%; right:9%; width:2.4%; height:20%; background:linear-gradient(90deg,#86222a,#a8313a 50%,#86222a);
  clip-path:polygon(0 0,100% 0,100% 100%,50% 84%,0 100%); box-shadow:0 2px 4px rgba(0,0,0,0.3); pointer-events:none; }   /* 赤いリボンの栞 */
.bv-bar button{ background:#efe3c6 linear-gradient(180deg, rgba(255,250,236,0.55), rgba(214,190,146,0.35)); border:1px solid rgba(120,86,48,0.6); color:#3a2a18;
  font-family:'Great Vibes',cursive; font-size:22px; padding:3px 18px; box-shadow:0 3px 10px rgba(20,12,6,0.45); }
.bv-bar button:hover:not([disabled]){ background:#f6ecd4; color:#7a1f26; }
.bv-bar .bv-count{ color:#efe3c6; text-shadow:0 1px 4px rgba(0,0,0,0.8); }
.bv-go{ background:#9e2a32; } .bv-go:hover{ background:#c23a3a; }
.bv-gos .bv-go.armed{ background:#c23a3a; }
.bv-gos-h{ font-family:'Great Vibes',cursive; color:#5a3f1c; }
.bv-sil{ position:absolute; bottom:0; width:auto; pointer-events:none; filter:drop-shadow(6px -4px 0 rgba(40,26,14,0.2)); }   /* ページの下の角いっぱいに（ページのふちで切れる） */
.bv-sil.hood{ left:-14%; height:45%; }    /* 左半身は、ページの左のふちで見切れる */
.bv-sil.wolf{ right:-16%; height:41%; }   /* 右半身（しっぽ）は、ページの右のふちで見切れる */
.bv-title:has(.bv-sil){ justify-content:flex-start; padding-top:9%; box-sizing:border-box; }   /* 絵があるとびらは、文字を上へ */
/* 「Play again」のボタンがあるページ：ボタンを文章の下に並べて、重ならないように（挿絵を少し小さく・行間を少しつめる） */
.bv-page:has(.bv-gos), .bv-face:has(.bv-gos){ display:flex; flex-direction:column; }
:is(.bv-page,.bv-face):has(.bv-gos) > .bv-h, :is(.bv-page,.bv-face):has(.bv-gos) > .bv-artwrap{ flex:none; }
:is(.bv-page,.bv-face):has(.bv-gos) > .bv-artwrap{ width:62%; }
:is(.bv-page,.bv-face):has(.bv-gos) > .bv-body{ flex:1 1 auto; min-height:0; overflow:hidden; line-height:1.8; }
:is(.bv-page,.bv-face) > .bv-gos{ position:static; flex:none; margin-top:0.35em; padding-bottom:0.2em; }
`;
const style=document.createElement('style'); style.textContent=css; document.head.appendChild(style);

const modal=document.getElementById('bookModal');
modal.classList.add('bv');
modal.innerHTML=`
  <div class="bv-book" role="document" aria-label="本">
    <div class="bv-cover"></div>
    <div class="bv-page l"></div>
    <div class="bv-page r"></div>
    <div class="bv-spine"></div>
    <div class="bv-ribbon"></div>
    <button class="bv-hit l" aria-label="前のページ"></button>
    <button class="bv-hit r" aria-label="次のページ"></button>
  </div>
  <div class="bv-bar">
    <button class="bv-prev">◀ Prev</button>
    <span class="bv-count"></span>
    <button class="bv-next">Next ▶</button>
    <button class="bv-close">Close</button>
  </div>`;
const book=modal.querySelector('.bv-book');
const pageL=modal.querySelector('.bv-page.l'), pageR=modal.querySelector('.bv-page.r');
const btnPrev=modal.querySelector('.bv-prev'), btnNext=modal.querySelector('.bv-next'), count=modal.querySelector('.bv-count');
const hitL=modal.querySelector('.bv-hit.l'), hitR=modal.querySelector('.bv-hit.r');

/* ---- ページの中身 ---- */
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const rnd=i=>{ const s=Math.sin(i*127.1+311.7)*43758.5453; return s-Math.floor(s); };
// 虫食い（GT.wormEaten でキャンバスに描く。穴の向こうは次のページ。外側のふちは劣化でよれる）
function holes(seed,count){ return `<canvas class="bv-worm" width="450" height="600" data-seed="${seed}" data-count="${count}"></canvas>`; }
// 本の並び：章のとびら（序章）→ 序章のページ → 章のとびら（第一章）→ 第一章のページ …（それより後ろ = 白紙）
const info=p=>(GT.pageInfo&&GT.pageInfo[p.key])||{title:p.title,chapter:''};
function entries(){
  const list=[]; let ch=null, no=0;   // 最初の とびら（Gravity Tales の題名のページ）は入れない。章のとびらから始まる
  for(const p of GT.pageRecord){ const c=info(p).chapter;
    if(c && c!==ch){ ch=c; list.push({type:'chap', name:c}); }
    list.push({type:'page', p, no:++no}); }
  return list;
}
// 章のとびらの絵：第一章は、ページの下の角に、赤ずきん（赤い上半身のシルエット・右向き）と狼（黒い上半身のシルエット・左向き）が向かい合う
const CHAP_SILS={
  '第一章':`<img class="bv-sil hood" alt="" src="${encodeURI('assets/character/とびら_赤ずきん上半身.webp')}"><img class="bv-sil wolf" alt="" src="${encodeURI('assets/character/とびら_狼上半身.webp')}">`,
};
// どのページにも、同じ「はしの よれ」をつける（よれのないページだけ大きく見えないように、左右のページの大きさをそろえる）
function slotHTML(slot){ const h=slotInner(slot); return h.includes('bv-worm') ? h : h+holes(slot,0); }
function slotInner(slot){
  const rec=GT.pageRecord, en=entries()[slot];
  if(en && en.type==='chap'){                                     // 章のとびら
    const c=(GT.chapters||[]).find(c=>c.name===en.name)||{name:en.name,sub:''};
    const pages=rec.filter(p=>info(p).chapter===en.name);
    const done=pages.filter(p=>{ const pc=pieces(p); return p.filled && pc.found>=pc.total; }).length;
    return `<div class="bv-title"><div class="orn">❦</div><div class="t1 bv-chap">${esc(c.name)}</div>
      ${c.sub?`<div class="t2">「${esc(c.sub)}」</div>`:''}<div class="orn">· · ·</div>
      <div class="t3">埋まったページ　${done} / ${pages.length}</div>${CHAP_SILS[en.name]||''}</div>`;
  }
  if(!en || en.type!=='page') return `<div class="bv-blank">❧</div>`;
  const p=en.p, pno=en.no;
  const pc=pieces(p), missing=pc.total-pc.found;
  const worm=Math.round(7*lackOf(p,pc));                                                         // 虫食いの穴の数（かけらを拾うと、へっていく）
  const note=(missing>0) ? `　<span class="bv-pieces">お話のかけら ${pc.found} / ${pc.total}</span>` : '';
  const head=`<div class="bv-h"><small>${esc(info(p).chapter)}　第 ${pno} 頁${note}</small>${esc(info(p).title)}</div>`;
  let art='';                                                                                     // 挿絵（bookart.js）。挿絵には穴をあけない（かけらが足りなくても、絵はそのまま見せる）
  if(p.filled && GT.bookArt && GT.bookArt.has(p.key))
    art=`<div class="bv-artwrap"><canvas class="bv-art" data-art="${esc(p.key)}"></canvas></div>`;
  // 文章：本に書き込まれた文章（GT.fillPage）。まだたどり着いていないページは、最初から書いてある同じ文章（playlist.js の base）。
  // どちらも虫食いで、かけらを集めるほど読めるようになる
  const base=(GT.pageBases&&GT.pageBases[p.key]) || p.base || '';
  const text=(p.filled && p.text) ? p.text : base;
  const body=(p.filled ? art : '') + `<div class="bv-body">${damagedText(text, pc, slot, !p.filled)}</div>` + (worm>0 ? holes(slot,worm) : '');
  // このページのステージへ行くボタン（このページにふくまれるステージのうち、一度来たことのあるものだけ。menu.js の GT.canStartFrom / GT.startFrom）
  const ids=(PAGE_SCENES[p.key]||[]).filter(id=>GT.canStartFrom && GT.canStartFrom(id));
  const go = ids.length ? `<div class="bv-gos"><span class="bv-gos-h">Play again</span>${ids.map(id=>
    `<button type="button" class="bv-go" data-scene="${esc(id)}" data-name="${esc(stageName(id))}">${esc(stageName(id))}</button>`).join('')}</div>` : '';
  return head+body+go+`<div class="bv-no">— ${pno} —</div>`;
}
/* ページ（playlist.js の GT.definePages の key）と、そのページにふくまれるステージ（シーンの id。物語の順）。
   そのページのボタンから、どのステージへも行ける（一度来たステージだけ出る。近道・遠回りは、通ったほうだけ） */
const PAGE_SCENES={
  prologue:['wake','opening'],
  komichi: ['komichi1','komichi2','mari_gate'],
  window:  ['house_peek','path1'],
  meet:    ['meet_hood'],
  cliff:   ['cliff'],
  wolf:    ['wolf_talk'],
  crossroads:['crossroads'],
  road:    ['path2','path2b','flowers','path3','path4'],
  front:   ['house_front'],
  granny:  ['arrive'],
};
// ボタンに出す名前：ステージの label から「第一章 ── 」などの章の名前をはずしたもの
const stageName=id=>String(GT.sceneName ? GT.sceneName(id) : id).replace(/^.*?──\s*/,'');
/* そのページのお話のかけら（engine.js）。かけらのないページは、いつも完全 */
function pieces(p){ return GT.pagePieces ? GT.pagePieces(p.key) : {found:0,total:0,ids:[],foundIds:[],extra:[]}; }
/* 欠けた文章：かけらが足りないぶんだけ、ところどころの文字がにじんだり、なくなったりしている。
   どの文字が欠けるかは決まっていて、かけらを拾うたびに、欠けた文字が少しずつ読めるようになる */
const MAX_LACK=0.72;              // かけらが 1 個もないときに、読めない文字の割合
function lackOf(p, pc){ return pc.total ? 1-Math.min(1,pc.found/pc.total) : (p.filled ? 0 : 0.85); }   // 0＝欠けなし、1＝いちばん欠けている
function damagedText(text, pc, seed, unread){
  // かけら 0 個で 7割くらいが読めない。かけらを 1 個拾うごとに、同じだけ読めるようになり、全部そろうと元どおり
  // （欠ける文字は決まっていて、拾うたびに、そのうちの一部が読めるようになる＝だんだん見えてくる）
  // かけらのないページ：まだたどり着いていなければ 6割くらい読めない。たどり着けば元どおり
  const rate = pc.total ? MAX_LACK*(1-Math.min(1,pc.found/pc.total)) : (unread ? 0.6 : 0);
  // 会話などのピース（extraPieces）がまだなら、その reveal の文は、かならず読めない
  const locked=new Array(String(text).length).fill(false);
  for(const e of (pc.extra||[])){ if((pc.foundIds||[]).includes(e.id) || !e.reveal) continue;
    const at=String(text).indexOf(e.reveal); if(at>=0) for(let k=at;k<at+e.reveal.length;k++) locked[k]=true; }
  if(rate<=0 && !locked.includes(true)) return esc(text);
  let out='', i=0;
  for(const ch of String(text)){
    if(ch==='\n'||ch===' '||ch==='　'){ out+=esc(ch); i++; continue; }
    const v=rnd(Math.floor(i/3)+seed*97)*0.65+rnd(i*1.7+seed*13)*0.35;   // となりどうしで、まとまって欠ける
    if(v<rate || locked[i]) out+=`<span class="${rnd(i+seed*5)<0.45?'bv-gap':'bv-blot'}">${esc(ch)}</span>`;
    else out+=esc(ch);
    i++;
  }
  return out;
}
/* 挿絵の穴：足りないかけらの数だけ、まるくびりびりに破れた穴が空いている（下のページの紙が見える） */
function drawArtHoles(cv){
  const miss=String(cv.dataset.missing).split(',').filter(s=>s!=='').map(Number), total=+cv.dataset.total, seed=+cv.dataset.seed, c=cv.getContext('2d'), W=cv.width, H=cv.height;
  c.clearRect(0,0,W,H);
  for(const j of miss){                                             // 穴の場所は、ピースごとに決まっている（会話のピースは、いちばん右＝挿絵のマリのあたり）
    const cx=W*(0.14+0.72*((j+0.5)/total))+(rnd(j*7+seed)-0.5)*W*0.08, cy=H*(0.32+0.36*rnd(j*3+seed*11));
    const r=Math.min(W,H)*(0.2+0.06*rnd(j+seed)), pts=GT.scrapPoints ? GT.scrapPoints(r*2.2,r*2,seed*31+j*17) : null;
    const path=()=>{ c.beginPath(); if(pts){ pts.forEach(([x,y],i)=>i?c.lineTo(cx+x,cy+y):c.moveTo(cx+x,cy+y)); } else c.ellipse(cx,cy,r*1.1,r,0,0,Math.PI*2); c.closePath(); };
    c.save(); path(); c.clip();
    c.fillStyle='#e9dcb8'; c.fillRect(0,0,W,H);                     // 一枚下のページの紙
    c.translate(-3,-4); path(); c.strokeStyle='rgba(60,44,26,0.35)'; c.lineWidth=12; c.stroke();   // 破れたふちが落とす影
    c.restore();
    path(); c.strokeStyle='rgba(255,252,240,0.95)'; c.lineWidth=4; c.stroke();                        // 白くけば立った、破れたふち
    c.strokeStyle='rgba(110,82,50,0.55)'; c.lineWidth=1.2; c.stroke();
  }
}
const slotClass=slot=>{ const en=entries()[slot]; return en && en.type==='page' && !en.p.filled ? ' bv-empty' : ''; };
function mountArt(root){
  if(GT.bookArt) root.querySelectorAll('canvas.bv-art').forEach(cv=>GT.bookArt.mount(cv, cv.dataset.art));
  root.querySelectorAll('canvas.bv-arthole').forEach(drawArtHoles);
  root.querySelectorAll('canvas.bv-worm').forEach(cv=>{ const slot=+cv.dataset.seed, left=slot%2===0, c=cv.getContext('2d');
    c.clearRect(0,0,cv.width,cv.height);
    // 見出し・「まだ埋まっていない」の文字・ページ番号のところは食べない（キャンバス 450×600 の座標）
    const avoid=[{x:20,y:28,w:410,h:150},{x:150,y:548,w:150,h:40}];
    // 挿絵のところも食べない（挿絵が虫食いにならないように）。ページの中の挿絵の位置を、キャンバスの座標に直す
    const aw=cv.parentNode && cv.parentNode.querySelector('.bv-artwrap');
    if(aw){ const cr=cv.getBoundingClientRect(), ar=aw.getBoundingClientRect();
      if(cr.width>0 && ar.width>0){ const sx=cv.width/cr.width, sy=cv.height/cr.height;
        avoid.push({x:(ar.left-cr.left)*sx-12, y:(ar.top-cr.top)*sy-12, w:ar.width*sx+24, h:ar.height*sy+24}); }
      else avoid.push({x:30,y:20,w:390,h:300}); }                     // まだ大きさが決まっていないときは、挿絵がありそうな上半分をよける
    const n=Math.max(0,+cv.dataset.count||0);                        // 0 のときは、穴はあけずに、はしの よれだけ
    GT.wormEaten(c,0,0,cv.width,cv.height,slot*31+5,{ edges:[left?'left':'right','top','bottom'], seam:left?'right':'left', under:'#e2d3ad', outside:'#3a2618', count:n, avoid }); });
}
function fill(el,slot){ el.innerHTML=slotHTML(slot); el.className=el.className.replace(/ ?bv-empty/g,'')+slotClass(slot); mountArt(el); }

/* ---- 見開き ---- */
let spread=0, turning=false, wasPaused=false;
const spreads=()=>Math.ceil(entries().length/2);             // とびら + 章のとびら + ページ
function show(){
  fill(pageL, spread*2); fill(pageR, spread*2+1);
  updateNav();
}
function updateNav(){                                         // 前へ・次へのボタンと「n / m」
  const last=spreads()-1;
  btnPrev.disabled=hitL.disabled=spread<=0; btnNext.disabled=hitR.disabled=spread>=last;
  count.textContent=`${spread+1} / ${last+1}`;
}
/* 1枚めくる：ゲームのページめくり（engine.js の drawFlip）と同じ動き。
   めくれる紙は、ページとまったく同じ大きさで、表にはいまのページ、裏には次の見開きのページが描いてある
   （白紙ではなく、文字や挿絵が入ったまま めくれる）。
   紙は背表紙を軸に横へ縮みながら反対側へ倒れ、上下のふちが少し反る。めくっているあいだは見開きが少し暗くなり、
   紙の背表紙側に影、めくれていくふちに光の線が入る。
   紙が倒れていく先のページ（進むときは左、もどるときは右）は、紙がおりきるまで いまのページのまま。
   （先に入れかえると、細くなった紙のうしろから、次のページが先に見えてしまう） */
function turn(dir){
  const to=spread+dir; if(turning || lidAnim || to<0 || to>=spreads()) return;
  turning=true; GT.sfx&&GT.sfx('page');
  const rect=book.getBoundingClientRect(), BW=rect.width, BH=rect.height, SP=BW/2;
  const frontSlot = dir>0 ? spread*2+1 : spread*2;            // めくる紙の表（いまのページ）
  const backSlot  = dir>0 ? to*2       : to*2+1;              // めくる紙の裏（次の見開きのページ）
  // 下にあるページは、先に次の見開きにしておく（めくった紙のうしろから見える）
  if(dir>0) fill(pageR, to*2+1); else fill(pageL, to*2);
  // 紙の下：見開きを少し暗くする
  const dimEl=document.createElement('div');
  Object.assign(dimEl.style,{position:'absolute',inset:'0',zIndex:'4',pointerEvents:'none',background:'rgb(28,22,14)',opacity:'0'});
  book.appendChild(dimEl);
  // めくれる紙（表と裏）
  const mkLeaf=(slot,side)=>{ const leaf=document.createElement('div'); leaf.className='bv-leaf';
    Object.assign(leaf.style,{zIndex:'5',left:side==='r'?'50%':'0',transformOrigin:side==='r'?'0 50%':'100% 50%',display:'none'});
    const face=document.createElement('div'); face.className='bv-face '+side; fill(face,slot);
    const sh=document.createElement('div'); sh.className='shade';
    leaf.appendChild(face); leaf.appendChild(sh); book.appendChild(leaf); return {leaf,sh,side}; };
  const front=mkLeaf(frontSlot, dir>0?'r':'l'), back=mkLeaf(backSlot, dir>0?'l':'r');
  // 紙の上：光の線と「ページをめくる…」
  const dpr=window.devicePixelRatio||1, cv=document.createElement('canvas'); cv.className='bv-fx';
  Object.assign(cv.style,{left:'0',top:'0',width:BW+'px',height:BH+'px',zIndex:'6'});
  cv.width=Math.round(BW*dpr); cv.height=Math.round(BH*dpr);
  const g=cv.getContext('2d'); g.setTransform(dpr,0,0,dpr,0,0); book.appendChild(cv);
  const fs=Math.max(12,Math.round(BW/45));                          // 「ページをめくる…」の文字の大きさ（ゲームの 20px / 900px に合わせる）
  const t0=performance.now(); let swapped=false;
  function frame(now){
    const p=Math.min(1,(now-t0)/TURN_MS), c=Math.cos(p*Math.PI), k=Math.max(0.001,Math.abs(c)), dim=Math.sin(p*Math.PI);
    if(!swapped && p>=0.5){ swapped=true; spread=to; updateNav(); } // 背表紙を越えたら、ページ番号だけ先に進める（ページの中身は、おりきってから）
    const cur = c>=0 ? front : back, other = c>=0 ? back : front;
    other.leaf.style.display='none'; cur.leaf.style.display='';
    // 上下のふちの反り（紙の外がわほど、内がわへ反る）。紙はページと同じ大きさ（SP×BH）
    const b=BH*(12/480)*(1-k), onR=cur.side==='r';
    const path = onR ? `M0 0 Q ${SP*0.55} ${b*0.2} ${SP} ${b} L ${SP} ${BH-b} Q ${SP*0.55} ${BH-b*0.2} 0 ${BH} Z`
                     : `M${SP} 0 Q ${SP*0.45} ${b*0.2} 0 ${b} L 0 ${BH-b} Q ${SP*0.45} ${BH-b*0.2} ${SP} ${BH} Z`;
    cur.leaf.style.clipPath=`path('${path}')`;
    cur.leaf.style.transform=`scaleX(${k})`;
    // 背表紙側の影と、倒れるほど暗くなる紙
    cur.sh.style.background=`linear-gradient(${onR?90:270}deg, rgba(58,45,30,${0.30+0.2*dim}) 0%, rgba(58,45,30,0) 35%), rgba(40,30,18,${0.18*dim})`;
    dimEl.style.opacity=String(0.30*dim);
    // めくれていくふちの光の線と、「ページをめくる…」
    const edgeX = onR ? SP+SP*k : SP-SP*k;
    g.clearRect(0,0,BW,BH);
    g.strokeStyle='rgba(255,250,235,0.55)'; g.lineWidth=2;
    g.beginPath(); g.moveTo(edgeX,b); g.lineTo(edgeX,BH-b); g.stroke();
    g.save(); g.globalAlpha=dim; g.fillStyle='rgba(74,70,60,0.95)';
    g.font=`700 ${Math.round(fs*1.35)}px 'Caveat', cursive`; g.textAlign='center'; g.textBaseline='middle';
    g.fillText('Turning the page…', BW/2, BH-BH*(38/480)); g.restore();
    if(p<1) requestAnimationFrame(frame);
    else { show(); front.leaf.remove(); back.leaf.remove(); dimEl.remove(); cv.remove(); turning=false; }   // 紙がおりきったら、倒れた先のページも次の見開きに
  }
  requestAnimationFrame(frame);
}

/* ---- 開く・閉じる ----
   開く：閉じた本（表紙だけ）が まん中にあらわれ、表紙が背表紙を軸に左へ倒れて、見開きになる。
   閉じる：左のページごと表紙が右へ倒れて本が閉じ、まん中にもどってから、消える。
   表紙の裏には、左のページがそのまま描いてあるので、開ききった／閉じはじめのところで、見た目がとぎれない。 */
const OPEN_MS=1150, CLOSE_MS=1000;
const coverEl=modal.querySelector('.bv-cover'), spineEl=modal.querySelector('.bv-spine'), bar=modal.querySelector('.bv-bar');
let lidAnim=false;
const reduced=()=>window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
const ease=t=>t<0.5 ? 4*t*t*t : 1-Math.pow(-2*t+2,3)/2;
// 本が閉じているあいだは、左半分（左のページ・表紙の左がわ）は見せない
function setClosed(on){
  pageL.style.visibility = on ? 'hidden' : '';
  coverEl.style.clipPath = spineEl.style.clipPath = on ? 'inset(0 0 0 50%)' : '';
}
// 表紙（表＝本の表紙、裏＝左のページ）。表紙のふちは、ページより少し外へ出ている（.bv-cover と同じ）
function mkLid(backSlot){
  const r=book.getBoundingClientRect(), BW=r.width, BH=r.height, ox=BW*0.014, oy=BH*0.016;
  const leaf=document.createElement('div'); leaf.className='bv-lid';
  Object.assign(leaf.style,{left:(BW/2)+'px', top:(-oy)+'px', width:(BW/2+ox)+'px', height:(BH+2*oy)+'px'});
  leaf.innerHTML=`<div class="bv-lid-front"><div class="bv-lid-deco"><div class="orn">❦</div><div class="t1">Gravity<br>Tales</div><div class="orn">· · ·</div></div><div class="bv-lid-shade"></div></div>
    <div class="bv-lid-back"><div class="bv-face l"></div><div class="bv-lid-shade"></div></div>`;
  book.appendChild(leaf);
  const pg=leaf.querySelector('.bv-face');
  pg.style.setProperty('left',ox+'px','important'); Object.assign(pg.style,{top:oy+'px', width:(BW/2)+'px', height:BH+'px'});
  fill(pg, backSlot);                                                  // 回す前に描く（虫食いの、よける場所の計算がずれないように）
  book.style.perspective=(BW*2.4)+'px';
  return { leaf, BW, shades:[...leaf.querySelectorAll('.bv-lid-shade')] };
}
// a … 表紙の開いた角度（0＝閉じている、180＝開いている）
function lidAt(lid, a){
  lid.leaf.style.transform=`rotateY(${-a}deg)`;
  const s=Math.sin(a*Math.PI/180); lid.shades.forEach(e=>e.style.opacity=String(0.42*s));   // 立っているほど、光が当たらず暗い
  book.style.transform=`translateX(${(-lid.BW/4)*(1-a/180)}px)`;     // 閉じた本は、まん中に来るように
}
function endLid(lid){ lid.leaf.remove(); book.style.transform=''; book.style.perspective=''; setClosed(false); lidAnim=false; }
function playLid(lid, from, to, ms, delay, onCross, done){
  const t0=performance.now()+delay; let crossed=false;
  (function frame(now){
    const p=Math.max(0,Math.min(1,(now-t0)/ms)), a=from+(to-from)*ease(p);
    if(!crossed && (from<to ? a>=90 : a<=90)){ crossed=true; onCross(); }
    lidAt(lid,a);
    if(p<1) requestAnimationFrame(frame); else done();
  })(performance.now());
}
/* 本の大きさ：ゲームの見開きと同じ大きさで、ぴったり重ねる。
   ただし、画面に入りきらないとき（全画面を Esc でやめた・窓を小さくした など）は、
   下の「閉じる」などのボタンまで画面に入るよう、本を小さくする。開いているあいだも、画面の大きさが変わるたびに合わせ直す */
function fitBook(){
  const gc=document.getElementById('game').getBoundingClientRect();
  const vw=window.innerWidth, vh=window.innerHeight, barH=(bar.offsetHeight||36)+14+16;   // ボタンの列＋すきま＋下の余白
  const M=Math.round(Math.max(28,vh*0.06));                                              // 本の上にとる、いちばん小さい余白
  const maxW=top=>Math.min(vw*0.96, (vh-top-barH)*900/480);
  let top=Math.max(M,Math.round(gc.top||M)), w=gc.width>0?gc.width:900;
  if(w>maxW(top)){ top=M; w=Math.min(w,maxW(top)); }                                    // 入りきらない：上に少し余白を残して、小さくする
  book.style.width=Math.max(200,Math.round(w))+'px';
  modal.style.justifyContent='flex-start'; modal.style.paddingTop=top+'px';
}
let refitQueued=false;
function refit(){                                                    // ゲーム画面の大きさが決まってから合わせる（次のフレームで）
  if(!modal.classList.contains('show') || refitQueued) return;
  refitQueued=true; requestAnimationFrame(()=>requestAnimationFrame(()=>{ refitQueued=false; if(modal.classList.contains('show')) fitBook(); }));
}
window.addEventListener('resize',refit);
document.addEventListener('fullscreenchange',refit); document.addEventListener('webkitfullscreenchange',refit);
/* ---- 本を開くように誘導する ----
   GT.guideToBook('文')  … 画面の下の「本を開く」ボタンを光らせ、上に文を出す（ステージから呼ぶ。例：03 赤ずきんの家）
   誘導中に本を開くと、とびらではなく、いちばん新しく書かれたページの見開きを開く。開いたら誘導は消える。
   GT.clearBookGuide()  … 誘導を消す（ページが変わると自動で消える） */
const guideBtn=document.getElementById('openBook');
let guiding=false;
let guidePage=null;   // 誘導中に本を開いたとき、開くページ（key）。無ければ、いちばん新しく書かれたページ
GT.guideToBook=function(text,pageKey){
  if(!guideBtn) return; guiding=true; guidePage=pageKey||null;
  guideBtn.dataset.guide=text||'本を開いてみよう'; guideBtn.classList.add('gt-guide');
};
GT.clearBookGuide=function(){ guiding=false; guidePage=null; if(guideBtn){ guideBtn.classList.remove('gt-guide'); delete guideBtn.dataset.guide; } };
GT.registerSceneReset(()=>GT.clearBookGuide());
function spreadOf(key){ const i=entries().findIndex(en=>en.type==='page' && en.p.key===key); return i<0?latestSpread():Math.floor(i/2); }
function latestSpread(){                                      // いちばん新しく書かれたページがある見開き
  const list=entries(); let slot=0;
  list.forEach((en,i)=>{ if(en.type==='page' && en.p.filled) slot=i; });
  return Math.floor(slot/2);
}
function open(){
  if(modal.classList.contains('show')) return;
  fitBook();
  spread = guiding ? (guidePage ? spreadOf(guidePage) : latestSpread()) : 0; GT.clearBookGuide(); show();
  wasPaused=!!GT.paused; GT.paused=true;
  if(reduced()){ modal.style.opacity=''; modal.classList.add('show'); GT.sfx&&GT.sfx('page'); return; }
  // 閉じた本を、ふわっと出してから開く
  lidAnim=true; modal.style.opacity='0'; bar.style.opacity='0';
  modal.classList.add('show');
  setClosed(true); const lid=mkLid(0); lidAt(lid,0);
  requestAnimationFrame(()=>{ modal.style.opacity='1'; });
  setTimeout(()=>GT.sfx&&GT.sfx('page'), 280);
  playLid(lid, 0, 180, OPEN_MS, 300, ()=>setClosed(false), ()=>{ endLid(lid); bar.style.opacity=''; });
}
function close(){
  if(!modal.classList.contains('show') || lidAnim) return;
  const finish=()=>{ modal.classList.remove('show'); modal.style.opacity=''; bar.style.opacity=''; GT.paused=wasPaused; };
  if(reduced() || turning){ GT.sfx&&GT.sfx('close'); finish(); return; }
  lidAnim=true; bar.style.opacity='0';
  const lid=mkLid(spread*2); lidAt(lid,180);
  playLid(lid, 180, 0, CLOSE_MS, 0, ()=>setClosed(true), ()=>{
    GT.sfx&&GT.sfx('close');                                           // 表紙が閉じたところで、パタン
    setTimeout(()=>{ modal.style.opacity='0';
      setTimeout(()=>{ finish(); endLid(lid); }, 260); }, 220);
  });
}
GT.openBookModal=open; GT.closeBookModal=close;
if(GT.bookArt) GT.bookArt.onReady(()=>{ if(modal.classList.contains('show') && !turning) show(); });   // 画像が読みこめたら描き直す

btnPrev.addEventListener('click',()=>turn(-1)); btnNext.addEventListener('click',()=>turn(1));
hitL.addEventListener('click',()=>turn(-1));    hitR.addEventListener('click',()=>turn(1));
modal.querySelector('.bv-close').addEventListener('click',close);
// 「このページへもどる」：本をすぐに閉じて、その場面のはじめから（来たときの分岐・本のページの状態にもどる）
//   1回押すと「もう一度押すと、もどる」。2.5秒以内にもう一度押すと、もどる（うっかり押して、いまの進みがなくならないように）
modal.addEventListener('click',e=>{ const g=e.target.closest('.bv-go'); if(!g) return; e.stopPropagation();
  if(!(g._armT>performance.now())){ g._armT=performance.now()+2500; g.textContent='Tap again'; g.classList.add('armed');
    setTimeout(()=>{ if(!(g._armT>performance.now())){ g.textContent=g.dataset.name; g.classList.remove('armed'); } },2600); return; }
  const id=g.dataset.scene; modal.classList.remove('show'); modal.style.opacity=''; bar.style.opacity=''; GT.paused=false;
  if(GT.bookJump && GT.bookJump(id)) return;   // お話を読み終えたあとの「森の出口」など（12_grannys_house.js）
  if(GT.startFrom) GT.startFrom(id); }, true);
modal.addEventListener('click',e=>{ if(e.target===modal) close(); });
// スワイプ
let sx=null;
book.addEventListener('pointerdown',e=>{ sx=e.clientX; });
book.addEventListener('pointerup',e=>{ if(sx==null) return; const d=e.clientX-sx; sx=null; if(Math.abs(d)>40){ e.preventDefault(); turn(d<0?1:-1); } });
// キー（開いているあいだは、ゲームやメニューにキーを渡さない）
window.addEventListener('keydown',e=>{
  if(!modal.classList.contains('show')) return;
  e.stopImmediatePropagation();
  if(e.key==='ArrowRight'||e.key==='d'||e.key==='D'){ e.preventDefault(); turn(1); }
  else if(e.key==='ArrowLeft'||e.key==='a'||e.key==='A'){ e.preventDefault(); turn(-1); }
  else if(e.key==='Escape'||e.key==='b'||e.key==='B'){ e.preventDefault(); close(); }
}, true);
})();
