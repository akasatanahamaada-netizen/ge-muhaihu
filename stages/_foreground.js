/* ============================================================================
   手前の木（明るい場面）：画面のはしに、いちばん手前の大きな木を立てる（参考画像④）
   ----------------------------------------------------------------------------
   ・少年より手前にあるので、根もとは床より下（ページの下のふち）まで来る。上は画面の外まで
   ・手前なので少し暗く、大きい。影は、うしろの背景の右上に、遠く大きく落ちる（js/engine.js の「手前の層」）
   ・場面ごとに、左か右か・位置を決める（FG）。遊ぶじゃまにならないよう、はしだけ
   ========================================================================== */
(function(){
const W=GT.W, H=GT.H;
const FG={   // シーンの id → 手前の木 {x：幹のまん中, w：幹の太さ, lean：上ほど どちらへ曲がるか}
  house_peek:{x:28,  w:46, lean:10},
  path1:     {x:874, w:40, lean:-10},
  meet_hood: {x:26,  w:44, lean:12},
  cliff:     {x:870, w:38, lean:-8},
  wolf_talk: {x:24,  w:48, lean:10},
  crossroads:{x:872, w:44, lean:-12},
  flowers:   {x:26,  w:42, lean:10},
  path3:     {x:872, w:40, lean:-10},
  path4:     {x:26,  w:42, lean:8},
  house_front:{x:24, w:46, lean:10},
};
const cache={};
let sd=1; const R=()=>{ sd=(sd*16807)%2147483647; return sd/2147483647; };
function build(t){
  const cv=document.createElement('canvas'); cv.width=W; cv.height=H; const c=cv.getContext('2d');
  sd=Math.round(t.x*7+t.w); const L=t.lean, x=t.x, w=t.w;
  // 幹：床より下（ページの下のふち）から、画面の上の外まで。少しうねる
  const tg=c.createLinearGradient(x-w/2,0,x+w/2,0); tg.addColorStop(0,'#3e2c1e'); tg.addColorStop(0.45,'#5a4130'); tg.addColorStop(1,'#33241a');
  c.fillStyle=tg; c.beginPath(); c.moveTo(x-w*0.62,H+10);
  c.bezierCurveTo(x-w*0.5+L*0.2,H*0.7,x-w*0.45-L*0.3,H*0.35,x-w*0.4+L,-20);
  c.lineTo(x+w*0.4+L,-20); c.bezierCurveTo(x+w*0.45-L*0.3,H*0.35,x+w*0.5+L*0.2,H*0.7,x+w*0.62,H+10); c.closePath(); c.fill();
  c.strokeStyle='rgba(20,12,6,0.35)'; c.lineWidth=1.4;                               // 樹皮のすじ
  for(let i=0;i<5;i++){ const bx=x-w*0.3+i*w*0.15; c.beginPath(); c.moveTo(bx,H); c.bezierCurveTo(bx+(R()-0.5)*8,H*0.6,bx+(R()-0.5)*8,H*0.3,bx+L*0.8,0); c.stroke(); }
  // 根もと：床より下に広がる根と、手前の草むら
  c.fillStyle='#3a2a1c';
  for(const s of [-1,1]){ c.beginPath(); c.moveTo(x+s*w*0.3,H-30); c.quadraticCurveTo(x+s*w*1.1,H-14,x+s*w*1.7,H+6); c.lineTo(x+s*w*0.4,H+6); c.closePath(); c.fill(); }
  for(let i=0;i<16;i++){ const gx=x-w*1.4+R()*w*2.8, gh=10+R()*18; c.fillStyle=i%2?'#4e5e2e':'#5f7036';
    c.beginPath(); c.moveTo(gx-4,H+2); c.quadraticCurveTo(gx+(R()-0.5)*6,H-gh*0.6,gx+(R()-0.5)*10,H-gh); c.quadraticCurveTo(gx+3,H-gh*0.5,gx+4,H+2); c.closePath(); c.fill(); }
  // 葉：上のはしに、大きく暗い葉のかたまり（画面の外へはみ出す）
  const cx=x+L*1.4, dir=x<W/2?1:-1;
  for(let k=0;k<3;k++){ const col=['#2f4020','#3a4f27','#465e2e'][k];                 // 手前なので、暗い緑
    for(let i=0;i<10;i++){ const bx=cx+dir*(R()*130-30)-dir*k*8, by=-20+R()*60+k*12, r=26+R()*24;
      c.fillStyle=col; c.beginPath(); c.arc(bx,by,r,0,Math.PI*2); c.fill(); }
    c.fillStyle='rgba(255,240,200,0.08)';                                           // 葉の上がわに、少しだけ光
    for(let i=0;i<5;i++){ const bx=cx+dir*(R()*110-20), by=R()*40; c.beginPath(); c.arc(bx,by,10+R()*10,0,Math.PI*2); c.fill(); } }
  return cv;
}
GT.registerDraw(()=>{
  const sc=GT.scene; if(!sc || !(GT.isBright&&GT.isBright())) return;
  const t=FG[sc.id]; if(!t) return;
  GT.ctx.drawImage(cache[sc.id]||(cache[sc.id]=build(t)),0,0);
}, 'overlay');
})();
