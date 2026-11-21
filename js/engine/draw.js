/* ============================================================================
   Gravity Tale ── エンジン：描き方（部品）
   ----------------------------------------------------------------------------
   少年・敵・ゴール・お話のかけら・ハート・ミッション表示・沼・木箱・人物などを描く関数。
   エンジンのファイルは js/engine/ にあり、index.html で core.js → … → boot.js の順に読む。
   どのファイルも、いちばん外側の const / let / function を共有している（ふつうの <script> なので）。
   ========================================================================== */
"use strict";
/* ========================================================================== */
/*  描画                                                                      */
/* ========================================================================== */
function roundRect(x,y,w,h,r){ ctx.beginPath(); roundRectPath(x,y,w,h,r); }
function roundRectPath(x,y,w,h,r){ ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r); ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath(); }
GT.roundRect=roundRect; GT.roundRectPath=roundRectPath;

function drawGravityIcon(cx,cy,dir,glow){
  ctx.save(); ctx.translate(cx,cy);
  if(glow>0){ ctx.shadowColor='rgba(176,141,87,0.9)'; ctx.shadowBlur=14*glow; }
  ctx.strokeStyle='#5a4a2e'; ctx.lineWidth=2.2; ctx.beginPath();
  if(dir===1){ ctx.moveTo(0,-8); ctx.lineTo(0,8); ctx.moveTo(-5,3); ctx.lineTo(0,8); ctx.lineTo(5,3); }
  else{ ctx.moveTo(0,8); ctx.lineTo(0,-8); ctx.moveTo(-5,-3); ctx.lineTo(0,-8); ctx.lineTo(5,-3); }
  ctx.stroke(); ctx.restore();
}
function drawPageEdges(){
  ctx.save(); const T=22;
  function eb(x,y,w,h,gx0,gy0,gx1,gy1,color){ const g=ctx.createLinearGradient(gx0,gy0,gx1,gy1); g.addColorStop(0,color); g.addColorStop(1,'rgba(58,50,38,0)'); ctx.fillStyle=g; ctx.fillRect(x,y,w,h); }
  // ふちの色づけと、遊べる範囲のふちの線は、ごく薄く（まわりのページとのさかいを目立たせない。床・天井の目安だけ）
  eb(0,H-T,W,T,0,H,0,H-T,'rgba(87,100,74,0.12)');
  eb(0,0,W,T,0,0,0,T,'rgba(43,46,74,0.08)');
  ctx.strokeStyle='rgba(58,50,38,0.14)'; ctx.lineWidth=1.5; ctx.lineCap='round';
  ctx.beginPath(); ctx.moveTo(EDGE,EDGE); ctx.lineTo(SPINE,EDGE); ctx.moveTo(EDGE,H-EDGE); ctx.lineTo(SPINE,H-EDGE); ctx.moveTo(EDGE,EDGE); ctx.lineTo(EDGE,H-EDGE); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(SPINE,EDGE); ctx.lineTo(W-EDGE,EDGE); ctx.moveTo(SPINE,H-EDGE); ctx.lineTo(W-EDGE,H-EDGE); ctx.moveTo(W-EDGE,EDGE); ctx.lineTo(W-EDGE,H-EDGE); ctx.stroke();
  ctx.restore();
}
/* 主人公：ちびキャラの絵（assets/character/syuzinkou1.webp＝立ち姿、syuzinkou2.png＝歩く姿）。足もとを当たり判定の箱の下にそろえて描く。
   歩いているあいだは、赤ずきんと同じように立ち姿と歩く姿を交互に出す。右へ向くときは左右反転する。
   絵は箱（26×34）より上に大きくはみ出す（頭が大きいため）。GT.PLAYER_H で高さを変えられる。
   ほかのキャラと同じく、ゆっくり上下にゆれる（絵はつぶさない）。倒れているとき（序の最初）は横に寝かせる。 */
GT.PLAYER_H=64;           // 58 の約1.1倍。マリ・赤ずきん・おばあさんもこの高さにそろう。絵の大きさだけで、当たり判定・ジャンプ力は変わらない
function drawPlayer(){
  const player=GT.player; const page=GT.currentPage(); const g=GT.gravity[page];
  const walking=player.onGround && Math.abs(player.vx)>40 && player.squash<=1.4;
  const BOY_STEP=0.16;                                       // 一歩ぶんの時間（秒）。歩く姿 → 立ち姿 → 歩く姿 … と入れかえる
  const step=walking && Math.floor(performance.now()/1000/BOY_STEP)%2===0;
  const img=GT.sprite(step?'boyWalk':'boyStand') || GT.sprite('boyStand');
  if(img){
    ctx.save(); if(GT.invincible>0){ ctx.globalAlpha=(Math.floor(GT.invincible*16)%2===0)?0.4:1; }
    const h=GT.PLAYER_H, w=h*img._cw/img._ch;
    ctx.translate(player.x+player.w/2, g>0 ? player.y+player.h : player.y); ctx.scale(player.facing>0?-1:1,g);   // 足もとが原点。天井ではさかさま。絵は左向きなので、右向きは反転
    ctx.imageSmoothingQuality='high';
    if(player.squash>1.4){                                   // 倒れている：横に寝かせる
      ctx.translate(0,-(player.h/2)*(player.squash-1)-w*0.42); ctx.rotate(-Math.PI/2);   // 平たい箱の底（＝地面）に寝かせる
      GT.drawSprite(img,-w/2,-h*0.75,w,h);
    } else {
      const t=performance.now()/1000;
      if(walking){
        // 歩く：足を踏み出した絵（歩く姿）で沈み、足をそろえた絵（立ち姿）で少し伸び上がる。進む向きへ少し前のめり
        ctx.translate(0, step?0:-3); ctx.rotate(-0.05);   // 絵は左向きの座標なので、-0.05 で進む向きへ傾く
      } else {
        // 立ち止まっているとき：ほかのキャラと同じように、ゆっくり上下にゆれる（絵はつぶさない）
        ctx.translate(0,-Math.abs(Math.sin(t*2.2))*2.2*0.6);
      }
      GT.drawSprite(img,-w/2,-h,w,h);
    }
    ctx.restore(); return;
  }
  // 絵が読みこめていないときは、前の形で描く
  ctx.save(); if(GT.invincible>0){ ctx.globalAlpha=(Math.floor(GT.invincible*16)%2===0)?0.4:1; }
  ctx.translate(player.x+player.w/2,player.y+player.h/2); ctx.scale(player.facing,g);
  const sx=player.squash, sy=2-player.squash; const hw=(player.w/2)*sx, hh=(player.h/2)*sy;
  ctx.beginPath(); ctx.fillStyle='#2b2e4a'; roundRectPath(-hw,-hh,hw*2,hh*2,9); ctx.fill();
  ctx.fillStyle='#b08d57'; ctx.beginPath(); ctx.moveTo(-4,-hh); ctx.lineTo(0,-hh-9); ctx.lineTo(4,-hh); ctx.closePath(); ctx.fill();
  ctx.fillStyle='#e8dcc0'; ctx.beginPath(); ctx.arc(-5,-2,2.4,0,Math.PI*2); ctx.arc(5,-2,2.4,0,Math.PI*2); ctx.fill();
  ctx.restore();
}
function drawEnemy(en){
  const eg=GT.gravity[en.page]; ctx.save();
  const sx=en.squash, sy=2-en.squash; const hw=(en.w/2)*sx, hh=(en.h/2)*sy;
  ctx.translate(en.x+en.w/2,en.y+en.h/2); ctx.scale(en.dir>=0?1:-1,eg);
  if(!en.alive){ ctx.globalAlpha=Math.max(0.25,1-en.deathT*0.6); ctx.beginPath(); roundRectPath(-hw*1.3,-hh*0.35,hw*2.6,hh*0.7,5); ctx.fillStyle='#4a4e6d'; ctx.fill(); ctx.restore(); return; }
  // 見やすいように、白いふちで囲む（からだと耳をひとつの形にして、外がわに白い線）
  const shape=()=>{ ctx.beginPath(); roundRectPath(-hw,-hh,hw*2,hh*2,7); ctx.moveTo(hw-6,-hh+1); ctx.lineTo(hw-2,-hh-8); ctx.lineTo(hw+2,-hh+1); ctx.closePath(); };
  shape(); ctx.strokeStyle='rgba(255,255,255,0.95)'; ctx.lineWidth=4; ctx.lineJoin='round'; ctx.stroke();
  ctx.beginPath(); roundRectPath(-hw,-hh,hw*2,hh*2,7); ctx.fillStyle='#3a2f2a'; ctx.fill();
  ctx.fillStyle='#3a2f2a'; ctx.beginPath(); ctx.moveTo(hw-6,-hh); ctx.lineTo(hw-2,-hh-8); ctx.lineTo(hw+2,-hh); ctx.closePath(); ctx.fill();
  ctx.fillStyle='#c9503f'; ctx.beginPath(); ctx.arc(hw-8,-2,2.2,0,Math.PI*2); ctx.fill();
  ctx.restore();
}
function drawGoal(){
  const goal=GT.goal; if(!goal) return; const g=GT.gravity[goal.page]; const pulse=0.5+0.5*Math.sin(goalPulse*3);
  ctx.save(); ctx.translate(goal.x+goal.w/2,goal.y+goal.h/2); ctx.scale(1,g);
  ctx.shadowColor='rgba(176,141,87,0.9)'; ctx.shadowBlur=10+6*pulse;
  const hw=goal.w/2,hh=goal.h/2; ctx.beginPath();
  ctx.moveTo(-hw,-hh); ctx.lineTo(hw,-hh); ctx.lineTo(hw,hh); ctx.lineTo(0,hh-6); ctx.lineTo(-hw,hh); ctx.closePath();
  ctx.fillStyle='#b08d57'; ctx.fill(); ctx.strokeStyle='rgba(58,50,38,0.6)'; ctx.lineWidth=1.5; ctx.stroke();
  ctx.restore();
}
/* ミッションのアイテム（ふつうは光るお話のかけら。itemLook:'star' なら金色の星）。かけらは取ると「本を開く」ボタンへ飛んでいく */
function drawStar(cx,cy,r){
  ctx.beginPath();
  for(let i=0;i<10;i++){ const a=-Math.PI/2+i*Math.PI/5, rr=i%2?r*0.45:r; ctx.lineTo(cx+Math.cos(a)*rr, cy+Math.sin(a)*rr); }
  ctx.closePath();
}
/* お話のかけら：まるくて、ふちがびりびりに破れた紙きれ。seed ごとに、破れ方がちがう。
   (0,0) を中心に、幅 w・高さ h の形の点を返す（画面の外へ飛んでいくかけら＝HTML の clip-path でも、同じ形を使う） */
function scrapPoints(w,h,seed){
  let s=seed*9301+49297; const R=()=>{ s=(s*9301+49297)%233280; return s/233280; };
  const rx=w/2, ry=h/2, pts=[];
  // 大きなゆがみ（ちぎった形のいびつさ）は、低い波を 3つ重ねて作る
  const p1=R()*6.28, p2=R()*6.28, p3=R()*6.28, a1=0.06+R()*0.05, a2=0.04+R()*0.04;
  let t=0, drift=0;
  while(t<Math.PI*2){
    let k=1+a1*Math.sin(t*2+p1)+a2*Math.sin(t*3+p2)+0.03*Math.sin(t*7+p3);
    drift=drift*0.5+(R()-0.5)*0.1;                  // 破れ目は、となりと少しずつつながってゆれる（規則的なぎざぎざにしない）
    k += drift - R()*R()*0.17;                       // 細かいけば立ち。ときどき深く欠ける
    pts.push([Math.cos(t)*rx*k, Math.sin(t)*ry*k]);
    t += (0.03+R()*0.08);                            // 点の間かくも、ふぞろいに
  }
  return pts;
}

/* ---- 拾ったかけらは、画面の下の「本を開く」ボタンへ飛んでいき、本に吸いこまれる ----
   ボタンの本の絵は、このステージで集めたぶんだけ、下から金色に埋まっていく。 */
(function(){
  const st=document.createElement('style');
  st.textContent=`@keyframes gtBookAbsorb{0%{transform:scale(1);box-shadow:0 0 0 0 rgba(255,214,110,.9)}
    30%{transform:scale(1.1);box-shadow:0 0 20px 6px rgba(255,214,110,.75)} 100%{transform:scale(1);box-shadow:0 0 0 0 rgba(255,214,110,0)}}
    #openBook.gt-absorb{animation:gtBookAbsorb .75s ease-out}`;
  document.head.appendChild(st);
  const svg=document.querySelector('#openBook svg'), path=svg&&svg.querySelector('path');
  if(path) svg.insertAdjacentHTML('afterbegin',
    `<defs><clipPath id="gtBookClip"><path d="${path.getAttribute('d')}"/></clipPath></defs>`+
    `<rect id="gtBookFill" x="0" y="20" width="24" height="0" fill="#e8c35a" stroke="none" opacity="0.9" clip-path="url(#gtBookClip)" style="transition:all .6s ease"/>`);
})();
let bookShown=0;                                     // ボタンの本に、もう吸いこまれたかけらの数
function updateBookFill(){
  const r=document.getElementById('gtBookFill'); if(!r) return;
  const bp=curStageDef&&curStageDef.bookPage, all=bp ? GT.pagePieces(bp).total : GT.items.length;   // ページのピース（かけら＋会話など）の数
  const f=all? Math.min(1,bookShown/all) : 0;
  r.setAttribute('y', String(20-16*f)); r.setAttribute('height', String(16*f));   // 本の絵は y=4〜20
}
function flyScrapToBook(it){
  const host=document.fullscreenElement||document.body;
  const btn=document.getElementById('openBook'), icon=btn&&(btn.querySelector('svg')||btn);
  const cr=canvas.getBoundingClientRect(), sc=cr.width/W;
  const br=icon ? icon.getBoundingClientRect() : null;
  const done=()=>{ bookShown++; updateBookFill(); if(btn){ btn.classList.remove('gt-absorb'); void btn.offsetWidth; btn.classList.add('gt-absorb'); } };
  if(!br || !br.width || !el_visible(btn)){ done(); return; }  // ボタンが見えていないときは、すぐ埋める
  const {w,h}=GT.pageScrapSize(it), pw=w*sc, ph=h*sc;
  const x0=cr.left+(it.x+it.w/2)*sc, y0=cr.top+(it.y+it.h/2)*sc;
  const x1=br.left+br.width/2, y1=br.top+br.height/2, dx=x1-x0, dy=y1-y0;
  const D=Math.max(16,Math.min(pw,ph)*0.8);
  const el=document.createElement('div');
  Object.assign(el.style,{position:'fixed',left:(x0-D/2)+'px',top:(y0-D/2)+'px',width:D+'px',height:D+'px',borderRadius:'50%',pointerEvents:'none',zIndex:60,
    background:'radial-gradient(circle at 40% 38%, #fffff5 0%, #fff0be 40%, rgba(255,200,110,0.7) 70%, rgba(255,200,110,0) 100%)',
    boxShadow:'0 0 12px 6px rgba(255,220,140,0.75), 0 0 28px 12px rgba(255,200,110,0.35)'});
  host.appendChild(el);
  const lift=-Math.min(140, 50+Math.abs(dy)*0.35), kf=[], DUR=1000, path=[];
  for(let i=0;i<=16;i++){ const t=i/16, e=t*t*(3-2*t);                          // ふわっと浮いてから、弧をえがいて栞へ
    const px=dx*e, py=dy*e+lift*Math.sin(Math.PI*Math.min(1,t*1.2)); path.push([px,py]);
    kf.push({transform:`translate(${px}px,${py}px) scale(${1-0.45*e})`, opacity:t>0.9?1-(t-0.9)/0.1*0.7:1}); }
  // 光の粒の尾（とちゅうの位置に、小さな光を置いていき、すっと消える）
  const sparks=[]; for(let i=1;i<path.length-1;i++){ const [px,py]=path[i];
    setTimeout(()=>{ for(let k=0;k<2;k++){ const sp=document.createElement('div'), s=3+Math.random()*4;
      Object.assign(sp.style,{position:'fixed',left:(x0+px-s/2+(Math.random()-0.5)*10)+'px',top:(y0+py-s/2+(Math.random()-0.5)*10)+'px',width:s+'px',height:s+'px',borderRadius:'50%',
        pointerEvents:'none',zIndex:59,background:'#fff3c8',boxShadow:'0 0 6px 2px rgba(255,214,130,0.8)'});
      host.appendChild(sp); sparks.push(sp);
      if(sp.animate) sp.animate([{opacity:1,transform:'translateY(0) scale(1)'},{opacity:0,transform:`translateY(${6+Math.random()*10}px) scale(0.3)`}],{duration:520,easing:'ease-out'}).onfinish=()=>sp.remove();
      else setTimeout(()=>sp.remove(),520); } }, DUR*i/16); }
  const burst=()=>{ for(let k=0;k<14;k++){ const sp=document.createElement('div'), a=k/14*Math.PI*2, d=18+Math.random()*26, s=3+Math.random()*4;   // 栞のまわりで、光がはじける
      Object.assign(sp.style,{position:'fixed',left:(x1-s/2)+'px',top:(y1-s/2)+'px',width:s+'px',height:s+'px',borderRadius:'50%',pointerEvents:'none',zIndex:61,
        background:'#fff6d6',boxShadow:'0 0 8px 3px rgba(255,220,140,0.85)'});
      host.appendChild(sp);
      if(sp.animate) sp.animate([{opacity:1,transform:'translate(0,0) scale(1)'},{opacity:0,transform:`translate(${Math.cos(a)*d}px,${Math.sin(a)*d}px) scale(0.2)`}],{duration:650,easing:'cubic-bezier(.2,.7,.3,1)'}).onfinish=()=>sp.remove();
      else setTimeout(()=>sp.remove(),650); } };
  let ended=false; const finish=()=>{ if(ended) return; ended=true; el.remove(); burst(); done(); };
  if(el.animate){ el.animate(kf,{duration:DUR,easing:'linear'}).onfinish=finish; }
  setTimeout(finish,DUR+150);                                      // 念のため（アニメーションが止まっていても、かならず埋まる）
}
GT.flyScrapToBook=flyScrapToBook; GT.scrapPoints=scrapPoints;   // ステージ側からも使える（拾った扱いにしたかけらを、本へ飛ばす）
function el_visible(e){ if(!e) return false; const s=getComputedStyle(e); return s.display!=='none' && s.visibility!=='hidden'; }

/* お話のかけら：ふわふわ浮かぶ、光の玉。まわりにやわらかい光、中は白く明るい芯、まわりを小さな光の粒が回る。
   （もとは紙きれ。呼びかたは同じ：drawPageScrap(中心x, 中心y, 幅, 高さ, 回転, 種, 光の強さ)） */
function drawPageScrap(cx,cy,w,h,rot,seed,glow){
  const t=performance.now()/1000+seed*0.37, R=Math.min(w,h)*0.42, pulse=0.85+0.15*Math.sin(t*3.1);
  ctx.save(); ctx.translate(cx,cy);
  ctx.globalCompositeOperation='lighter';
  let g=ctx.createRadialGradient(0,0,0,0,0,R*3.2*pulse);                       // 外の、やわらかい光
  g.addColorStop(0,'rgba(255,236,170,0.55)'); g.addColorStop(0.35,'rgba(255,214,120,0.22)'); g.addColorStop(1,'rgba(255,200,100,0)');
  ctx.fillStyle=g; ctx.beginPath(); ctx.arc(0,0,R*3.2*pulse,0,Math.PI*2); ctx.fill();
  ctx.globalCompositeOperation='source-over';
  g=ctx.createRadialGradient(-R*0.25,-R*0.3,0,0,0,R);                            // 玉（白い芯 → 金色のふち）
  g.addColorStop(0,'rgba(255,255,245,1)'); g.addColorStop(0.45,'rgba(255,240,190,0.95)'); g.addColorStop(1,'rgba(255,200,110,0.55)');
  ctx.fillStyle=g; ctx.beginPath(); ctx.arc(0,0,R*pulse,0,Math.PI*2); ctx.fill();
  ctx.globalCompositeOperation='lighter';
  for(let i=0;i<5;i++){ const a=t*(1.4+i*0.15)+i*1.26, rr=R*(1.35+0.35*Math.sin(t*2+i));   // まわりを回る、小さな光の粒
    const x=Math.cos(a)*rr, y=Math.sin(a)*rr*0.75, s=1.1+0.7*Math.sin(t*5+i*2);
    ctx.fillStyle=`rgba(255,246,210,${0.55+0.35*Math.sin(t*4+i)})`; ctx.beginPath(); ctx.arc(x,y,Math.max(0.4,s),0,Math.PI*2); ctx.fill(); }
  ctx.restore();
}
/* 拾ったときの、小さな鈴の音（その場で作る。効果音の音量にしたがう） */
let chimeAC=null;
function chime(){
  const vol=GT.volume?GT.volume.se:1; if(vol<=0) return;
  try{ chimeAC=chimeAC||new (window.AudioContext||window.webkitAudioContext)(); if(chimeAC.state==='suspended') chimeAC.resume(); }catch(e){ return; }
  // 光の魔法の音「しゅわーん」＋鈴のきらめき：空気の音の、ひびく高さが すーっと上がってから ゆるやかに下りる。うすく、すきとおった音が上へすべって重なる
  const a=chimeAC, t=a.currentTime, D=1.15, out=a.createGain(); out.gain.value=vol; out.connect(a.destination);
  const dl=a.createDelay(1), fb=a.createGain(), wet=a.createGain(); dl.delayTime.value=0.11; fb.gain.value=0.3; wet.gain.value=0.4;   // こだま
  dl.connect(fb).connect(dl); dl.connect(wet).connect(out);
  // ① しゅわー：雑音を、するどく ひびく帯で通し、その高さを動かす（2本を少しずらして、きらめかせる）
  const n=a.createBufferSource(), b=a.createBuffer(1,Math.ceil(a.sampleRate*D),a.sampleRate), d=b.getChannelData(0);
  for(let i=0;i<d.length;i++) d[i]=Math.random()*2-1; n.buffer=b;
  const ng=a.createGain(); ng.gain.setValueAtTime(0.0001,t); ng.gain.exponentialRampToValueAtTime(0.16,t+0.22); ng.gain.setValueAtTime(0.16,t+0.32); ng.gain.exponentialRampToValueAtTime(0.0001,t+D);
  [[1,6],[1.33,9]].forEach(([k,q])=>{ const bp=a.createBiquadFilter(); bp.type='bandpass'; bp.Q.value=q;
    bp.frequency.setValueAtTime(700*k,t); bp.frequency.exponentialRampToValueAtTime(5200*k,t+0.38); bp.frequency.exponentialRampToValueAtTime(2600*k,t+D);
    n.connect(bp).connect(ng); });
  ng.connect(out); ng.connect(dl); n.start(t); n.stop(t+D);
  // ③ 魔法のきらめき：小さな鈴（ベルの音色）が、しゅわーんの上で ちりちりと鳴る。上がっていく音の並びで、ところどころ ばらつかせる
  const NOTES=[1568,1760,2093,2349,2637,3136,3520,4186];
  for(let i=0;i<9;i++){ const f=NOTES[Math.min(NOTES.length-1,Math.floor(i*0.9+Math.random()*1.5))], tt=t+0.08+i*0.075+Math.random()*0.03, amp=0.05*(1-i*0.06);
    const g=a.createGain(); g.gain.setValueAtTime(0.0001,tt); g.gain.exponentialRampToValueAtTime(amp,tt+0.004); g.gain.exponentialRampToValueAtTime(0.0001,tt+0.6);
    [[1,1],[2.76,0.25],[5.4,0.08]].forEach(([m,v])=>{ const o=a.createOscillator(), og=a.createGain(); o.type='sine'; o.frequency.value=f*m; og.gain.value=v;   // ベルの音色（上の倍音を少し）
      o.connect(og).connect(g); o.start(tt); o.stop(tt+0.62); });
    g.connect(out); g.connect(dl); }
  setTimeout(()=>{ try{ out.disconnect(); dl.disconnect(); fb.disconnect(); }catch(e){} }, 2600);   // こだまを止める
}
GT.chime=chime;
GT.drawPageScrap=drawPageScrap;   // ステージ側からも使う（落ちてくるかけらなど）
GT.pageScrapSeed=it=>Math.round(it.x*7+it.y*3);
GT.pageScrapSize=it=>{ const s=Math.max(it.w,32); return {w:s*1.12, h:s*1.0}; };   // 小さいアイテムでも見えるように、少し大きめに描く
function drawItem(it){
  if(it.hidden) return;
  const cx=it.x+it.w/2, r=Math.min(it.w,it.h)/2;
  if(itemLook==='page'){
    const seed=GT.pageScrapSeed(it), sw=GT.pageScrapSize(it).w, sh=GT.pageScrapSize(it).h;
    if(it.got){
      if(it.gotT>1.3) return;
      const sx=cx, sy=it.y+it.h/2;
      if(it.gotT<0.35){ const k=it.gotT/0.35;                        // 拾った瞬間、ぱっと光の輪（かけらは本のボタンへ飛んでいく）
        ctx.save(); ctx.globalAlpha=1-k; ctx.strokeStyle='#ffe9a0'; ctx.lineWidth=2;
        ctx.beginPath(); ctx.arc(sx,sy,sw*0.5*(1+k*1.4),0,Math.PI*2); ctx.stroke(); ctx.restore(); }
      return;                                                       // 「お話のかけら ＋1」の文字は出さない
      const a=Math.min(1,(1.3-it.gotT)/0.4);
      ctx.save(); ctx.globalAlpha=Math.max(0,a); ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.font="700 14px 'Zen Old Mincho',serif"; const txt=itemLabel+' ＋1', ty2=sy-62-it.gotT*24;   // 少年の頭より上に出す
      ctx.lineWidth=4; ctx.strokeStyle='rgba(43,36,24,0.75)'; ctx.strokeText(txt,sx,ty2);
      ctx.fillStyle='#ffe9a0'; ctx.fillText(txt,sx,ty2); ctx.restore();
      return;
    }
    const bob=Math.sin(goalPulse*2.0+it.x*0.07)*5;                                 // ふわふわ浮かぶ光の玉
    drawPageScrap(cx,it.y+it.h/2+bob,sw,sh,0,seed,1);
    return;
  }
  if(itemLook==='flower'){ drawFlowerItem(it,cx,r); return; }
  if(it.got){ if(it.gotT>0.5) return; const t=it.gotT/0.5;
    ctx.save(); ctx.globalAlpha=1-t; ctx.strokeStyle='#e8c35a'; ctx.lineWidth=2;
    ctx.beginPath(); ctx.arc(cx,it.y+it.h/2,r*(1+t*1.6),0,Math.PI*2); ctx.stroke(); ctx.restore(); return; }
  const cy=it.y+it.h/2+Math.sin(goalPulse*3+it.x*0.07)*2.5;
  ctx.save();
  ctx.shadowColor='rgba(232,195,90,0.8)'; ctx.shadowBlur=10;
  drawStar(cx,cy,r); ctx.fillStyle='#e8c35a'; ctx.fill();
  ctx.shadowBlur=0; ctx.strokeStyle='#8a6a2a'; ctx.lineWidth=1.5; ctx.stroke();
  ctx.restore();
}
/* お花（itemLook:'flower'）：茎と葉のある、5枚花びらの花。天井に近いものは、さかさまに（天井から）咲いている。
   摘むと、花びらが舞って「お花 ＋1」 */
const FLOWER_COLS=[['#e2738a','#f6c1cc'],['#e8c35a','#f8e7a8'],['#8f8be0','#d4d0f6'],['#f3ead0','#ffffff'],['#e88a5a','#f8c9a8']];
function drawFlowerItem(it,cx,r){
  const up = it.ceil!=null ? !!it.ceil : it.y < EDGE+20;   // 天井に咲く花だけ、さかさま（高い崖や丸太の上の花は、上向き）
  const base = up ? it.y : it.y+it.h, d = up ? 1 : -1;      // 根もと（床か天井）と、のびる向き
  const [c1,c2]=FLOWER_COLS[Math.abs(Math.round(it.x/7+it.y/11))%FLOWER_COLS.length];
  const sway=Math.sin(goalPulse*2+it.x*0.05)*2.2;
  if(it.got){
    if(it.gotT>1.2) return;
    const k=it.gotT;
    ctx.save(); ctx.globalAlpha=Math.max(0,1-k/1.2);
    for(let i=0;i<6;i++){ const a=i*1.05+k*2, rr=8+k*40;          // 花びらが舞う
      ctx.fillStyle=i%2?c1:c2; ctx.beginPath(); ctx.ellipse(cx+Math.cos(a)*rr, base+d*it.h*0.7+Math.sin(a)*rr*0.6-k*20, 4, 2.4, a, 0, Math.PI*2); ctx.fill(); }
    ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.font="700 14px 'Zen Old Mincho',serif";
    const ty=base+d*it.h-40*(up?-1:1)-k*20, txt=itemLabel+' ＋1';
    ctx.lineWidth=4; ctx.strokeStyle='rgba(43,36,24,0.75)'; ctx.strokeText(txt,cx,ty); ctx.fillStyle='#ffe9a0'; ctx.fillText(txt,cx,ty);
    ctx.restore(); return;
  }
  const top=base+d*it.h*0.95, fx=cx+sway;
  ctx.save();
  ctx.strokeStyle='#5e7d44'; ctx.lineWidth=2.2; ctx.beginPath(); ctx.moveTo(cx,base); ctx.quadraticCurveTo(cx+sway*0.4,base+d*it.h*0.5,fx,top); ctx.stroke();   // 茎
  ctx.fillStyle='#6f9a4e'; ctx.beginPath(); ctx.ellipse(cx+5,base+d*it.h*0.35,6,2.6,-0.5*d,0,Math.PI*2); ctx.fill();              // 葉
  ctx.shadowColor='rgba(255,236,170,0.8)'; ctx.shadowBlur=8;                                                                        // ほんのり光って、見つけやすく
  for(let i=0;i<5;i++){ const a=i*Math.PI*2/5+goalPulse*0.3; ctx.fillStyle=c1;
    ctx.beginPath(); ctx.ellipse(fx+Math.cos(a)*r*0.42, top+Math.sin(a)*r*0.42, r*0.34, r*0.22, a, 0, Math.PI*2); ctx.fill(); }
  ctx.shadowBlur=0; ctx.fillStyle=c2; for(let i=0;i<5;i++){ const a=i*Math.PI*2/5+goalPulse*0.3; ctx.beginPath(); ctx.ellipse(fx+Math.cos(a)*r*0.36, top+Math.sin(a)*r*0.36, r*0.16, r*0.1, a, 0, Math.PI*2); ctx.fill(); }
  ctx.fillStyle='#c98a2a'; ctx.beginPath(); ctx.arc(fx,top,r*0.17,0,Math.PI*2); ctx.fill();
  ctx.restore();
}
/* ミッション中は右端に「閉じた扉」を描いて、通れないことを見せる */
function drawExitGate(){
  ctx.save(); ctx.fillStyle='rgba(107,91,70,0.55)'; ctx.fillRect(W-EDGE,EDGE,EDGE,H-EDGE*2);
  ctx.strokeStyle='rgba(201,80,63,0.7)'; ctx.lineWidth=2; ctx.setLineDash([6,5]);
  ctx.beginPath(); ctx.moveTo(W-EDGE,EDGE); ctx.lineTo(W-EDGE,H-EDGE); ctx.stroke(); ctx.restore();
}
/* 画面上部のミッション表示 */
/* ハート（体力）：敵や狼がいるステージだけ、左上に出す。減ったハートは、ふるえてから空になる */
function heartPath(cx,cy,r){ ctx.beginPath(); ctx.moveTo(cx,cy+r*0.9);
  ctx.bezierCurveTo(cx-r*1.6,cy-r*0.1,cx-r*0.8,cy-r*1.3,cx,cy-r*0.45);
  ctx.bezierCurveTo(cx+r*0.8,cy-r*1.3,cx+r*1.6,cy-r*0.1,cx,cy+r*0.9); ctx.closePath(); }
function drawHearts(){
  const sc=GT.scene; if(!sc) return;
  if(!(GT.enemies.length>0 || sc.type==='boss') || flipping) return;
  ctx.save();
  for(let i=0;i<GT.MAX_HP;i++){
    const full=i<GT.hp, justLost=(i===GT.hp && heartLost>0);
    const shake = justLost ? Math.sin(heartLost*40)*3*heartLost : 0;
    const cx=40+i*40+shake, cy=58, r=14*(justLost?1+0.25*heartLost:1);   // ハートの大きさ（前は r=9・間隔 26）
    heartPath(cx,cy,r);
    ctx.fillStyle = full ? '#c9503f' : justLost ? `rgba(201,80,63,${heartLost})` : 'rgba(243,234,208,0.55)'; ctx.fill();
    ctx.strokeStyle='rgba(58,40,30,0.85)'; ctx.lineWidth=2.2; ctx.stroke();
    if(full){ ctx.fillStyle='rgba(255,240,225,0.6)'; ctx.beginPath(); ctx.ellipse(cx-r*0.4,cy-r*0.35,r*0.22,r*0.14,-0.6,0,Math.PI*2); ctx.fill(); }
  }
  ctx.restore();
}
/* ゲームオーバー：画面が暗くなって文字が出る → ページが前へもどる */
function drawGameOver(){
  const t=gameOver.t, k=Math.min(1,t/0.5);
  ctx.save();
  ctx.fillStyle=`rgba(30,14,10,${0.55*k})`; ctx.fillRect(0,0,W,H);
  ctx.globalAlpha=k; ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillStyle='#f3ead0'; ctx.font="700 54px 'Caveat',cursive"; ctx.fillText('Game Over',W/2,H/2-18);
  ctx.globalAlpha=Math.min(1,Math.max(0,(t-0.5)/0.4));
  // （「ページをもどって、やりなおす」などの文は出さない）
  ctx.restore();
}
/* ミッションの表示（HTML）。文字がくっきり出る。位置はキャンバスの上から 48/480 */
const missionEl=document.createElement('div'); missionEl.id='gtMission';
missionEl.innerHTML='<svg class="ic" viewBox="0 0 20 20" aria-hidden="true"><defs><radialGradient id="gtOrbIc" cx="0.42" cy="0.4" r="0.6"><stop offset="0" stop-color="#fffff5"/><stop offset="0.45" stop-color="#fff0be"/><stop offset="1" stop-color="#ffc86e" stop-opacity="0"/></radialGradient></defs><circle cx="10" cy="10" r="9.5" fill="url(#gtOrbIc)"/><circle cx="10" cy="10" r="4.6" fill="#fffbe8"/></svg><span class="tx"></span>';
canvas.parentElement.appendChild(missionEl);
(function(){ const st=document.createElement('style'); st.textContent=`
  #gtMission{ position:absolute; left:50%; top:${(48/480*100).toFixed(2)}%; transform:translate(-50%,-50%); z-index:1; display:none; align-items:center; gap:0.5em;
    padding:0.28em 1.1em; border-radius:2em; background:rgba(43,36,24,0.78); color:#f3ead0; white-space:nowrap; pointer-events:none;
    font-family:'Zen Old Mincho',serif; font-weight:700; font-size:clamp(11px,1.6cqw,38px); letter-spacing:0.04em; box-shadow:0 0 0 0 rgba(255,226,140,0); }
  #gtMission.show{ display:flex; }
  #gtMission.done{ background:rgba(176,141,87,0.92); }
  #gtMission.done .tx{ font-family:'Caveat',cursive; font-size:1.35em; letter-spacing:0.04em; line-height:1; }
  #gtMission .ic{ width:1.35em; height:1.35em; flex:none; filter:drop-shadow(0 0 4px rgba(255,214,130,0.9)); }
  #gtMission.nopage .ic{ display:none; }`; document.head.appendChild(st); })();
let missionTxt=null;
function missionDom(txt,page,done,pulse){
  if(txt!==missionTxt){ missionEl.querySelector('.tx').textContent=txt; missionTxt=txt; }
  missionEl.classList.add('show'); missionEl.classList.toggle('done',done); missionEl.classList.toggle('nopage',!page);
  missionEl.style.opacity = done ? Math.min(1,0.35+missionFlash) : 1;
  missionEl.style.transform = `translate(-50%,-50%) scale(${(1+0.18*pulse).toFixed(3)})`;   // 拾った直後は、ぽんと大きくなる
  missionEl.style.boxShadow = pulse>0 ? `0 0 0 2px rgba(255,226,140,${pulse.toFixed(2)})` : 'none';
}
function drawMissionHud(){
  const c=missionCount(), parts=[];
  const page=itemLook==='page', verb = page?'を集める':itemLook==='flower'?'を摘む':null;   // 見出しの言いかた
  if(missionReq.items) parts.push(verb ? `${itemLabel}${verb} ${c.items}/${c.itemsAll}` : `${itemLabel} ${c.items}/${c.itemsAll}`);
  if(missionReq.enemies) parts.push(`敵を倒す ${c.enemies}/${c.enemiesAll}`);
  const done = (curStageDef&&curStageDef.itemsOptional) ? (c.items>=c.itemsAll && (!missionReq.enemies||c.enemies>=c.enemiesAll)) : missionDone();
  // そろったときの言葉（絵本の語りのように）
  const doneTxt = 'Complete';   // 全部そろったとき（英語の筆記体）
  const txt = done ? doneTxt : parts.join('　');
  // キャンバスに描くと、画面を大きくしたときに文字がぼやけるので、ゲーム画面の上に重ねた HTML（#gtMission）で出す
  missionDom(txt, page, done, hudPulse); return;
  ctx.save(); ctx.font="700 14px 'Zen Old Mincho',serif"; ctx.textAlign='center'; ctx.textBaseline='middle';
  const icon=page?26:0, w=ctx.measureText(txt).width+28+icon, y=48;
  ctx.globalAlpha = done ? Math.min(1,0.35+missionFlash) : 1;
  ctx.translate(W/2,y); const sc=1+0.18*hudPulse; ctx.scale(sc,sc); ctx.translate(-W/2,-y);   // 拾った直後は、ぽんと大きくなる
  roundRect(W/2-w/2,y-13,w,26,13); ctx.fillStyle=done?'rgba(176,141,87,0.92)':'rgba(43,36,24,0.78)'; ctx.fill();
  if(hudPulse>0){ ctx.strokeStyle=`rgba(255,226,140,${hudPulse})`; ctx.lineWidth=2; ctx.stroke(); }
  if(page) drawPageScrap(W/2-w/2+20,y,16,13,-0.12,7,hudPulse);   // かけらの小さな絵
  ctx.fillStyle='#f3ead0'; ctx.fillText(txt,W/2+icon/2,y+1);
  ctx.restore();
}
function drawSwamp(sw0){
  const SINK=7, sw={...sw0, y:sw0.y+(sw0.y+sw0.h/2<H/2?-SINK:SINK)};   // 見た目は、地面より少し下に沈める（天井がわの沼は上へ）。当たりはそのまま
  ctx.save(); roundRect(sw.x,sw.y,sw.w,sw.h,Math.min(10,sw.h/2));
  ctx.fillStyle='rgba(63,72,46,0.82)'; ctx.fill();
  ctx.clip();
  ctx.fillStyle='rgba(120,132,84,0.35)';               // 水面のにぶい光
  const inv=GT.gravity[GT.pageOf(sw)]===-1;
  ctx.fillRect(sw.x+6, inv?sw.y+sw.h-5:sw.y+2, sw.w-12, 3);
  ctx.strokeStyle='rgba(176,184,130,0.55)'; ctx.lineWidth=1.4;   // ぷくぷく浮かぶ泡
  const n=Math.max(2,Math.floor(sw.w/40));
  for(let i=0;i<n;i++){
    const t=(goalPulse*0.6+i*0.37)%1, bx=sw.x+(i+0.5)*sw.w/n+Math.sin(i*2.1)*6;
    const by=inv?sw.y+sw.h*(0.2+0.6*t):sw.y+sw.h*(0.8-0.6*t);
    ctx.globalAlpha=1-t; ctx.beginPath(); ctx.arc(bx,by,2+2*t,0,Math.PI*2); ctx.stroke();
  }
  ctx.restore();
}
function drawBox(box){
  if(GT.boxSkinned && GT.boxSkinned()) return;   // ステージが箱を自分の絵（家具など）で描くときは、ふつうの箱は描かない
  ctx.save(); const sx=box.squash, sy=2-box.squash; const hw=(box.w/2)*sx, hh=(box.h/2)*sy;
  ctx.translate(box.x+box.w/2,box.y+box.h/2);
  ctx.beginPath(); roundRectPath(-hw,-hh,hw*2,hh*2,6); ctx.fillStyle='#8b5e63'; ctx.fill();
  ctx.strokeStyle='rgba(43,46,74,0.35)'; ctx.lineWidth=1.5; ctx.stroke();
  ctx.strokeStyle='rgba(232,220,192,0.5)'; ctx.lineWidth=2; ctx.beginPath();
  ctx.moveTo(-hw+4,-hh+4); ctx.lineTo(hw-4,hh-4); ctx.moveTo(hw-4,-hh+4); ctx.lineTo(-hw+4,hh-4); ctx.stroke();
  ctx.restore();
}
/* キャラクターの絵（赤ずきん・マリ・お母さん・おばあさん・狼・少年）は js/sprites.js */

/* ステージ上のキャラ（NPC） */
function drawNpc(n){
  const g=n.g||1;                                         // 1=床に立つ / -1=天井に立つ（上下さかさま）
  const bob=Math.sin(goalPulse*2.2 + n.x*0.05)*2.2;
  const cx=n.x+n.w/2, midY=n.y+n.h/2;
  const face=(GT.player.x<n.x)?-1:1;
  let headY = g>0 ? n.y+bob : n.y+n.h-bob;                // 頭のある側（名前・「はなす」はその外側に出す）
  ctx.save();
  if(n.who==='hood' && GT.sprite('front')){
    // 近くにいるときは主人公のほうを向き、離れているときは正面を向く
    // 動いているときは、進む方向を向いて歩く（ステージが x を動かす）
    const dx=n._lastX==null?0:n.x-n._lastX; n._lastX=n.x;
    if(Math.abs(dx)>0.05){ n._walkDir=Math.sign(dx); n._walkT=performance.now(); }
    const walking=n._walkT!=null && performance.now()-n._walkT<120;
    const near=Math.abs((GT.player.x+GT.player.w/2)-cx)<140;
    const sb=walking?0:Math.abs(bob)*0.6;
    GT.drawHoodSprite(cx, g>0 ? n.y+n.h-sb : n.y+sb, GT.HOOD_H, walking?n._walkDir:(near?face:0), g, null, walking);
    headY += g>0 ? -(GT.HOOD_H-n.h) : (GT.HOOD_H-n.h);
  } else if(n.who==='mari' && GT.sprite('mariLeft')){
    // マリは、いつも主人公のほうを向く
    const sb=Math.abs(bob)*0.6;
    GT.drawMariSprite(cx, g>0 ? n.y+n.h-sb : n.y+sb, GT.MARI_H, face, g);
    headY += g>0 ? -(GT.MARI_H-n.h) : (GT.MARI_H-n.h);
  } else if(n.who==='granny' && GT.sprite('grannyLeft')){
    // おばあさん（二頭身の絵）。主人公のほうを向く
    const sb=Math.abs(bob)*0.6;
    GT.drawCharSprite('granny', cx, g>0 ? n.y+n.h-sb : n.y+sb, GT.GRANNY_H, face, g);
    headY += g>0 ? -(GT.GRANNY_H-n.h) : (GT.GRANNY_H-n.h);
  } else if(n.who==='granny'){
    // おばあさん（ふくらんだ服・白い髪とずきん・めがね）
    ctx.translate(cx,g>0?n.y+n.h:n.y); ctx.scale(1,g); ctx.translate(0,bob*0.5);
    ctx.fillStyle='#8a7fa0'; ctx.beginPath(); ctx.moveTo(-15,0); ctx.quadraticCurveTo(-17,-26,-9,-30); ctx.lineTo(9,-30); ctx.quadraticCurveTo(17,-26,15,0); ctx.closePath(); ctx.fill();
    ctx.fillStyle='#e8dcc0'; ctx.fillRect(-9,-14,18,12);                                           // エプロン
    ctx.fillStyle='#ecd0a8'; ctx.beginPath(); ctx.arc(0,-38,10,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#f6eed8'; ctx.beginPath(); ctx.ellipse(0,-44,12,7,0,0,Math.PI*2); ctx.fill();   // ずきん
    ctx.strokeStyle='#5a4630'; ctx.lineWidth=1; ctx.beginPath(); ctx.arc(-4*face,-38,2.6,0,Math.PI*2); ctx.arc(4*face,-38,2.6,0,Math.PI*2); ctx.stroke();
    ctx.fillStyle='#6b4f36'; ctx.fillRect(14*face-1,-22,2,22);                                      // つえ
    headY += g>0 ? -(52-n.h) : (52-n.h);
  } else if(n.who==='wolf' && GT.sprite('wolfLeft')){
    // 狼（ミニの絵）。動いているときは走る絵で進む方向を、止まっているときは主人公のほうを向く
    const dx=n._lastX==null?0:n.x-n._lastX; n._lastX=n.x;
    if(Math.abs(dx)>0.05){ n._walkDir=Math.sign(dx); n._walkT=performance.now(); }
    const running=n._walkT!=null && performance.now()-n._walkT<120;
    const sb=running?0:Math.abs(bob)*0.6;
    ctx.translate(cx, g>0 ? n.y+n.h-sb : n.y+sb);
    const step=GT.wolfRunPose(running, running?n._walkDir:face, g);
    const ok=GT.drawCharSprite(step?'wolfRun':'wolf', 0, 0, GT.WOLF_H, running?n._walkDir:face, g);
    if(ok) headY += g>0 ? -(GT.WOLF_H-n.h) : (GT.WOLF_H-n.h);
  } else if(n.who==='wolf'){
    const bw=n.w+8, bh=n.h*0.62;
    ctx.translate(cx,midY); ctx.scale(face,g); ctx.translate(0,n.h/2-bh/2-6+bob);
    ctx.fillStyle='#3a2f2a';
    ctx.fillRect(-bw/2+4,bh/2-2,6,10); ctx.fillRect(bw/2-10,bh/2-2,6,10);
    ctx.beginPath(); roundRectPath(-bw/2,-bh/2,bw,bh,8); ctx.fill();
    ctx.beginPath(); ctx.moveTo(bw/2-12,-bh/2); ctx.lineTo(bw/2-6,-bh/2-11); ctx.lineTo(bw/2,-bh/2); ctx.closePath(); ctx.fill();
    ctx.beginPath(); roundRectPath(bw/2-8,-bh*0.12,bw*0.38,bh*0.34,4); ctx.fillStyle='#2c231f'; ctx.fill();
    ctx.fillStyle='#c9503f'; ctx.beginPath(); ctx.arc(bw/2-12,-bh*0.14,2.6,0,Math.PI*2); ctx.fill();
  } else {
    const hw=n.w/2, hh=n.h/2;
    ctx.translate(cx,midY); ctx.scale(1,g); ctx.translate(0,bob);
    const col=(n.who==='mari')?'#4a4e6d':'#2b2e4a';
    ctx.beginPath(); roundRectPath(-hw,-hh,n.w,n.h,9); ctx.fillStyle=col; ctx.fill();
    if(n.who==='hood'){
      ctx.fillStyle='#b8423f';
      ctx.beginPath(); ctx.moveTo(-hw,-hh*0.1); ctx.lineTo(hw,-hh*0.1); ctx.lineTo(hw*0.7,hh*0.9); ctx.lineTo(-hw*0.7,hh*0.9); ctx.closePath(); ctx.globalAlpha=0.92; ctx.fill(); ctx.globalAlpha=1;
      ctx.beginPath(); ctx.arc(0,-hh,hw*0.95,Math.PI,0); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-hw*0.9*face,-hh*1.0); ctx.lineTo(-hw*1.7*face,-hh*0.7); ctx.lineTo(-hw*0.9*face,-hh*0.55); ctx.closePath(); ctx.fill();
    } else if(n.who==='mari'){
      ctx.fillStyle='#a9b0d6'; ctx.beginPath(); ctx.moveTo(-4,-hh); ctx.lineTo(0,-hh-9); ctx.lineTo(4,-hh); ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle='#e8dcc0'; ctx.beginPath();
    ctx.arc(-5*face,-hh*0.35,2.4,0,Math.PI*2); ctx.arc(5*face,-hh*0.35,2.4,0,Math.PI*2); ctx.fill();
  }
  ctx.restore();
  if(n.name){ ctx.save(); ctx.font="600 11px 'Zen Old Mincho',serif"; ctx.textAlign='center';
    const nm=GT.speakerName(n.who, n.name), ny=g>0 ? headY-12 : headY+20;
    ctx.strokeStyle='rgba(246,239,220,0.8)'; ctx.lineWidth=3; ctx.lineJoin='round'; ctx.strokeText(nm, cx, ny);   // うすい紙の色のふち（どんな背景の上でも読めるように）
    ctx.fillStyle='rgba(74,70,60,0.9)'; ctx.fillText(nm, cx, ny); ctx.restore(); }
  // 話しかけられる人：頭の上に吹き出しマーク（まだ話していない人だけ。会話中は出さない）
  const canTalk = n.talkable && !n.talked && n.lines && !storyTalking && !dlg.classList.contains('show') && GT.mode==='play';
  // 話しかけないと先へ進めない人は「！」、話さなくても進める人（ヒント・寄り道の会話）は「…」
  //   ふつうは、話し終えると右の端が開く人（noExit でない人）で、まだ一度も話していない人が「！」。
  //   ステージ側で n.required = true / false と書けば、そちらが優先
  const must = n.required!=null ? !!n.required : (!n.noExit && !n.talkedOnce);
  if(canTalk) drawTalkMark(cx, g>0 ? headY-38 : headY+44, g, n===activeNpc, must);
  if(n===activeNpc && !storyTalking){
    const p=0.5+0.5*Math.sin(goalPulse*5);
    ctx.save(); ctx.textAlign='center'; ctx.globalAlpha=0.65+0.35*p;
    ctx.fillStyle='#b08d57'; ctx.font="700 19px 'Caveat',cursive";
    ctx.fillText(GT.ctl('Tap / Enter to talk','Tap to talk'), cx, g>0 ? headY-66 : headY+74);
    ctx.restore();
  }
  if(n.speech) GT.drawSpeech(cx, g>0 ? headY-14 : headY+14, n.speech.text, n.speech.t/0.4, g<0, n.speech.angry);
}

