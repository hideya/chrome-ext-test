// メッセージリスナー（background.jsからの色適用要求を処理）
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'applyColor') {
    setWindowColor(message.color);
    sendResponse({ success: true });
  } else if (message.action === 'removeColor') {
    const existingBar = document.getElementById('window-color-bar');
    if (existingBar) {
      existingBar.remove();
    }
    sendResponse({ success: true });
  }
  
  return true;
});

// ウィンドウに色を設定する関数
function setWindowColor(color) {
  // 既存のカラーバーを削除
  const existingBar = document.getElementById('window-color-bar');
  if (existingBar) {
    existingBar.remove();
  }

  // 新しいカラーバーを作成
  const colorBar = document.createElement('div');
  colorBar.id = 'window-color-bar';
  colorBar.className = 'window-color-bar';
  colorBar.style.backgroundColor = color;

  // ページの最上部に挿入
  if (document.documentElement) {
    document.documentElement.appendChild(colorBar);
  }
}
