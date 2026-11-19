/* ============================================================================
   Gravity Tale ── メニュー画面 (menu.js)
   ----------------------------------------------------------------------------
   ・ゲームを開くと、まずこの画面が出る（タイトルともくじ）
       （ゲーム中は つづける）はじめから / つづきから / 物語を振り返る / あそびかた / せってい
   ・しおりを挟む … いまのステージに、しおり（Ⅰ・Ⅱ…）を挟む。本の上のしおりを押すと、そのステージのはじめにもどれる（5枚まで）
   ・ゲーム中は、左上の「≡ メニュー」ボタンか Esc キーで開く（開いているあいだは止まる）
   ・進み具合は、ブラウザに自動でセーブされる（ステージが始まるたび）
       → 「つづきから」で最後のステージから遊べる。一度来たステージへは、本を読み返す画面（bookview.js）の各ページから行ける
       → そのステージに来たときの分岐（フラグ）と本のページも、いっしょにもどる

   読み込む順番：playlist.js のあと（index.html のいちばん最後）。
   ステージの名前は、各ステージの label を使う。label の無いシーンは下の NAMES で決める。
   ========================================================================== */
(function(){
"use strict";
const SAVE_KEY='gravityTale.ep1.save';
const BOOKMARK_MAX=5;                 // しおりは5枚まで（下の「しおり」）
const TITLE_BG='assets/background/タイトル背景_森.webp';   // タイトル画面の背景（霧の薔薇の森。紫をぬいて、霧の深い緑がかった灰色に。もとは『ゴシックの森とタイトル背景png.png』）
const TITLE_LOGO='assets/background/タイトルロゴ_金.webp'; // タイトルのロゴ（ふちが透明）。文字といばらを古びた金色にしたもの（もとの色は『タイトルロゴ.webp』）
const NAMES={ arrive:'おばあさんの家', ending:'結末' };      // label の無いシーンの名前

/* ---- セーブ（ブラウザの localStorage。使えないときはセーブなしで動く） ---- */
const clone=o=>JSON.parse(JSON.stringify(o));
const INIT={ flags:clone(GT.flags), pages:clone(GT.pageRecord) };   // 最初の状態（はじめから用）
function loadSave(){ try{ const d=JSON.parse(localStorage.getItem(SAVE_KEY)); if(d&&d.scenes) return d; }catch(e){} return {last:null, scenes:{}}; }
function writeSave(){ try{ localStorage.setItem(SAVE_KEY, JSON.stringify(save)); }catch(e){} }
let save=loadSave();

// 状態をもどす（GT.flags / GT.pageRecord は、ほかのファイルも見ているので中身だけ入れかえる）
function applyState(st){
  for(const k of Object.keys(GT.flags)) delete GT.flags[k];
  Object.assign(GT.flags, clone(st.flags));
  GT.pageRecord.length=0; for(const p of clone(st.pages)) GT.pageRecord.push(p);
}
function rebuildScenes(){   // 途中で差しこまれたシーン（ボス戦など）を片づけて、playlist の並びにもどす
  GT.SCENES=GT.playlist.map(id=>GT.sceneRegistry[id]).filter(Boolean);
}
const sceneName=id=>{ const s=GT.sceneRegistry[id]; return (s&&s.label)||NAMES[id]||id; };

GT.onSceneStart(scene=>{
  if(!scene || GT.playlist.indexOf(scene.id)<0) return;            // 差しこまれたシーンはセーブしない
  save.last=scene.id;
  save.scenes[scene.id]={ flags:clone(GT.flags), pages:clone(GT.pageRecord), pageNo:GT.getPageNo() };
  writeSave();
});

/* ---- 見た目 -------------------------------------------------------------- */
let css=`
.canvas-wrap{ container-type:inline-size; }
.gtm{ position:absolute; inset:0; z-index:10; display:none; overflow:hidden; border-radius:3px;
  background:#d9c9a3 url("${encodeURI(TITLE_BG)}") 100% 50%/cover no-repeat; font-family:'Zen Old Mincho',serif; color:#2b2418; }
.gtm.show{ display:block; }
.gtm-start{ position:absolute; inset:0; z-index:5; display:none; background:rgba(30,24,16,0.18); cursor:pointer; }
.gtm-start.show{ display:block; }
.gtm-start span{ position:absolute; left:74%; top:72%; transform:translate(-50%,-50%); white-space:nowrap; font-size:clamp(12px,2.2cqw,50px); letter-spacing:0.18em; color:#f3ead0; text-shadow:0 1px 6px rgba(0,0,0,0.6);
  padding:0.45em 1.1em; border:1px solid rgba(243,234,208,0.6); border-radius:2em; background:rgba(43,36,24,0.55);
  animation:gtmBlink 1.6s ease-in-out infinite; }
@keyframes gtmBlink{ 0%,100%{ opacity:1 } 50%{ opacity:0.45 } }
.gtm::before{ content:''; position:absolute; inset:0; pointer-events:none;
  background:linear-gradient(90deg, rgba(58,50,38,0) 47%, rgba(58,50,38,0.35) 50%, rgba(58,50,38,0) 53%),
             radial-gradient(ellipse at center, rgba(0,0,0,0) 60%, rgba(40,30,18,0.35) 100%); }
.gtm-title{ position:absolute; left:52%; right:3%; top:9%; text-align:center; pointer-events:none;
  text-shadow:0 1px 0 rgba(255,250,235,0.8), 0 0 12px rgba(255,250,235,0.7); }
.gtm-title h2{ margin:0; font-family:'Cormorant Garamond',serif; font-weight:700; letter-spacing:0.14em;
  font-size:clamp(20px,6.2cqw,145px); line-height:1.05; color:#3a2a1a; }
.gtm-title p{ margin:0.5em 0 0; font-size:clamp(10px,1.9cqw,42px); letter-spacing:0.12em; color:#4a3a26; }
.gtm-card{ position:absolute; left:3.5%; top:6%; width:42%; height:88%; box-sizing:border-box;
  background:rgba(248,242,226,0.93); border-radius:6px; box-shadow:0 6px 24px rgba(40,30,18,0.35), inset 0 0 0 1px rgba(120,92,52,0.35);
  padding:clamp(8px,2.6cqw,65px) clamp(10px,3cqw,75px); display:flex; flex-direction:column; overflow:auto; }
.gtm-card h3{ margin:0 0 0.6em; font-size:clamp(11px,1.7cqw,38px); letter-spacing:0.4em; color:#8a7350; font-weight:700;
  border-bottom:1px solid rgba(120,92,52,0.35); padding-bottom:0.5em; }
.gtm-view{ display:none; flex-direction:column; gap:clamp(2px,0.6cqw,15px); flex:1; }
.gtm-view.show{ display:flex; }
.gtm-btn{ all:unset; box-sizing:border-box; cursor:pointer; display:flex; align-items:baseline; gap:0.6em;
  padding:clamp(3px,0.9cqw,22px) clamp(6px,1cqw,25px); border-radius:6px; font-size:clamp(12px,2.2cqw,48px); font-weight:700;
  letter-spacing:0.08em; color:#2b2418; transition:background .15s, color .15s; }
.gtm-btn::before{ content:'❧'; color:#b08d57; opacity:0; transition:opacity .15s; font-size:0.9em; }
.gtm-btn:hover, .gtm-btn:focus-visible, .gtm-btn:focus{ background:rgba(176,141,87,0.18); color:#5a3f1c; }
.gtm-btn:hover::before, .gtm-btn:focus::before{ opacity:1; }
.gtm-btn small{ font-size:0.68em; font-weight:500; color:#8a7350; letter-spacing:0.04em; margin-left:auto; text-align:right; }
.gtm-btn[disabled]{ cursor:default; color:#b3a587; } .gtm-btn[disabled]::before{ opacity:0; }
.gtm-btn[disabled]:hover{ background:none; }
.gtm-back{ margin-top:auto; font-size:clamp(11px,1.8cqw,38px); color:#8a7350; }
.gtm-howto{ font-size:clamp(10px,1.65cqw,35px); line-height:1.75; margin:0; padding:0; list-style:none; }
.gtm-howto b{ display:inline-block; min-width:6.5em; color:#5a3f1c; }
.gtm-howto li{ border-bottom:1px dashed rgba(120,92,52,0.25); padding:0.15em 0; }
.gtm-foot{ position:absolute; right:3%; bottom:4%; font-size:clamp(9px,1.4cqw,30px); color:rgba(58,42,26,0.8);
  letter-spacing:0.1em; text-shadow:0 0 6px rgba(255,250,235,0.9); pointer-events:none; }
.gtm-open{ position:absolute; top:0.67cqw; left:0.9cqw; z-index:2; padding:0.25em 0.85em; border-radius:2em; background:rgba(43,36,24,0.72);
  border:1px solid rgba(176,141,87,0.6); color:#e8dcc0; font-family:'Zen Old Mincho',serif;
  font-size:clamp(11px,1.33cqw,32px); letter-spacing:0.06em; cursor:pointer; }
.gtm-vol{ display:grid; grid-template-columns:5em 1fr 3em; align-items:center; gap:0.6em; font-size:clamp(11px,1.9cqw,42px); font-weight:700;
  padding:clamp(3px,0.8cqw,20px) clamp(6px,1cqw,25px); border-radius:6px; }
.gtm-vol:focus-within{ background:rgba(176,141,87,0.18); }
.gtm-vol output{ text-align:right; font-size:0.85em; color:#8a7350; font-weight:500; }
.gtm-range{ width:100%; accent-color:#b08d57; cursor:pointer; margin:0; height:1.4em; }
@media (max-width:640px){ .gtm-card{ width:50%; left:2%; top:4%; height:92%; } .gtm-title{ left:54%; } }
/* ボタン・見出しは英語の筆記体（Caveat）。物語の言葉（ステージの名前・説明の文）は日本語の明朝のまま */
.gtm-card h3{ font-family:'Caveat',cursive; font-size:clamp(16px,2.6cqw,60px); letter-spacing:0.06em; font-weight:700; }
.gtm-btn, .gtm-vol span, .gtm-start span, .gtm-open{ font-family:'Caveat',cursive; letter-spacing:0.03em; }
.gtm-btn{ font-size:clamp(17px,3.1cqw,70px); font-weight:600; line-height:1.15; }
.gtm-back{ font-size:clamp(15px,2.5cqw,56px); }
.gtm-vol{ font-size:clamp(15px,2.6cqw,58px); }
.gtm-vol output{ font-family:'Zen Old Mincho',serif; font-size:0.6em; }
.gtm-start span{ font-size:clamp(17px,3cqw,68px); letter-spacing:0.05em; }
.gtm-btn small{ font-family:'Zen Old Mincho',serif; letter-spacing:0.04em; }
.gtm-howto b{ font-family:'Caveat',cursive; font-size:1.3em; font-weight:700; letter-spacing:0.02em; }

/* ==== タイトル画面：背景（霧の薔薇の森）の上に、ロゴの絵（.gtm-logo）を重ねる ====
   ・ロゴは絵なので、文字のタイトルは出さない。ロゴの下に章の名前、その下に横に並んだ筆記体のメニュー
   ・「Tap or press any key to start」のあいだは、ロゴと案内だけ（メニューは出さない）
   ・Settings・How to Play は、まん中に暗い半透明の枠で出す（薔薇の色と、くすんだ金のふち） */
.gtm{ background:#10130f url("${encodeURI(TITLE_BG)}") 50% 50%/cover no-repeat; color:#efe6d2; }
.gtm::before{ background:radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 55%, rgba(4,6,4,0.55) 100%); }
.gtm-logo{ position:absolute; left:50%; top:12%; width:48%; transform:translateX(-50%); pointer-events:none; user-select:none;
  filter:drop-shadow(0 6px 14px rgba(4,6,4,0.75)); }
.gtm-title{ left:0; right:0; top:50%; text-shadow:0 1px 6px rgba(4,6,4,0.95), 0 0 14px rgba(4,6,4,0.8); }
.gtm-title h2{ position:absolute; width:1px; height:1px; overflow:hidden; clip-path:inset(50%); }   /* ロゴの絵があるので、文字は見せない（読み上げ用に残す） */
.gtm-title p{ margin:0; font-size:clamp(11px,1.7cqw,40px); letter-spacing:0.3em; color:#e6d8b8; }
.gtm-title p::before, .gtm-title p::after{ content:'❧'; color:#b9a27a; margin:0 0.8em; letter-spacing:0; font-size:0.9em; }
.gtm-title p::before{ display:inline-block; transform:scaleX(-1); }
/* 章の名前の横の飾り（❧）は、タップできる。タップすると章の名前が「第二章「？？？」」…と変わる */
.gtm-title p::before, .gtm-title p::after{ content:none !important; }
.gtm-title{ z-index:6; }
.gtm-orn{ pointer-events:auto; background:none; border:none; padding:0.1em 0.2em; margin:0 0.6em; color:#b9a27a; font:inherit; font-size:0.9em; letter-spacing:0; cursor:pointer; display:inline-block; transition:transform .2s, color .2s; }
.gtm-orn.l{ transform:scaleX(-1); }
.gtm-orn:hover{ color:#e8d4a0; }
.gtm-orn.l:active{ transform:scaleX(-1) scale(0.85); } .gtm-orn.r:active{ transform:scale(0.85); }
.gtm-ch{ display:inline-block; transition:opacity .25s; }
.gtm-foot{ left:0; right:0; bottom:3.2%; text-align:center; color:rgba(232,207,214,0.6); text-shadow:0 1px 4px rgba(0,0,0,0.9); letter-spacing:0.22em; font-size:clamp(9px,1.25cqw,28px); }
/* 案内（はじめる前） */
.gtm-start{ background:none; }
.gtm-start span{ left:50%; top:75%; border:none; background:none; padding:0.2em 0.6em; color:#f6e6ea; font-size:clamp(18px,3cqw,70px);
  text-shadow:0 0 10px rgba(220,180,100,0.5), 0 1px 4px rgba(0,0,0,0.9); }
.gtm:has(.gtm-start.show) .gtm-card{ visibility:hidden; }
.gtm:has(.gtm-start.show) .gtm-title{ top:52%; }
.gtm:has(.gtm-start.show) .gtm-logo{ top:16%; }
/* メインのメニュー：枠なしで、ロゴの下に横一列（入りきらなければ折りかえす） */
.gtm[data-view="main"] .gtm-card{ left:4%; right:4%; width:auto; top:auto; bottom:11%; height:auto; padding:0; background:none; box-shadow:none; overflow:visible; }
.gtm[data-view="main"] .gtm-card h3{ display:none; }
.gtm[data-view="main"] .gtm-view{ flex-direction:row; flex-wrap:wrap; justify-content:center; align-items:center; gap:0.2em clamp(4px,1.4cqw,34px); }
.gtm[data-view="main"] .gtm-btn{ padding:0.15em 0.35em; font-size:clamp(17px,2.85cqw,66px); color:#f1e8d4; font-weight:700;
  text-shadow:0 1px 4px rgba(0,0,0,0.95), 0 0 10px rgba(4,8,4,0.8); background:none; }
.gtm[data-view="main"] .gtm-btn::before{ content:'❦'; color:#c4344d; font-size:0.7em; margin-right:-0.25em; }
.gtm[data-view="main"] .gtm-btn:hover, .gtm[data-view="main"] .gtm-btn:focus-visible, .gtm[data-view="main"] .gtm-btn:focus{ background:none; color:#fff1d0;
  text-shadow:0 1px 4px rgba(0,0,0,0.95), 0 0 12px rgba(230,190,110,0.85); }
.gtm[data-view="main"] .gtm-btn small{ display:none; }   /* 「Continue」のステージの名前は、カーソルを乗せたときに出す（title） */
.gtm[data-view="main"] .gtm-btn[disabled]{ color:rgba(241,232,212,0.32); text-shadow:0 1px 3px rgba(0,0,0,0.8); }
/* Settings・How to Play：まん中に、暗い半透明の枠 */
.gtm:not([data-view="main"]) .gtm-card{ left:14%; width:72%; top:5%; height:90%; padding:clamp(8px,2cqw,50px) clamp(10px,3cqw,75px); background:rgba(14,16,12,0.88);
  box-shadow:0 10px 30px rgba(0,0,0,0.6), inset 0 0 0 1px rgba(201,160,112,0.55), inset 0 0 0 4px rgba(14,16,12,0.88), inset 0 0 0 5px rgba(201,160,112,0.25); }
.gtm:not([data-view="main"]) .gtm-title, .gtm:not([data-view="main"]) .gtm-foot, .gtm:not([data-view="main"]) .gtm-logo{ display:none; }
.gtm:not([data-view="main"]) .gtm-card h3{ color:#e3cfa0; border-bottom-color:rgba(201,160,112,0.4); text-align:center; }
.gtm:not([data-view="main"]) .gtm-btn{ color:#efe6d2; }
.gtm:not([data-view="main"]) .gtm-btn:hover, .gtm:not([data-view="main"]) .gtm-btn:focus{ background:rgba(201,160,112,0.16); color:#fff1d0; }
.gtm:not([data-view="main"]) .gtm-btn::before{ color:#c4344d; }
.gtm-back{ color:#c9a070 !important; align-self:center; }
.gtm-howto{ color:#e8e0cc; } .gtm-howto b{ color:#e3c58a; } .gtm-howto li{ border-bottom-color:rgba(201,160,112,0.22); }
.gtm-vol{ color:#efe6d2; } .gtm-vol:focus-within{ background:rgba(201,160,112,0.14); } .gtm-vol output{ color:#c9a070; }
.gtm-range{ accent-color:#c4344d; }
.gtm:not([data-view="main"]) .gtm-howto{ font-size:clamp(10px,1.5cqw,32px); line-height:1.45; }   /* How to Play が枠に入りきるように */
.gtm:not([data-view="main"]) .gtm-card h3{ margin-bottom:0.35em; padding-bottom:0.3em; }
@media (max-width:640px){ .gtm:not([data-view="main"]) .gtm-card{ left:6%; width:88%; top:5%; height:90%; } }
/* メニューの英語は、つづけ字の筆記体（Great Vibes）。細い字なので、少し大きく・ふちに影 */
.gtm-btn, .gtm-start span, .gtm-card h3, .gtm-vol span{ font-family:'Great Vibes',cursive !important; font-weight:400 !important; letter-spacing:0.01em !important; }
.gtm[data-view="main"] .gtm-btn{ font-size:clamp(16px,2.55cqw,60px); white-space:nowrap; }
.gtm[data-view="main"] .gtm-view{ flex-wrap:nowrap !important; gap:0.1em clamp(2px,0.9cqw,22px) !important; }
.gtm-start span{ font-size:clamp(22px,3.6cqw,84px); }
.gtm:not([data-view="main"]) .gtm-card h3{ font-size:clamp(22px,3.4cqw,78px); }
.gtm:not([data-view="main"]) .gtm-btn, .gtm-vol span{ font-size:1.3em; }
`;
css+=`
/* タイトル画面（ゲームを始める前）：背景の絵ではなく、うしろのゲーム画面（明るい森の場面・影つき）をすかして見せる。
   ロゴと文字が読めるよう、上と下を少し暗く */
.gtm.title-live{ background:transparent !important; }
.gtm.title-live[data-view="main"] .gtm-card{ bottom:23% !important; }   /* メニューは、人物の頭より上に */
.gtm.title-live::before{ background:linear-gradient(180deg, rgba(20,14,8,0.42) 0%, rgba(20,14,8,0) 34%, rgba(20,14,8,0) 62%, rgba(20,14,8,0.55) 100%) !important; }
`;
const style=document.createElement('style'); style.textContent=css; document.head.appendChild(style);

const wrap=document.querySelector('.canvas-wrap');
const menu=document.createElement('div'); menu.className='gtm'; menu.dataset.view='main'; menu.setAttribute('role','dialog'); menu.setAttribute('aria-label','メニュー');
menu.innerHTML=`
  <img class="gtm-logo" src="${encodeURI(TITLE_LOGO)}" alt="" draggable="false">
  <div class="gtm-title"><h2>Gravity Tales</h2><p><button class="gtm-orn l" type="button" tabindex="-1" aria-label="章">❧</button><span class="gtm-ch">第一章「赤い頭巾」</span><button class="gtm-orn r" type="button" tabindex="-1" aria-label="章">❧</button></p></div>
  <div class="gtm-card">
    <div class="gtm-view" data-view="main">
      <h3>Contents</h3>
      <button class="gtm-btn" data-act="resume">Resume</button>
      <button class="gtm-btn" data-act="new">New Game</button>
      <button class="gtm-btn" data-act="continue">Continue<small></small></button>
      <button class="gtm-btn" data-act="book">Book</button>
      <button class="gtm-btn" data-act="howto">How to Play</button>
      <button class="gtm-btn" data-act="settings">Settings</button>
    </div>
    <div class="gtm-view" data-view="settings">
      <h3>Settings</h3>
      <label class="gtm-vol"><span>Music</span><input type="range" class="gtm-range" data-vol="bgm" min="0" max="100" step="5"><output></output></label>
      <label class="gtm-vol"><span>Sound</span><input type="range" class="gtm-range" data-vol="se" min="0" max="100" step="5"><output></output></label>
      <p class="gtm-howto gtm-pc" style="margin-top:0.4em">← → で大きさを変える（↑ ↓ で選ぶ）</p>
      <button class="gtm-btn gtm-back" data-act="back">← Back</button>
    </div>
    <div class="gtm-view" data-view="howto">
      <h3>How to Play</h3>
      <ul class="gtm-howto gtm-touch">
        <li><b>◀ ▶</b>あるく</li>
        <li><b>▲</b>ジャンプ</li>
        <li><b>Flip</b>本を裏返す。そのページの重力が反転（床か天井に立っているときだけ）</li>
        <li><b>Tap</b>近くの人に話しかける・調べる・会話を進める</li>
        <li><b>Skip ≫</b>会話を飛ばす</li>
        <li><b>↺ Reset</b>ステージをやり直す（2回押す）</li>
        <li><b>menu</b>メニューを開く</li>
      </ul>
      <ul class="gtm-howto gtm-pc">
        <li><b>← →</b>あるく</li>
        <li><b>↑ / W</b>ジャンプ</li>
        <li><b>F / Space</b>本を裏返す（そのページの重力が反転。床か天井に立っているときだけ）</li>
        <li><b>Tap / Enter</b>近くの人に話しかける・会話を進める</li>
        <li><b>S</b>会話をスキップ</li>
        <li><b>R</b>ステージをやり直す</li>
        <li><b>Esc</b>メニューを開く・閉じる</li>
      </ul>
      <p class="gtm-howto" style="margin-top:0.6em">右ページの右の端まで行くと、ページがめくれて次へ進む。</p>
      <button class="gtm-btn gtm-back" data-act="back">← Back</button>
    </div>
  </div>
  <div class="gtm-foot"></div>`;   // （「本を裏返すと、世界の重力が反転する」は出さない）
wrap.appendChild(menu);

/* はじめの画面：タップかキーで はじめる（ブラウザは、操作があるまで音を出せないため。その操作でタイトルの曲が流れはじめる） */
const startCover=document.createElement('div'); startCover.className='gtm-start show';
startCover.innerHTML='<span>Tap or press any key to start</span>';
menu.appendChild(startCover);
function dismissStart(e){
  if(!startCover.classList.contains('show')) return;
  startCover.classList.remove('show');
  if(GT.musicUnlock) GT.musicUnlock();
  if(GT.enterFullscreen) GT.enterFullscreen();             // はじめるときに全画面にする（index.html）
  if(e){ e.preventDefault(); e.stopPropagation(); }        // この操作では、メニューのボタンは押さない
}
startCover.addEventListener('pointerdown',dismissStart);
/* 章の名前の横の飾りをタップすると、まだ書かれていない章の名前が出る（第五章のつぎは、すべて「？？？」。そのつぎは第一章にもどる） */
const CH_NAMES=['第一章「赤い頭巾」','第二章「？？？」','第三章「？？？」','第四章「？？？」','第五章「？？？」','？？？'];
let chIdx=0;
menu.querySelectorAll('.gtm-orn').forEach(b=>b.addEventListener('pointerdown',e=>{
  e.preventDefault(); e.stopPropagation();                 // はじめの画面を閉じない・メニューのボタンも押さない
  const ch=menu.querySelector('.gtm-ch'); if(!ch) return;
  chIdx=(chIdx+1)%CH_NAMES.length; ch.style.opacity='0';
  setTimeout(()=>{ ch.textContent=CH_NAMES[chIdx]; ch.style.opacity='1'; },180);
  GT.sfx&&GT.sfx('page');
}));
window.addEventListener('keydown',e=>{ if(startCover.classList.contains('show') && menu.classList.contains('show')) dismissStart(e); }, true);

const openBtn=document.createElement('button');
openBtn.className='gtm-open'; openBtn.textContent='≡ Menu'; openBtn.title='メニュー（Esc キー）';
openBtn.addEventListener('pointerdown',e=>{ e.preventDefault(); e.stopPropagation(); showMenu(true); });
wrap.appendChild(openBtn);

const $=sel=>menu.querySelector(sel);
let inGame=false;        // 一度でもゲームを始めたか（「つづける」を出すか）

function setView(name){
  menu.dataset.view=name;                                    // タイトル画面の見た目を、いま出しているもの（main / settings / howto）で変える
  menu.querySelectorAll('.gtm-view').forEach(v=>v.classList.toggle('show', v.dataset.view===name));
  if(name==='settings') fillVolume();
  const first=menu.querySelector(`.gtm-view[data-view="${name}"] :is(.gtm-range,.gtm-btn:not([disabled]))`);
  if(first) first.focus({preventScroll:true});
}
function refreshMain(){
  $('[data-act="resume"]').style.display = inGame ? '' : 'none';
  const c=$('[data-act="continue"]'), has=save.last && save.scenes[save.last];
  c.disabled=!has; c.querySelector('small').textContent = has ? sceneName(save.last) : '';
  c.title = has ? sceneName(save.last)+' から' : '';
}
/* せってい：音量のバー（0〜100%。100% がふつうの大きさ） */
function fillVolume(){
  menu.querySelectorAll('.gtm-range').forEach(r=>{ const v=Math.round((GT.volume?GT.volume[r.dataset.vol]:1)*100);
    r.value=v; r.nextElementSibling.textContent=v+'%'; });
}
let seTry=0;
menu.querySelectorAll('.gtm-range').forEach(r=>{
  r.addEventListener('input',()=>{
    r.nextElementSibling.textContent=r.value+'%';
    if(GT.setVolume) GT.setVolume(r.dataset.vol, r.value/100);
    if(r.dataset.vol==='se'){ const now=performance.now(); if(now-seTry>250){ seTry=now; GT.sfx&&GT.sfx('land'); } }   // 大きさの見本
  });
});
function escapeHtml(s){ return String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }

const pageSound=()=>{ GT.sfx&&GT.sfx('page'); };   // メニューを開いたとき・メニューの中で何かを選んだときは、ページをめくる音
function showMenu(sound){ menu.classList.toggle('title-live', !inGame && !!(GT.scene&&GT.scene.id==='title'));
  if(sound) pageSound();
  GT.paused=true; refreshMain(); menu.classList.add('show'); openBtn.style.visibility='hidden'; setView('main');   // menu の栞は場所を残して隠す（となりの Reread の栞が動かないように）
}
function hideMenu(){
  menu.classList.remove('show'); openBtn.style.visibility=''; GT.paused=false;
}
function startNew(){
  applyState(INIT); rebuildScenes(); inGame=true; hideMenu(); GT.flipToScene(0,1);   // ページをめくってから始める
}
function startFrom(id){
  const st=save.scenes[id]; if(!st) return;
  applyState(st); rebuildScenes();
  const idx=GT.SCENES.findIndex(s=>s.id===id); if(idx<0) return;
  inGame=true; hideMenu(); GT.jumpToScene(idx, st.pageNo||1);
}

menu.addEventListener('click',e=>{
  const btn=e.target.closest('.gtm-btn'); if(btn && !btn.disabled) pageSound();   // ステージの番号ボタンもふくむ
  const b=e.target.closest('[data-act]'); if(!b || b.disabled) return;
  switch(b.dataset.act){
    case 'resume':   hideMenu(); break;
    case 'bookmark': addBookmark(); hideMenu(); break;
    case 'new':      startNew(); break;
    case 'continue': startFrom(save.last); break;
    case 'howto':    setView('howto'); break;
    case 'settings': setView('settings'); break;
    case 'book':     GT.openBookModal(); break;
    case 'back':     setView('main'); break;
  }
});

/* キー操作：メニューを開いているあいだは、ゲームにキーを渡さない（↑↓で選ぶ・Enter で決める・Esc でもどる） */
window.addEventListener('keydown',e=>{
  const bookOpen=document.getElementById('bookModal').classList.contains('show');
  if(!menu.classList.contains('show')){
    if(e.key==='Escape' && !bookOpen){ e.preventDefault(); showMenu(true); }
    return;
  }
  if(bookOpen) return;
  e.stopPropagation();                                   // engine.js のキー操作に渡さない
  if(e.key==='Escape'){
    e.preventDefault();
    const sub=menu.querySelector('.gtm-view.show:not([data-view="main"])');
    if(sub){ pageSound(); setView('main'); } else if(inGame){ pageSound(); hideMenu(); }
    return;
  }
  const onRange=document.activeElement && document.activeElement.classList.contains('gtm-range');
  if(onRange && (e.key==='ArrowLeft'||e.key==='ArrowRight')) return;   // バーの上では ← → で大きさを変える
  if(e.key==='ArrowDown'||e.key==='ArrowUp'||e.key==='ArrowLeft'||e.key==='ArrowRight'){
    e.preventDefault();
    const list=[...menu.querySelectorAll('.gtm-view.show :is(.gtm-range,.gtm-btn:not([disabled]))')].filter(b=>b.offsetParent);
    if(!list.length) return;
    const i=list.indexOf(document.activeElement), d=(e.key==='ArrowDown'||e.key==='ArrowRight')?1:-1;
    list[(i<0?0:(i+d+list.length)%list.length)].focus();
  }
}, true);

GT.showMenu=showMenu; GT.hideMenu=hideMenu;
GT.startFrom=startFrom; GT.canStartFrom=id=>!!save.scenes[id]; GT.sceneName=sceneName;   // 本を読み返す画面の、各ページのステージのボタンで使う

/* ---- しおり：メニューの「しおりを挟む」で、いまのステージにしおりを挟む。本の上に色ちがいのしおりが増え、
   押すと、そのステージのはじめにもどれる（挟んだときの分岐・本のページも、いっしょにもどる）。
   しおりは BOOKMARK_MAX 枚まで（いっぱいのときは挟めない。右クリックで外す）。セーブといっしょにブラウザに残る ---- */
const bookmarkHooks=[];
function bookmarks(){ return save.bookmarks||(save.bookmarks=[]); }
function changed(){ writeSave(); for(const f of bookmarkHooks) f(); }
function addBookmark(){
  const id=GT.scene && GT.scene.id, st=id && save.scenes[id]; if(!st) return;
  const list=bookmarks();
  const used=new Set(list.map(b=>b.color));
  const color=[0,1,2].find(c=>!used.has(c)) ?? (list[0] ? list[0].color : 0);
  if(list.length>=BOOKMARK_MAX) return;                       // 5枚まで（いっぱいのときは挟めない。しおりを右クリックで外せる）
  list.push({ id, name:sceneName(id), state:clone(st), color });
  GT.sfx&&GT.sfx('page'); changed();
}
// 机の上の まっさらな栞（js/page.js）を押しても挟める。挟めたら true
GT.addBookmark=()=>{ const n=bookmarks().length; if(inGame) addBookmark(); return bookmarks().length>n; };
GT.bookmarksFull=()=>bookmarks().length>=BOOKMARK_MAX;
GT.getBookmarks=()=>bookmarks().map(b=>({id:b.id, name:b.name, color:b.color}));
GT.onBookmarksChange=fn=>{ bookmarkHooks.push(fn); };
GT.jumpBookmark=i=>{ const b=bookmarks()[i]; if(!b) return;
  applyState(b.state); rebuildScenes();
  const idx=GT.SCENES.findIndex(s=>s.id===b.id); if(idx<0) return;
  inGame=true; hideMenu(); GT.flipToScene(idx, b.state.pageNo||1); };          // ページをめくって、しおりのページへ
GT.removeBookmark=i=>{ bookmarks().splice(i,1); changed(); };
})();
