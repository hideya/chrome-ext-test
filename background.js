// ウィンドウの色管理（特徴ベース識別）
class WindowColorManager {
  constructor() {
    this.windowColors = new Map(); // 従来のwindowID → color
    this.windowProfiles = new Map(); // windowID → ウィンドウ特徴
    this.savedProfiles = new Map(); // 保存された特徴 → color
    this.detachedTabColors = new Map(); // デタッチ中のタブの色を一時保存
    this.loadStoredColors();
  }

  async loadStoredColors() {
    try {
      const result = await chrome.storage.local.get(['windowColors', 'savedProfiles']);
      if (result.windowColors) {
        this.windowColors = new Map(Object.entries(result.windowColors));
      }
      if (result.savedProfiles) {
        this.savedProfiles = new Map(Object.entries(result.savedProfiles));
      }
    } catch (error) {
      console.log('色設定の読み込みエラー:', error);
    }
  }

  async saveColors() {
    try {
      const colorsObj = Object.fromEntries(this.windowColors);
      const profilesObj = Object.fromEntries(this.savedProfiles);
      await chrome.storage.local.set({ 
        windowColors: colorsObj,
        savedProfiles: profilesObj
      });
    } catch (error) {
      console.log('色設定の保存エラー:', error);
    }
  }

  setWindowColor(windowId, color) {
    this.windowColors.set(windowId.toString(), color);
    // 即座に特徴保存するのではなく、Chrome終了時にまとめて保存
    this.saveColors(); // windowColors のみ保存
  }

  getWindowColor(windowId) {
    return this.windowColors.get(windowId.toString()) || null;
  }

  removeWindowColor(windowId) {
    // 保存されたプロファイルも削除
    const profile = this.windowProfiles.get(windowId.toString());
    if (profile) {
      this.savedProfiles.delete(profile);
      this.windowProfiles.delete(windowId.toString());
    }
    this.windowColors.delete(windowId.toString());
    this.saveColors();
  }

  // ウィンドウ特徴を生成
  async generateWindowProfile(windowId) {
    try {
      const window = await chrome.windows.get(windowId);
      const tabs = await chrome.tabs.query({ windowId: windowId });
      
      // ウィンドウの特徴：位置、サイズ、タブ数
      const profile = `${window.left}-${window.top}-${window.width}-${window.height}-${tabs.length}`;
      return profile;
    } catch (error) {
      console.log('ウィンドウプロファイル生成エラー:', error);
      return null;
    }
  }

  // Chrome終了時に全ウィンドウの特徴を保存
  async saveAllWindowProfiles() {
    console.log('Chrome終了時に全ウィンドウ特徴を保存中...');
    
    try {
      const windows = await chrome.windows.getAll();
      
      for (const window of windows) {
        const windowId = window.id.toString();
        const color = this.windowColors.get(windowId);
        
        if (color) {
          // 色設定があるウィンドウのみ特徴を保存
          const profile = await this.generateWindowProfile(window.id);
          if (profile) {
            this.savedProfiles.set(profile, color);
            console.log(`ウィンドウ ${window.id} 特徴保存: ${profile} → ${color}`);
          }
        }
      }
      
      // 保存された特徴をストレージに書き込み
      const profilesObj = Object.fromEntries(this.savedProfiles);
      await chrome.storage.local.set({ savedProfiles: profilesObj });
      console.log('終了時特徴保存完了:', profilesObj);
      
    } catch (error) {
      console.log('終了時特徴保存エラー:', error);
    }
  }

  // ウィンドウが既存の特徴と一致するかチェック
  async tryRestoreWindowColor(windowId) {
    const profile = await this.generateWindowProfile(windowId);
    if (profile && this.savedProfiles.has(profile)) {
      const color = this.savedProfiles.get(profile);
      this.windowColors.set(windowId.toString(), color);
      this.windowProfiles.set(windowId.toString(), profile);
      console.log(`ウィンドウ ${windowId} の色を復元: ${profile} → ${color}`);
      return color;
    }
    return null;
  }
}

const colorManager = new WindowColorManager();

// Chrome終了時に全ウィンドウ特徴を保存
chrome.runtime.onSuspend.addListener(() => {
  console.log('Chrome終了処理開始');
  colorManager.saveAllWindowProfiles();
});

// Service Workerが終了する前にも保存
chrome.runtime.onSuspendCanceled.addListener(() => {
  console.log('終了処理がキャンセルされました');
});

// アラームで定期的に保存（フォールバック）
chrome.alarms.create('saveProfiles', { periodInMinutes: 5 });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'saveProfiles') {
    console.log('定期的な特徴保存実行');
    colorManager.saveAllWindowProfiles();
  }
});

// 新しいウィンドウが作成されたとき
chrome.windows.onCreated.addListener(async (window) => {
  console.log(`新しいウィンドウ ${window.id} が作成された`);
  // 少し待ってから色の復元を試行
  setTimeout(async () => {
    const restoredColor = await colorManager.tryRestoreWindowColor(window.id);
    if (restoredColor) {
      // そのウィンドウの全タブに色を適用
      chrome.tabs.query({ windowId: window.id }, (tabs) => {
        tabs.forEach(tab => {
          applyColorToTab(tab.id, restoredColor);
        });
      });
    }
  }, 1000); // 1秒待ってウィンドウが完全に初期化されるのを待つ
});

// 新しいタブが作成されたとき
chrome.tabs.onCreated.addListener(async (tab) => {
  if (tab.windowId) {
    const color = colorManager.getWindowColor(tab.windowId);
    if (color) {
      console.log(`新しいタブ ${tab.id} にウィンドウ ${tab.windowId} の色 ${color} を適用`);
      applyColorToTabWithRetry(tab.id, color);
    }
  }
});

// タブが更新されたとき（ページ遷移など）
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (tab.windowId) {
    const color = colorManager.getWindowColor(tab.windowId);
    if (color) {
      if (changeInfo.status === 'loading' || changeInfo.status === 'complete') {
        console.log(`タブ ${tabId} に色 ${color} を適用`);
        applyColorToTab(tabId, color);
      }
    }
  }
});

// タブが別のウィンドウに移動されたとき
chrome.tabs.onAttached.addListener(async (tabId, attachInfo) => {
  const windowId = attachInfo.newWindowId;
  
  // 移動先ウィンドウに他のタブが存在するかチェック
  chrome.tabs.query({ windowId: windowId }, (tabs) => {
    const isNewWindow = tabs.length === 1; // 移動してきたタブだけなら新しい独立ウィンドウ
    
    if (isNewWindow) {
      // 新しいウィンドウになった場合：一時保存した色をウィンドウ色として設定
      const savedColor = colorManager.detachedTabColors.get(tabId.toString());
      if (savedColor) {
        console.log(`タブ ${tabId} が独立ウィンドウ ${windowId} になった、保存された色 ${savedColor} をウィンドウ色として設定`);
        colorManager.setWindowColor(windowId, savedColor);
        // 一時保存した色を削除
        colorManager.detachedTabColors.delete(tabId.toString());
        setTimeout(() => {
          applyColorToTab(tabId, savedColor);
        }, 200);
      }
    } else {
      // 既存のウィンドウに移動した場合：移動先ウィンドウの色を適用
      // 一時保存した色をクリーンアップ
      colorManager.detachedTabColors.delete(tabId.toString());
      
      const color = colorManager.getWindowColor(windowId);
      if (color) {
        console.log(`タブ ${tabId} がウィンドウ ${windowId} に移動、ウィンドウの色 ${color} を適用`);
        setTimeout(() => {
          applyColorToTab(tabId, color);
        }, 200);
      } else {
        console.log(`タブ ${tabId} がウィンドウ ${windowId} に移動、色設定なし - 色を削除`);
        setTimeout(() => {
          removeColorFromTab(tabId);
        }, 200);
      }
    }
  });
});

// タブが別のウィンドウから切り離されたとき
chrome.tabs.onDetached.addListener(async (tabId, detachInfo) => {
  console.log(`タブ ${tabId} がウィンドウ ${detachInfo.oldWindowId} から切り離された`);
  
  // 切り離したタブの色を一時保存
  const oldWindowColor = colorManager.getWindowColor(detachInfo.oldWindowId);
  if (oldWindowColor) {
    colorManager.detachedTabColors.set(tabId.toString(), oldWindowColor);
    console.log(`タブ ${tabId} の色 ${oldWindowColor} を一時保存`);
  }
});

// アクティブなタブが変更されたとき
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const color = colorManager.getWindowColor(activeInfo.windowId);
  if (color) {
    console.log(`アクティブタブ変更: タブ ${activeInfo.tabId} に色 ${color} を適用`);
    applyColorToTab(activeInfo.tabId, color);
  }
});

// ウィンドウが閉じられたときに色設定をクリーンアップ
chrome.windows.onRemoved.addListener((windowId) => {
  console.log(`ウィンドウ ${windowId} が閉じられたため色設定を削除`);
  colorManager.removeWindowColor(windowId);
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
        setTimeout(tryApply, 300 * retries);
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
    throw error;
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
  } else if (message.action === 'getCurrentWindowColor') {
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
  
  return true;
});
