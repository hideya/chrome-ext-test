class PopupManager {
  constructor() {
    this.currentWindowId = null;
    this.currentColor = null;
    this.init();
  }

  async init() {
    await this.getCurrentWindow();
    await this.loadCurrentColor();
    this.setupEventListeners();
    this.updateUI();
  }

  async getCurrentWindow() {
    try {
      const window = await chrome.windows.getCurrent();
      this.currentWindowId = window.id;
    } catch (error) {
      console.error('ウィンドウ情報の取得エラー:', error);
    }
  }

  async loadCurrentColor() {
    try {
      // 現在のウィンドウの実効的な色を取得（タブ色またはウィンドウ色）
      const response = await chrome.runtime.sendMessage({
        action: 'getCurrentWindowEffectiveColor',
        windowId: this.currentWindowId
      });
      this.currentColor = response.color;
    } catch (error) {
      console.error('色情報の取得エラー:', error);
    }
  }

  updateUI() {
    // 対応するカラーオプションを選択状態にする
    document.querySelectorAll('.color-option').forEach(option => {
      if (option.dataset.color === this.currentColor) {
        option.classList.add('selected');
      } else {
        option.classList.remove('selected');
      }
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

    // 色の削除
    document.getElementById('removeColor').addEventListener('click', async () => {
      await this.removeColor();
      this.showStatus('色を削除しました');
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
