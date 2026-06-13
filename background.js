chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== "complete" || !tab.url) return;
  const { serverUrl } = await chrome.storage.local.get("serverUrl");
  if (!serverUrl) return;

  if (tab.url.startsWith(serverUrl.split("/dorf")[0])) {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["content_scripts/combined-bot.js"]
    });
    console.log("✅ Combined Bot injected into", tab.url);
  }
});
