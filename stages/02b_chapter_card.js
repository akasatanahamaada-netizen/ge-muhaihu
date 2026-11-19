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
/* 書き順どおりに、一画ずつ書いていく（js/inkwrite.js の GT.ink） */
const SPD_S=0.35, SPD_L=0.8;                     // 書く速さ（小さい「第一章」は速く）
let PLAN=null;
function plan(){                                   // 書きはじめの時間：「第一章」→ 罫線 → 「赤い頭巾」→ 英語の筆記体 → すこし待って、めくる
  const chap=(GT.chapters||[])[card.ch]||{sub:'赤い頭巾'}, key=card.ch+':'+chap.sub;
  if(PLAN && PLAN.key===key) return PLAN;
  const w1=T_TEXT, w2=w1+GT.ink.lineDur('第一章',SPD_S)+0.15, w3=w2+0.3, w4=w3+GT.ink.lineDur(chap.sub,SPD_L)+0.2;
  return PLAN={key, w1, w2, w3, w4, end:Math.max(9.2, w4+1.0+1.8)};
}
function writeBrush(str,size,color,y,t0,spd,onStart){
  const chs=[...str], font=`400 ${size}px 'Yuji Syuku','Zen Old Mincho',serif`; ctx.font=font;
  const gap=size*0.08, ws=chs.map(ch=>ctx.measureText(ch).width), total=ws.reduce((a,b)=>a+b,0)+gap*(chs.length-1);
  const t=(performance.now()-card.t0)/1000; let x=-total/2, c0=t0;
  chs.forEach((ch,n)=>{ const cp=GT.ink.charPlan(ch,spd), lt=t-c0; c0+=cp.dur;
    if(lt>0 && onStart) onStart(n,cp.dur);
    GT.ink.drawChar(ctx,ch,x,y,size,font,color,ws[n],lt,cp);
    x+=ws[n]+gap; });
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
