// --- NEW: Queue system to prevent race conditions ---
let messageQueue = [];
let isProcessingQueue = false;

// Initialize storage if it doesn't exist
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(["trackedReels"], (result) => {
    if (!result.trackedReels) {
      chrome.storage.local.set({ trackedReels: [] });
      console.log("Background: Initialized trackedReels storage.");
    }
  });
});

/**
 * Processes one item from the queue, saves it to storage,
 * and then calls itself to process the next item.
 */
function processQueue() {
  if (isProcessingQueue || messageQueue.length === 0) {
    return; // Don't run if already processing or if queue is empty
  }
  isProcessingQueue = true; // Set the "lock"

  const newReel = messageQueue.shift(); // Get the oldest item from the queue

  chrome.storage.local.get(["trackedReels"], (result) => {
    if (chrome.runtime.lastError) {
      console.error("Background: Error getting storage:", chrome.runtime.lastError);
      isProcessingQueue = false; // Release lock on error
      processQueue(); // Try next item
      return;
    }

    let reels = result.trackedReels || [];
    const exists = reels.some((reel) => reel.link === newReel.link);

    if (!exists) {
      reels.push(newReel);
      chrome.storage.local.set({ trackedReels: reels }, () => {
        if (chrome.runtime.lastError) {
          console.error("Background: Error setting storage:", chrome.runtime.lastError);
        } else {
          console.log(`Background: Reel added. Total: ${reels.length}. Link: ${newReel.link}`);
        }
        // IMPORTANT: Release lock and process next item AFTER storage is set
        isProcessingQueue = false;
        processQueue();
      });
    } else {
      // If item already exists, just release lock and move on
      isProcessingQueue = false;
      processQueue();
    }
  });
}

// Listener for messages from content script or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // --- Handle Tracking Request from Content Script ---
  if (request.action === "trackReel" && request.data) {
    // Instead of processing here, just add to the queue
    messageQueue.push(request.data);
    // And kick off the processor (it won't run if already running)
    processQueue();
    sendResponse({ status: "Reel queued for tracking" });
    return true; // Acknowledge message was received
  }

  // --- Handle Download Request from Popup ---
  if (request.action === "downloadData") {
    console.log("Background: Received downloadData request.");
    chrome.storage.local.get(["trackedReels"], (result) => {
      if (chrome.runtime.lastError) {
        console.error("Background: Error getting storage for download:", chrome.runtime.lastError);
        sendResponse({ status: "Error getting data for download" });
        return;
      }

      let reels = result.trackedReels || [];
      if (reels.length === 0) {
        console.log("Background: No reels tracked to download.");
        sendResponse({ status: "No data to download" });
        return;
      }

      // Sort by views descending
      reels.sort((a, b) => b.views - a.views);

      // Format data as text
      let fileContent = `Total Reels Tracked: ${reels.length}\n\n`;
      reels.forEach((reel) => {
        fileContent += `Views: ${reel.views} - Link: ${reel.link}\n`;
      });

      // Create Blob and Download URL
      const blob = new Blob([fileContent], { type: "text/plain" });
      const url = URL.createObjectURL(blob);

      // Trigger download
      chrome.downloads.download(
        {
          url: url,
          filename: "instagram_reels_sorted.txt",
          saveAs: true,
        },
        (downloadId) => {
          if (chrome.runtime.lastError) {
            console.error("Background: Download failed:", chrome.runtime.lastError);
            sendResponse({ status: "Download failed" });
          } else {
            console.log("Background: Download initiated with ID:", downloadId);
            sendResponse({ status: "Download started" });
          }
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        }
      );
    });
    return true; // Indicate asynchronous response
  }

  // --- Handle Clear Data Request from Popup ---
  if (request.action === "clearData") {
    console.log("Background: Received clearData request.");
    // Clear the queue first
    messageQueue = [];
    chrome.storage.local.set({ trackedReels: [] }, () => {
      if (chrome.runtime.lastError) {
        console.error("Background: Error clearing storage:", chrome.runtime.lastError);
        sendResponse({ status: "Error clearing data" });
      } else {
        console.log("Background: Tracked Reels data cleared.");
        sendResponse({ status: "Data cleared successfully" });
      }
    });
    return true; // Indicate asynchronous response
  }

  return false;
});