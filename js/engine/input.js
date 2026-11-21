/* ============================================================================
   Gravity Tale ── エンジン：入力（キー・タッチ・本を裏返す操作）
   ----------------------------------------------------------------------------
   キーとタッチのボタンを keys に記録し、本を裏返す操作（F・スペース・反転ボタン）を受けつける。
   エンジンのファイルは js/engine/ にあり、index.html で core.js → … → boot.js の順に読む。
   どのファイルも、いちばん外側の const / let / function を共有している（ふつうの <script> なので）。
   ========================================================================== */
"use strict";
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

