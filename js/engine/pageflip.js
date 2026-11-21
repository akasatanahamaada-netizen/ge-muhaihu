/* ============================================================================
   Gravity Tale ── エンジン：ページめくりの演出
   ----------------------------------------------------------------------------
   次のページへ進む・ゲームオーバーで前へもどるときの、ページめくり（startPageFlip）。
   エンジンのファイルは js/engine/ にあり、index.html で core.js → … → boot.js の順に読む。
   どのファイルも、いちばん外側の const / let / function を共有している（ふつうの <script> なので）。
   ========================================================================== */
"use strict";
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

