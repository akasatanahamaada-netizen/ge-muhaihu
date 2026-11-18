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
      const gw=Math.max(240, Math.min((window.innerWidth-28)/1.17, (window.innerHeight-46)/(480/900+0.2), 1800));   // しおりのひも・引き出した旗のぶんも入れる
      frame.style.setProperty('--gw', Math.floor(gw)+'px'); return; }
    const parts=['.hud','.canvas-wrap','.gt-cover','.gt-marks','.under','#btnLeft','#btnRight','#btnFlip','#btnJump'].map(q=>frame.querySelector(q));
    const fits=gw=>{ frame.style.setProperty('--gw',gw+'px'); frame.style.setProperty('--gs',Math.max(1,gw/900).toFixed(3)); const f=frame.getBoundingClientRect();
      return parts.every(el=>{ if(!el) return true; const r=el.getBoundingClientRect(); if(!r.width && !r.height) return true;   // 見えていない部品は数えない（SVG は offsetParent を持たないので、大きさで見る）
        // しおりは上にひも（V の字）が、旗はカーソルを乗せると左へ出るぶんがあるので、そのぶんも画面に入れる（切れないように）
        const cq=(wrap.getBoundingClientRect().width||900)/100;
        const top = el.classList.contains('gt-tabs') ? r.top-2.6*cq : r.top;   // 引き出したぶん（ひもは絵の中）
        const left= el.classList.contains('gt-flags') ? r.left-2.6*cq : r.left;
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
     ・.gt-flags … 左がわの赤いリボンの旗。「Book」＝本を読み返す（index.html の #openBook）、「menu」＝メニュー（menu.js のボタン）
     ・.gt-tabs  … 上の紺色のしおり（menu.js の「しおりを挟む」で挟んだもの。Ⅰ〜Ⅴ）
   全画面ボタンは机の右上へ */
(function(){
  const wrap=document.querySelector('.canvas-wrap'); if(!wrap) return;
  // 表紙とページ（viewBox はゲーム画面と同じ座標。ゲーム画面は 0〜900 × 0〜480 で、そのまわりが見える）
  const NS='http://www.w3.org/2000/svg';
  // 重なり順：表紙（いちばん奥）→ しおり・旗 → ページ。しおりと旗は、ページのあいだに挟まっていて、ページのふちから出ているように見える
  const layer=cls=>{ const e=document.createElementNS(NS,'svg'); e.setAttribute('class',cls); e.setAttribute('viewBox','-100 -70 1100 620');   // ゲーム画面は 0〜900 × 0〜480。そのまわりに、表紙とページ
    e.setAttribute('preserveAspectRatio','none'); e.setAttribute('aria-hidden','true'); return e; };
  const cover=layer('gt-cover'), pages=layer('gt-pages');
  const L='#c4a574';
  // 本のまわりを、できるだけ本物らしく（ゲーム画面の座標で、表紙は -58〜958 × -36〜530、ページは -40〜940 × -20〜516）
  //   表紙 … 革の地（こまかい しぼ と、まだらの色むら）、ふちの面取りの光と影、すり切れた角、下と右に見える板の厚み、机に落ちる影
  //   背表紙 … まん中の ふくらみ と、頭と尻の飾り布
  //   ページ … 重なった紙の束（こまかい線がたくさん）、紙のこまかい地、のど（まん中）へ向かって紙が沈む陰、ふちのかすかな焼け
  const COVER='M -52 -36 L 952 -36 Q 958 -36 958 -30 L 958 524 Q 958 530 952 530 L -52 530 Q -58 530 -58 524 L -58 -30 Q -58 -36 -52 -36 Z';
  cover.innerHTML=`
    <defs>
      <linearGradient id="gtCoverG" x1="0" y1="0" x2="0.3" y2="1"><stop offset="0" stop-color="#4a3226"/><stop offset="0.5" stop-color="#3a261c"/><stop offset="1" stop-color="#281912"/></linearGradient>
      <linearGradient id="gtSpineG" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#1e1611" stop-opacity="0"/><stop offset="0.3" stop-color="#1e1611" stop-opacity="0.5"/>
        <stop offset="0.5" stop-color="#6e5040" stop-opacity="0.55"/><stop offset="0.7" stop-color="#1e1611" stop-opacity="0.5"/><stop offset="1" stop-color="#1e1611" stop-opacity="0"/></linearGradient>
      <filter id="gtShadow" x="-10%" y="-10%" width="120%" height="130%"><feGaussianBlur stdDeviation="9"/></filter>
      <filter id="gtLeather" x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" seed="3" result="g"/>
        <feColorMatrix in="g" type="matrix" values="0 0 0 0 0.08  0 0 0 0 0.05  0 0 0 0 0.03  0 0 0 -1.6 1.15" result="grain"/>
        <feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves="2" seed="8" result="m"/>
        <feColorMatrix in="m" type="matrix" values="0 0 0 0 0.56  0 0 0 0 0.42  0 0 0 0 0.30  0 0 0 0.9 -0.32" result="mottle"/>
        <feMerge><feMergeNode in="mottle"/><feMergeNode in="grain"/></feMerge>
      </filter>
      <clipPath id="gtCoverClip"><path d="${COVER}"/></clipPath>
    </defs>
    <path d="${COVER}" transform="translate(8 14)" fill="rgba(18,12,8,0.5)" filter="url(#gtShadow)"/>
    <path d="${COVER}" transform="translate(3 5)" fill="#22180f"/>
    <path d="${COVER}" fill="url(#gtCoverG)"/>
    <g clip-path="url(#gtCoverClip)">
      <rect x="-60" y="-40" width="1020" height="575" filter="url(#gtLeather)" opacity="0.55"/>
      <rect x="420" y="-36" width="60" height="566" fill="url(#gtSpineG)"/>
      <path d="${COVER}" fill="none" stroke="rgba(255,226,190,0.18)" stroke-width="3" transform="translate(1.5 1.5)"/>
      <path d="${COVER}" fill="none" stroke="rgba(0,0,0,0.35)" stroke-width="3" transform="translate(-1.5 -1.5)"/>
      <path d="M -58 -24 L -46 -36 M 946 -36 L 958 -24 M -58 518 L -46 530 M 946 530 L 958 518" stroke="rgba(170,140,110,0.35)" stroke-width="5" stroke-linecap="round"/>
    </g>
    <path d="${COVER}" fill="none" stroke="#1d150f" stroke-width="1.6"/>
    <path d="M 432 -36 Q 450 -43 468 -36 L 468 -27 Q 450 -33 432 -27 Z" fill="#7a2e28" stroke="#4a1a16" stroke-width="0.8"/>
    <path d="M 435 -33 Q 450 -38 465 -33" stroke="#c9a070" stroke-width="0.8" fill="none"/>
    <path d="M 432 530 Q 450 537 468 530 L 468 521 Q 450 527 432 521 Z" fill="#7a2e28" stroke="#4a1a16" stroke-width="0.8"/>`;
  // ページ：top=上のふちの高さ、bot=下のふちの高さ（ずらしで、紙の束を描く）
  // ページの上下のふちは、ゆるやかに曲げる（背表紙のそばで少し沈むだけ）
  const pagePathD=(dx,dy)=>`M ${-40-dx} ${-20+dy} C 140 ${-26+dy} 340 ${-24+dy} 446 ${-13+dy} L 454 ${-13+dy} C 560 ${-24+dy} 760 ${-26+dy} ${940+dx} ${-20+dy}
      L ${942+dx} ${504+dy} C 760 ${499+dy} 560 ${500+dy} 454 ${509+dy} L 446 ${509+dy} C 340 ${500+dy} 140 ${499+dy} ${-42-dx} ${504+dy} Z`;
  // ページの紙の色に、ゲーム画面と同じ色合い（engine.js の GRADE_MUL）をかける（さかいが目立たないように）
  const tintPage=svg=>GT.tintHex ? svg.replace(/#[0-9a-fA-F]{6}\b/g, GT.tintHex) : svg;
  let stack='';
  for(let k=12;k>=1;k--){ const d=k*1.05;                                  // 紙の束：奥の紙ほど少し外へ・下へ。ふちは、明るい線と暗い線がこまかく交互に
    stack+=`<path d="${pagePathD(d,d*0.9)}" fill="${k%2?'#e9e0cd':'#d8cbb1'}" stroke="${k%2?'#cdbd9c':'#efe6d4'}" stroke-width="0.7"/>`; }
  const PAGE_DEFS=`
    <defs>
      <linearGradient id="gtPaperL" gradientUnits="userSpaceOnUse" x1="-40" y1="0" x2="940" y2="0">
        <stop offset="0" stop-color="#e3d7c0"/><stop offset="0.05" stop-color="#f0e8d9"/><stop offset="0.4" stop-color="#f1e9db"/>
        <stop offset="0.47" stop-color="#e2d6bf"/><stop offset="0.495" stop-color="#c6b493"/><stop offset="0.505" stop-color="#c6b493"/>
        <stop offset="0.53" stop-color="#e2d6bf"/><stop offset="0.6" stop-color="#f1e9db"/><stop offset="0.95" stop-color="#f0e8d9"/><stop offset="1" stop-color="#e3d7c0"/></linearGradient>
      <linearGradient id="gtPaperV" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b89a6a" stop-opacity="0.18"/><stop offset="0.05" stop-color="#b89a6a" stop-opacity="0"/>
        <stop offset="0.95" stop-color="#b89a6a" stop-opacity="0"/><stop offset="1" stop-color="#b89a6a" stop-opacity="0.22"/></linearGradient>
      <filter id="gtPaperGrain" x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="2" seed="5"/>
        <feColorMatrix type="matrix" values="0 0 0 0 0.45  0 0 0 0 0.36  0 0 0 0 0.24  0 0 0 -1.2 0.75"/>
      </filter>
      <clipPath id="gtPageClip"><path d="${pagePathD(0,0)}"/></clipPath>
    </defs>`;
  const PAGE_SHEET=`
    <path d="${pagePathD(0,0)}" fill="url(#gtPaperL)" stroke="#bfa985" stroke-width="0.9"/>
    <g clip-path="url(#gtPageClip)">
      <rect x="-50" y="-40" width="1000" height="570" fill="url(#gtPaperV)"/>
      <rect x="-50" y="-40" width="1000" height="570" filter="url(#gtPaperGrain)" opacity="0.5"/>
      <path d="M 447 -10 L 447 520 M 453 -10 L 453 520" stroke="rgba(255,250,238,0.35)" stroke-width="1.2"/>
    </g>`;
  pages.innerHTML=tintPage(PAGE_DEFS+stack+PAGE_SHEET);
  // ページをめくるときの紙にも、同じ紙（いちばん上の一枚）の絵を使う（engine.js の toPage が使う GT.pageSheet）。
  //   紙の大きさは、ゲーム画面のまわりに GT.PAGE_PAD（engine.js）だけ広い
  if(GT.PAGE_PAD){ const p=GT.PAGE_PAD, ew=900+p.x*2, eh=480+p.top+p.bot;
    const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${ew}" height="${eh}" viewBox="${-p.x} ${-p.top} ${ew} ${eh}">${tintPage(PAGE_DEFS+PAGE_SHEET)}</svg>`;
    const im=new Image(); im.onload=()=>{ GT.pageSheet=im; }; im.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg); }
  wrap.insertBefore(pages, wrap.firstChild); wrap.insertBefore(cover, pages);
  // 本の上に横にして置いた栞（作者の絵 assets/komono/栞.png）：「Reread」＝本を読み返す（index.html の #openBook）、「menu」＝メニュー（menu.js のボタン）
  //   カーソルを乗せると、すこし持ち上がる。やり直すボタンは、ゲーム画面の右上（engine.js の「↺ やり直す」）
  const marks=document.createElement('div'); marks.className='gt-marks'; wrap.appendChild(marks);
  const asMark=(el,word,label)=>{ if(!el) return; el.className='gt-mark'; el.innerHTML='<span class="word"></span>';
    el.querySelector('.word').textContent=word; el.title=label; el.setAttribute('aria-label',label); el.removeAttribute('style'); marks.appendChild(el); };
  asMark(wrap.querySelector('.gtm-open'),'menu','メニュー');          // 左が menu、右が Reread
  asMark(document.getElementById('openBook'),'Book','本を読み返す');
  const fs=document.getElementById('fsBtn'); if(fs) document.body.appendChild(fs);
  const under=document.querySelector('.under'); if(under) under.style.display='none';
})();
