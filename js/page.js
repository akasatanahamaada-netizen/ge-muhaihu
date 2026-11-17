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
      // 本ぜんたいの大きさ（ゲーム画面の幅 gw に対して）：横 gw×1.42（左右 0.21 ずつ）、たて gw×(480/900 + 0.14 + 0.06)
      const gw=Math.max(240, Math.min((window.innerWidth-28)/1.5, (window.innerHeight-40)/(480/900+0.4), 1100));   // しおりのひも・引き出した旗のぶんも入れる
      frame.style.setProperty('--gw', Math.floor(gw)+'px'); return; }
    const parts=['.hud','.canvas-wrap','.gt-cover','.gt-flags','.gt-tabs','.under','#btnLeft','#btnRight','#btnFlip','#btnJump'].map(q=>frame.querySelector(q));
    const fits=gw=>{ frame.style.setProperty('--gw',gw+'px'); frame.style.setProperty('--gs',Math.max(1,gw/900).toFixed(3)); const f=frame.getBoundingClientRect();
      return parts.every(el=>{ if(!el) return true; const r=el.getBoundingClientRect(); if(!r.width && !r.height) return true;   // 見えていない部品は数えない（SVG は offsetParent を持たないので、大きさで見る）
        // しおりは上にひも（V の字）が、旗はカーソルを乗せると左へ出るぶんがあるので、そのぶんも画面に入れる（切れないように）
        const cq=(wrap.getBoundingClientRect().width||900)/100;
        const top = el.classList.contains('gt-tabs') ? r.top-9.5*cq : r.top;   // ひも＋引き出したぶん
        const left= el.classList.contains('gt-flags') ? r.left-4*cq : r.left;
        return left>=f.left+4 && r.right<=f.right-4 && top>=f.top+4 && r.bottom<=f.bottom-4; }); };
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
  // 表紙：焦げ茶の厚い板。机に落ちる影・下と右に見える板の厚み・上のふちのかすかな光・まん中の背表紙（ふくらみと、頭と尻の飾り布）
  cover.innerHTML=`
    <defs>
      <linearGradient id="gtCoverG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#55433a"/><stop offset="0.45" stop-color="#46372f"/><stop offset="1" stop-color="#382b24"/></linearGradient>
      <linearGradient id="gtSpineG" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#2c221c" stop-opacity="0"/><stop offset="0.35" stop-color="#2c221c" stop-opacity="0.55"/>
        <stop offset="0.5" stop-color="#5a473c" stop-opacity="0.6"/><stop offset="0.65" stop-color="#2c221c" stop-opacity="0.55"/><stop offset="1" stop-color="#2c221c" stop-opacity="0"/></linearGradient>
      <filter id="gtShadow" x="-10%" y="-10%" width="120%" height="130%"><feGaussianBlur stdDeviation="7"/></filter>
    </defs>
    <rect x="-46" y="-20" width="1004" height="546" rx="6" fill="rgba(20,14,10,0.45)" filter="url(#gtShadow)"/>
    <rect x="-49" y="-26" width="1004" height="546" rx="5" fill="#261c17"/>
    <rect x="-52" y="-30" width="1004" height="546" rx="5" fill="url(#gtCoverG)" stroke="#2a201b" stroke-width="2"/>
    <path d="M -46 -27 L 946 -27" stroke="rgba(255,228,196,0.16)" stroke-width="2" stroke-linecap="round"/>
    <rect x="420" y="-30" width="60" height="546" fill="url(#gtSpineG)"/>
    <path d="M 432 -30 Q 450 -36 468 -30 L 468 -22 Q 450 -27 432 -22 Z" fill="#7a2e28"/>
    <path d="M 432 516 Q 450 522 468 516 L 468 508 Q 450 513 432 508 Z" fill="#7a2e28"/>`;
  // ページ：ちゃんとした開いた本の形。背表紙に向かって紙が沈み、外がわへ ふくらむ。
  //   外がわ（左右）と下には、重なった紙の層（少しずつずらした紙を、奥から順に重ねる）。まん中は、のどの陰
  const pg=(dx,dy,fill,o)=>`<path d="M ${-30-dx} ${-12+dy} C 120 ${-30+dy} 330 ${-26+dy} 446 ${2+dy} L 454 ${2+dy} C 570 ${-26+dy} 780 ${-30+dy} ${930+dx} ${-12+dy}
      L ${932+dx} ${498+dy} C 780 ${484+dy} 570 ${486+dy} 454 ${508+dy} L 446 ${508+dy} C 330 ${486+dy} 120 ${484+dy} ${-32-dx} ${498+dy} Z"
      fill="${fill}" stroke="${L}" stroke-width="1.3" stroke-opacity="${o}" stroke-linejoin="round"/>`;
  pages.innerHTML=`
    <defs>
      <linearGradient id="gtGutter" x1="0" y1="0" x2="1" y2="0"><stop offset="0.44" stop-color="#8a6c4a" stop-opacity="0"/><stop offset="0.5" stop-color="#8a6c4a" stop-opacity="0.28"/><stop offset="0.56" stop-color="#8a6c4a" stop-opacity="0"/></linearGradient>
      <linearGradient id="gtPaperL" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#e2d6c1"/><stop offset="0.12" stop-color="#efe7da"/><stop offset="0.9" stop-color="#efe7da"/><stop offset="1" stop-color="#e2d6c1"/></linearGradient>
    </defs>
    ${pg(10,10,'#ddd0b8',0.7)}${pg(8,8,'#e5d9c4',0.7)}${pg(6,6,'#ddd0b8',0.7)}${pg(4,4,'#e8ddca',0.75)}${pg(2,2,'#e2d6c1',0.8)}
    ${pg(0,0,'url(#gtPaperL)',1)}
    <rect x="390" y="-30" width="120" height="545" fill="url(#gtGutter)"/>`;
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
