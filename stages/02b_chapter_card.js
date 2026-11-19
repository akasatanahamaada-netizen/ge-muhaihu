/* ============================================================================
   章のとびら：第一章「赤い頭巾」  id = 'chapter1'
   ----------------------------------------------------------------------------
   チュートリアル（ゴシックの暗い森）のあと、赤ずきんの家（明るい絵本）に入る前にはさむ演出。
     1) まっ暗な中に、閉じた本が浮かぶ
     2) 本が、まん中からひらく（ページの音）
     3) ひらいたページに、大きく「第一章」「赤い頭巾」の文字が、インクがにじむように出る
     4) ページがめくれて、明るい赤ずきんの家の場面へ（一気に雰囲気が変わる）
   章の名前は js/playlist.js の GT.chapters から取る
   ========================================================================== */
(function(){
const ctx=GT.ctx, W=GT.W, H=GT.H;
GT.defineStage('chapter1_card', { label:'第一章「赤い頭巾」', platforms:[], boxes:[], enemies:[] });
GT.registerScene({ id:'chapter1', type:'card', label:'第一章「赤い頭巾」', dynamic:'chapterCard', chapter:1 });

const card={ t0:0, flipped:false, sfx:false, ch:1, pen:{} };   // pen … ペンの音を鳴らした字（一字に一回）
const isCard=()=>GT.scene&&GT.scene.id==='chapter1';
const T_OPEN0=0.9, T_OPEN1=2.1, T_TEXT=2.3;   // T_TEXT … 書きはじめる時間（おわりの時間は、書き順の長さから決める＝plan()）

GT.registerDynamic('chapterCard', scene=>{
  GT.loadStageDef(GT.STAGE_DEFS['chapter1_card']); GT.mode='idle';
  GT.player.x=-600; GT.player.y=H-GT.EDGE-GT.player.h;           // 少年は見せない
  card.t0=performance.now(); card.flipped=false; card.sfx=false; card.pen={}; card.ch=scene.chapter||1;
  GT.setHudStage&&GT.setHudStage(scene.label||'');
  const rb=document.getElementById('resetBtn'); if(rb) rb.style.visibility='hidden';   // とびらのあいだは「Reset」を隠す
});
GT.registerSceneReset(()=>{ if(isCard()) return; const rb=document.getElementById('resetBtn'); if(rb) rb.style.visibility=''; });

const ease=x=>x<0?0:x>1?1:x*x*(3-2*x);
const SIL={ hood:new Image(), wolf:new Image() };   // とびらのページの、赤ずきんと狼のシルエット（上半身）
SIL.hood.src='assets/character/とびら_赤ずきん上半身.webp'; SIL.wolf.src='assets/character/とびら_狼上半身.webp';
function drawCard(){
  if(!isCard() || !card.t0) return;
  const t=(performance.now()-card.t0)/1000;
  const T_END=plan().end;
  if(t>=T_END && !card.flipped){ card.flipped=true; GT.startPageFlip(); }   // めくって、赤ずきんの家へ
  if(t>=T_OPEN0 && !card.sfx){ card.sfx=true; GT.sfx&&GT.sfx('page'); }   // 本がひらく音
  const chap=(GT.chapters||[])[card.ch]||{name:'第一章',sub:'赤い頭巾'};
  const cx=W/2, cy=H/2+6, zoom=1+0.1*ease((t-0.2)/5.5);
  ctx.save();
  // まっ暗な背景と、本のうしろの あたたかい光
  ctx.fillStyle='#0d0b0a'; ctx.fillRect(0,0,W,H);
  const glowA=0.15+0.35*ease((t-0.3)/2);
  let g=ctx.createRadialGradient(cx,cy,10,cx,cy,W*0.55); g.addColorStop(0,`rgba(255,214,150,${glowA})`); g.addColorStop(1,'rgba(255,214,150,0)');
  ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
  // ただよう ちり
  for(let i=0;i<26;i++){ const s=Math.sin(i*91.7)*43758.5, r=s-Math.floor(s), s2=Math.sin(i*37.3)*24634.6, r2=s2-Math.floor(s2);
    const x=(r*W+t*8*(0.5+r2))%W, y=(r2*H-t*12*(0.4+r))%H+(r2*H-t*12*(0.4+r)<0?H:0);
    ctx.globalAlpha=0.25+0.25*Math.sin(t*1.5+i); ctx.fillStyle='#f0dcb0'; ctx.beginPath(); ctx.arc(x,y,1.1,0,Math.PI*2); ctx.fill(); }
  ctx.globalAlpha=Math.min(1,t/0.6);                                   // 本が、暗やみから浮かびあがる
  ctx.translate(cx,cy); ctx.scale(zoom,zoom);
  const PW=230, PH=300, o=ease((t-T_OPEN0)/(T_OPEN1-T_OPEN0));
  const c=Math.cos(Math.PI*o);                 // 表紙の向き（1：閉じている → -1：左へ開ききる）
  const lw= c<0 ? PW*(-c) : 0;                 // 左がわに開いている幅
  ctx.translate(-PW/2*(1-o),0);                // 閉じているあいだも、本がまん中に来るように（開くにつれて背がまん中へ）
  // 本の土台（うらの革）：右はいつも、左は開いたぶんだけ
  ctx.fillStyle='#2a170f'; roundRect(-lw-8,-PH/2-8,lw+PW+16,PH+16,6); ctx.fill();
  ctx.strokeStyle='rgba(201,164,90,0.7)'; ctx.lineWidth=1.4; roundRect(-lw-4,-PH/2-4,lw+PW+8,PH+8,4); ctx.stroke();
  // 右のページ（紙のたば。右のふちに、ページの重なり）
  paper(0,-PH/2,PW,PH,1);
  ctx.strokeStyle='rgba(150,120,80,0.35)'; ctx.lineWidth=0.8;
  for(let k=1;k<=3;k++){ ctx.beginPath(); ctx.moveTo(PW+k*1.6,-PH/2+3); ctx.lineTo(PW+k*1.6,PH/2-3); ctx.stroke(); }
  // 開きかけの表紙が、右のページに落とす影
  if(o>0 && o<1){ const a=0.35*(1-Math.abs(c)), sw=40+60*(1-Math.abs(c));
    const sg=ctx.createLinearGradient(0,0,sw,0); sg.addColorStop(0,`rgba(40,24,12,${a})`); sg.addColorStop(1,'rgba(40,24,12,0)');
    ctx.fillStyle=sg; ctx.fillRect(0,-PH/2,sw,PH); }
  // 左のページ（開ききったあと）
  if(o>=1) paper(-PW,-PH/2,PW,PH,-1);
  // めくれていく表紙（背を軸にまわる）：手前に来るほど、はしが少し大きく見える
  if(o<1){ const w=PW*Math.abs(c), k=(1-Math.abs(c))*14, dir=c>=0?1:-1;
    const x2=dir*w;
    ctx.beginPath(); ctx.moveTo(0,-PH/2-6); ctx.lineTo(x2,-PH/2-6-k); ctx.lineTo(x2,PH/2+6+k); ctx.lineTo(0,PH/2+6); ctx.closePath();
    if(c>=0){                                   // 表がわ：革の表紙
      const g=ctx.createLinearGradient(0,0,x2,0); g.addColorStop(0,'#2e1a11'); g.addColorStop(1,'#4a2c1c');
      ctx.fillStyle=g; ctx.fill();
      ctx.save(); ctx.clip();
      ctx.strokeStyle='rgba(201,164,90,0.85)'; ctx.lineWidth=1.2;
      ctx.beginPath(); ctx.moveTo(6,-PH/2+4); ctx.lineTo(x2-6*Math.sign(x2||1),-PH/2+4-k*0.8); ctx.lineTo(x2-6*Math.sign(x2||1),PH/2-4+k*0.8); ctx.lineTo(6,PH/2-4); ctx.closePath(); ctx.stroke();
      if(w>70){ ctx.fillStyle='rgba(201,164,90,0.9)'; ctx.font="600 14px 'Cormorant Garamond',serif"; ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.save(); ctx.translate(w/2,0); ctx.scale(Math.abs(c),1+k/PH); ctx.fillText('GRAVITY TALES',0,0); ctx.restore(); }
      ctx.restore();
    } else {                                    // うらがわ：見返しの紙（左のページになっていく）
      const g=ctx.createLinearGradient(0,0,x2,0); g.addColorStop(0,'#cdbf9f'); g.addColorStop(0.15,'#ece0c6'); g.addColorStop(1,'#f2e8d2');
      ctx.fillStyle=g; ctx.fill();
      ctx.fillStyle=`rgba(60,40,20,${0.25*(1-Math.abs(c))})`; ctx.fill();   // まだ立っているあいだは、少しかげる
    }
    ctx.strokeStyle='rgba(40,24,12,0.5)'; ctx.lineWidth=1; ctx.stroke();
  }
  // のどの影
  if(o>=1){ g=ctx.createLinearGradient(-14,0,14,0); g.addColorStop(0,'rgba(60,40,20,0)'); g.addColorStop(0.5,'rgba(60,40,20,0.35)'); g.addColorStop(1,'rgba(60,40,20,0)');
    ctx.fillStyle=g; ctx.fillRect(-14,-PH/2,28,PH); }
  /* ひらいたページに、筆で書いていくように、文字と絵があらわれる
       「第一章」→ 罫線 → 「赤い頭巾」（筆の書体で、一画ずつ）→ 英語の筆記体 → 赤ずきんと狼のシルエットを上から描いていく */
  const P=plan(), W1=P.w1, W2=P.w2, W3=P.w3, W4=P.w4, S0=W1;   // 書きはじめる時間（秒）。S0 … 絵（シルエット）も、文字を書きはじめると同時に描きはじめる
  const pen=(key,len)=>{ if(card.pen[key]) return; card.pen[key]=true; GT.sfx&&GT.sfx('write',len); };   // ペンで書く音（一字に一回。その字を書いているあいだだけ鳴る）
  if(o>=1 && t>=W1){
    ctx.globalAlpha=1;
    writeBrush('第一章', 22, '#5a3a22', -116, W1, SPD_S, (n,len)=>pen('l1-'+n,len));
    const kl=ease((t-W2)/0.35);                                               // 罫線を、まん中から左右へ（はしは細く）
    if(kl>0){ ctx.strokeStyle='rgba(120,80,40,0.55)'; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(-100*kl,-96); ctx.quadraticCurveTo(0,-92,100*kl,-96); ctx.stroke();
      ctx.fillStyle='rgba(120,80,40,0.6)'; ctx.beginPath(); ctx.arc(0,-94,2.2*kl,0,Math.PI*2); ctx.fill(); }
    writeBrush(chap.sub, 60, '#2a160c', -52, W3, SPD_L, (n,len)=>pen('l2-'+n,len));
    writeCursive(CH_EN[card.ch]||'', 24, '#6b4a2a', -6, W4, 1.0, ()=>pen('l3',1.0));
    // シルエット：上から下へ、筆で描いていくように（描いているふちは、ゆらゆら）
    ctx.save(); ctx.beginPath(); ctx.rect(-PW+6,-PH/2+6,PW*2-12,PH-12); ctx.clip();
    const paint=(img,x,right,t0,key)=>{ if(!img.complete||!img.naturalWidth) return; const p=ease((t-t0)/1.3); if(p<=0) return;
      const h=140, w=h*img.naturalWidth/img.naturalHeight, ix=right? x-w : x, iy=PH/2-6-h;
      ctx.save(); ctx.beginPath(); ctx.moveTo(ix-4,iy-4);
      for(let k=0;k<=12;k++){ const xx=ix-4+(w+8)*k/12, yy=iy+h*p*1.08+Math.sin(k*1.7+t*6)*6*(1-p); ctx.lineTo(xx,yy); }
      ctx.lineTo(ix+w+4,iy-4); ctx.closePath(); ctx.clip();
      ctx.globalAlpha=0.92; ctx.drawImage(img,ix,iy,w,h); ctx.restore(); };
    paint(SIL.hood,-PW+18,false,S0,'s1'); paint(SIL.wolf,PW-18,true,S0+0.5,'s2');
    ctx.restore();
  }
  ctx.restore();
  // 最後は、すこし白くとんで、めくりへ
  const fade=ease((t-(T_END-0.6))/0.6);
  if(fade>0){ ctx.save(); ctx.globalAlpha=fade*0.35; ctx.fillStyle='#fff4dc'; ctx.fillRect(0,0,W,H); ctx.restore(); }
}
function paper(x,y,w,h,side){
  if(w<=0) return;
  const g=ctx.createLinearGradient(x,0,x+w,0);
  if(side>0){ g.addColorStop(0,'#d9ccae'); g.addColorStop(0.12,'#f2e8d2'); g.addColorStop(1,'#ece0c6'); }
  else { g.addColorStop(0,'#ece0c6'); g.addColorStop(0.88,'#f2e8d2'); g.addColorStop(1,'#d9ccae'); }
  ctx.fillStyle=g; ctx.fillRect(x,y,w,h);
  ctx.strokeStyle='rgba(150,120,80,0.35)'; ctx.lineWidth=1; ctx.strokeRect(x+10*Math.sign(side||1)*0+8,y+8,Math.max(0,w-16),h-16);
}
function roundRect(x,y,w,h,r){ ctx.beginPath(); ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r); ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath(); }
const spaced=s=>s.split('').join(' ');
const CH_EN=['','Little Red Riding Hood'];        // 章の名前の下に、英語の筆記体で添える
/* 書き順どおりに、一画ずつ書いていく。
   書き順のデータは KanjiVG（Ulrich Apel ほか, CC BY-SA 3.0, https://kanjivg.tagaini.net）。109×109 のます目の中の、一画ずつの線。
   その線を太い筆で少しずつなぞったところだけ、字（筆の書体）を見せる。データの無い字は、左上から右下へ、インクがしみるように */
const KVG={"第":["M32,11.12c0.08,1.12-0.04,2.14-0.38,3.21C30,19.39,23.93,30.01,17.12,35.5","M30.73,22.54c2.95,0,12.14-1.29,17.77-2.29C49.92,20,51.65,20,52.5,20","M35.5,25.12c2.4,1.47,6.21,6.05,6.81,8.34","M66,9.75c0.12,0.88,0.1,1.44-0.05,1.94c-1.07,3.78-5.83,11.68-10.21,16.06","M64.98,19.66C70.62,19.5,80,18,86.28,16.82c1.52-0.29,3.97-0.32,5.1,0.02","M76.02,22c0.06,0.54-0.02,1.06-0.25,1.55c-0.79,2.02-3.16,5.27-6.53,8.07","M27.12,41.42c2.6,0.92,5.35,0.61,8.01,0.23c14.43-2.07,28.84-4.11,43.22-5.94c1.89-0.24,3.85,1.67,3.05,3.47c-0.91,2.06-2.41,7.98-2.88,10.12","M26.5,54.75c1.62,0.25,3.27,0.23,5.73-0.03C44.75,53.38,73,50,75.39,49.75c1.9-0.2,3.83-0.25,5.36-0.25","M27.68,55.53c0.71,0.71,0.94,1.85,0.49,3.06C27.6,60.14,25.5,65.5,24.05,68c-1.06,1.83-0.8,3.47,1.82,3.01c2.5-0.44,56.35-7.49,63-8.38c4.63-0.62,5.76,2,4.79,4.87c-1.8,5.37-3.46,9.42-5.74,14.37c-3.17,6.88-6.67,0.88-8.67-1.55","M54.87,41.73c1.08,1.08,1.71,2.27,1.71,4.02c0,9.08-0.01,36.83-0.12,49.25c-0.03,2.81-0.06,4.82-0.1,5.64","M51.96,68.5c0.08,0.64-0.41,1.45-0.96,2.25c-3.75,5.5-13,17.5-28,25.75"],"一":["M11,54.25c3.19,0.62,6.25,0.75,9.73,0.5c20.64-1.5,50.39-5.12,68.58-5.24c3.6-0.02,5.77,0.24,7.57,0.49"],"章":["M51.75,9.25c1,0.75,1.5,1.75,1.5,3.5s0,1.5,0,6.25","M28,21.95c2.75,0.3,5.21,0.19,7.75-0.07c9.16-0.93,24.63-2.66,37.25-3.61c2.64-0.2,5.13-0.38,7.75,0.06","M38.5,25.38c3.09,3.71,4.77,7.68,5.05,10.12","M67.97,23c0.16,0.88,0.15,1.85-0.19,2.6c-1.15,2.53-3.64,6.64-4.77,8.15","M14.75,40.05c3.29,0.72,6.75,0.69,10.08,0.37c17.66-1.68,40.01-4.68,59.92-5.34c3.3-0.11,6.48-0.19,9.75,0.25","M30.54,47.49c1.08,0.76,1.96,2,2.31,3.43c1.15,4.61,2.38,10.7,3.49,16.44c0.23,1.21,0.46,2.41,0.69,3.57","M33.07,48.74c6.12-0.89,30.74-3.63,38.55-4.17c3.58-0.25,6.02,1.01,5.39,5.08c-0.21,1.36-1.41,7.01-3.16,13.05c-0.4,1.4-0.84,2.81-1.3,4.21","M35.85,58.04C45,57,64.38,55,74.48,54.19","M37.58,68.09c12.3-1.46,26.3-3.09,34.27-3.51","M20.13,81.17c3.25,0.58,7.99,0.64,11.76,0.24C45.12,80,66.75,77.75,81.67,77.1c4.1-0.18,7.46-0.35,10.09,0.38","M53.21,68.5c1.02,1.02,1.35,2,1.35,3.51c0,3.86-0.08,15.44-0.11,23.24c-0.01,2.53-0.02,4.66-0.02,6"],"赤":["M30.13,29.42c2.55,0.64,5.18,0.48,7.76,0.15c9.53-1.23,23.14-3.87,31.61-4.52c2.51-0.19,4.9-0.13,7.38,0.25","M52.24,12.45c1.53,1.53,2.01,3.55,2.01,5.05c0,3.33,0.04,25.2,0,26.25","M14.38,49.17c2.64,0.58,4.98,0.91,10.12,0.13c18.5-2.8,40.29-6,58.24-7.47c3.33-0.27,6.79-0.66,10.13-0.3","M42.78,49.89c0.97,1.23,1.22,3.09,1.2,4.53c-0.22,15.82,0.15,26.07-8.72,37.82","M61.02,46.83c1.39,1.39,2.01,2.92,2.01,5.02c0,13.52-0.06,30.44-0.06,35.4c0,12.25-3.71,5.75-6.71,2.75","M28.53,63.89c0.35,1.23,0.25,2.31-0.02,3.18c-1.63,5.43-4.42,9.93-9.26,15.93","M78.77,63.83c3.86,3.92,9.11,12.92,10.98,19.17"],"い":["M21.5,29.66c2.01,2.17,2.61,4.68,2.17,7.43c-3.09,19.16-1.03,32.01,7.93,41.45c6.12,6.45,6.26,3.14,7.04-5.21","M72.96,36.51c9.44,8.05,17.79,18.82,18.41,33.83"],"頭":["M15.13,22.97c1.2,0.24,3.41,0.36,4.61,0.24C26.5,22.5,34,21,41.54,20.47c2-0.14,3.21,0.11,4.21,0.23","M15.75,35.34c0.8,0.43,1.34,1.3,1.53,2.15c0.96,4.16,1.84,8.43,2.68,12.77c0.22,1.16,0.44,2.32,0.66,3.49","M18.3,36.44c8.95-1.56,20.18-3.2,25.07-3.7c2.02-0.2,3.38,0.81,2.94,3.03c-0.78,3.99-1.65,7.07-2.68,11.89","M20.85,51.31c5.59-0.43,12.99-1.87,20.63-2.75c1.24-0.14,2.49-0.27,3.73-0.38","M22.12,61.38c1.9,2.18,4.9,8.98,5.38,12.38","M42.24,55c0.45,1.22,0.5,1.99,0.27,2.95c-1.4,5.81-2.76,9.21-5.25,15.05","M14,84.87c1.75,0.88,3.25,1.13,5.46,0.07c8.18-3.91,18.88-9.38,26.79-13.94","M53.63,19.14c2.62,0.36,4.82,0.33,7.14,0.14c9.25-0.78,21.23-2.78,30.22-2.74c2.45,0.01,3.92,0.24,5.14,0.49","M72.75,20.5c0.05,0.71-0.03,1.4-0.26,2.08c-0.73,2.41-2.84,6.26-4.67,8.76","M58.52,32.73c0.88,0.88,1.45,2.02,1.45,3.36c0,1.06,0.05,23.69-0.04,33.66c-0.02,2.71-0.04,4.48-0.04,4.63","M60.75,34.24c6.9-0.73,24.04-2.64,26.06-2.8c2.09-0.17,3.57,1.86,3.57,3.12c0,3.19-0.07,21.33-0.06,36.18c0,1.53,0.09,2.44,0.09,3.45","M60.98,47.15c6.02-0.9,22.34-2.3,28.25-2.67","M61.21,59.31c10.67-1.06,20.19-1.73,27.74-2.2","M61.17,71.95c6.36-1,19.95-1.88,27.98-2.38","M66.97,78.69c0.03,1.06-0.49,2.27-1.25,3.14c-2.3,2.62-9.38,8.82-13.97,11.93","M83.5,80.75c5.09,3.8,11.11,10.68,12.5,14"],"巾":["M25.06,33.88c0.9,0.9,1.26,2.74,1.26,4c0,0.91,0,33.24,0,40.5","M27.25,36.97c4.75-0.31,51.04-5.04,54.59-5.24c4.16-0.23,5.26,1.76,4.91,5.74c-1,11.53-2.75,24.78-5.5,35.28c-1.89,7.21-6.25,1.5-8.25-1","M52.56,11.13c1.22,1.22,1.51,2.99,1.51,4.5c0,0.69,0,45.03,0,68.87c0,7.45,0,12.89,0,14.38"]};
const SPD_S=0.35, SPD_L=0.8;                     // 書く速さ（小さい「第一章」は速く）
const KVG_LEN={};
function strokeLens(ch){                          // 一画ずつの線の長さ（はじめに一度だけ、見えない SVG で測る）
  if(KVG_LEN[ch]) return KVG_LEN[ch]; const d=KVG[ch]; if(!d) return null;
  let lens; try{ const NS='http://www.w3.org/2000/svg', svg=document.createElementNS(NS,'svg'), pe=document.createElementNS(NS,'path');
    svg.setAttribute('style','position:absolute;width:0;height:0;visibility:hidden'); svg.appendChild(pe); document.body.appendChild(svg);
    lens=d.map(x=>{ pe.setAttribute('d',x); return pe.getTotalLength(); }); svg.remove(); }catch(e){ lens=d.map(()=>40); }
  return KVG_LEN[ch]=lens;
}
const LIFT=0.04, PER_UNIT=0.0018;                 // 一画ごとに筆を持ちあげる時間・線の長さ1あたりの時間（秒）
function charPlan(ch,spd){                        // 一字の書き順の時間わり：[{a:書きはじめ, b:書きおわり, len}]・合計の時間
  const lens=strokeLens(ch); if(!lens) return {st:null, dur:0.42*spd};
  let tt=0; const st=lens.map(len=>{ const a=tt+LIFT*spd, b=a+(0.03+len*PER_UNIT)*spd; tt=b; return {a,b,len}; });
  return {st, dur:tt+0.05*spd};
}
function lineDur(str,spd){ return [...str].reduce((s,ch)=>s+charPlan(ch,spd).dur,0); }
let PLAN=null;
function plan(){                                   // 書きはじめの時間：「第一章」→ 罫線 → 「赤い頭巾」→ 英語の筆記体 → すこし待って、めくる
  const chap=(GT.chapters||[])[card.ch]||{sub:'赤い頭巾'}, key=card.ch+':'+chap.sub;
  if(PLAN && PLAN.key===key) return PLAN;
  const w1=T_TEXT, w2=w1+lineDur('第一章',SPD_S)+0.15, w3=w2+0.3, w4=w3+lineDur(chap.sub,SPD_L)+0.2;
  return PLAN={key, w1, w2, w3, w4, end:Math.max(9.2, w4+1.0+1.8)};
}
const maskCv=document.createElement('canvas'), mctx=maskCv.getContext('2d');
function writeBrush(str,size,color,y,t0,spd,onStart){
  const chs=[...str]; ctx.font=`400 ${size}px 'Yuji Syuku','Zen Old Mincho',serif`;
  const gap=size*0.08, ws=chs.map(ch=>ctx.measureText(ch).width), total=ws.reduce((a,b)=>a+b,0)+gap*(chs.length-1);
  const t=(performance.now()-card.t0)/1000; let x=-total/2, c0=t0;
  chs.forEach((ch,n)=>{ const w=ws[n], cp=charPlan(ch,spd), lt=t-c0; c0+=cp.dur;
    if(lt>0){ if(onStart) onStart(n,cp.dur);
      const S=Math.ceil(size*1.4); if(maskCv.width!==S){ maskCv.width=S; maskCv.height=S; }
      mctx.clearRect(0,0,S,S);
      const ox=(S-w)/2, oy=(S-size)/2;
      if(lt>=cp.dur){ mctx.fillStyle='#000'; mctx.fillRect(0,0,S,S); }
      else if(cp.st){                              // 書き順どおりに、一画ずつ（いま書いている画は、とちゅうまで）
        mctx.save(); mctx.translate(ox+(w-size)/2,oy); mctx.scale(size/109,size/109);
        mctx.lineCap='round'; mctx.lineJoin='round'; mctx.lineWidth=15; mctx.strokeStyle='#000';
        cp.st.forEach((sk,si)=>{ if(lt<=sk.a) return; const q=Math.min(1,(lt-sk.a)/(sk.b-sk.a));
          mctx.setLineDash(q>=1?[]:[sk.len*q, sk.len+20]); mctx.stroke(new Path2D(KVG[ch][si])); });
        mctx.restore();
      } else {                                     // 書き順のデータが無い字
        const p=lt/cp.dur, soft=0.35, e=-soft+p*(1+soft), gr=mctx.createLinearGradient(ox,oy,ox+w,oy+size);
        gr.addColorStop(0,'#000'); gr.addColorStop(Math.max(0,Math.min(1,e)),'#000'); gr.addColorStop(Math.max(0,Math.min(1,e+soft)),'rgba(0,0,0,0)'); gr.addColorStop(1,'rgba(0,0,0,0)');
        mctx.fillStyle=gr; mctx.fillRect(0,0,S,S);
      }
      mctx.globalCompositeOperation='source-in'; mctx.fillStyle=color; mctx.font=ctx.font; mctx.textBaseline='middle'; mctx.textAlign='left';
      mctx.fillText(ch,ox,S/2); mctx.globalCompositeOperation='source-over';
      ctx.drawImage(maskCv,x-ox,y-S/2);
    }
    x+=w+gap; });
}
/* 英語の筆記体：つづけ字なので、左から右へ、ペン先が進むように */
function writeCursive(str,size,color,y,t0,dur,onStart){
  if(!str) return; const t=(performance.now()-card.t0)/1000, p=ease((t-t0)/dur); if(p<=0) return; if(onStart) onStart();
  ctx.save(); ctx.font=`400 ${size}px 'Great Vibes',cursive`; ctx.textAlign='left'; ctx.textBaseline='middle';
  const w=ctx.measureText(str).width, x=-w/2;
  ctx.beginPath(); ctx.rect(x-6,y-size,(w+12)*p,size*2); ctx.clip();
  ctx.fillStyle=color; ctx.fillText(str,x,y); ctx.restore();
}
GT.registerDraw(drawCard,'speech');
})();
