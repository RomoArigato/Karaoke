import { playFirstSongInQueue, stopPlayback } from "./playback.js";

// --- DATA ---
// This acts as our local "database" of available songs.
const fakeSongs = [
  {
    song_name: "Midnight Serenade",
    artist: "Dreamweavers",
    duration: "4:10",
    audio_path: "assets/songs/midnight_serenade.mp3",
    lyrics_path: "assets/lyrics/midnight_serenade.txt",
  },
  {
    song_name: "Electric Dreams",
    artist: "Synthwave Collective",
    duration: "3:20",
    audio_path: "assets/songs/electric_dreams.mp3",
    lyrics_path: "assets/lyrics/electric_dreams.txt",
  },
  {
    song_name: "Starlight Symphony",
    artist: "Cosmic Echoes",
    duration: "5:05",
    audio_path: "assets/songs/starlight_symphony.mp3",
    lyrics_path: "assets/lyrics/starlight_symphony.txt",
  },
  {
    song_name: "Rhythm of the City",
    artist: "Urban Beats",
    duration: "3:55",
    audio_path: "assets/songs/rhythm_of_the_city.mp3",
    lyrics_path: "assets/lyrics/rhythm_of_the_city.txt",
  },
  {
    song_name: "Whispering Pines",
    artist: "Forest Folk",
    duration: "2:40",
    audio_path: "assets/songs/whispering_pines.mp3",
    lyrics_path: "assets/lyrics/whispering_pines.txt",
  },
  {
    song_name: "Neon Nights",
    artist: "Chrome Crusaders",
    duration: "4:30",
    audio_path: "assets/songs/neon_nights.mp3",
    lyrics_path: "assets/lyrics/neon_nights.txt",
  },
  {
    song_name: "Ocean's Embrace",
    artist: "Aqua Tones",
    duration: "3:15",
    audio_path: "assets/songs/ocean_embrace.mp3",
    lyrics_path: "assets/lyrics/ocean_embrace.txt",
  },
  {
    song_name: "Galactic Groove",
    artist: "Astro Funk",
    duration: "4:50",
    audio_path: "assets/songs/galactic_groove.mp3",
    lyrics_path: "assets/lyrics/galactic_groove.txt",
  },
  {
    song_name: "Desert Bloom",
    artist: "Sandstone Singers",
    duration: "2:58",
    audio_path: "assets/songs/desert_bloom.mp3",
    lyrics_path: "assets/lyrics/desert_bloom.txt",
  },
  {
    song_name: "Cybernetic Heartbeat",
    artist: "Digital Pulse",
    duration: "4:00",
    audio_path: "assets/songs/cybernetic_heartbeat.mp3",
    lyrics_path: "assets/lyrics/cybernetic_heartbeat.txt",
  },
  {
    song_name: "Moonlit Dance",
    artist: "Dreamweavers",
    duration: "3:45",
    audio_path: "assets/songs/moonlit_dance.mp3",
    lyrics_path: "assets/lyrics/moonlit_dance.txt",
  },
  {
    song_name: "Digital Dawn",
    artist: "Digital Pulse",
    duration: "3:30",
    audio_path: "assets/songs/digital_dawn.mp3",
    lyrics_path: "assets/lyrics/digital_dawn.txt",
  },
  {
    song_name: "Man In The Mirror",
    artist: "Michael Jackson",
    duration: "5:19",
    audio_path: "assets/songs/Man_In_The_Mirror.mp3",
    lyrics_path: "assets/lyrics/man_in_the_mirror.txt",
  },
];

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

const currentQueue = [];

// --- DOM ELEMENT REFERENCES ---
const mainContent = document.getElementById("main-content");
const startPlaylistButton = document.getElementById("start-playlist-btn");

// Queue Section
const queueButton = document.getElementById("queue-btn");
const songQueueSection = document.getElementById("song-queue-section");
const queueSongList = document.getElementById("queue-song-list");
const backToHomeFromQueueButton = document.getElementById(
  "back-to-home-from-queue-btn"
);

// Manual Search Section
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

// AI Search Section (NEW)
const aiSearchButton = document.getElementById("ai-search-btn");
const aiSearchSection = document.getElementById("ai-search-section");
const aiSearchInput = document.getElementById("ai-search-input");
const aiSearchSubmitButton = document.getElementById("ai-search-submit-btn");
const aiSearchResultsList = document.getElementById("ai-search-results-list");
const aiLoadingSpinner = document.getElementById("ai-loading-spinner");
const backToHomeFromAiButton = document.getElementById(
  "back-to-home-from-ai-btn"
);

// Karaoke Screen
const karaokeScreen = document.getElementById("karaoke-screen");
const nowPlayingTitle = document.getElementById("now-playing-title");
const lyricsDisplay = document.getElementById("lyrics-display");
const stopPlayingButton = document.getElementById("stop-playing-btn");

// --- UTILITY FUNCTIONS ---

/**
 * Displays a toast notification.
 * @param {string} message - The message to display.
 * @param {boolean} isError - If true, displays a red error toast.
 */
function showToast(message, isError = false) {
  const toast = document.createElement("div");
  toast.classList.add("toast-notification");
  if (isError) {
    toast.style.backgroundColor = "rgba(239, 68, 68, 0.9)"; // Red for errors
  }
  toast.textContent = message;
  document.body.appendChild(toast);

  // Position toast
  let bottomOffset = 24;
  document.querySelectorAll(".toast-notification.show").forEach((t) => {
    bottomOffset += t.offsetHeight + 16;
  });
  toast.style.bottom = `${bottomOffset}px`;

  // Animate in
  requestAnimationFrame(() => {
    toast.classList.add("show");
  });

  // Animate out and remove
  setTimeout(() => {
    toast.classList.remove("show");
    toast.addEventListener("transitionend", () => toast.remove());
  }, 3000);
}

/**
 * Generic function to add a song to the queue and show a toast.
 * @param {object} song - The song object to add.
 */
function addSongToQueue(song) {
  const isDuplicate = currentQueue.some(
    (s) => s.song_name === song.song_name && s.artist === song.artist
  );

  if (!isDuplicate) {
    currentQueue.push(song);
    showToast(`Added "${song.song_name}" to queue`);
  } else {
    showToast(`"${song.song_name}" is already in the queue!`);
  }
}

/**
 * Creates a list item for a song with an "Add to Queue" button.
 * @param {object} song - The song object.
 * @returns {HTMLLIElement} The created list item element.
 */
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

// --- UI POPULATION FUNCTIONS ---

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
        const removedSong = currentQueue.splice(songIndex, 1);
        showToast(`Removed "${removedSong[0].song_name}"`);
        populateQueueSongList();
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

  // Populate image
  artistImageWrapper.innerHTML = "";
  const img = document.createElement("img");
  img.src =
    artistImages[artistName] ||
    `https://placehold.co/200x200/374151/d1d5db?text=${artistName.charAt(0)}`;
  img.alt = artistName;
  img.onerror = function () {
    this.src = "https://placehold.co/200x200/374151/d1d5db?text=Not+Found";
  };
  artistImageWrapper.appendChild(img);

  // Populate songs
  artistSongsList.innerHTML = "";
  const songsByArtist = fakeSongs.filter((song) => song.artist === artistName);
  songsByArtist.forEach((song) => {
    artistSongsList.appendChild(createSongListItem(song));
  });
}

// NEW: Function to populate AI search results
function populateAiSearchResults(songs) {
  aiSearchResultsList.innerHTML = ""; // Clear previous results
  if (songs.length === 0) {
    aiSearchResultsList.innerHTML = `<li class="list-item" style="justify-content: center; color: #a0aec0;">Sorry, no matching songs found. Try another vibe!</li>`;
    return;
  }
  songs.forEach((song) => {
    // Find the full song object from our "database" to ensure all data is present
    const fullSongData = fakeSongs.find(
      (fs) => fs.song_name === song.song_name && fs.artist === song.artist
    );
    if (fullSongData) {
      aiSearchResultsList.appendChild(createSongListItem(fullSongData));
    }
  });
}

// --- AI SEARCH LOGIC (NEW) ---
async function handleAiSearch() {
  const userPrompt = aiSearchInput.value.trim();
  if (!userPrompt) {
    showToast("Please enter a search description!", true);
    return;
  }

  aiLoadingSpinner.classList.remove("hidden");
  aiSearchResultsList.innerHTML = ""; // Clear previous results

  const systemPrompt = `You are a music curator for a karaoke app. Your task is to select songs from a provided list that match the user's textual description of a mood, genre, or theme.

    Rules:
    1.  Only select songs from the provided "Available Songs" list.
    2.  Return your answer as a valid JSON array of song objects.
    3.  The objects in the array MUST have the following properties: "song_name" and "artist".
    4.  If no songs from the list match the user's request, return an empty JSON array: [].
    5.  Do not invent songs. Do not add any explanatory text outside of the JSON response.

    Available Songs:
    ${JSON.stringify(
      fakeSongs.map((s) => ({ song_name: s.song_name, artist: s.artist }))
    )}
    `;

  try {
    let chatHistory = [];
    chatHistory.push({
      role: "user",
      parts: [{ text: `User Request: "${userPrompt}"` }],
    });
    chatHistory.unshift({ role: "model", parts: [{ text: systemPrompt }] });

    const payload = {
      contents: chatHistory,
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              song_name: { type: "STRING" },
              artist: { type: "STRING" },
            },
            required: ["song_name", "artist"],
          },
        },
      },
    };

    const apiKey = ""; // This will be handled by the environment
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }

    const result = await response.json();

    if (result.candidates && result.candidates.length > 0) {
      const jsonText = result.candidates[0].content.parts[0].text;
      const suggestedSongs = JSON.parse(jsonText);
      populateAiSearchResults(suggestedSongs);
    } else {
      throw new Error("No valid response from AI.");
    }
  } catch (error) {
    console.error("AI Search Error:", error);
    showToast("Sorry, the AI search failed. Please try again.", true);
    populateAiSearchResults([]); // Show empty state
  } finally {
    aiLoadingSpinner.classList.add("hidden");
  }
}

// --- EVENT LISTENERS ---

// Main Buttons
startPlaylistButton.addEventListener("click", () => {
  playFirstSongInQueue(
    currentQueue,
    showToast,
    nowPlayingTitle,
    lyricsDisplay,
    mainContent,
    karaokeScreen,
    songQueueSection,
    manualSearchSection,
    populateQueueSongList
  );
});

queueButton.addEventListener("click", () => {
  songQueueSection.classList.add("show-modal");
  populateQueueSongList();
});

manualSearchButton.addEventListener("click", () => {
  manualSearchSection.classList.add("show-modal");
  populateArtistList();
});

// NEW: AI Search Button
aiSearchButton.addEventListener("click", () => {
  aiSearchSection.classList.add("show-modal");
  aiSearchInput.focus();
});

// Modal Buttons
backToHomeFromQueueButton.addEventListener("click", () => {
  songQueueSection.classList.remove("show-modal");
});

backToHomeFromManualButton.addEventListener("click", () => {
  manualSearchSection.classList.remove("show-modal");
});

backToArtistsButton.addEventListener("click", populateArtistList);

// NEW: AI Modal Buttons
backToHomeFromAiButton.addEventListener("click", () => {
  aiSearchSection.classList.remove("show-modal");
});

aiSearchSubmitButton.addEventListener("click", handleAiSearch);
aiSearchInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    handleAiSearch();
  }
});

// Karaoke Screen Buttons
stopPlayingButton.addEventListener("click", () => {
  stopPlayback(karaokeScreen, mainContent);
});
