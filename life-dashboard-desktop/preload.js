const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
  getDisplays: () => ipcRenderer.invoke('get-displays'),
  
  // Desktop-specific features
  isDesktop: true,
  platform: process.platform,
  
  // Window controls
  minimize: () => ipcRenderer.invoke('minimize-window'),
  maximize: () => ipcRenderer.invoke('maximize-window'),
  close: () => ipcRenderer.invoke('close-window'),
  
  // Utility functions
  openExternal: (url) => ipcRenderer.invoke('open-external', url)
});

// Add desktop-specific styling when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // Add desktop class to body for desktop-specific styling
  document.body.classList.add('desktop-widget');
  
  // Add draggable area to the top of the window
  const dragArea = document.createElement('div');
  dragArea.id = 'drag-area';
  dragArea.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: 30px;
    background: rgba(0, 0, 0, 0.1);
    -webkit-app-region: drag;
    z-index: 10000;
    cursor: move;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 10px;
    font-size: 12px;
    color: rgba(255, 255, 255, 0.7);
    backdrop-filter: blur(10px);
  `;
  
  dragArea.innerHTML = `
    <span>Life Dashboard</span>
    <div style="-webkit-app-region: no-drag;">
      <button id="minimize-btn" style="background: none; border: none; color: white; cursor: pointer; padding: 2px 6px; margin-left: 5px;">−</button>
      <button id="close-btn" style="background: none; border: none; color: white; cursor: pointer; padding: 2px 6px; margin-left: 5px;">×</button>
    </div>
  `;
  
  document.body.appendChild(dragArea);
  
  // Add window control functionality
  document.getElementById('minimize-btn').addEventListener('click', () => {
    window.electronAPI.minimize();
  });
  
  document.getElementById('close-btn').addEventListener('click', () => {
    window.electronAPI.close();
  });
  
  // Add padding to main content to account for drag area
  const mainContent = document.querySelector('main') || document.body;
  if (mainContent) {
    mainContent.style.paddingTop = '30px';
  }
});

// Add desktop-specific console styling
console.log('%c🖥️ Life Dashboard Desktop Widget', 'color: #4CAF50; font-weight: bold; font-size: 14px;');
console.log('%c• Transparent desktop widget mode', 'color: #2196F3; font-size: 12px;');
console.log('%c• Right-click system tray icon for settings', 'color: #2196F3; font-size: 12px;');
console.log('%c• Drag the top bar to move the widget', 'color: #2196F3; font-size: 12px;'); 