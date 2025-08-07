// Global audio element to manage playback
let currentAudio = null;
let lyricHighlightTimeout = null;
let currentLyricLineIndex = 0;
let lyricsLines = []; // Array of arrays of words

/**
 * Fetches and parses lyrics from a given path.
 * @param {string} path - The path to the lyrics file.
 * @returns {Promise<Array<Array<string>>>} A promise that resolves with an array of lines, where each line is an array of words.
 */
async function fetchLyrics(path) {
  try {
    const response = await fetch(path);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const rawLyrics = await response.text();
    return rawLyrics
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line)
      .map((line) => line.split(/\s+/).filter((word) => word));
  } catch (error) {
    console.error("Error fetching lyrics:", error);
    return [];
  }
}

/**
 * Simulates the karaoke highlighting effect line by line with a wipe animation.
 * @param {HTMLElement} lyricsDisplay - The element to display the lyrics.
 */
function startLyricHighlighting(lyricsDisplay) {
  if (lyricHighlightTimeout) clearTimeout(lyricHighlightTimeout);

  const advanceLine = () => {
    if (currentLyricLineIndex >= lyricsLines.length) {
      clearTimeout(lyricHighlightTimeout);
      lyricsDisplay.innerHTML = "";
      return;
    }

    const currentLineWords = lyricsLines[currentLyricLineIndex];
    const lineText = currentLineWords.join(" ");

    const averageWordDuration = 450; // ms per word
    const pauseBetweenLines = 800; // ms pause
    const lineDurationMs = currentLineWords.length * averageWordDuration;

    lyricsDisplay.innerHTML = `<p class="lyric-line" data-text="${lineText}">${lineText}</p>`;

    const lineElement = lyricsDisplay.querySelector(".lyric-line");

    // Use requestAnimationFrame to ensure the element is painted before we apply the animation
    requestAnimationFrame(() => {
      if (lineElement) {
        lineElement.style.animationDuration = `${lineDurationMs / 1000}s`;
      }
    });

    currentLyricLineIndex++;
    lyricHighlightTimeout = setTimeout(
      advanceLine,
      lineDurationMs + pauseBetweenLines
    );
  };

  advanceLine();
}

/**
 * Plays the first song in the queue.
 */
export async function playFirstSongInQueue(
  currentQueue,
  showToast,
  nowPlayingTitle,
  lyricsDisplay,
  mainContent,
  karaokeScreen,
  songQueueSection,
  manualSearchSection,
  populateQueueSongList
) {
  if (currentQueue.length === 0) {
    showToast("Queue is empty! Add some songs first.");
    return;
  }

  stopPlayback(karaokeScreen, mainContent);

  const songToPlay = currentQueue[0];

  // Make sure title is visible, set the text, then schedule it to fade out
  nowPlayingTitle.classList.remove("fade-out");
  nowPlayingTitle.textContent = `"${songToPlay.song_name}" by ${songToPlay.artist}`;
  setTimeout(() => {
    nowPlayingTitle.classList.add("fade-out");
  }, 4000); // Fade out after 4 seconds

  lyricsDisplay.innerHTML = "";

  mainContent.style.display = "none";
  songQueueSection.classList.remove("show-modal");
  manualSearchSection.classList.remove("show-modal");
  karaokeScreen.classList.add("show");

  lyricsLines = await fetchLyrics(songToPlay.lyrics_path);
  currentLyricLineIndex = 0;

  if (lyricsLines.length > 0) {
    startLyricHighlighting(lyricsDisplay);
  } else {
    lyricsDisplay.innerHTML = "<p>Lyrics not available for this song.</p>";
  }

  currentAudio = new Audio(songToPlay.audio_path);
  currentAudio.play().catch((e) => {
    console.error("Audio play failed:", e);
    showToast(
      "Could not play audio. User interaction might be required.",
      true
    );
  });

  currentAudio.addEventListener("ended", () => {
    showToast(`Finished: "${songToPlay.song_name}"`);
    currentQueue.shift();
    populateQueueSongList(currentQueue);

    if (currentQueue.length > 0) {
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
    } else {
      showToast("Playlist finished!");
      stopPlayback(karaokeScreen, mainContent);
    }
  });

  currentAudio.addEventListener("error", () => {
    showToast(`Error playing "${songToPlay.song_name}". Skipping.`, true);
    currentQueue.shift();
    populateQueueSongList(currentQueue);
    if (currentQueue.length > 0) {
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
    } else {
      stopPlayback(karaokeScreen, mainContent);
    }
  });
}

/**
 * Stops the currently playing song and hides the karaoke screen.
 */
export function stopPlayback(karaokeScreen, mainContent) {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.src = "";
    currentAudio = null;
  }
  if (lyricHighlightTimeout) {
    clearTimeout(lyricHighlightTimeout);
    lyricHighlightTimeout = null;
  }
  currentLyricLineIndex = 0;
  lyricsLines = [];

  // Reset the title's visibility when stopping playback
  const nowPlayingTitle = document.getElementById("now-playing-title");
  if (nowPlayingTitle) {
    nowPlayingTitle.classList.remove("fade-out");
  }

  karaokeScreen.classList.remove("show");
  mainContent.style.display = "flex";
}
