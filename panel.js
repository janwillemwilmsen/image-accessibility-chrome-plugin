// References to UI elements
const totalImagesEl = document.getElementById('total-images');
const altPresentEl = document.getElementById('alt-text-present');
const altEmptyEl = document.getElementById('alt-text-empty');
const altMissingEl = document.getElementById('alt-text-missing');
const toggleAltButton = document.getElementById('toggle-alt-display');
const reloadButton = document.getElementById('reload-page');
const filterTypeEl = document.getElementById('filter-type');
const filterAltStatusEl = document.getElementById('filter-alt-status');
const imageListEl = document.getElementById('image-list');

let associatedTabId = null; // Store the ID of the tab this panel is CURRENTLY targeting
let allImagesData = [];
let isAltDisplayActive = false;

// Function to update the overview statistics
function updateOverview(images) {
    const total = images.length;
    const present = images.filter(img => img.altStatus === 'present').length;
    const empty = images.filter(img => img.altStatus === 'empty').length;
    const missing = images.filter(img => img.altStatus === 'missing').length;

    totalImagesEl.textContent = total;
    altPresentEl.textContent = present;
    altEmptyEl.textContent = empty;
    altMissingEl.textContent = missing;
}

// Function to render the image list based on filters
function renderImageList() {
    if (!associatedTabId) {
        imageListEl.innerHTML = '<li>Panel not associated with an active tab.</li>';
        return;
    }
    const typeFilter = filterTypeEl.value;
    const altFilter = filterAltStatusEl.value;

    const filteredImages = allImagesData.filter(img => {
        const typeMatch = typeFilter === 'all' || img.type === typeFilter;
        const altMatch = altFilter === 'all' || img.altStatus === altFilter;
        return typeMatch && altMatch;
    });

    imageListEl.innerHTML = ''; // Clear previous list

    if (filteredImages.length === 0) {
        imageListEl.innerHTML = '<li>No images match the current filters.</li>';
        return;
    }

    filteredImages.forEach(img => {
        const li = document.createElement('li');

        // Add thumbnail
        const thumbnail = document.createElement('img');
        thumbnail.src = img.src || 'icons/placeholder.png'; // Handle missing src?
        thumbnail.classList.add('thumbnail');
        thumbnail.alt = 'Thumbnail';
        li.appendChild(thumbnail);

        // Add info
        const infoDiv = document.createElement('div');
        infoDiv.classList.add('info');
        infoDiv.innerHTML = `
            <p><strong>Src:</strong> ${img.src ? escapeHTML(img.src) : 'N/A'}</p>
            <p><strong>Alt:</strong> <span class="alt-status-${img.altStatus}">${escapeHTML(img.altValue !== null ? img.altValue : `(${img.altStatus})`)}</span></p>
            <p><strong>Type:</strong> ${img.type.toUpperCase()}</p>
        `;
        li.appendChild(infoDiv);

        imageListEl.appendChild(li);
    });
}

// --- Communication ---

// Function to request image data from the content script for the associated tab
async function requestImageData() {
    if (!associatedTabId) {
        console.warn("requestImageData called but no associatedTabId is set.");
        imageListEl.innerHTML = '<li>No active tab identified.</li>';
        return;
    }
    console.log(`Requesting image data from associated tab: ${associatedTabId}`);
    imageListEl.innerHTML = '<li>Loading image data...</li>'; // Provide feedback
    try {
        const response = await chrome.tabs.sendMessage(associatedTabId, { type: 'GET_IMAGE_DATA' });
        if (response && response.images) {
            allImagesData = response.images;
            updateOverview(allImagesData);
            renderImageList();
        } else if (response && response.error) {
             console.error("Content script error:", response.error);
             imageListEl.innerHTML = `<li>Error in content script: ${escapeHTML(response.error)}</li>`;
        } else {
            console.log("No response or no images found.");
            imageListEl.innerHTML = '<li>No images found on the page or content script not ready.</li>';
        }
    } catch (error) {
        console.error(`Error sending message to content script for tab ${associatedTabId}:`, error);
        if (error.message.includes("Could not establish connection") || error.message.includes("Receiving end does not exist")) {
             // This error is common if the content script isn't injected or the tab is wrong (e.g., chrome:// URL)
             imageListEl.innerHTML = `<li>Could not connect to the page (ID: ${associatedTabId}). Is it a valid page (not chrome://)? Try reloading.</li>`;
        } else {
            imageListEl.innerHTML = `<li>Error fetching data: ${escapeHTML(error.message)}</li>`;
        }
        allImagesData = [];
        updateOverview(allImagesData);
        renderImageList(); // Render the error message
    }
}


// Function to send message to content script to toggle alt display for the associated tab
async function toggleAltDisplayOnPage() {
    if (!associatedTabId) {
        console.warn("toggleAltDisplayOnPage called before associatedTabId is set.");
        return;
    }
    isAltDisplayActive = !isAltDisplayActive;
    console.log(`Toggling alt display to ${isAltDisplayActive} on associated tab ${associatedTabId}`);
    try {
        await chrome.tabs.sendMessage(associatedTabId, { type: 'TOGGLE_ALT_DISPLAY', show: isAltDisplayActive });
        toggleAltButton.textContent = isAltDisplayActive ? 'Hide Alt Text' : 'Show Alt Text';
    } catch (error) {
        console.error(`Toggle alt display failed for tab ${associatedTabId}:`, error);
        isAltDisplayActive = !isAltDisplayActive;
        toggleAltButton.textContent = isAltDisplayActive ? 'Hide Alt Text' : 'Show Alt Text';
         imageListEl.innerHTML += `<li>Error toggling alt display: ${escapeHTML(error.message)}</li>`;
    }
}

// --- Event Listeners ---

// Reload button targets the CURRENTLY ACTIVE tab
reloadButton.addEventListener('click', async () => {
    console.log("Reload button clicked. Finding active tab...");
    imageListEl.innerHTML = '<li>Initiating reload...</li>';
    reloadButton.disabled = true;
    toggleAltButton.disabled = true;

    try {
        // 1. Find the currently active tab
        let [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true });

        if (currentTab && currentTab.id) {
            console.log(`Found active tab: ${currentTab.id}. Reloading...`);
            associatedTabId = currentTab.id; // Update our target ID

            // 2. Reload this tab
            await chrome.tabs.reload(associatedTabId);
            console.log(`Tab ${associatedTabId} reload initiated.`);

            // 3. Re-initialize the panel after a delay to fetch new data
            console.log("Scheduling panel re-initialization after reload delay...");
            // Use initPanel which now correctly identifies the active tab
            setTimeout(initPanel, 1500);
        } else {
            console.error("Could not find active tab to reload.");
            imageListEl.innerHTML = '<li>Error: Could not find active tab.</li>';
            reloadButton.disabled = false; // Re-enable on error finding tab
            toggleAltButton.disabled = false;
        }
    } catch (error) {
        // Handle errors during query or reload
        console.error("Error during reload process:", error);
        imageListEl.innerHTML = `<li>Error during reload: ${escapeHTML(error.message)}</li>`;
        reloadButton.disabled = false; // Re-enable on error
        toggleAltButton.disabled = false;
    }
});

// Toggle alt display button (uses associatedTabId)
toggleAltButton.addEventListener('click', toggleAltDisplayOnPage);

// Filter changes (acts on currently loaded data)
filterTypeEl.addEventListener('change', renderImageList);
filterAltStatusEl.addEventListener('change', renderImageList);

// --- Initialization ---

// Initialize the panel by finding the active tab and loading its data
async function initPanel() {
    console.log("Panel initializing...");
    reloadButton.disabled = true; // Disable buttons until ready
    toggleAltButton.disabled = true;
    imageListEl.innerHTML = '<li>Identifying active tab...</li>';
    associatedTabId = null; // Reset ID on init
    allImagesData = [];     // Reset data
    isAltDisplayActive = false; // Reset toggle state
    toggleAltButton.textContent = 'Show Alt Text';

    try {
        // Query for the currently active tab in the current window
        let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        if (tab && tab.id) {
            associatedTabId = tab.id;
            console.log("Panel associated with active tab:", associatedTabId);
            // Check if the URL is valid for content script injection
            if (tab.url && (tab.url.startsWith('http:') || tab.url.startsWith('https:') || tab.url.startsWith('file:'))) {
                imageListEl.innerHTML = '<li>Fetching data...</li>';
                reloadButton.disabled = false; // Enable buttons now
                toggleAltButton.disabled = false;
                await requestImageData(); // Load data for the active tab
            } else {
                console.warn(`Cannot analyze non-HTTP/HTTPS/File URL: ${tab.url}`);
                imageListEl.innerHTML = `<li>Cannot analyze this page (${escapeHTML(tab.url || 'N/A')}). Requires http, https, or file URL.</li>`;
                // Keep buttons disabled
            }
        } else {
            console.error("Could not find active tab during initialization.");
            imageListEl.innerHTML = '<li>Error: Could not find active tab.</li>';
        }
    } catch (error) {
        console.error("Error during panel initialization:", error);
        imageListEl.innerHTML = `<li>Error initializing panel: ${escapeHTML(error.message)}</li>`;
        // Keep buttons disabled
    }
}

// Initial setup when the panel's HTML content is loaded
document.addEventListener('DOMContentLoaded', initPanel);

// Listen for tab activation changes to re-initialize the panel
// This makes the panel update when the user switches tabs
chrome.tabs.onActivated.addListener(async (activeInfo) => {
    console.log("Tab activated event, re-initializing panel for tab:", activeInfo.tabId);
    // We could check if the panel is actually visible here, but re-running initPanel
    // is generally safe as it queries the *new* active tab.
    await initPanel();
});

// Listen for tab updates (e.g., navigation within the same tab)
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    // Check if the update is for the currently associated tab and the update is complete
    // (to avoid multiple triggers during a single page load)
    if (tabId === associatedTabId && changeInfo.status === 'complete') {
        console.log(`Detected update completion for associated tab ${tabId}. Re-initializing panel.`);
        await initPanel();
    }
});

// Utility function to escape HTML
function escapeHTML(str) {
    if (str === null || str === undefined) return '';
    return String(str).replace(/[&<>'"/]/g, function (s) {
        return {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;',
            '/': '&#x2F;'
        }[s];
    });
}

// Note: The more robust Port connection logic is removed as it was
// primarily beneficial for DevTools<->Background communication.
// Direct tabs.sendMessage is generally sufficient for SidePanel<->ContentScript. 