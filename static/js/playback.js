// Global audio element to manage playback
let currentAudio = null;
let lyricHighlightTimeout = null;
let currentLyricLineIndex = 0;
let currentWordIndex = 0;
let lyricsLines = []; // Array of { time: number, words: string[] }

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
 * Updates the lyrics display with highlighting and scrolling.
 * @param {HTMLElement} lyricsDisplay - The element to display the lyrics.
 */
function updateLyricsDisplay(lyricsDisplay) {
  if (lyricsLines.length === 0) {
    lyricsDisplay.innerHTML = "Lyrics not available.";
    return;
  }

  let htmlContent = "";
  lyricsLines.forEach((lineWords, lineIndex) => {
    let lineHtml = "";
    lineWords.forEach((word, wordIndex) => {
      if (lineIndex < currentLyricLineIndex) {
        lineHtml += `<span class="highlighted-line">${word}</span> `;
      } else if (lineIndex === currentLyricLineIndex) {
        if (wordIndex < currentWordIndex) {
          lineHtml += `<span class="highlighted-line">${word}</span> `;
        } else if (wordIndex === currentWordIndex) {
          lineHtml += `<span class="highlighted-word">${word}</span> `;
        } else {
          lineHtml += `${word} `;
        }
      } else {
        lineHtml += `${word} `;
      }
    });
    htmlContent += `${lineHtml.trim()}<br>`;
  });
  lyricsDisplay.innerHTML = htmlContent;

  // Scroll to the highlighted line
  const activeWordElement = lyricsDisplay.querySelector(".highlighted-word");
  if (activeWordElement) {
    const containerHeight = lyricsDisplay.clientHeight;
    const spanOffsetTop = activeWordElement.offsetTop;
    const spanHeight = activeWordElement.offsetHeight;
    lyricsDisplay.scrollTop =
      spanOffsetTop - containerHeight / 2 + spanHeight / 2;
  }
}

/**
 * Simulates the karaoke word highlighting progression.
 * @param {HTMLElement} lyricsDisplay - The element to display the lyrics.
 */
function startLyricHighlighting(lyricsDisplay) {
  if (lyricHighlightTimeout) clearTimeout(lyricHighlightTimeout);

  const advanceWord = () => {
    if (currentLyricLineIndex >= lyricsLines.length) {
      clearTimeout(lyricHighlightTimeout);
      return;
    }

    const currentLineWords = lyricsLines[currentLyricLineIndex];
    if (currentWordIndex < currentLineWords.length) {
      updateLyricsDisplay(lyricsDisplay);
      currentWordIndex++;
      // This duration can be made dynamic based on song beatmap in the future
      lyricHighlightTimeout = setTimeout(advanceWord, 350);
    } else {
      currentLyricLineIndex++;
      currentWordIndex = 0;
      updateLyricsDisplay(lyricsDisplay);
      // Pause slightly longer between lines
      lyricHighlightTimeout = setTimeout(advanceWord, 800);
    }
  };
  advanceWord();
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

  stopPlayback(karaokeScreen, mainContent); // Stop any previous playback

  const songToPlay = currentQueue[0];
  nowPlayingTitle.textContent = `Now Playing: "${songToPlay.song_name}" by ${songToPlay.artist}`;
  lyricsDisplay.textContent = "Loading lyrics...";

  mainContent.style.display = "none";
  songQueueSection.classList.remove("show-modal");
  manualSearchSection.classList.remove("show-modal");
  karaokeScreen.classList.add("show");

  lyricsLines = await fetchLyrics(songToPlay.lyrics_path);
  currentLyricLineIndex = 0;
  currentWordIndex = 0;

  if (lyricsLines.length > 0) {
    updateLyricsDisplay(lyricsDisplay);
    startLyricHighlighting(lyricsDisplay);
  } else {
    lyricsDisplay.textContent = "Lyrics not available for this song.";
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
  currentWordIndex = 0;
  lyricsLines = [];
  karaokeScreen.classList.remove("show");
  mainContent.style.display = "flex";
}
