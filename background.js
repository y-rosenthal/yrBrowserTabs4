// Background service worker
// Currently not needed for the popup functionality but good to have for future expansion
chrome.runtime.onInstalled.addListener(() => {
  console.log('TabMaster AI installed');
});