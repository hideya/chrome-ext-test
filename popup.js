class PopupManager {
  constructor() {
    this.currentWindowId = null;
    this.currentColor = null;
    this.previewMode = false;
    this.init();
  }

  async init() {
    await this.getCurrentWindow();
    await this.loadCurrentColor();
    await this.loadColorHistory();
    this.setupEventListeners();
    this.updateUI();
  }

  async getCurrentWindow() {
    try {
      const window = await chrome.windows.getCurrent();
      this.currentWindowId = window.id;
      document.getElementById('windowId').textContent = window.id;
    } catch (error) {
      console.error('ウィンドウ情報の取得エラー:', error);
    }
  }

  async loadCurrentColor() {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'getWindowColor',
        windowId: this.currentWindowId
      });
      this.currentColor = response.color;
    } catch (error) {
      console.error('色情報の取得エラー:', error);
    }
  }

  async loadColorHistory() {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'getColorHistory'
      });
      this.colorHistory = response.history || [];
    } catch (error) {
      console.error('色履歴の取得エラー:', error);
      this.colorHistory = [];
    }
  }

  updateUI() {
    const currentColorDisplay = document.getElementById('currentColorDisplay');
    
    if (this.currentColor) {
      currentColorDisplay.style.backgroundColor = this.currentColor;
      currentColorDisplay.textContent = '';
      currentColorDisplay.title = this.currentColor;
      
      // 対応するカラーオプションを選択状態にする
      document.querySelectorAll('.color-option').forEach(option => {
        if (option.dataset.color === this.currentColor) {
          option.classList.add('selected');
        } else {
          option.classList.remove('selected');
        }
      });
    } else {
      currentColorDisplay.style.backgroundColor = '#f8f9fa';
      currentColorDisplay.textContent = '未設定';
      currentColorDisplay.title = '';
      
      document.querySelectorAll('.color-option').forEach(option => {
        option.classList.remove('selected');
      });
    }

    // 色履歴を更新
    this.updateColorHistory();
  }

  updateColorHistory() {
    const historyPalette = document.getElementById('historyPalette');
    historyPalette.innerHTML = '';
    
    if (this.colorHistory.length === 0) {
      historyPalette.innerHTML = '<p class="no-history">まだ使用履歴がありません</p>';
      return;
    }
    
    // 最新の色から順番に表示（最大10個）
    const recentColors = [...this.colorHistory].reverse().slice(0, 10);
    
    recentColors.forEach(color => {
      const colorDiv = document.createElement('div');
      colorDiv.className = 'history-color';
      colorDiv.style.backgroundColor = color;
      colorDiv.dataset.color = color;
      colorDiv.title = `以前に使用: ${color}`;
      
      // 現在の色と同じなら選択状態に
      if (color === this.currentColor) {
        colorDiv.classList.add('selected');
      }
      
      historyPalette.appendChild(colorDiv);
    });
  }

  setupEventListeners() {
    // プリセットカラーの選択
    document.querySelectorAll('.color-option').forEach(option => {
      option.addEventListener('click', async () => {
        const color = option.dataset.color;
        await this.setColor(color);
        this.showStatus('色を適用しました！');
      });
    });

    // カスタムカラーの適用
    document.getElementById('applyCustom').addEventListener('click', async () => {
      const color = document.getElementById('customColor').value;
      await this.setColor(color);
      this.showStatus('カスタム色を適用しました！');
    });

    // カスタムカラー選択時の即時プレビュー
    document.getElementById('customColor').addEventListener('input', (e) => {
      if (this.previewMode) {
        this.previewColor(e.target.value);
      }
    });

    // 色の削除
    document.getElementById('removeColor').addEventListener('click', async () => {
      await this.removeColor();
      this.showStatus('色を削除しました');
    });

    // プレビューモード切り替え
    document.getElementById('previewMode').addEventListener('click', () => {
      this.togglePreviewMode();
    });

    // プリセットカラーホバー時のプレビュー
    document.querySelectorAll('.color-option').forEach(option => {
      option.addEventListener('mouseenter', () => {
        if (this.previewMode) {
          this.previewColor(option.dataset.color);
        }
      });
    });

    // 色履歴のクリックイベント（動的要素なので委譲）
    document.getElementById('historyPalette').addEventListener('click', async (e) => {
      if (e.target.classList.contains('history-color')) {
        const color = e.target.dataset.color;
        await this.setColor(color);
        this.showStatus('履歴から色を適用しました！');
      }
    });

    // 色履歴のホバープレビュー（動的要素なので委譲）
    document.getElementById('historyPalette').addEventListener('mouseenter', (e) => {
      if (e.target.classList.contains('history-color') && this.previewMode) {
        this.previewColor(e.target.dataset.color);
      }
    }, true);

    // 色履歴のクリアボタン
    document.getElementById('clearHistory').addEventListener('click', async () => {
      await this.clearColorHistory();
      this.showStatus('色履歴をクリアしました');
    });
  }

  async setColor(color) {
    try {
      await chrome.runtime.sendMessage({
        action: 'setWindowColor',
        windowId: this.currentWindowId,
        color: color
      });
      
      this.currentColor = color;
      // 色履歴を再読み込み
      await this.loadColorHistory();
      this.updateUI();
    } catch (error) {
      console.error('色設定エラー:', error);
      this.showStatus('エラーが発生しました', 'error');
    }
  }

  async removeColor() {
    try {
      await chrome.runtime.sendMessage({
        action: 'removeWindowColor',
        windowId: this.currentWindowId
      });
      
      this.currentColor = null;
      this.updateUI();
    } catch (error) {
      console.error('色削除エラー:', error);
      this.showStatus('エラーが発生しました', 'error');
    }
  }

  async previewColor(color) {
    try {
      // 現在のアクティブタブに一時的に色を適用
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs.length > 0) {
        await chrome.tabs.sendMessage(tabs[0].id, {
          action: 'applyColor',
          color: color,
          preview: true
        });
      }
    } catch (error) {
      // プレビューエラーは無視
    }
  }

  togglePreviewMode() {
    this.previewMode = !this.previewMode;
    const button = document.getElementById('previewMode');
    
    if (this.previewMode) {
      button.textContent = 'プレビュー: ON';
      button.style.background = '#27ae60';
      this.showStatus('プレビューモード有効');
    } else {
      button.textContent = 'プレビューモード';
      button.style.background = '#f39c12';
      this.showStatus('プレビューモード無効');
      
      // 元の色に戻す
      if (this.currentColor) {
        this.previewColor(this.currentColor);
      }
    }
  }

  showStatus(message, type = 'success') {
    // 既存のステータスメッセージを削除
    const existing = document.querySelector('.status-message');
    if (existing) {
      existing.remove();
    }

    const statusDiv = document.createElement('div');
    statusDiv.className = 'status-message';
    if (type === 'error') {
      statusDiv.style.background = '#e74c3c';
    }
    statusDiv.textContent = message;
    
    document.querySelector('.container').insertBefore(
      statusDiv, 
      document.querySelector('.info')
    );

    // 3秒後に消去
    setTimeout(() => {
      statusDiv.remove();
    }, 3000);
  }
}

// ポップアップが読み込まれたら初期化
document.addEventListener('DOMContentLoaded', () => {
  new PopupManager();
});