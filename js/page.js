/* Gravity Tale ── ページまわりの小さな仕掛け（画面外のほこり・全画面・見出しの色） */
/* 画面外の飾り：ランプの光の中を、ほこりがゆっくり昇る */
(function(){
  const box=document.querySelector('.ambient'); if(!box) return;
  for(let i=0;i<14;i++){ const d=document.createElement('i');
    d.style.left=(Math.random()*100)+'%'; d.style.setProperty('--dx',(Math.random()*120-60)+'px');
    d.style.animationDuration=(16+Math.random()*18)+'s'; d.style.animationDelay=(-Math.random()*30)+'s';
    const sz=(1.5+Math.random()*2.5)+'px'; d.style.width=d.style.height=sz; box.appendChild(d); }
})();
/* 全画面：ページ全体をブラウザの全画面にして、本の枠を画面いっぱいに広げる。
   （本を読みかえす画面などもそのまま出せるよう、全画面にするのはページ全体）
   全画面に対応していないブラウザ（iPhone など）では、画面いっぱいに広げるだけ。
   GT.enterFullscreen() … メニューの「タップ／キーを押して はじめる」でも呼ぶ */
(function(){
  const frame=document.querySelector('.book-frame'), wrap=frame.querySelector('.canvas-wrap');
  const btn=document.getElementById('fsBtn'), label=document.getElementById('fsLabel');
  const root=document.documentElement;
  const canFs=!!(root.requestFullscreen||root.webkitRequestFullscreen);
  const fsEl=()=>document.fullscreenElement||document.webkitFullscreenElement;
  let full=false;
  // ゲーム画面の幅：本の枠からはみ出さない、いちばん大きな幅をさがす（ボタンの並びが変わっても使える）
  function fit(){
    if(!full){                                   // 全画面でないとき：本（表紙・旗・しおりの余白もふくめて）が窓に入るだけの大きさ
      frame.style.removeProperty('--gs');
      // 本ぜんたいの大きさ（ゲーム画面の幅 gw に対して）：横 gw×1.38（左右 0.19 ずつ）、たて gw×(480/900 + 0.12 + 0.05)
      const gw=Math.max(240, Math.min((window.innerWidth-28)/1.38, (window.innerHeight-40)/(480/900+0.17), 1100));
      frame.style.setProperty('--gw', Math.floor(gw)+'px'); return; }
    const parts=['.hud','.canvas-wrap','.gt-cover','.gt-flags','.gt-tabs','.under','#btnLeft','#btnRight','#btnFlip','#btnJump'].map(q=>frame.querySelector(q));
    const fits=gw=>{ frame.style.setProperty('--gw',gw+'px'); frame.style.setProperty('--gs',Math.max(1,gw/900).toFixed(3)); const f=frame.getBoundingClientRect();
      return parts.every(el=>{ if(!el) return true; const r=el.getBoundingClientRect(); if(!r.width && !r.height) return true;   // 見えていない部品は数えない（SVG は offsetParent を持たないので、大きさで見る）
        return r.left>=f.left+4 && r.right<=f.right-4 && r.top>=f.top+4 && r.bottom<=f.bottom-4; }); };
    let lo=200, hi=Math.min(frame.clientWidth, window.innerHeight*900/480);
    if(fits(hi)) return;
    for(let i=0;i<14;i++){ const mid=(lo+hi)/2; if(fits(mid)) lo=mid; else hi=mid; }
    fits(Math.floor(lo));
  }
  function setFull(on){
    full=on; frame.classList.toggle('is-full',on); document.body.classList.toggle('gt-full',on);
    label.textContent=on?'全画面をやめる':'全画面'; fit();
  }
  function enter(){
    if(full) return;
    setFull(true);
    if(canFs && !fsEl()){ const p=(root.requestFullscreen||root.webkitRequestFullscreen).call(root); if(p&&p.catch) p.catch(()=>{}); }
  }
  function exit(){
    setFull(false);
    if(fsEl()){ const p=(document.exitFullscreen||document.webkitExitFullscreen).call(document); if(p&&p.catch) p.catch(()=>{}); }
  }
  btn.addEventListener('click',()=>{ full?exit():enter(); btn.blur(); });
  // Esc などでブラウザの全画面がとかれたら、本の枠ももとにもどす
  const onFsChange=()=>{ if(canFs && !fsEl() && full) setFull(false); };
  document.addEventListener('fullscreenchange',onFsChange); document.addEventListener('webkitfullscreenchange',onFsChange);
  window.addEventListener('resize',fit);
  fit();                                         // 開いたときも、窓の大きさに合わせる
  GT.enterFullscreen=enter; GT.exitFullscreen=exit;
})();
/* ページの見出し：重力が反転しているページは赤くする（engine.js が文字を書きかえるのを見張る） */
(function(){
  for(const id of ['hudLeft','hudRight']){ const el=document.getElementById(id);
    const upd=()=>el.classList.toggle('rev', el.textContent.indexOf('反転')>=0);
    new MutationObserver(upd).observe(el,{childList:true,characterData:true,subtree:true}); upd(); }
})();

/* 本のまわり（参考画像２のデザイン）：
     ・.gt-cover … 焦げ茶の表紙と、開いたページのふち（重なった紙の線）。ゲーム画面のうしろに SVG で描く
     ・.gt-flags … 左がわの赤いリボンの旗。「Reread」＝本を読み返す（index.html の #openBook）、「menu」＝メニュー（menu.js のボタン）
     ・.gt-tabs  … 上の紺色のしおり（menu.js の「しおりを挟む」で挟んだもの。Ⅰ〜Ⅴ）
   全画面ボタンは机の右上へ */
(function(){
  const wrap=document.querySelector('.canvas-wrap'); if(!wrap) return;
  // 表紙とページ（viewBox はゲーム画面と同じ座標。ゲーム画面は 0〜900 × 0〜480 で、そのまわりが見える）
  const NS='http://www.w3.org/2000/svg';
  // 重なり順：表紙（いちばん奥）→ しおり・旗 → ページ。しおりと旗は、ページのあいだに挟まっていて、ページのふちから出ているように見える
  const layer=cls=>{ const e=document.createElementNS(NS,'svg'); e.setAttribute('class',cls); e.setAttribute('viewBox','-60 -40 1020 560');
    e.setAttribute('preserveAspectRatio','none'); e.setAttribute('aria-hidden','true'); return e; };
  const cover=layer('gt-cover'), pages=layer('gt-pages');
  const L='#c4a574';
  cover.innerHTML=`<rect x="-52" y="-30" width="1004" height="546" rx="4" fill="#45372f" filter="url(#gt-rough)"/>`;
  // ページ：手描きのように、線はゆらいで（#gt-sketch）、ところどころ二重。重なった紙の線は、長さ・太さ・こさがふぞろい
  const sk=(d,w,o)=>`<path d="${d}" stroke-width="${w}" opacity="${o}"/>`;
  pages.innerHTML=`
    <g fill="#efe7da" stroke="${L}" stroke-width="2.4" stroke-linejoin="round" filter="url(#gt-sketch)">
      <path d="M -30 -10 Q 210 -22 446 -2 L 454 -2 Q 690 -22 930 -10 L 932 500 Q 690 486 454 506 L 446 506 Q 210 486 -30 500 Z"/>
    </g>
    <g fill="none" stroke="${L}" stroke-linecap="round" filter="url(#gt-sketch)">
      ${sk('M -28 -6 Q 210 -18 444 0',1.2,0.55)}${sk('M 456 0 Q 690 -18 928 -6',1.2,0.55)}
      ${sk('M -22 -2 Q -24 240 -21 494',1.9,0.95)}${sk('M -15 4 Q -13 250 -15 488',1.3,0.8)}${sk('M -8 6 Q -9 230 -7 484',2.1,0.7)}${sk('M -19 30 L -18 460',0.9,0.5)}
      ${sk('M 922 -2 Q 924 240 921 494',1.9,0.95)}${sk('M 915 4 Q 913 250 915 488',1.3,0.8)}${sk('M 908 6 Q 909 230 907 484',2.1,0.7)}${sk('M 919 30 L 918 460',0.9,0.5)}
      ${sk('M -20 496 Q 210 480 440 500',1.8,0.9)}${sk('M -12 491 Q 220 478 438 495',1.1,0.6)}
      ${sk('M 460 500 Q 690 480 920 496',1.8,0.9)}${sk('M 462 495 Q 680 478 912 491',1.1,0.6)}
      ${sk('M 40 488 Q 200 480 330 486',1.3,0.55)}${sk('M 600 486 Q 760 478 870 488',1.3,0.55)}
    </g>`;
  wrap.insertBefore(pages, wrap.firstChild); wrap.insertBefore(cover, pages);
  // 左がわの旗
  const flags=document.createElement('div'); flags.className='gt-flags'; wrap.appendChild(flags);
  const book=document.getElementById('openBook');
  if(book){ book.className='gt-flag reread'; book.textContent='Reread'; book.title='本を読み返す'; book.setAttribute('aria-label','本を読み返す'); flags.appendChild(book); }
  const menuBtn=wrap.querySelector('.gtm-open');
  if(menuBtn){ menuBtn.className='gt-flag menu'; menuBtn.textContent='menu'; menuBtn.setAttribute('aria-label','メニュー'); flags.appendChild(menuBtn); }
  // 上のしおり（挟んだしおり）。1回押すと「もう一度押すと、このページへもどる」、2.5秒以内にもう一度押すと、もどる。右クリックで外す
  const tabs=document.createElement('div'); tabs.className='gt-tabs'; wrap.appendChild(tabs);
  const ROMAN=['Ⅰ','Ⅱ','Ⅲ','Ⅳ','Ⅴ','Ⅵ','Ⅶ','Ⅷ','Ⅸ','Ⅹ'];
  function drawMarks(){
    tabs.innerHTML='';
    (GT.getBookmarks?GT.getBookmarks():[]).forEach((m,i)=>{
      const t=document.createElement('button'); t.type='button'; t.className='gt-tab';
      t.innerHTML='<span class="orn"></span><span class="num"></span><span class="ask">もう一度押すと、このページへもどる</span>';
      t.querySelector('.num').textContent=ROMAN[i]||String(i+1);
      t.title='しおり '+(ROMAN[i]||i+1)+'：'+m.name+'（右クリックで外す）'; t.setAttribute('aria-label','しおり '+(i+1)+'：'+m.name);
      let armT=0;
      t.addEventListener('click',e=>{ e.preventDefault(); e.stopPropagation();
        if(performance.now()<armT){ armT=0; t.classList.remove('armed'); GT.jumpBookmark(i); return; }
        armT=performance.now()+2500; t.classList.add('armed'); setTimeout(()=>{ if(performance.now()>=armT) t.classList.remove('armed'); },2600); });
      t.addEventListener('contextmenu',e=>{ e.preventDefault(); GT.removeBookmark(i); });
      tabs.appendChild(t);
    });
  }
  if(GT.onBookmarksChange){ GT.onBookmarksChange(drawMarks); drawMarks(); }
  const fs=document.getElementById('fsBtn'); if(fs) document.body.appendChild(fs);
  const under=document.querySelector('.under'); if(under) under.style.display='none';
})();
