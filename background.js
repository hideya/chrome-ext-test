// ウィンドウと色のマッピングを管理
class WindowColorManager {
  constructor() {
    this.windowColors = new Map();
    this.loadStoredColors();
  }

  async loadStoredColors() {
    try {
      const result = await chrome.storage.local.get('windowColors');
      if (result.windowColors) {
        this.windowColors = new Map(Object.entries(result.windowColors));
      }
    } catch (error) {
      console.log('色設定の読み込みエラー:', error);
    }
  }

  async saveColors() {
    try {
      const colorsObj = Object.fromEntries(this.windowColors);
      await chrome.storage.local.set({ windowColors: colorsObj });
    } catch (error) {
      console.log('色設定の保存エラー:', error);
    }
  }

  setWindowColor(windowId, color) {
    this.windowColors.set(windowId.toString(), color);
    this.saveColors();
  }

  getWindowColor(windowId) {
    return this.windowColors.get(windowId.toString()) || null;
  }

  removeWindowColor(windowId) {
    this.windowColors.delete(windowId.toString());
    this.saveColors();
  }
}

const colorManager = new WindowColorManager();

// 新しいタブが作成されたとき
chrome.tabs.onCreated.addListener(async (tab) => {
  if (tab.windowId) {
    const color = colorManager.getWindowColor(tab.windowId);
    if (color) {
      console.log(`新しいタブ ${tab.id} にウィンドウ ${tab.windowId} の色 ${color} を適用`);
      // 複数のタイミングで適用を試行して確実に色を適用
      applyColorToTabWithRetry(tab.id, color);
    }
  }
});

// タブが更新されたとき（ページ遷移など）
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (tab.windowId) {
    const color = colorManager.getWindowColor(tab.windowId);
    if (color) {
      // ページの読み込み状況に応じて色を適用
      if (changeInfo.status === 'loading') {
        console.log(`タブ ${tabId} の読み込み開始時に色 ${color} を適用`);
        applyColorToTab(tabId, color);
      } else if (changeInfo.status === 'complete') {
        console.log(`タブ ${tabId} の読み込み完了時に色 ${color} を適用`);
        applyColorToTab(tabId, color);
      }
    }
  }
});

// タブが別のウィンドウに移動されたとき（ドラッグアンドドロップ）
chrome.tabs.onAttached.addListener(async (tabId, attachInfo) => {
  const windowId = attachInfo.newWindowId;
  const color = colorManager.getWindowColor(windowId);
  
  if (color) {
    console.log(`タブ ${tabId} がウィンドウ ${windowId} に移動、色 ${color} を適用`);
    // 少し遅延を入れてタブの移動が完了してから色を適用
    setTimeout(() => {
      applyColorToTab(tabId, color);
    }, 200);
  } else {
    // 移動先のウィンドウに色設定がない場合は、色バーを削除
    console.log(`タブ ${tabId} がウィンドウ ${windowId} に移動、色設定なし - 色バーを削除`);
    setTimeout(() => {
      removeColorFromTab(tabId);
    }, 200);
  }
});

// タブが別のウィンドウから切り離されたとき
chrome.tabs.onDetached.addListener(async (tabId, detachInfo) => {
  console.log(`タブ ${tabId} がウィンドウ ${detachInfo.oldWindowId} から切り離された`);
  // 切り離し時は特に何もしない（onAttachedで新しいウィンドウの色が適用される）
});

// ウィンドウが閉じられたときに色設定をクリーンアップ
chrome.windows.onRemoved.addListener((windowId) => {
  console.log(`ウィンドウ ${windowId} が閉じられたため色設定を削除`);
  colorManager.removeWindowColor(windowId);
});

// アクティブなタブが変更されたときも色を確認して適用
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const color = colorManager.getWindowColor(activeInfo.windowId);
  if (color) {
    console.log(`アクティブタブ変更: タブ ${activeInfo.tabId} に色 ${color} を適用`);
    applyColorToTab(activeInfo.tabId, color);
  }
});

// タブに色を適用する関数（リトライ機能付き）
async function applyColorToTabWithRetry(tabId, color, maxRetries = 3) {
  let retries = 0;
  
  const tryApply = async () => {
    try {
      await applyColorToTab(tabId, color);
    } catch (error) {
      retries++;
      if (retries < maxRetries) {
        console.log(`タブ ${tabId} への色適用失敗、${retries}回目、再試行します...`);
        setTimeout(tryApply, 300 * retries); // 徐々に遅延を増やす
      } else {
        console.log(`タブ ${tabId} への色適用を ${maxRetries} 回試行しましたが失敗`);
      }
    }
  };
  
  tryApply();
}

// タブに色を適用する関数
async function applyColorToTab(tabId, color) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: setWindowColor,
      args: [color]
    });
  } catch (error) {
    throw error; // エラーを上位に伝播
  }
}

// タブから色を削除する関数
async function removeColorFromTab(tabId) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: () => {
        const existingBar = document.getElementById('window-color-bar');
        if (existingBar) {
          existingBar.remove();
        }
      }
    });
  } catch (error) {
    // エラーは無視（特権ページなどでスクリプトが実行できない場合）
  }
}

// タブに注入される関数
function setWindowColor(color) {
  // 既存のカラーバーを削除
  const existingBar = document.getElementById('window-color-bar');
  if (existingBar) {
    existingBar.remove();
  }

  // 新しいカラーバーを作成
  const colorBar = document.createElement('div');
  colorBar.id = 'window-color-bar';
  colorBar.style.cssText = `
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
    width: 100% !important;
    height: 5px !important;
    background-color: ${color} !important;
    z-index: 999999 !important;
    pointer-events: none !important;
    box-shadow: 0 0 3px rgba(0,0,0,0.3) !important;
    transition: opacity 0.2s ease !important;
  `;

  document.documentElement.appendChild(colorBar);
}

// ポップアップからのメッセージを受信
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'setWindowColor') {
    colorManager.setWindowColor(message.windowId, message.color);
    
    // そのウィンドウの全タブに色を適用
    chrome.tabs.query({ windowId: message.windowId }, (tabs) => {
      tabs.forEach(tab => {
        applyColorToTab(tab.id, message.color);
      });
    });
    
    sendResponse({ success: true });
  } else if (message.action === 'getWindowColor') {
    const color = colorManager.getWindowColor(message.windowId);
    sendResponse({ color: color });
  } else if (message.action === 'removeWindowColor') {
    colorManager.removeWindowColor(message.windowId);
    
    // そのウィンドウの全タブから色を削除
    chrome.tabs.query({ windowId: message.windowId }, (tabs) => {
      tabs.forEach(tab => {
        removeColorFromTab(tab.id);
      });
    });
    
    sendResponse({ success: true });
  }
  
  return true; // 非同期レスポンスを示す
});