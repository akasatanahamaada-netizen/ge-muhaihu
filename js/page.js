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
  // 参考画像２（作者の絵）に合わせる：影やグラデーションは使わず、平らな色と、手で引いたような線だけで描く
  //   表紙 … 平らな焦げ茶。右と下のふちに、こい線
  //   ページ … 平らなクリーム色（ふちの線はなし）。内がわに、紙の厚みを表すベージュの線（ふちの近くに2〜3本。ところどころ はみ出したり重なったりする）
  //   まん中 … 細い折り目の線
  cover.innerHTML=`
    <path d="M -52 -30 L 952 -32 L 954 516 L -51 518 Z" fill="#46382f" filter="url(#gt-rough)"/>
    <path d="M 950 -26 L 952 514 L 300 517" fill="none" stroke="#211814" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" filter="url(#gt-rough)"/>`;
  const st=(d,w,o)=>`<path d="${d}" stroke-width="${w||2.4}" opacity="${o||1}"/>`;
  pages.innerHTML=`
    <path d="M -34 -8 Q 200 -18 446 4 L 454 4 Q 700 -18 934 -10 L 936 498 Q 700 482 454 512 L 446 512 Q 200 482 -36 496 Z" fill="#eee6da"/>
    <g fill="none" stroke="#c4a574" stroke-linecap="round" stroke-linejoin="round" filter="url(#gt-soft)">
      ${st('M -30 -6 Q 200 -17 446 5')}${st('M 454 5 Q 700 -17 930 -8')}${st('M 420 -2 Q 440 2 452 8',1.6,0.8)}
      ${st('M -22 -2 L -21 492',2.6)}${st('M -14 4 Q -12 250 -13 486',2.2)}${st('M -24 40 L -23 300',1.4,0.7)}
      ${st('M 923 -6 L 922 492',2.6)}${st('M 915 0 Q 913 250 914 488',2.2)}${st('M 907 4 L 906 484',1.6,0.85)}${st('M 919 360 L 918 470',1.4,0.7)}
      ${st('M -30 494 Q 200 478 440 506',2.6)}${st('M -10 488 Q 220 474 436 498',1.6,0.8)}${st('M 60 498 L 130 497',1.6,0.7)}
      ${st('M 458 506 Q 700 478 928 494',2.6)}${st('M 600 486 Q 780 478 930 490',1.8,0.85)}${st('M 700 499 L 760 498',1.6,0.7)}
    </g>
    <path d="M 450 6 L 450 508" stroke="#b7aa98" stroke-width="1.2" fill="none"/>`;
  wrap.insertBefore(pages, wrap.firstChild); wrap.insertBefore(cover, pages);
  // 左がわの旗
  const flags=document.createElement('div'); flags.className='gt-flags'; wrap.appendChild(flags);
  const book=document.getElementById('openBook');
  if(book){ book.className='gt-flag reread'; book.textContent='Reread'; book.title='本を読み返す'; book.setAttribute('aria-label','本を読み返す'); flags.appendChild(book); }
  const menuBtn=wrap.querySelector('.gtm-open');
  if(menuBtn){ menuBtn.className='gt-flag menu'; menuBtn.textContent='menu'; menuBtn.setAttribute('aria-label','メニュー'); flags.appendChild(menuBtn); }
  // 「Reset」（このステージをやり直す。engine.js の「↺ やり直す」ボタン）。1回押すと「Again?」、もう一度で やり直す
  const reset=document.getElementById('resetBtn');
  if(reset){ reset.removeAttribute('style'); reset.className='gt-flag reset'; reset.dataset.label='Reset'; reset.dataset.arm='Again?';
    reset.textContent='Reset'; reset.title='このステージを最初からやり直す（R キー）。2回押す'; reset.setAttribute('aria-label','このステージをやり直す'); flags.appendChild(reset); }
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
