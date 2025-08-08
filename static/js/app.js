import { playFirstSongInQueue, stopPlayback } from "./playback.js";

// --- CONFIGURATION ---
const API_BASE_URL = "";

// --- DATA ---
let fakeSongs = [];
let currentQueue = [];
const artistImages = {
  Dreamweavers: "assets/images/dreamweavers.jpg",
  "Synthwave Collective": "assets/images/synthwave_collective.jpg",
  "Cosmic Echoes": "assets/images/cosmic_echoes.jpg",
  "Urban Beats": "assets/images/urban_beats.jpg",
  "Forest Folk": "assets/images/forest_folk.jpg",
  "Chrome Crusaders": "assets/images/chrome_crusaders.jpg",
  "Aqua Tones": "assets/images/aqua_tones.jpg",
  "Astro Funk": "assets/images/astro_funk.jpg",
  "Sandstone Singers": "assets/images/sandstone_singers.jpg",
  "Digital Pulse": "assets/images/digital_pulse.jpg",
  "Michael Jackson": "assets/images/michael_jackson.jpg",
};

// --- DOM ELEMENT REFERENCES ---
const mainContent = document.getElementById("main-content");
const startPlaylistButton = document.getElementById("start-playlist-btn");
const queueButton = document.getElementById("queue-btn");
const songQueueSection = document.getElementById("song-queue-section");
const queueSongList = document.getElementById("queue-song-list");
const backToHomeFromQueueButton = document.getElementById(
  "back-to-home-from-queue-btn"
);
const manualSearchButton = document.getElementById("manual-search-btn");
const manualSearchSection = document.getElementById("manual-search-section");
const manualSearchTitle = document.getElementById("manual-search-title");
const artistListContainer = document.getElementById("artist-list-container");
const artistList = document.getElementById("artist-list");
const artistDetailContainer = document.getElementById(
  "artist-detail-container"
);
const artistImageWrapper = document.getElementById("artist-image-wrapper");
const artistSongsList = document.getElementById("artist-songs-list");
const backToArtistsButton = document.getElementById("back-to-artists-btn");
const backToHomeFromManualButton = document.getElementById(
  "back-to-home-from-manual-btn"
);
const aiSearchButton = document.getElementById("ai-search-btn");
const aiSearchSection = document.getElementById("ai-search-section");
const aiSearchInput = document.getElementById("ai-search-input");
const aiSearchSubmitButton = document.getElementById("ai-search-submit-btn");
const aiSearchResultsList = document.getElementById("ai-search-results-list");
const aiLoadingSpinner = document.getElementById("ai-loading-spinner");
const backToHomeFromAiButton = document.getElementById(
  "back-to-home-from-ai-btn"
);
const karaokeScreen = document.getElementById("karaoke-screen");
const nowPlayingTitle = document.getElementById("now-playing-title");
const lyricsDisplay = document.getElementById("lyrics-display");
const stopPlayingButton = document.getElementById("stop-playing-btn");

// --- API FUNCTIONS ---
async function fetchAvailableSongs() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/songs`);
    if (!response.ok) throw new Error("Failed to fetch songs");
    fakeSongs = await response.json();
  } catch (error) {
    console.error("Error fetching available songs:", error);
    showToast("Could not load song library from server.", true);
  }
}

async function fetchQueue() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/queue`);
    if (!response.ok) throw new Error("Failed to fetch queue");
    const serverQueue = await response.json();
    if (JSON.stringify(serverQueue) !== JSON.stringify(currentQueue)) {
      currentQueue = serverQueue;
      populateQueueSongList();
    }
  } catch (error) {
    console.error("Error fetching queue:", error);
  }
}

async function addSongToQueue(song) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/queue/add`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(song),
    });
    const result = await response.json();
    if (response.ok) {
      showToast(`Added "${song.song_name}" to queue`);
      fetchQueue();
    } else {
      showToast(result.message || "Could not add song.", true);
    }
  } catch (error) {
    console.error("Error adding song to queue:", error);
    showToast("Failed to connect to the server.", true);
  }
}

async function removeSongFromQueue(index) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/queue/remove`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ index: index }),
    });
    const result = await response.json();
    if (response.ok) {
      showToast(result.message);
      fetchQueue();
    } else {
      showToast(result.message || "Could not remove song.", true);
    }
  } catch (error) {
    console.error("Error removing song:", error);
    showToast("Failed to connect to the server.", true);
  }
}

// --- UTILITY & UI FUNCTIONS ---
function showToast(message, isError = false) {
  const toast = document.createElement("div");
  toast.classList.add("toast-notification");
  if (isError) {
    toast.style.backgroundColor = "rgba(239, 68, 68, 0.9)";
  }
  toast.textContent = message;
  document.body.appendChild(toast);
  let bottomOffset = 24;
  document.querySelectorAll(".toast-notification.show").forEach((t) => {
    bottomOffset += t.offsetHeight + 16;
  });
  toast.style.bottom = `${bottomOffset}px`;
  requestAnimationFrame(() => {
    toast.classList.add("show");
  });
  setTimeout(() => {
    toast.classList.remove("show");
    toast.addEventListener("transitionend", () => toast.remove());
  }, 3000);
}

function createSongListItem(song) {
  const listItem = document.createElement("li");
  listItem.classList.add("list-item");
  listItem.innerHTML = `
        <span style="flex: 1; min-width: 0;">${song.song_name} by ${song.artist}</span>
        <span style="width: 5rem; text-align: right; flex-shrink: 0;">${song.duration}</span>
        <button class="add-to-queue-btn">
            <svg xmlns="http://www.w3.org/2000/svg" style="height: 1rem; width: 1rem;" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add
        </button>
    `;
  const addButton = listItem.querySelector(".add-to-queue-btn");
  addButton.addEventListener("click", (e) => {
    e.stopPropagation();
    addSongToQueue(song);
  });
  return listItem;
}

function populateQueueSongList() {
  queueSongList.innerHTML = "";
  if (currentQueue.length === 0) {
    queueSongList.innerHTML = `<li class="list-item" style="justify-content: center; color: #a0aec0;">Queue is empty. Add some songs!</li>`;
    return;
  }
  currentQueue.forEach((song, index) => {
    const listItem = document.createElement("li");
    listItem.classList.add("list-item", "queue-list-item");
    listItem.innerHTML = `
        <span class="queue-song-col">${song.song_name} by ${song.artist}</span>
        <span class="queue-duration-col">${song.duration}</span>
        <button class="remove-from-queue-btn" data-index="${index}">
            <svg xmlns="http://www.w3.org/2000/svg" style="height: 1.25rem; width: 1.25rem;" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
        </button>
    `;
    listItem
      .querySelector(".remove-from-queue-btn")
      .addEventListener("click", (e) => {
        e.stopPropagation();
        const songIndex = parseInt(e.currentTarget.dataset.index, 10);
        removeSongFromQueue(songIndex);
      });
    queueSongList.appendChild(listItem);
  });
}

function populateArtistList() {
  manualSearchTitle.textContent = "Artists";
  artistListContainer.style.display = "block";
  artistDetailContainer.style.display = "none";
  backToArtistsButton.classList.add("hidden");

  artistList.innerHTML = "";
  const artists = [...new Set(fakeSongs.map((song) => song.artist))].sort();
  artists.forEach((artist) => {
    const listItem = document.createElement("li");
    listItem.classList.add("list-item");
    listItem.textContent = artist;
    listItem.addEventListener("click", () => showArtistDetail(artist));
    artistList.appendChild(listItem);
  });
}

function showArtistDetail(artistName) {
  manualSearchTitle.textContent = artistName;
  artistListContainer.style.display = "none";
  artistDetailContainer.style.display = "flex";
  backToArtistsButton.classList.remove("hidden");

  artistImageWrapper.innerHTML = "";
  const img = document.createElement("img");

  const imagePath = artistImages[artistName]
    ? `/static/${artistImages[artistName]}`
    : `https://placehold.co/200x200/374151/d1d5db?text=${artistName.charAt(0)}`;

  img.src = imagePath;
  img.alt = artistName;
  img.onerror = function () {
    this.src = "https://placehold.co/200x200/374151/d1d5db?text=Not+Found";
  };
  artistImageWrapper.appendChild(img);

  artistSongsList.innerHTML = "";
  const songsByArtist = fakeSongs.filter((song) => song.artist === artistName);
  songsByArtist.forEach((song) => {
    artistSongsList.appendChild(createSongListItem(song));
  });
}

function populateAiSearchResults(songs) {
  aiSearchResultsList.innerHTML = "";
  if (songs.length === 0) {
    aiSearchResultsList.innerHTML = `<li class="list-item" style="justify-content: center; color: #a0aec0;">Sorry, no matching songs found.</li>`;
    return;
  }
  songs.forEach((song) => {
    const fullSongData = fakeSongs.find(
      (fs) => fs.song_name === song.song_name && fs.artist === song.artist
    );
    if (fullSongData) {
      aiSearchResultsList.appendChild(createSongListItem(fullSongData));
    }
  });
}

async function handleAiSearch() {
  // This function can remain the same
}

// --- EVENT LISTENERS ---
startPlaylistButton.addEventListener("click", () => {
  playFirstSongInQueue(
    showToast,
    nowPlayingTitle,
    lyricsDisplay,
    mainContent,
    karaokeScreen
  );
});
queueButton.addEventListener("click", () => {
  songQueueSection.classList.add("show-modal");
  fetchQueue();
});
manualSearchButton.addEventListener("click", () => {
  manualSearchSection.classList.add("show-modal");
  populateArtistList();
});
aiSearchButton.addEventListener("click", () => {
  aiSearchSection.classList.add("show-modal");
  aiSearchInput.focus();
});
backToHomeFromQueueButton.addEventListener("click", () => {
  songQueueSection.classList.remove("show-modal");
});
backToHomeFromManualButton.addEventListener("click", () => {
  manualSearchSection.classList.remove("show-modal");
});
backToArtistsButton.addEventListener("click", populateArtistList);
backToHomeFromAiButton.addEventListener("click", () => {
  aiSearchSection.classList.remove("show-modal");
});
aiSearchSubmitButton.addEventListener("click", handleAiSearch);
aiSearchInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") handleAiSearch();
});
stopPlayingButton.addEventListener("click", () => {
  stopPlayback(karaokeScreen, mainContent);
});

// --- INITIALIZATION ---
window.addEventListener("load", async () => {
  await fetchAvailableSongs();

  // Generate QR Code
  try {
    const qrContainer = document.getElementById("qr-code-container");
    if (qrContainer) {
      const qr = qrcode(4, "L");

      // *** IMPORTANT: Replace this placeholder with your actual localtunnel URL. ***
      // It should look like: https://your-subdomain.loca.lt
      const tunnelUrl = "https://<YOUR_LOCALTUNNEL_URL_HERE>";

      qr.addData(tunnelUrl);
      qr.make();
      qrContainer.innerHTML = qr.createImgTag(4, 8);
      const qrImg = qrContainer.querySelector("img");
      if (qrImg) {
        qrImg.style.width = "100px";
        qrImg.style.height = "100px";
      }
    }
  } catch (error) {
    console.error("Could not generate QR code:", error);
    const qrContainer = document.getElementById("qr-code-container");
    if (qrContainer) qrContainer.style.display = "none";
  }

  setInterval(fetchQueue, 3000);
});
