console.log("Insta Reel Tracker: Content script loaded.");

// --- Selectors ---
// !! Verify these selectors if Instagram changes its structure !!
const linkSelector = "a._a6hd"; // Primary anchor: the link to the post
const iconSelector = 'svg[aria-label="View Count Icon"]'; // The specific icon for views
// --- End Selectors ---

// Keep track of links processed in this specific page load to avoid spamming background
const processedLinks = new Set();

/**
 * Parses Instagram view count text (e.g., "1.5M", "250K", "987") into a number.
 */
function parseViewCount(text) {
  if (!text) {
    return 0;
  }
  const cleanedText = text.trim().replace(/,/g, "");
  const value = parseFloat(cleanedText);
  if (isNaN(value)) {
    return 0;
  }
  if (cleanedText.toLowerCase().includes("m")) {
    return Math.round(value * 1000000);
  } else if (cleanedText.toLowerCase().includes("k")) {
    return Math.round(value * 1000);
  } else {
    return Math.round(value);
  }
}

/**
 * Processes a link element to find its container and extract Reel data.
 * @param {HTMLAnchorElement} linkElement The <a> element to process.
 */
function processLink(linkElement) {
  if (!linkElement || !linkElement.href) {
    return;
  }

  const reelLink = linkElement.href;

  // Filter out non-post links
  if (!reelLink.includes("/p/") && !reelLink.includes("/reel/")) {
    return;
  }

  // Only process if we haven't seen this link in this session
  if (processedLinks.has(reelLink)) {
    return;
  }
  processedLinks.add(reelLink); // Mark as processed for this session

  const postContainer = linkElement; // The <a> tag is the container
  let viewCount = 0;

  // --- THE FIX: Find the icon first, then get the number next to it ---
  const viewCountIcon = postContainer.querySelector(iconSelector);

  // If the icon exists, we know it's a video with views.
  if (viewCountIcon) {
    // The structure is usually: <div> -> [icon] </div> <span> [number] </span>
    // So we find the icon's parent div and get the next element sibling.
    const iconWrapper = viewCountIcon.parentElement;
    if (iconWrapper) {
      const viewSpan = iconWrapper.nextElementSibling;
      if (viewSpan && viewSpan.tagName === "SPAN") {
        viewCount = parseViewCount(viewSpan.textContent);
      }
    }
  }

  console.log(
    `Insta Reel Tracker: Found Post - Views: ${viewCount}, Link: ${reelLink}`
  );

  // Send data to background script for storage
  chrome.runtime.sendMessage(
    {
      action: "trackReel",
      data: { link: reelLink, views: viewCount },
    },
    (response) => {
      if (chrome.runtime.lastError) {
        console.error(
          "Content Script Error sending message:",
          chrome.runtime.lastError.message
        );
      }
    }
  );
}

/**
 * Scans the entire page for any new reel links that haven't been processed yet.
 */
function scanPageForReels() {
  // Find all links that match our selector on the entire page
  const allLinksOnPage = document.querySelectorAll(linkSelector);

  // Process each link found. The processLink function will handle duplicates and filtering.
  allLinksOnPage.forEach(processLink);
}

// --- Throttled Scroll Listener ---
function throttle(func, limit) {
  let inThrottle;
  return function () {
    const args = arguments;
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

const throttleLimit = 500; // Scan at most once every 500ms during scroll.

// Add the throttled listener to the window's scroll event
window.addEventListener("scroll", throttle(scanPageForReels, throttleLimit));

console.log(`Insta Reel Tracker: Scroll listener added (throttled to ${throttleLimit}ms).`);

// Run one initial scan immediately on load to catch the first batch of posts
scanPageForReels();