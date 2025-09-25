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
    document.querySelectorAll('.color-option').forEach(option => {
      if (option.dataset.color === this.currentColor) {
        option.classList.add('selected');
      } else {
        option.classList.remove('selected');
      }
    });
  }

  setupEventListeners() {
    document.querySelectorAll('.color-option').forEach(option => {
      option.addEventListener('click', async () => {
        const color = option.dataset.color;
        await this.setColor(color);
      });
    });

    document.getElementById('removeColor').addEventListener('click', async () => {
      await this.removeColor();
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
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new PopupManager();
});
