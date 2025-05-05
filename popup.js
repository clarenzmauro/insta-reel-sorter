const downloadButton = document.getElementById("downloadButton");
const clearButton = document.getElementById("clearButton");
const statusDiv = document.getElementById("status");

function setStatus(message, isError = false) {
  statusDiv.textContent = message;
  statusDiv.style.color = isError ? "red" : "green";
  // Clear status after a few seconds
  setTimeout(() => {
    statusDiv.textContent = "";
  }, 4000);
}

downloadButton.addEventListener("click", () => {
  statusDiv.textContent = "Requesting download...";
  statusDiv.style.color = "black";
  chrome.runtime.sendMessage({ action: "downloadData" }, (response) => {
    if (chrome.runtime.lastError) {
      console.error("Popup Error:", chrome.runtime.lastError);
      setStatus(`Error: ${chrome.runtime.lastError.message}`, true);
    } else if (response?.status.startsWith("Error")) {
      console.error("Popup received error status:", response.status);
      setStatus(response.status, true);
    } else {
      console.log("Popup received status:", response?.status);
      setStatus(response?.status || "Download initiated.", false);
    }
  });
});

clearButton.addEventListener("click", () => {
  if (confirm("Are you sure you want to clear all tracked Reel data?")) {
    statusDiv.textContent = "Clearing data...";
    statusDiv.style.color = "black";
    chrome.runtime.sendMessage({ action: "clearData" }, (response) => {
      if (chrome.runtime.lastError) {
        console.error("Popup Error:", chrome.runtime.lastError);
        setStatus(`Error: ${chrome.runtime.lastError.message}`, true);
      } else if (response?.status.startsWith("Error")) {
        console.error("Popup received error status:", response.status);
        setStatus(response.status, true);
      } else {
        console.log("Popup received status:", response?.status);
        setStatus(response?.status || "Data cleared.", false);
      }
    });
  }
});
