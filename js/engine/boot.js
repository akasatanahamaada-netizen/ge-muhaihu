/* ============================================================================
   Gravity Tale ── エンジン：起動
   ----------------------------------------------------------------------------
   すべてのステージと playlist.js が読みこまれたあと（DOMContentLoaded）に、シーンを並べてゲームを始める。
   エンジンのファイルは js/engine/ にあり、index.html で core.js → … → boot.js の順に読む。
   どのファイルも、いちばん外側の const / let / function を共有している（ふつうの <script> なので）。
   ========================================================================== */
"use strict";
/* 画面の下の「本を開く」ボタン（本の画面は js/bookview.js。GT.openBookModal はそちらで決まる） */
document.getElementById('openBook').addEventListener('click',()=>GT.openBookModal&&GT.openBookModal());

/* ========================================================================== */
/*  起動（全ステージとplaylistが読み込まれた後に自動で走る）                  */
/* ========================================================================== */
GT.boot=function(){
  // playlist の id 順に、登録済みシーンを並べて SCENES を作る
  GT.SCENES = GT.playlist.map(id=>{
    const s=GT.sceneRegistry[id];
    if(!s) console.warn('[Gravity Tale] playlist のID「'+id+'」に対応するシーンが登録されていません');
    return s;
  }).filter(Boolean);
  if(GT.sceneRegistry.title){ startScene(GT.sceneRegistry.title); GT.mode='idle'; }   // タイトル画面のうしろに映す場面（stages/00t_title.js）
  if(GT.showMenu) GT.showMenu();      // メニュー画面（menu.js）があれば、そこから始める
  else startScene(0);
  requestAnimationFrame(loop);
  requestAnimationFrame(typeLoop);
};
document.addEventListener('DOMContentLoaded',()=>GT.boot());

