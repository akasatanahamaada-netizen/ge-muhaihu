/* ============================================================================
   Gravity Tale ── 本の紙  (js/paper.js)
   ----------------------------------------------------------------------------
   見開きの紙を、はじめに一度だけ描いておく（毎フレーム js/engine/ の render() が重ねる）。
     GT.paperArt.paper     … いちばん下に敷く紙（色・ざらざら・まわりの暗がり）
     GT.paperArt.agedPaper … 地形やキャラの上から「かけ合わせ」でかぶせる、古い紙の色むら・しみ
     GT.paperArt.wornEdges … 見開きのふちの、よれ・黄ばみ・角のめくれ
   読み込む順番：js/engine/ のすぐあと。
   ========================================================================== */
(function(){
"use strict";
const W=GT.W, H=GT.H;

/* ---- 紙のテクスチャ ------------------------------------------------------ */
const paper=document.createElement('canvas'); paper.width=W; paper.height=H;
(function(){
  const p=paper.getContext('2d');
  const grad=p.createLinearGradient(0,0,0,H); grad.addColorStop(0,'#efe4c8'); grad.addColorStop(1,'#e2d3ab');
  p.fillStyle=grad; p.fillRect(0,0,W,H);
  for(let i=0;i<2200;i++){ const x=Math.random()*W,y=Math.random()*H,a=Math.random()*0.05;
    p.fillStyle=Math.random()>0.5?`rgba(120,100,60,${a})`:`rgba(255,250,230,${a})`; p.fillRect(x,y,1.4,1.4); }
  const vg=p.createRadialGradient(W/2,H/2,H*0.25,W/2,H/2,H*0.9);
  vg.addColorStop(0,'rgba(0,0,0,0)'); vg.addColorStop(1,'rgba(58,50,38,0.25)');
  p.fillStyle=vg; p.fillRect(0,0,W,H);
})();

/* ---- 古い絵本の紙（地形やキャラの上から「かけ合わせ」でかぶせる） --------
   セピアの色むら・紙の繊維・茶色いしみ（古い本の斑点）・ページのふちの焼け。
   会話の枠やミッション表示などは、この上に描くので読みにくくならない。 */
const agedPaper=document.createElement('canvas'); agedPaper.width=W; agedPaper.height=H;
(function(){
  const p=agedPaper.getContext('2d');
  const R=(()=>{ let s=20240917; return ()=>((s=(s*16807)%2147483647)/2147483647); })();   // いつも同じ模様になる乱数
  p.fillStyle='rgb(254,252,247)'; p.fillRect(0,0,W,H);                                       // 全体の色（白に近いほど黄ばまない）
  for(let i=0;i<26;i++){ const x=R()*W, y=R()*H, r=60+R()*160;                               // 大きな色むら
    const g=p.createRadialGradient(x,y,0,x,y,r); g.addColorStop(0,`rgba(232,220,200,${0.08+R()*0.1})`); g.addColorStop(1,'rgba(232,220,200,0)');
    p.fillStyle=g; p.fillRect(x-r,y-r,r*2,r*2); }
  for(let i=0;i<900;i++){ const x=R()*W, y=R()*H, l=2+R()*6, a=R()*Math.PI;                  // 紙の繊維
    p.strokeStyle=`rgba(120,100,80,${0.04+R()*0.06})`; p.lineWidth=0.6;
    p.beginPath(); p.moveTo(x,y); p.lineTo(x+Math.cos(a)*l,y+Math.sin(a)*l); p.stroke(); }
  for(let i=0;i<34;i++){ const x=R()*W, y=R()*H, r=1.5+R()*(i<6?14:5);                        // しみ（斑点）
    const g=p.createRadialGradient(x,y,0,x,y,r); g.addColorStop(0,`rgba(180,145,105,${0.12+R()*0.14})`); g.addColorStop(0.7,`rgba(200,170,130,${0.05+R()*0.06})`); g.addColorStop(1,'rgba(200,170,130,0)');
    p.fillStyle=g; p.beginPath(); p.arc(x,y,r,0,Math.PI*2); p.fill(); }
  const vg=p.createRadialGradient(W/2,H/2,H*0.35,W/2,H/2,W*0.62);                             // ふちの焼け
  vg.addColorStop(0,'rgba(200,180,150,0)'); vg.addColorStop(1,'rgba(190,165,130,0.3)');
  p.fillStyle=vg; p.fillRect(0,0,W,H);
  for(const x of [0,W]){ const g=p.createLinearGradient(x,0,x===0?40:W-40,0);                   // 小口の汚れ
    g.addColorStop(0,'rgba(170,145,110,0.22)'); g.addColorStop(1,'rgba(170,145,110,0)'); p.fillStyle=g; p.fillRect(x===0?0:W-40,0,40,H); }
})();

/* ---- 見開きのふちの劣化：上下左右のふちが黄ばみ、波うつように よれる。小さなしわと、角のめくれ ----
   一度だけ作って、毎フレーム重ねる（全部のステージ共通）。 */
const wornEdges=document.createElement('canvas'); wornEdges.width=W; wornEdges.height=H;
(function(){
  const c=wornEdges.getContext('2d');
  const R=(()=>{ let s=4471; return ()=>((s=(s*16807)%2147483647)/2147483647); })();
  const OUT='#3a2e22';                                     // 欠けたふちの外（本の枠の色）
  // 黄ばみ（ふちほど濃い）
  for(const e of ['left','right','top','bottom']){
    const d=e==='left'||e==='right'?70:56;
    const g= e==='left'?c.createLinearGradient(0,0,d,0) : e==='right'?c.createLinearGradient(W,0,W-d,0)
           : e==='top'?c.createLinearGradient(0,0,0,d) : c.createLinearGradient(0,H,0,H-d);
    g.addColorStop(0,'rgba(170,128,70,0.30)'); g.addColorStop(0.45,'rgba(170,128,70,0.10)'); g.addColorStop(1,'rgba(170,128,70,0)');
    c.fillStyle=g; c.fillRect(0,0,W,H);
  }
  // よれたふち（波うつ線で、外側が少し欠ける）
  const edge=(horiz,base,sign,len,seed)=>{
    const n=Math.round(len/12), pts=[];
    for(let i=0;i<=n;i++){ const t=i/n; pts.push([t,(Math.sin(t*23+seed)*0.5+0.5)*2.6+Math.sin(t*61+seed*3)*0.9+R()*1.6]); }
    const P=(t,d)=>horiz?[len*t,base+sign*d]:[base+sign*d,len*t];
    c.beginPath(); let q=P(0,0); c.moveTo(q[0],q[1]);
    for(const [t,d] of pts){ q=P(t,d); c.lineTo(q[0],q[1]); }
    q=P(1,0); c.lineTo(q[0],q[1]); c.closePath(); c.fillStyle=OUT; c.fill();
    c.beginPath(); pts.forEach(([t,d],i)=>{ const r=P(t,d+0.7); i?c.lineTo(r[0],r[1]):c.moveTo(r[0],r[1]); });
    c.strokeStyle='rgba(120,88,50,0.5)'; c.lineWidth=1.1; c.stroke();
    for(let i=0;i<Math.round(len/45);i++){ const t=0.03+R()*0.94, l=5+R()*12, a=P(t,2), b=P(t+(R()-0.5)*0.015,2+l);   // しわ
      c.beginPath(); c.moveTo(a[0],a[1]); c.lineTo(b[0],b[1]); c.strokeStyle='rgba(120,88,50,0.2)'; c.lineWidth=0.8; c.stroke(); }
  };
  edge(true,0,1,W,1); edge(true,H,-1,W,2); edge(false,0,1,H,3); edge(false,W,-1,H,4);
  // 角のめくれ（4つのうち3つ）
  for(const [cx,cy,dx,dy,on] of [[0,0,1,1,1],[W,0,-1,1,1],[0,H,1,-1,1],[W,H,-1,-1,0]]){ if(!on) continue;
    const r=14+R()*8;
    c.beginPath(); c.moveTo(cx+dx*r,cy); c.lineTo(cx,cy+dy*r); c.lineTo(cx,cy); c.closePath(); c.fillStyle=OUT; c.fill();
    c.beginPath(); c.moveTo(cx+dx*r,cy); c.lineTo(cx,cy+dy*r); c.lineTo(cx+dx*r*0.72,cy+dy*r*0.72); c.closePath();
    const g=c.createLinearGradient(cx+dx*r*0.5,cy+dy*r*0.5,cx+dx*r*0.75,cy+dy*r*0.75);
    g.addColorStop(0,'#efe3c2'); g.addColorStop(1,'#d3c194'); c.fillStyle=g; c.fill();
    c.strokeStyle='rgba(120,88,50,0.55)'; c.lineWidth=0.9; c.stroke(); }
})();

GT.paperArt={ paper, agedPaper, wornEdges };
})();
