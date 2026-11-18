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

const card={ t0:0, flipped:false, sfx:false, ch:1 };
const isCard=()=>GT.scene&&GT.scene.id==='chapter1';
const T_OPEN0=0.9, T_OPEN1=2.1, T_TEXT=2.3, T_END=6.0;

GT.registerDynamic('chapterCard', scene=>{
  GT.loadStageDef(GT.STAGE_DEFS['chapter1_card']); GT.mode='idle';
  GT.player.x=-600; GT.player.y=H-GT.EDGE-GT.player.h;           // 少年は見せない
  card.t0=performance.now(); card.flipped=false; card.sfx=false; card.ch=scene.chapter||1;
  GT.setHudStage&&GT.setHudStage(scene.label||'');
  const rb=document.getElementById('resetBtn'); if(rb) rb.style.visibility='hidden';   // とびらのあいだは「Reset」を隠す
});
GT.registerSceneReset(()=>{ if(isCard()) return; const rb=document.getElementById('resetBtn'); if(rb) rb.style.visibility=''; });

const ease=x=>x<0?0:x>1?1:x*x*(3-2*x);
function drawCard(){
  if(!isCard() || !card.t0) return;
  const t=(performance.now()-card.t0)/1000;
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
  // 本の土台（ひらくほど、左がわが広がる）
  const leftW=PW*o;
  ctx.fillStyle='#2a170f'; roundRect(-leftW-8,-PH/2-8,leftW+PW+16,PH+16,6); ctx.fill();   // 革の表紙（うら）
  ctx.strokeStyle='rgba(201,164,90,0.7)'; ctx.lineWidth=1.4; roundRect(-leftW-4,-PH/2-4,leftW+PW+8,PH+8,4); ctx.stroke();
  // 右のページ（紙）
  paper(0,-PH/2,PW,PH,1);
  // 左のページ（ひらいたぶんだけ）
  if(o>0.5) paper(-PW*((o-0.5)*2),-PH/2,PW*((o-0.5)*2),PH,-1);
  // めくれていく表紙：前半は右がわで細くなり、後半は左がわのページになる
  if(o<1){ const c=Math.cos(Math.PI*o);
    if(c>0){ const w=PW*c; ctx.fillStyle='#3a2116'; roundRect(0,-PH/2-6,w+6,PH+12,5); ctx.fill();
      ctx.strokeStyle='rgba(201,164,90,0.85)'; ctx.lineWidth=1.2; roundRect(6,-PH/2+4,Math.max(0,w-8),PH-8,3); ctx.stroke();
      if(w>60){ ctx.fillStyle='rgba(201,164,90,0.85)'; ctx.font="600 13px 'Cormorant Garamond',serif"; ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.save(); ctx.translate(w/2+3,0); ctx.scale(c,1); ctx.fillText('GRAVITY TALES',0,0); ctx.restore(); } } }
  // のどの影
  if(o>0.5){ g=ctx.createLinearGradient(-14,0,14,0); g.addColorStop(0,'rgba(60,40,20,0)'); g.addColorStop(0.5,'rgba(60,40,20,0.35)'); g.addColorStop(1,'rgba(60,40,20,0)');
    ctx.fillStyle=g; ctx.fillRect(-14,-PH/2,28,PH); }
  // 文字：インクがにじむように、ゆっくり出る
  const k1=ease((t-T_TEXT)/0.9), k2=ease((t-T_TEXT-0.6)/1.2);
  ctx.textAlign='center'; ctx.textBaseline='middle';
  if(k1>0){ ctx.globalAlpha=k1; ctx.fillStyle='#5a3a22'; ctx.font="700 24px 'Zen Old Mincho',serif";
    ctx.fillText(spaced(chap.name),0,-80);
    ctx.strokeStyle='rgba(120,80,40,0.55)'; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(-90*k1,-54); ctx.lineTo(90*k1,-54); ctx.stroke(); }
  if(k2>0){ ctx.globalAlpha=k2; ctx.save(); ctx.filter=`blur(${((1-k2)*3).toFixed(2)}px)`;
    ctx.fillStyle='#2a160c'; ctx.font="900 62px 'Zen Old Mincho',serif"; ctx.fillText('「'+chap.sub+'」',0,10);
    ctx.restore();
    ctx.fillStyle='#8a1c24'; ctx.globalAlpha=k2*0.9; ctx.beginPath(); ctx.arc(0,82,4.5,0,Math.PI*2); ctx.fill();   // 小さな赤い点（赤い頭巾）
    ctx.strokeStyle='rgba(120,80,40,0.45)'; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(-64,82); ctx.lineTo(-14,82); ctx.moveTo(14,82); ctx.lineTo(64,82); ctx.stroke(); }
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
GT.registerDraw(drawCard,'speech');
})();
