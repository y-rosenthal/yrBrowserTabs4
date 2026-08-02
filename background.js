// Background service worker.
// The extension has no action popup: clicking the toolbar icon always opens
// the full-tab dashboard (focusing an existing dashboard tab in the current
// window if one is already open).
chrome.runtime.onInstalled.addListener(() => {
  console.log('TabMaster AI installed');
});

chrome.action.onClicked.addListener(async () => {
  const appUrl = chrome.runtime.getURL('app.html');
  try {
    const currentWindow = await chrome.windows.getCurrent();
    const tabs = await chrome.tabs.query({ url: appUrl, windowId: currentWindow.id });
    if (tabs.length > 0) {
      await chrome.windows.update(currentWindow.id, { focused: true });
      await chrome.tabs.update(tabs[0].id, { active: true });
    } else {
      await chrome.tabs.create({ url: appUrl, windowId: currentWindow.id });
    }
  } catch (e) {
    // Fallback (e.g. no current window): open the dashboard wherever Chrome puts it.
    await chrome.tabs.create({ url: appUrl });
  }
});
