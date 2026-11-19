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
  const x=t.x, w=t.w*1.5, dir=x<W/2?1:-1, top=-40, seed=Math.round(x*7+w);
  c.filter='brightness(0.82) saturate(0.9)';                                   // 手前なので、少し暗く
  GTDecor.paint.trunk(c, x-w/2, top+120, H+30, w, seed, { branches:[{y:top+190,dir:dir,len:w*1.6},{y:top+150,dir:-dir,len:w*0.9}] });   // 根もとは、床より下（ページのふち）まで
  GTDecor.paint.canopy(c,[
    {x:x+dir*20, y:top+70,  rx:150, ry:90},
    {x:x+dir*110,y:top+120, rx:90,  ry:60},
    {x:x-dir*40, y:top+120, rx:80,  ry:60},
    {x:x+dir*60, y:top+20,  rx:110, ry:70},
  ], seed);
  c.filter='none';
  return cv;
}
GT.registerDraw(()=>{
  const sc=GT.scene; if(!sc || !(GT.isBright&&GT.isBright())) return;
  const t=FG[sc.id]; if(!t) return;
  GT.ctx.drawImage(cache[sc.id]||(cache[sc.id]=build(t)),0,0);
}, 'overlay');
})();
