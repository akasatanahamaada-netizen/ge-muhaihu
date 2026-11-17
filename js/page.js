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
    if(!full){ frame.style.removeProperty('--gw'); frame.style.removeProperty('--gs'); return; }
    const parts=['.hud','.canvas-wrap','.gt-tabs','.under','#btnLeft','#btnRight','#btnFlip','#btnJump'].map(q=>frame.querySelector(q));
    const fits=gw=>{ frame.style.setProperty('--gw',gw+'px'); frame.style.setProperty('--gs',Math.max(1,gw/900).toFixed(3)); const f=frame.getBoundingClientRect();
      return parts.every(el=>{ if(!el || !el.offsetParent) return true; const r=el.getBoundingClientRect();
        // ゲーム画面は、まわりに描く本の枠（.canvas-wrap::after。太さ＝margin）も入れて、はみ出さないかを見る
        const m = el.classList.contains('canvas-wrap') ? (parseFloat(getComputedStyle(el).marginTop)||0) : 0;
        return r.left-m>=f.left+4 && r.right+m<=f.right-4 && r.top-m>=f.top+4 && r.bottom+m<=f.bottom-4; }); };
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
  GT.enterFullscreen=enter; GT.exitFullscreen=exit;
})();
/* ページの見出し：重力が反転しているページは赤くする（engine.js が文字を書きかえるのを見張る） */
(function(){
  for(const id of ['hudLeft','hudRight']){ const el=document.getElementById(id);
    const upd=()=>el.classList.toggle('rev', el.textContent.indexOf('反転')>=0);
    new MutationObserver(upd).observe(el,{childList:true,characterData:true,subtree:true}); upd(); }
})();

/* しおりのタブ（参考画像のデザイン）：本の左上に「menu」のタブと「物語を振り返る」のタブを並べる。
   中身のボタンはそのまま使う（menu.js の「≡ メニュー」ボタンと、index.html の #openBook）。全画面ボタンは机の右上へ */
(function(){
  const wrap=document.querySelector('.canvas-wrap'); if(!wrap) return;
  const tabs=document.createElement('div'); tabs.className='gt-tabs'; wrap.appendChild(tabs);
  const menuBtn=wrap.querySelector('.gtm-open');
  if(menuBtn){ menuBtn.className='gt-tab menu'; menuBtn.innerHTML='<span class="orn"></span>menu'; menuBtn.setAttribute('aria-label','メニュー'); tabs.appendChild(menuBtn); }
  const book=document.getElementById('openBook');
  if(book){ const svg=book.querySelector('svg');
    book.className='gt-tab book'; book.textContent=''; book.insertAdjacentHTML('afterbegin','<span class="orn"></span>');
    if(svg) book.appendChild(svg);
    book.title='物語を振り返る'; book.setAttribute('aria-label','物語を振り返る'); tabs.appendChild(book); }
  // 挟んだしおり（menu.js の「しおりを挟む」）：1回押すと「もう一度で、このページへもどる」、2.5秒以内にもう一度押すと、もどる。
  // 右クリック（スマホは長押し）で、しおりを外す
  function drawMarks(){
    tabs.querySelectorAll('.gt-tab.mark').forEach(e=>e.remove());
    (GT.getBookmarks?GT.getBookmarks():[]).forEach((m,i)=>{
      const t=document.createElement('button'); t.type='button'; t.className='gt-tab mark c'+m.color;
      const short=String(m.name).replace(/^.*──\s*/,'');
      t.innerHTML='<span class="orn"></span><span class="label"></span><span class="ask">もう一度押すと、このページへもどる</span>';
      t.querySelector('.label').textContent=short; t.title='しおり：'+m.name+'（右クリックで外す）'; t.setAttribute('aria-label','しおり：'+m.name);
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
