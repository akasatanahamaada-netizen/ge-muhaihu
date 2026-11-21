/* ============================================================================
   Gravity Tale ── エンジン：会話
   ----------------------------------------------------------------------------
   会話の枠・文字送り・スキップ・選択肢・名前の入力・立ち絵・画面の案内（GT.beginDialogue など）。
   エンジンのファイルは js/engine/ にあり、index.html で core.js → … → boot.js の順に読む。
   どのファイルも、いちばん外側の const / let / function を共有している（ふつうの <script> なので）。
   ========================================================================== */
"use strict";
/* ========================================================================== */
/*  会話エンジン                                                              */
/* ========================================================================== */
const dlg=document.getElementById('dlg');
const dlgSpeaker=document.getElementById('dlgSpeaker');
const dlgLine=document.getElementById('dlgLine');
const dlgChoices=document.getElementById('dlgChoices');
const dlgHint=document.getElementById('dlgHint');
let dq=[], dChoices=null, dOnComplete=null;
let typing=false, typeTarget='', typeI=0, typeAcc=0;
let choicesShown=false;

function beginDialogue(lines,choices,onComplete){
  dq=(lines||[]).slice(); dChoices=choices||null; dOnComplete=onComplete||null;
  choicesShown=false;
  dlg.classList.add('show'); dlgChoices.innerHTML=''; nextLine();
}
function nextLine(){
  dlgChoices.innerHTML='';
  if(dq.length===0){
    if(dChoices){ showChoices(dChoices); return; } dlgHint.style.display='none'; finishDialogue(); return;
  }
  const line=dq.shift();
  for(const h of lineHooks) h(line);
  if(line.act && actHooks[line.act]) actHooks[line.act]();
  if(holdFn){ startHold(line); return; }      // 人物が動いているあいだは、会話の枠を消して待つ
  showLine(line);
}
/* 動いているところを見せる：act の中で GT.holdDialogue(終わったか) を呼ぶと、
   その動き（赤ずきんが駆けだす・狼が去る など）が終わるまで、会話の枠と立ち絵を消して待ち、終わってからその行の文を出す。
   待っているあいだは、タップしても進まない（いつまでも終わらないときのために、最長 HOLD_MAX 秒で先へ進む） */
const HOLD_MAX=6;
let holdFn=null, holdWait=null;
GT.holdDialogue=fn=>{ holdFn=fn; };
function startHold(line){
  const f=holdFn, t0=performance.now(); holdFn=null;
  dlg.classList.add('hold'); showPortrait(null); dlgLine.textContent=''; dlgSpeaker.textContent='';
  holdWait=()=>{ if(f() || performance.now()-t0>HOLD_MAX*1000){ holdWait=null; dlg.classList.remove('hold'); showLine(line); } };
}
function endHold(){ if(holdWait){ holdWait=null; dlg.classList.remove('hold'); } }
/* 主人公の名前（序で入力する。GT.flags.playerName にしまうので、セーブにも入る）。
   セリフの t に {name} と書くと、その名前に置きかわる。主人公のセリフ（c:'boy'）の名前の欄にも出る */
GT.playerName=()=>(GT.flags && GT.flags.playerName) || '少年';
/* 名前を名乗るまでは「？？？」と出す人（マリ）。flags.mariNamed が false のあいだ（序章で「わたしは、マリ」と名乗るまで）。
   古いセーブで mariNamed が無いときは、名乗ったあととみなす */
GT.speakerName=(c,name)=> (c==='mari' && GT.flags && GT.flags.mariNamed===false) ? '？？？' : name;
const withName=t=>String(t||'').replace(/\{name\}/g, GT.playerName());
function showLine(line){
  // sc … 名前の色だけ別の人にする（正体をかくすとき）
  dlgSpeaker.className='speaker '+(line.sc||line.c||''); dlgSpeaker.textContent = line.c==='boy' ? GT.playerName() : GT.speakerName(line.c, line.s||'');
  showPortrait(line.c, line);
  dlgLine.classList.toggle('big', !!line.big);   // セリフに big:true と書くと、太く大きな文字（叫ぶところなど）
  typing=true; typeTarget=withName(line.t); typeI=0; typeAcc=0; dlgLine.textContent=''; dlgHint.style.display='block';
  if(line.ask==='name') showNameAsk();
}
/* 名前を入力する（セリフに ask:'name' と書くと、その行で入力欄を出して、決めるまで先へ進まない） */
function showNameAsk(){
  choicesShown=true; dlgHint.style.display='none'; dlgChoices.innerHTML='';
  const box=document.createElement('div'); box.className='name-ask';
  box.innerHTML='<input type="text" maxlength="8" placeholder="なまえ（8文字まで）" aria-label="主人公の名前"><button class="choice ui-en" type="button">OK</button>';
  const input=box.querySelector('input'), ok=box.querySelector('button');
  input.value=(GT.flags && GT.flags.playerName) || '';
  const decide=()=>{
    const v=input.value.trim().slice(0,8);
    if(!v){ input.focus(); input.classList.add('shake'); setTimeout(()=>input.classList.remove('shake'),400); return; }
    GT.flags.playerName=v; choicesShown=false; nextLine();   // （名前を決めたときは、音を鳴らさない）
  };
  // 名前を打っているあいだは、ゲームのキー操作（R でやり直す・S でスキップなど）に渡さない
  input.addEventListener('keydown',e=>{ e.stopPropagation(); if(e.key==='Enter' && !e.isComposing && e.keyCode!==229){ e.preventDefault(); decide(); } });
  input.addEventListener('keyup',e=>e.stopPropagation());
  ok.addEventListener('click',decide);
  dlgChoices.appendChild(box);
  setTimeout(()=>input.focus({preventScroll:true}),50);
}
/* 選択肢：when:()=>true/false を書くと、そのときだけ選べる。
   選べないときは、lockedLabel を書いていれば「選べない選択肢」として うすく出す（書いていなければ出さない） */
function showChoices(choices){
  choicesShown=true; showPortrait(null);
  dlgSpeaker.textContent=''; dlgLine.textContent=''; dlgHint.style.display='none'; dlgChoices.innerHTML='';
  choices.forEach(ch=>{
    const open=!ch.when || ch.when();
    if(!open){ if(!ch.lockedLabel) return;
      const b=document.createElement('button'); b.className='choice locked'; b.disabled=true;
      b.textContent=typeof ch.lockedLabel==='function'?ch.lockedLabel():ch.lockedLabel; dlgChoices.appendChild(b); return; }
    const b=document.createElement('button'); b.className='choice'; b.textContent=ch.label;
    b.addEventListener('click',()=>{ if(ch.set) ch.set(); dChoices=null; choicesShown=false;
      const resolvedAfter = typeof ch.after==='function' ? ch.after() : ch.after;
      dq = resolvedAfter ? resolvedAfter.slice() : []; if(dq.length){ nextLine(); } else { finishDialogue(); } });
    dlgChoices.appendChild(b);
  });
}
function finishDialogue(){ showPortrait(null); const cb=dOnComplete; dOnComplete=null; if(cb) cb(); }   // 会話が終わったら、立ち絵はかならず消す（飛ばしたときに残らないように）
function hideDialogue(){ dlg.classList.remove('show'); }
function tryAdvanceDialogue(){
  if(!dlg.classList.contains('show')) return false;
  if(holdWait) return true;                     // 動きを見せているあいだは進まない
  if(choicesShown) return false;
  if(typing){ dlgLine.textContent=typeTarget; typing=false; return true; }
  nextLine(); return true;
}
/* ストーリースキップ：残りの行を一気に飛ばす（選択肢があればそこで止まる）。
   飛ばした行の act（窓のぞきの開閉など）も順番どおりに実行するので、ステージの状態はずれない。 */
function skipDialogue(){
  if(!dlg.classList.contains('show') || choicesShown) return;
  typing=false; endHold(); holdFn=null;
  while(dq.length){
    const line=dq.shift();
    for(const h of lineHooks) h(line);
    if(line.act && actHooks[line.act]) actHooks[line.act]();
    holdFn=null;                                // 飛ばすときは、動きを待たない
    if(line.ask){ showLine(line); typing=false; dlgLine.textContent=typeTarget; return; }   // 名前の入力では止まる
  }
  if(dChoices){ showChoices(dChoices); return; }
  dlgHint.style.display='none'; finishDialogue();
}
GT.skipDialogue=skipDialogue;
// 会話の枠の右上に「スキップ」ボタンを置く（index.html は触らずに、ここで作る）
const skipBtn=document.createElement('button');
skipBtn.textContent='Skip ≫';
skipBtn.title='会話を飛ばす（S キー）';
Object.assign(skipBtn.style,{ position:'absolute', top:'1.1cqw', right:'1.33cqw', padding:'0.33em 1em',
  background:'rgba(120,40,70,0.25)', border:'1px solid rgba(201,160,112,0.55)', borderRadius:'14px',
  color:'#e8dcc0', fontFamily:"'Caveat',cursive", fontSize:'clamp(15px,1.85cqw,44px)', lineHeight:'1', letterSpacing:'0.02em', cursor:'pointer' });   // ボタンの文字は英語の筆記体
skipBtn.addEventListener('pointerdown',e=>{ e.preventDefault(); e.stopPropagation(); skipDialogue(); });
dlg.appendChild(skipBtn);
// 選択肢を出しているあいだは、スキップボタンを隠す
new MutationObserver(()=>{ skipBtn.style.display = choicesShown ? 'none' : ''; })
  .observe(dlgChoices,{childList:true});

/* 立ち絵：しゃべっているキャラの絵を、会話の枠の右うしろに出す。
   どのキャラ（セリフの c）にどの画像を使うかは playlist.js の GT.portraits で決める。
   GT.portraits に無いキャラのときは出さない。関数にすると、そのセリフ（{s,c,t}）を受けとって絵を選べる。 */
GT.portraits = GT.portraits || {};
const portrait=document.createElement('img');
portrait.alt='';
Object.assign(portrait.style,{ position:'absolute', right:'2%', bottom:'0', height:'92%', maxWidth:'45%',
  objectFit:'contain', objectPosition:'bottom right', pointerEvents:'none', opacity:'0',
  transition:'opacity .18s ease', filter:'drop-shadow(0 4px 10px rgba(0,0,0,0.35))' });
dlg.parentNode.insertBefore(portrait, dlg);   // 会話の枠より奥（枠が手前に重なる）
let portraitKey=null, portraitToken=0;
/* 立ち絵の読みこみ：GT.preloadPortraits([...]) で、ゲームの起動時に全部読みこんでおく（playlist.js の GT.portraitFiles）。
   img の src を差しかえると、ブラウザは新しい絵の用意ができるまで前の絵を出したままにする。
   そのままだと、別の人に切りかわる一瞬だけ、前の人の絵が見えてしまう。
   なので、絵が変わるときは いったん消して、新しい絵の用意（decode）ができてから出す */
const portraitCache={};
function portraitImage(src){ let im=portraitCache[src];
  if(!im){ im=new Image(); im.src=encodeURI(src); portraitCache[src]=im; if(im.decode) im.decode().catch(()=>{}); }
  return im; }
GT.preloadPortraits=list=>{ for(const s of list||[]) portraitImage(s); };
function showPortrait(c, line){
  let src = c ? GT.portraits[c] : null;
  if(typeof src==='function') src=src(line||{});  // 向きやセリフの中身で絵を変えるとき（playlist.js の mari・narr など）
  if(!src || !dlg.classList.contains('show')){ portrait.style.transition='none'; portrait.style.opacity='0'; portraitKey=null; portraitToken++; return; }   // すぐに消す（うすく残らないように）
  // 右向きに描かれた絵は、左右反転して左向きにする（GT.portraitMirror に入っている絵。playlist.js）
  const flip = (GT.portraitMirror||[]).includes(src) ? 'scaleX(-1)' : '';
  if(portraitKey===src){ portrait.style.transform=flip; portrait.style.opacity='1'; return; }
  portraitKey=src; const tok=++portraitToken;
  portrait.style.transition='none'; portrait.style.opacity='0';          // 前の絵は、すぐに消す
  portraitImage(src);
  portrait.src=encodeURI(src); portrait.style.transform=flip;
  const show=()=>{ if(tok!==portraitToken) return;                        // そのあいだに別の絵になっていたら出さない
    portrait.style.transition='opacity .18s ease'; portrait.style.opacity='1'; };
  (portrait.decode ? portrait.decode() : Promise.resolve()).then(show,show);
}
// 会話の枠が閉じたら、立ち絵も消す
new MutationObserver(()=>{ if(!dlg.classList.contains('show')) showPortrait(null); })
  .observe(dlg,{attributes:true, attributeFilter:['class']});
GT.showPortrait=showPortrait;

/* やり直す：いまのステージを最初からやり直す（詰んだとき用。R キーでも）。
   ステージの地形・箱・敵・重力・会話は、ステージに入ったときの状態にもどる。 */
function restartStage(){
  if(flipping || !GT.scene) return;
  hideDialogue(); document.getElementById('qte').classList.remove('show');
  for(const k in keys) keys[k]=false;
  startScene(GT.sceneIndex);
}
GT.restartStage=restartStage;
const resetBtn=document.createElement('button');
resetBtn.textContent='↺ Reset';
resetBtn.title='このステージを最初からやり直す（R キー）';
Object.assign(resetBtn.style,{ position:'absolute', top:'0.67cqw', right:'0.9cqw', padding:'0.25em 0.85em', zIndex:'2',
  background:'rgba(34,12,24,0.78)', border:'1px solid rgba(201,160,112,0.6)', borderRadius:'12px',
  color:'#e8dcc0', fontFamily:"'Caveat',cursive", fontSize:'clamp(15px,1.85cqw,44px)', lineHeight:'1', letterSpacing:'0.02em', cursor:'pointer' });
// 1回目のタップでは「もう一度で やり直す」と出すだけ。2.5 秒以内にもう一度押したら、やり直す
// （スマホで会話を進めようと画面の端をタップしたとき、うっかりやり直さないように）
let resetArmT=0;
// 表示の文字は dataset で変えられる（js/page.js が「Reset」の旗にする）。押した1回目は .armed が付く
const resetLabel=()=>{ resetBtn.textContent=resetBtn.dataset.label||'↺ Reset'; resetBtn.classList.remove('armed');
  if(!resetBtn.dataset.label) resetBtn.style.background='rgba(34,12,24,0.78)'; };
resetBtn.addEventListener('pointerdown',e=>{ e.preventDefault(); e.stopPropagation();
  resetArmT=0; resetLabel(); restartStage(); });   // 1回押すだけで、やり直す
canvas.parentNode.appendChild(resetBtn); resetBtn.id='resetBtn';
window.addEventListener('keydown',e=>{ if(e.key==='r'||e.key==='R'){ e.preventDefault(); restartStage(); } });

/* 操作の説明の枠（チュートリアル用）。ステージ側から GT.drawHint(中心x, 中心y, 行の配列) で描く。
   行は '文字' か [['キー','キー'], '説明'] の形。キーはキーボードのキーの形で描く。 */
function drawKeycapBright(x,y,label){   // 明るい絵本のころのキー（チュートリアル）
  ctx.font="700 12px 'Zen Old Mincho',serif";
  const w=Math.max(20,ctx.measureText(label).width+12);
  roundRect(x,y-11,w,22,5); ctx.fillStyle='#f3ead0'; ctx.fill();
  ctx.strokeStyle='#8a7a5a'; ctx.lineWidth=1.2; ctx.stroke();
  ctx.fillStyle='#3a2f2a'; ctx.textAlign='center'; ctx.fillText(label,x+w/2,y+1);
  return w;
}
function drawKeycap(x,y,label){                     // ゴシック：暗い板に、くすんだ金のふち（下に厚み）
  ctx.font="700 12px 'Zen Old Mincho',serif";
  const w=Math.max(20,ctx.measureText(label).width+12);
  roundRect(x,y-9,w,22,4); ctx.fillStyle='#100c08'; ctx.fill();                       // 厚み
  roundRect(x,y-11,w,21,4); const g=ctx.createLinearGradient(0,y-11,0,y+10); g.addColorStop(0,'#3e3226'); g.addColorStop(1,'#241c14');
  ctx.fillStyle=g; ctx.fill(); ctx.strokeStyle='rgba(214,176,118,0.85)'; ctx.lineWidth=1.1; ctx.stroke();
  ctx.fillStyle='#f3dfb0'; ctx.textAlign='center'; ctx.fillText(label,x+w/2,y);
  return w;
}
/* 案内の枠のかざり：すみの、いばらの巻きひげ（dx,dy … 向き） */
function hintCorner(x,y,dx,dy){
  ctx.save(); ctx.translate(x,y); ctx.scale(dx,dy); ctx.strokeStyle='rgba(214,176,118,0.9)'; ctx.lineWidth=1.2; ctx.lineCap='round';
  ctx.beginPath(); ctx.moveTo(0,16); ctx.quadraticCurveTo(0,0,16,0); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(5,13); ctx.bezierCurveTo(5,4,13,4,13,9); ctx.bezierCurveTo(13,12,9,12,9,9); ctx.stroke();   // 巻きひげ
  ctx.beginPath(); ctx.moveTo(18,0); ctx.lineTo(22,-2); ctx.moveTo(0,18); ctx.lineTo(-2,22); ctx.stroke();                 // とげ
  ctx.restore();
}
/* 虫食い：古い本のページが、虫に食べられたあと。
   GT.wormEaten(ctx, x, y, 幅, 高さ, 種, {edges:['left','top','bottom'], under:'#色', count:6, avoid:[{x,y,w,h}]})
     ・食べ跡の穴 … 穴の向こうに「次のページ」が見える（under の淡い紙の色。黒くはしない）。ふちに切り口の影だけ
     ・ページのはしの劣化 … edges のふちが黄ばみ、波うつように よれて、ところどころ かじられて欠ける
     （avoid … 文字などのために、食べないでおく場所）
   本を読みかえす画面（bookview.js）と、序章の本の場面（00_opening.js）が使う。 */
GT.wormEaten=function(c,x,y,w,h,seed,o){
  o=o||{};
  let s=Math.abs(Math.floor((seed||1)*9973))%233280+1; const R=()=>{ s=(s*9301+49297)%233280; return s/233280; };
  const S=Math.min(w,h)/260, under=o.under||'#e3d6b4';
  const keep=o.avoid||[];
  const free=(px,py,r)=>!keep.some(k=>px+r>k.x && px-r<k.x+k.w && py+r>k.y && py-r<k.y+k.h);
  const edges=o.edges||[];
  c.save(); c.beginPath(); c.rect(x,y,w,h); c.clip();

  // ── ページのはしの劣化：黄ばみ（ふちほど濃い） ──
  for(const e of edges){
    const d=(e==='left'||e==='right'?w:h)*0.16;
    const g = e==='left'  ? c.createLinearGradient(x,0,x+d,0)
            : e==='right' ? c.createLinearGradient(x+w,0,x+w-d,0)
            : e==='top'   ? c.createLinearGradient(0,y,0,y+d)
            :               c.createLinearGradient(0,y+h,0,y+h-d);
    g.addColorStop(0,'rgba(176,136,78,0.38)'); g.addColorStop(0.4,'rgba(176,136,78,0.14)'); g.addColorStop(1,'rgba(176,136,78,0)');
    c.fillStyle=g; c.fillRect(x,y,w,h);
  }
  // しみ（うすい茶色のまだら）
  for(let i=0;i<5;i++){ const px=x+w*R(), py=y+h*R(), r=(10+R()*26)*S;
    const g=c.createRadialGradient(px,py,0,px,py,r); g.addColorStop(0,'rgba(170,128,70,0.12)'); g.addColorStop(1,'rgba(170,128,70,0)');
    c.fillStyle=g; c.beginPath(); c.arc(px,py,r,0,Math.PI*2); c.fill(); }

  // ── 食べ跡の穴（次のページが見える） ──
  const holes=[];
  const addHole=(bx,by,r0,edge)=>{                  // ふちが、かじったように でこぼこした1つの形
    const n=16, rx=r0*(0.8+R()*0.5), ry=r0*(0.65+R()*0.4), rot=R()*Math.PI, pts=[];
    const b1=R()*Math.PI*2, b2=R()*Math.PI*2;          // かじった所（2か所）が、少し大きくへこむ
    for(let i=0;i<n;i++){ const a=i/n*Math.PI*2;
      const k=0.82+R()*0.3+0.22*Math.max(0,Math.cos(a-b1))**4+0.16*Math.max(0,Math.cos(a-b2))**4;
      const ex=Math.cos(a)*rx*k, ey=Math.sin(a)*ry*k;
      pts.push([bx+ex*Math.cos(rot)-ey*Math.sin(rot), by+ex*Math.sin(rot)+ey*Math.cos(rot)]); }
    if(pts.every(([px,py])=>free(px,py,3*S))) holes.push({pts,edge}); };
  for(let i=0;i<(o.count!=null?o.count:6);i++) addHole(x+w*(0.14+R()*0.72), y+h*(0.12+R()*0.76), (5+R()*10)*S, false);
  for(const e of edges){ for(let i=0;i<1+Math.floor(R()*2);i++){ let t=0.15+R()*0.7; const r0=(5+R()*7)*S;
    if((e==='top'||e==='bottom') && o.seam) t = o.seam==='right' ? t*0.8 : 0.2+t*0.8;   // 背表紙のそばは かじらない
    addHole(e==='left'?x:e==='right'?x+w:x+w*t, e==='top'?y:e==='bottom'?y+h:y+h*t, r0, true); } }
  const holePath=(hl)=>{ const p=hl.pts, m=(a,b)=>[(a[0]+b[0])/2,(a[1]+b[1])/2]; c.beginPath();   // 角をなめらかに
    let s0=m(p[p.length-1],p[0]); c.moveTo(s0[0],s0[1]);
    for(let i=0;i<p.length;i++){ const q=m(p[i],p[(i+1)%p.length]); c.quadraticCurveTo(p[i][0],p[i][1],q[0],q[1]); } c.closePath(); };
  for(const hl of holes){
    holePath(hl); c.strokeStyle='rgba(150,112,64,0.35)'; c.lineWidth=1.6*S; c.stroke();   // 穴のふちの、少し焼けた紙
    c.fillStyle=under; c.fill();                                                          // 穴の向こうの、次のページ
    c.save(); holePath(hl); c.clip();                                                     // 切り口の影（上と左だけ、うすく）
    c.translate(1.8*S,1.8*S); holePath(hl); c.lineWidth=3*S; c.strokeStyle='rgba(110,80,46,0.25)'; c.stroke();
    c.restore();
  }
  c.restore();

  // ── ページのはしの よれ：ふちが波うって、外側が少し欠ける（under の色で欠けたところを見せる） ──
  c.save();
  for(const e of edges){
    const horiz=(e==='top'||e==='bottom'), len=horiz?w:h, n=Math.max(8,Math.round(len/(14*S)));
    const base = e==='left'?x : e==='right'?x+w : e==='top'?y : y+h, sign=(e==='left'||e==='top')?1:-1;
    // seam（'left' / 'right'）… 背表紙側。上下のふちの よれを、つなぎ目に向かって 0 にして、となりのページと高さをそろえる
    const seamK=t=>{ if(!horiz || !o.seam) return 1; const u=Math.min(1,(o.seam==='right'?1-t:t)/0.12); return u*u*(3-2*u); };
    const pts=[]; for(let i=0;i<=n;i++){ const t=i/n, wob=((Math.sin(t*9+seed)*0.5+0.5)*2.2*S + R()*1.8*S)*seamK(t);
      pts.push([t, wob]); }
    const P=(t,d)=> horiz ? [x+w*t, base+sign*d] : [base+sign*d, y+h*t];
    // 欠けた部分（よれて内側に入りこんだところ）
    c.beginPath(); let [sx,sy]=P(0,0); c.moveTo(sx,sy);
    for(const [t,d] of pts){ const [px,py]=P(t,d); c.lineTo(px,py); }
    const [ex,ey]=P(1,0); c.lineTo(ex,ey); c.closePath();
    c.fillStyle=o.outside||'rgba(0,0,0,0)'; if(o.outside) c.fill();
    // よれたふちの線（紙のめくれ・しわ）
    c.beginPath(); pts.forEach(([t,d],i)=>{ const [px,py]=P(t,d+0.6*S); i?c.lineTo(px,py):c.moveTo(px,py); });
    c.strokeStyle='rgba(120,88,50,0.45)'; c.lineWidth=1.1*S; c.stroke();
    // 小さなしわ（ふちから内側へ、短い線）
    for(let i=0;i<Math.round(len/(60*S));i++){ const t=0.05+R()*0.9, l=(4+R()*8)*S, [px,py]=P(t,1.5*S), [qx,qy]=P(t+(R()-0.5)*0.02,1.5*S+l);
      c.beginPath(); c.moveTo(px,py); c.lineTo(qx,qy); c.strokeStyle='rgba(120,88,50,0.22)'; c.lineWidth=0.8*S; c.stroke(); }
  }
  // 角のめくれ（edges の2本が交わる角）
  const corners=[]; const has=e=>edges.includes(e);
  if(has('top')&&has('left')) corners.push([x,y,1,1]); if(has('top')&&has('right')) corners.push([x+w,y,-1,1]);
  if(has('bottom')&&has('left')) corners.push([x,y+h,1,-1]); if(has('bottom')&&has('right')) corners.push([x+w,y+h,-1,-1]);
  for(const [cx,cy,dx,dy] of corners){ if(R()<0.35) continue; const r=(10+R()*8)*S;
    c.beginPath(); c.moveTo(cx+dx*r,cy); c.lineTo(cx,cy+dy*r); c.lineTo(cx,cy); c.closePath();
    c.fillStyle=o.outside||under; c.fill();                                           // めくれて見える裏
    c.beginPath(); c.moveTo(cx+dx*r,cy); c.lineTo(cx,cy+dy*r); c.lineTo(cx+dx*r*0.7,cy+dy*r*0.7); c.closePath();
    const g=c.createLinearGradient(cx+dx*r*0.5,cy+dy*r*0.5,cx+dx*r*0.75,cy+dy*r*0.75);
    g.addColorStop(0,'#efe3c2'); g.addColorStop(1,'#d8c79c'); c.fillStyle=g; c.fill();
    c.strokeStyle='rgba(120,88,50,0.5)'; c.lineWidth=0.9*S; c.stroke(); }
  c.restore();
};

function drawHintBright(cx,cy,lines){   // 明るい絵本のころの案内の枠（チュートリアル）
  ctx.save(); ctx.textBaseline='middle';
  const FONT="700 14px 'Zen Old Mincho',serif";
  const widths=lines.map(l=>{ ctx.font=FONT; if(typeof l==='string') return ctx.measureText(l).width;
    ctx.font="700 12px 'Zen Old Mincho',serif"; const kw=touchKeys(l[0]).reduce((a,k)=>a+Math.max(20,ctx.measureText(k).width+12)+14,0);
    ctx.font=FONT; return kw+ctx.measureText(l[1]).width+6; });
  const bw=Math.max(...widths)+28, bh=lines.length*26+16;
  const bx=Math.max(EDGE+6,Math.min(W-EDGE-6-bw,cx-bw/2)), by=Math.max(EDGE+30,Math.min(H-EDGE-6-bh,cy-bh/2));
  ctx.globalAlpha=0.88+0.12*Math.sin(performance.now()/300);
  roundRect(bx,by,bw,bh,12); ctx.fillStyle='rgba(43,36,24,0.82)'; ctx.fill();
  ctx.strokeStyle='rgba(232,195,90,0.7)'; ctx.lineWidth=1.5; ctx.stroke();
  lines.forEach((l,i)=>{ const y=by+20+i*26; let x=bx+14; ctx.textAlign='left';
    if(typeof l==='string'){ ctx.font=FONT; ctx.fillStyle='#f3ead0'; ctx.fillText(l,x,y); return; }
    const ks=touchKeys(l[0]);
    ks.forEach((k,j)=>{ x+=drawKeycapBright(x,y,k)+4;
      if(j<ks.length-1){ ctx.fillStyle='#cbb98f'; ctx.font="700 12px serif"; ctx.textAlign='left'; ctx.fillText('/',x,y); x+=10; } });
    ctx.font=FONT; ctx.textAlign='left'; ctx.fillStyle='#e8c35a'; ctx.fillText(l[1],x+4,y); });
  ctx.restore();
}
/* 説明の枠（チュートリアル）：キャンバスではなく、ゲーム画面の上に重ねた HTML で出す。
   ステージ側は、これまでどおり毎フレーム GT.drawHint(中心x, 中心y, 行) を呼ぶ。描いたフレームだけ表示される */
const hintEl=document.createElement('div'); hintEl.id='gtHint'; canvas.parentElement.appendChild(hintEl);
(function(){ const st=document.createElement('style'); st.textContent=`
  #gtHint{ position:absolute; z-index:1; display:none; transform:translate(-50%,-50%); pointer-events:none; white-space:nowrap;
    padding:0.55em 1.05em; border-radius:0.45em; background:rgba(43,36,24,0.9); color:#f1e8d6;
    font-family:'Zen Old Mincho',serif; font-weight:700; font-size:clamp(10px,1.55cqw,36px); line-height:1.75; letter-spacing:0.02em;
    box-shadow:0 0.25em 0.9em rgba(0,0,0,0.45), inset 0 0 0 1px rgba(214,176,118,0.85), inset 0 0 0 0.3em rgba(43,36,24,0.9), inset 0 0 0 calc(0.3em + 1px) rgba(214,176,118,0.35);
    animation:gtHintPulse 1.6s ease-in-out infinite; }
  #gtHint.show{ display:block; }
  #gtHint .row{ display:flex; align-items:center; gap:0.35em; }
  #gtHint kbd{ display:inline-block; min-width:1.5em; padding:0 0.4em; border-radius:0.25em; text-align:center; font:inherit; font-size:0.85em; line-height:1.55;
    background:linear-gradient(#3e3226,#241c14); color:#f3dfb0; box-shadow:inset 0 0 0 1px rgba(214,176,118,0.85), 0 0.15em 0 #100c08; }
  #gtHint .sl{ color:#b9a27a; font-size:0.85em; }
  #gtHint .lb{ color:#e8c88a; margin-left:0.25em; }
  #gtHint.bright{ background:rgba(43,36,24,0.82); color:#f3ead0; box-shadow:inset 0 0 0 1.5px rgba(232,195,90,0.7); border-radius:0.8em; }
  #gtHint.bright kbd{ background:#f3ead0; color:#3a2f2a; box-shadow:inset 0 0 0 1px #8a7a5a; }
  #gtHint.bright .lb{ color:#e8c35a; }
  @keyframes gtHintPulse{ 0%,100%{ opacity:0.92; } 50%{ opacity:1; } }`; document.head.appendChild(st); })();
let hintReq=null, hintKey='';
const escH=t=>String(t).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
function flushHint(){
  if(!hintReq || flipping || GT.paused){ hintEl.classList.remove('show'); hintReq=null; return; }
  const {cx,cy,lines}=hintReq; hintReq=null;
  const html=lines.map(l=>{ if(typeof l==='string') return `<div class="row">${escH(l)}</div>`;
    const ks=touchKeys(l[0]).map(k=>`<kbd>${escH(k)}</kbd>`).join('<span class="sl">/</span>');
    return `<div class="row">${ks}<span class="lb">${escH(l[1])}</span></div>`; }).join('');
  const key=html+(GT.isBright&&GT.isBright()?'b':'g');
  if(key!==hintKey){ hintEl.innerHTML=html; hintEl.classList.toggle('bright',!!(GT.isBright&&GT.isBright())); hintKey=key; }
  hintEl.style.left=(Math.max(EDGE+60,Math.min(W-EDGE-60,cx))/W*100)+'%';
  hintEl.style.top=(Math.max(EDGE+40,Math.min(H-EDGE-40,cy))/H*100)+'%';
  hintEl.classList.add('show');
}
GT.drawHint=function(cx,cy,lines){ hintReq={cx,cy,lines}; return; };   // （下の、キャンバスに描くしくみは使わない）
GT.drawHintCanvas=function(cx,cy,lines){
  if(GT.isBright&&GT.isBright()) return drawHintBright(cx,cy,lines);   // チュートリアル（明るい場面）は、前の枠のまま
  ctx.save(); ctx.textBaseline='middle';
  const FONT="700 14px 'Zen Old Mincho',serif";
  const widths=lines.map(l=>{ ctx.font=FONT; if(typeof l==='string') return ctx.measureText(l).width;
    ctx.font="700 12px 'Zen Old Mincho',serif"; const kw=touchKeys(l[0]).reduce((a,k)=>a+Math.max(20,ctx.measureText(k).width+12)+14,0);
    ctx.font=FONT; return kw+ctx.measureText(l[1]).width+6; });
  const bw=Math.max(...widths)+40, bh=lines.length*26+26;
  const bx=Math.max(EDGE+6,Math.min(W-EDGE-6-bw,cx-bw/2)), by=Math.max(EDGE+34,Math.min(H-EDGE-6-bh,cy-bh/2));
  const pulse=0.5+0.5*Math.sin(performance.now()/420);
  // 枠：赤紫の黒（上ほど少し明るい）、影、くすんだ金の二重のふち、すみのいばら、上のまん中に薔薇
  ctx.save(); ctx.shadowColor='rgba(8,2,6,0.7)'; ctx.shadowBlur=14; ctx.shadowOffsetY=4;
  roundRect(bx,by,bw,bh,6); const bg=ctx.createLinearGradient(0,by,0,by+bh); bg.addColorStop(0,'rgba(43,36,24,0.9)'); bg.addColorStop(1,'rgba(43,36,24,0.9)');   // 地の色は、元の茶色（明るい場面の説明の枠と同じ）
  ctx.fillStyle=bg; ctx.fill(); ctx.restore();
  roundRect(bx,by,bw,bh,6); ctx.strokeStyle=`rgba(214,176,118,${0.7+0.25*pulse})`; ctx.lineWidth=1.4; ctx.stroke();
  roundRect(bx+4,by+4,bw-8,bh-8,3); ctx.strokeStyle='rgba(214,176,118,0.35)'; ctx.lineWidth=1; ctx.stroke();
  hintCorner(bx+3,by+3,1,1); hintCorner(bx+bw-3,by+3,-1,1); hintCorner(bx+3,by+bh-3,1,-1); hintCorner(bx+bw-3,by+bh-3,-1,-1);
  { const rx=bx+bw/2, ry=by;                                                               // 薔薇と葉
    ctx.fillStyle='#2a3624'; ctx.beginPath(); ctx.ellipse(rx-9,ry+1,6,2.6,-0.3,0,Math.PI*2); ctx.ellipse(rx+9,ry+1,6,2.6,0.3,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(rx,ry,5.5,0,Math.PI*2); ctx.fillStyle='#6e1024'; ctx.fill();
    ctx.beginPath(); ctx.arc(rx-1,ry-1,3.4,0,Math.PI*2); ctx.fillStyle='#b3263f'; ctx.fill();
    ctx.beginPath(); ctx.arc(rx-0.6,ry-0.6,1.8,0.5,5.6); ctx.strokeStyle='#4a0816'; ctx.lineWidth=0.8; ctx.stroke(); }
  lines.forEach((l,i)=>{ const y=by+24+i*26; let x=bx+20; ctx.textAlign='left';
    if(typeof l==='string'){ ctx.font=FONT; ctx.fillStyle='#f1e8d6'; ctx.fillText(l,x,y); return; }
    const ks=touchKeys(l[0]);
    ks.forEach((k,j)=>{ x+=drawKeycap(x,y,k)+4;
      if(j<ks.length-1){ ctx.fillStyle='#b9a27a'; ctx.font="700 12px serif"; ctx.textAlign='left'; ctx.fillText('/',x,y); x+=10; } });
    ctx.font=FONT; ctx.textAlign='left'; ctx.fillStyle='#e8c88a'; ctx.fillText(l[1],x+4,y); });
  ctx.restore();
};

GT.beginDialogue=beginDialogue; GT.hideDialogue=hideDialogue;
/* 吹き出しマーク（話しかけられる人の頭の上）。(cx,cy)＝マークの中心、g＝重力（-1 なら しっぽが上を向く）、
   near＝話しかけられる近さにいる（金色にして、少し大きく） */
function drawTalkMark(cx,cy,g,near,must){
  const t=performance.now()/1000, bob=Math.sin(t*3)*2.5, k=near?1.15+0.06*Math.sin(t*6):1;
  ctx.save(); ctx.translate(cx,cy+bob*g); ctx.scale(k,k);
  const w=30, h=20;
  const fill = near ? '#fff4d6' : '#fffaf0', line = near ? '#c0902a' : '#8a7a5a';
  const GOLD='#c0902a';   // 「！」「…」の色（金色）
  ctx.beginPath(); roundRectPath(-w/2,-h/2,w,h,9);
  ctx.fillStyle=fill; ctx.fill(); ctx.lineWidth=1.6; ctx.strokeStyle=line; ctx.stroke();
  // しっぽ（人のほうへ向ける）。枠の線をまたいで塗り、つなぎ目を消す
  const ty=g>0 ? h/2 : -h/2, tip=g>0 ? h/2+8 : -h/2-8, d=g>0?-2:2;
  ctx.beginPath(); ctx.moveTo(-5,ty+d); ctx.lineTo(-1,tip); ctx.lineTo(4,ty+d); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-5,ty); ctx.lineTo(-1,tip); ctx.lineTo(4,ty); ctx.stroke();
  if(must){                                                                            // 「！」（話さないと進めない）
    ctx.fillStyle=GOLD;
    ctx.beginPath(); ctx.moveTo(-2.6,-6.5); ctx.lineTo(2.6,-6.5); ctx.lineTo(1.4,2.5); ctx.lineTo(-1.4,2.5); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.arc(0,5.6,1.9,0,Math.PI*2); ctx.fill();
  } else {
    ctx.fillStyle=GOLD;
    for(let i=-1;i<=1;i++){ ctx.beginPath(); ctx.arc(i*7, 0, 2.2, 0, Math.PI*2); ctx.fill(); }   // 「…」（話さなくても進める）
  }
  ctx.restore();
}

canvas.addEventListener('pointerdown',e=>{
  if(dlg.classList.contains('show')){ e.preventDefault(); tryAdvanceDialogue(); return; }
  if(activeNpc && !storyTalking && !flipping){ e.preventDefault(); tryTalk(); }
});
dlg.addEventListener('pointerdown',e=>{
  if(e.target.closest('.choice, .name-ask')) return;
  e.preventDefault(); tryAdvanceDialogue();
});
window.addEventListener('keydown',e=>{
  if((e.key==='Enter'||e.key==='z'||e.key==='Z')){
    if(dlg.classList.contains('show')){ e.preventDefault(); tryAdvanceDialogue(); }
    else if(activeNpc && !storyTalking && !flipping){ e.preventDefault(); tryTalk(); }
  }
  if((e.key==='s'||e.key==='S') && dlg.classList.contains('show')){ e.preventDefault(); skipDialogue(); }
});

/* タイプライター表示 */
function typeTick(dt){
  if(!typing) return; typeAcc+=dt; const cps=42;
  while(typeAcc>1/cps && typeI<typeTarget.length){ typeAcc-=1/cps; typeI++; }
  dlgLine.textContent=typeTarget.slice(0,typeI); if(typeI>=typeTarget.length) typing=false;
}
let ttLast=performance.now();
function typeLoop(now){ const dt=(now-ttLast)/1000; ttLast=now; if(holdWait) holdWait(); typeTick(dt); requestAnimationFrame(typeLoop); }

