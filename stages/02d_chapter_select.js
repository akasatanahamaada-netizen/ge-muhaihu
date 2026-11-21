/* ============================================================================
   章をえらぶ画面  id = 'chapter_select'（チュートリアルのおわり＝森の出口のあと）
   ----------------------------------------------------------------------------
   タイトル画面と同じ森の場面（stages/00t_title.js の title_view。赤ずきんと狼のシルエット）。
   章の名前の左右の ❧ で、前の章・次の章へ（場面がぺらっとめくれる）。
   「Begin」で、その章をはじめる（いまは第一章だけ。ほかの章は、まだ書かれていない）。
   ========================================================================== */
(function(){
GT.registerScene({ id:'chapter_select', type:'story', stage:'title_view', label:'Gravity Tales', npcs:[] });
const isSel=()=>GT.scene && GT.scene.id==='chapter_select';
GT.CHAPTER_NAMES=['第一章「赤い頭巾」','第二章「？？？」','第三章「？？？」','第四章「？？？」','第五章「？？？」','？？？'];

const box=document.createElement('div'); box.id='gtChSel';
box.innerHTML=`<div class="row"><button class="orn l" type="button" aria-label="前の章">❧</button><canvas class="name" role="img"></canvas><button class="orn r" type="button" aria-label="次の章">❧</button></div>
  <div class="go"><button class="begin" type="button">Begin</button><div class="note"></div></div>`;
GT.canvas.parentElement.appendChild(box);
const st=document.createElement('style'); st.textContent=`
  #gtChSel{ position:absolute; left:0; right:0; top:30%; z-index:3; display:none; flex-direction:column; align-items:center; gap:0.6em; pointer-events:none;
    text-shadow:0 1px 6px rgba(4,6,4,0.95), 0 0 14px rgba(4,6,4,0.8); }
  #gtChSel.show{ display:flex; }
  #gtChSel .row{ display:flex; align-items:center; gap:0.6em; font-family:'Zen Old Mincho',serif; font-size:clamp(14px,2.6cqw,60px); letter-spacing:0.25em; color:#f1e8d4; }
  #gtChSel .name{ display:block; }
  #gtChSel button{ pointer-events:auto; background:none; border:none; cursor:pointer; color:#e3c58a; font:inherit; text-shadow:inherit; }
  #gtChSel .orn{ font-size:1.1em; letter-spacing:0; padding:0.1em 0.3em; } #gtChSel .orn.l{ transform:scaleX(-1); }
  #gtChSel .orn:hover{ color:#fff1d0; }
  /* Begin：筆記体のまま、金の縁のボタンに（押せると分かるように、ゆっくり光る） */
  #gtChSel .begin{ font-family:'Great Vibes',cursive; font-size:clamp(22px,4cqw,96px); line-height:1.1; color:#f1e8d4; margin-top:0.15em; padding:0.02em 1.1em 0.12em; border-radius:999px;
    background:rgba(18,12,6,0.5); box-shadow:inset 0 0 0 1px rgba(227,197,138,0.9), inset 0 0 0 4px rgba(18,12,6,0.5), inset 0 0 0 5px rgba(227,197,138,0.35), 0 0 10px rgba(240,207,134,0.2);
    animation:gtBeginGlow 1.4s ease-in-out infinite alternate; transition:background .15s, transform .15s; }
  #gtChSel .begin:hover{ color:#fff1d0; background:rgba(70,48,20,0.62); transform:scale(1.05); }
  #gtChSel .begin[disabled]{ opacity:0.35; cursor:default; animation:none; transform:none; }
  @keyframes gtBeginGlow{ to{ box-shadow:inset 0 0 0 1px rgba(255,230,160,1), inset 0 0 0 4px rgba(18,12,6,0.5), inset 0 0 0 5px rgba(255,230,160,0.55), 0 0 24px 4px rgba(240,207,134,0.55); } }
  #gtChSel .note{ font-family:'Zen Old Mincho',serif; font-size:clamp(10px,1.4cqw,32px); color:#e6d8b8; min-height:1.2em; }
  /* Begin と説明は、章の名前を書き終えてから、ふわっと出す（.ready）。それまでは見えず、押せない */
  #gtChSel .go{ display:flex; flex-direction:column; align-items:center; gap:0.6em; opacity:0; visibility:hidden; transform:translateY(6px);
    transition:opacity .9s ease, transform .9s ease, visibility 0s linear .9s; }
  #gtChSel.ready .go{ opacity:1; visibility:visible; transform:none; transition:opacity .9s ease, transform .9s ease, visibility 0s; }
  .gt-flipping #gtChSel{ visibility:hidden; }`;
document.head.appendChild(st);
const nameEl=box.querySelector('.name'), beginEl=box.querySelector('.begin'), noteEl=box.querySelector('.note');
/* 章の名前は、ペンで書き順どおりに一画ずつ書く（js/inkwrite.js の GT.ink）。一字ごとにペンの音。
   ページがめくれているあいだは待って、めくり終わってから書きはじめる */
const SPD=0.5, nctx=nameEl.getContext('2d');
const wr={ str:'', t0:null, pen:{}, raf:0 };
function drawName(){
  wr.raf=0;
  if(!isSel() || !box.classList.contains('show')) return;
  const now=performance.now()/1000;
  if(document.body.classList.contains('gt-flipping')) wr.t0=null;               // めくっているあいだは、書かない
  else if(wr.t0===null) wr.t0=now+0.25;
  const dpr=Math.min(3,window.devicePixelRatio||1), row=nameEl.parentElement;
  const size=parseFloat(getComputedStyle(row).fontSize)*dpr, font=`400 ${size}px 'Zen Old Mincho',serif`;
  const chs=[...wr.str], gap=size*0.25, pad=Math.ceil(size*0.6);
  nctx.font=font; const ws=chs.map(ch=>nctx.measureText(ch).width), total=ws.reduce((a,b)=>a+b,0)+gap*Math.max(0,chs.length-1);
  const cw=Math.ceil(total+pad*2), chh=Math.ceil(size*1.6);
  if(nameEl.width!==cw||nameEl.height!==chh){ nameEl.width=cw; nameEl.height=chh; nameEl.style.width=cw/dpr+'px'; nameEl.style.height=chh/dpr+'px'; }
  nctx.clearRect(0,0,cw,chh);
  nctx.shadowColor='rgba(4,6,4,0.95)'; nctx.shadowBlur=8*dpr; nctx.shadowOffsetY=1*dpr;   // 字のまわりの、うすい影（背景の森の上でも読めるように）
  const lt0=wr.t0===null? -1 : now-wr.t0; let x=pad, c0=0, done=wr.t0!==null;
  chs.forEach((ch,n)=>{ const cp=GT.ink.charPlan(ch,SPD), lt=lt0-c0; c0+=cp.dur;
    if(lt>0 && cp.dur>0 && !wr.pen[n]){ wr.pen[n]=true; GT.sfx&&GT.sfx('write',cp.dur); }   // ペンの音（その字を書いているあいだだけ）
    if(lt<cp.dur) done=false;
    GT.ink.drawChar(nctx,ch,x,chh/2,size,font,'#f1e8d4',ws[n],lt,cp);
    x+=ws[n]+gap; });
  nctx.shadowColor='transparent';
  box.classList.toggle('ready',done);                                              // 書き終えたら、Begin がふわっと出てくる
  if(!done) wr.raf=requestAnimationFrame(drawName);
}
function writeName(str){ box.classList.remove('ready'); wr.str=str; wr.t0=null; wr.pen={}; nameEl.setAttribute('aria-label',str); if(!wr.raf) wr.raf=requestAnimationFrame(drawName); }
window.addEventListener('resize',()=>{ if(isSel() && !wr.raf) wr.raf=requestAnimationFrame(drawName); });
document.fonts && document.fonts.load("400 40px 'Zen Old Mincho'").catch(()=>{});
function refresh(){ const c=GT.titleChapter||0; writeName(GT.CHAPTER_NAMES[c]);
  const ok=c===0; beginEl.disabled=!ok; noteEl.textContent=ok?(GT.ctl?GT.ctl('クリックして、お話をはじめる','タップして、お話をはじめる'):'クリックして、お話をはじめる'):'このお話は、まだ書かれていない'; }   // 押せることが分かるように、ひとこと添える
function step(d){
  if(!isSel()) return;
  GT.titleChapter=((GT.titleChapter||0)+d+GT.CHAPTER_NAMES.length)%GT.CHAPTER_NAMES.length;
  refresh(); GT.startPageFlip(d<0?-1:1, GT.sceneRegistry.chapter_select);   // 前の章へは、ページも前へもどる   // 場面が、ぺらっとめくれる
}
box.querySelector('.orn.l').addEventListener('pointerdown',e=>{ e.preventDefault(); e.stopPropagation(); step(-1); });
box.querySelector('.orn.r').addEventListener('pointerdown',e=>{ e.preventDefault(); e.stopPropagation(); step(1); });
beginEl.addEventListener('pointerdown',e=>{ e.preventDefault(); e.stopPropagation(); if(!isSel()||beginEl.disabled||!box.classList.contains('ready')) return;
  box.classList.remove('show'); GT.startPageFlip(); });                // 第一章をはじめる（次のシーン＝赤ずきんの家へ）
GT.registerSceneReset(()=>{ const on=isSel(); box.classList.toggle('show',on); if(on){ GT.titleChapter=GT.titleChapter||0; refresh(); GT.mode='idle'; } });
})();
