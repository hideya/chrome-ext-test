# chrome-ext-test

## Window Color Manager 🎨

A Chrome extension that helps organize your work by color-coding multiple windows. Display colored bars at the top of each window to instantly identify which window belongs to which task.

![Window Color Manager Demo](https://img.shields.io/badge/Chrome-Extension-4285F4?style=for-the-badge&logo=googlechrome&logoColor=white)

## 🚀 Features

- **Window-based Color Coding**: Assign different colors to each Chrome window
- **Auto Color Application**: New tabs automatically inherit their window's color
- **Tab Drag Support**: When tabs are moved between windows, they automatically adopt the destination window's color
- **Preset Colors**: 8 commonly used preset colors
- **Custom Colors**: Full color picker for unlimited color choices
- **Preview Mode**: Preview colors before applying them
- **Data Persistence**: Color settings are saved and restored after browser restart

## 📥 Installation

### Loading as Developer Extension

1. **Enable Developer Mode**
   - Open Chrome and navigate to `chrome://extensions/`
   - Toggle "Developer mode" on in the top right corner

2. **Load the Extension**
   - Click "Load unpacked" button
   - Select this project folder
   - Click "Select Folder"

3. **Verify Installation**
   - Click the extension menu icon (puzzle piece) in Chrome's top right
   - Confirm "Window Color Manager" appears in the list

## 🎯 Usage

### Basic Usage

1. **Set a Color**
   - Click "Window Color Manager" from Chrome's extension menu
   - In the popup, click your preferred color
   - Or use the custom color picker and click "Apply"

2. **See the Effect**
   - A 5px colored bar appears at the top of the page
   - New tabs in the same window automatically get the same color

3. **Multi-Window Organization**
   - Open new windows (Cmd+N / Ctrl+N)
   - Assign different colors to each window
   - Switch between windows and enjoy easy visual identification

### Advanced Features

- **Preview Mode**: Click "Preview Mode" to temporarily preview colors by hovering over them
- **Remove Color**: Use "Remove Color" button to clear the current window's color setting
- **Tab Movement**: Drag and drop tabs between windows - they'll automatically adopt the destination window's color

## 🔧 Development & Customization

### File Structure

```
chrome-ext-test/
├── manifest.json          # Extension configuration
├── background.js           # Background script (main logic)
├── content.js             # Content script (page injection)
├── content.css            # Color bar styles
├── popup.html             # Settings panel HTML
├── popup.css              # Settings panel styles
├── popup.js               # Settings panel functionality
├── icon128.svg            # Icon file (SVG format)
├── ICONS_README.txt       # Icon-related notes
└── README.md              # This file
```

### Reload After Code Changes

1. **Edit Files**
   - Make changes to any file and save

2. **Reload Extension**
   - Navigate to `chrome://extensions/`
   - Click the "🔄" (reload) button for "Window Color Manager"

3. **Test Changes**
   - Verify your changes work as expected
   - If there are errors, click "Errors" link for details

### Debugging

- **Background Script Debugging**:
  - Go to `chrome://extensions/` → "Details" → "Inspect views: background page"
  - Check Console tab for logs and errors

- **Content Script Debugging**:
  - Press F12 on any page to open Developer Tools
  - Check Console tab for errors and logs

- **Popup Debugging**:
  - Right-click extension icon → "Inspect popup"

## 🎨 Customization Examples

### Change Color Bar Height

In `content.css`, modify the `.window-color-bar` section:
```css
.window-color-bar {
  height: 8px !important;  /* Default is 5px */
}
```

### Add Custom Preset Colors

In `popup.html`, add new colors to the `.color-palette` section:
```html
<div class="color-option" data-color="#YOUR_COLOR" style="background: #YOUR_COLOR;" title="Custom Color"></div>
```

## 🐛 Troubleshooting

### Common Issues

**Q: Colors not applying**
- A: Try refreshing the page (F5)
- A: The extension doesn't work on Chrome special pages (`chrome://` URLs)

**Q: Icon not showing**
- A: The extension works fine without icon files

**Q: New tabs don't get colors**
- A: Try reloading the extension
- A: Check for errors in the background page console

**Q: Color settings not saving**
- A: Verify Chrome storage permissions are correctly set

### Checking Error Logs

1. Open `chrome://extensions/`
2. Click "Errors" for "Window Color Manager" (if visible)
3. Or go to "Details" → "Inspect views: background page" to check console

## 🌐 Publishing Guide

### Publishing to Chrome Web Store

1. **Register with Chrome Developer Dashboard**
   - Visit [Chrome Developer Dashboard](https://chrome.google.com/webstore/devconsole/)
   - Sign in with your Google account
   - Pay the one-time $5 developer registration fee

2. **Package the Extension**
   - Update the version number in manifest.json for production
   - Add icon files (16px, 48px, 128px) in PNG format
   - Remove unnecessary files (development logs, etc.)
   - Compress the entire project folder into a ZIP file

3. **Upload to Store**
   - Click "New Item"
   - Upload the ZIP file
   - Fill in store listing information:
     - Title
     - Detailed description
     - Screenshots (1280x800 recommended)
     - Category selection
     - Language settings

4. **Review and Publication**
   - Click "Submit for review"
   - Review process typically takes several days to weeks
   - Once approved, it will automatically be published on Chrome Web Store

### Publishing to GitHub

1. **Create Repository**
   ```bash
   cd /Users/hideya/Desktop/WS/AT/chrome-ext-test
   git init
   git add .
   git commit -m "Initial commit: Window Color Manager v1.0.0"
   ```

2. **Push to GitHub**
   - Create a new repository on GitHub
   - Connect local repository to remote:
   ```bash
   git remote add origin https://github.com/yourusername/window-color-manager.git
   git branch -M main
   git push -u origin main
   ```

3. **Create Release**
   - Go to "Releases" → "Create a new release" on GitHub repository page
   - Set tag version (e.g., v1.0.0)
   - Write release notes
   - Attach ZIP file (optional)

### Pre-Publication Checklist

- [ ] Verify all features work correctly
- [ ] Test on multiple websites
- [ ] Check that no errors appear in error logs
- [ ] Update version number in manifest.json
- [ ] Add icon files (PNG format)
- [ ] Ensure README.md contains up-to-date information
- [ ] Include privacy policy (if needed)

### Additional Publishing Platforms

**Microsoft Edge Add-ons**
- Visit [Microsoft Partner Center](https://partner.microsoft.com/)
- Similar process to Chrome Web Store
- Can often reuse the same ZIP package

**Firefox Add-ons (AMO)**
- Visit [Firefox Add-on Developer Hub](https://addons.mozilla.org/developers/)
- May require manifest.json modifications for Firefox compatibility

## 📝 Version History

### v1.0.0
- Initial release
- Window-based color coding
- Auto color application for new tabs
- Tab drag color change support
- Preset and custom color support
- Preview functionality

## 🤝 Contributing

Bug reports and feature requests are welcome!

## 📄 License

This project is released under the MIT License.

---

**Simple color-coding tool for better productivity** 🚀