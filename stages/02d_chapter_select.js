/* ============================================================================
   章をえらぶ画面  id = 'chapter_select'（チュートリアルのおわり＝森の出口のあと）
   ----------------------------------------------------------------------------
   タイトル画面と同じ森の場面（stages/00t_title.js の title_view。赤ずきんと狼のシルエット）。
   章の名前の左右の ❧ で、前の章・次の章へ（場面がぺらっとめくれる）。
   「Begin」で、その章をはじめる（いまは第一章だけ。ほかの章は、まだ書かれていない）。
   （本がひらく章のとびら chapter1 は、いったん使わない）
   ========================================================================== */
(function(){
GT.registerScene({ id:'chapter_select', type:'story', stage:'title_view', label:'Gravity Tales', npcs:[] });
const isSel=()=>GT.scene && GT.scene.id==='chapter_select';
GT.CHAPTER_NAMES=['第一章「赤い頭巾」','第二章「？？？」','第三章「？？？」','第四章「？？？」','第五章「？？？」','？？？'];

const box=document.createElement('div'); box.id='gtChSel';
box.innerHTML=`<div class="row"><button class="orn l" type="button" aria-label="前の章">❧</button><span class="name"></span><button class="orn r" type="button" aria-label="次の章">❧</button></div>
  <button class="begin" type="button">Begin</button><div class="note"></div>`;
GT.canvas.parentElement.appendChild(box);
const st=document.createElement('style'); st.textContent=`
  #gtChSel{ position:absolute; left:0; right:0; top:30%; z-index:3; display:none; flex-direction:column; align-items:center; gap:0.6em; pointer-events:none;
    text-shadow:0 1px 6px rgba(4,6,4,0.95), 0 0 14px rgba(4,6,4,0.8); }
  #gtChSel.show{ display:flex; }
  #gtChSel .row{ display:flex; align-items:center; gap:0.6em; font-family:'Zen Old Mincho',serif; font-size:clamp(14px,2.6cqw,60px); letter-spacing:0.25em; color:#f1e8d4; }
  #gtChSel .name{ transition:opacity .2s; }
  #gtChSel button{ pointer-events:auto; background:none; border:none; cursor:pointer; color:#e3c58a; font:inherit; text-shadow:inherit; }
  #gtChSel .orn{ font-size:1.1em; letter-spacing:0; padding:0.1em 0.3em; } #gtChSel .orn.l{ transform:scaleX(-1); }
  #gtChSel .orn:hover{ color:#fff1d0; }
  #gtChSel .begin{ font-family:'Great Vibes',cursive; font-size:clamp(22px,4cqw,96px); color:#f1e8d4; }
  #gtChSel .begin:hover{ color:#fff1d0; } #gtChSel .begin[disabled]{ opacity:0.35; cursor:default; }
  #gtChSel .note{ font-family:'Zen Old Mincho',serif; font-size:clamp(10px,1.4cqw,32px); color:#e6d8b8; min-height:1.2em; }
  .gt-flipping #gtChSel{ visibility:hidden; }`;
document.head.appendChild(st);
const nameEl=box.querySelector('.name'), beginEl=box.querySelector('.begin'), noteEl=box.querySelector('.note');
function refresh(){ const c=GT.titleChapter||0; nameEl.textContent=GT.CHAPTER_NAMES[c];
  const ok=c===0; beginEl.disabled=!ok; noteEl.textContent=ok?'':'このお話は、まだ書かれていない'; }
function step(d){
  if(!isSel()) return;
  GT.titleChapter=((GT.titleChapter||0)+d+GT.CHAPTER_NAMES.length)%GT.CHAPTER_NAMES.length;
  refresh(); GT.startPageFlip(d<0?-1:1, GT.sceneRegistry.chapter_select);   // 前の章へは、ページも前へもどる   // 場面が、ぺらっとめくれる
}
box.querySelector('.orn.l').addEventListener('pointerdown',e=>{ e.preventDefault(); e.stopPropagation(); step(-1); });
box.querySelector('.orn.r').addEventListener('pointerdown',e=>{ e.preventDefault(); e.stopPropagation(); step(1); });
beginEl.addEventListener('pointerdown',e=>{ e.preventDefault(); e.stopPropagation(); if(!isSel()||beginEl.disabled) return;
  box.classList.remove('show'); GT.startPageFlip(); });                // 第一章をはじめる（次のシーン＝赤ずきんの家へ）
GT.registerSceneReset(()=>{ const on=isSel(); box.classList.toggle('show',on); if(on){ GT.titleChapter=GT.titleChapter||0; refresh(); GT.mode='idle'; } });
})();
