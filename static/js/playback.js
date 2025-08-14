import { startHandTracking, stopHandTracking } from "./handtracking.js";
import { OsuGameplay } from "./gameplay.js";

// Define KaraokeApp on the window object *before* the IIFE
window.KaraokeApp = window.KaraokeApp || {};

(function (KaraokeApp) {
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
  KaraokeApp.playFirstSongInQueue = async function (...args) {
    // Support two call signatures:
    // 1) (currentQueue, showToast, nowPlayingTitle, lyricsDisplay, mainContent, karaokeScreen, songQueueSection?, manualSearchSection?, populateQueueSongList?)
    // 2) (showToast, nowPlayingTitle, lyricsDisplay, mainContent, karaokeScreen)
    let currentQueue,
      showToast,
      nowPlayingTitle,
      lyricsDisplay,
      mainContent,
      karaokeScreen,
      songQueueSection,
      manualSearchSection,
      populateQueueSongList;

    if (Array.isArray(args[0])) {
      [
        currentQueue,
        showToast,
        nowPlayingTitle,
        lyricsDisplay,
        mainContent,
        karaokeScreen,
        songQueueSection,
        manualSearchSection,
        populateQueueSongList,
      ] = args;
    } else {
      [showToast, nowPlayingTitle, lyricsDisplay, mainContent, karaokeScreen] =
        args;
      try {
        const res = await fetch("/api/queue");
        const q = await res.json();
        currentQueue = Array.isArray(q) ? q : [];
      } catch (e) {
        console.warn("Failed to fetch queue, defaulting to empty.", e);
        currentQueue = [];
      }
      songQueueSection = document.getElementById("song-queue-section");
      manualSearchSection = document.getElementById("manual-search-section");
      populateQueueSongList =
        window.KaraokeApp &&
        typeof window.KaraokeApp.populateQueueSongList === "function"
          ? window.KaraokeApp.populateQueueSongList
          : function () {};
    }

    // Safety wrapper for toast
    const toast =
      typeof showToast === "function"
        ? showToast
        : window.KaraokeApp && typeof window.KaraokeApp.showToast === "function"
        ? window.KaraokeApp.showToast
        : (msg) => console.log("[toast]", msg);

    if (currentQueue.length === 0) {
      toast("Queue is empty! Add some songs first.");
      return;
    }

    // This function is now the single source of truth for stopping.
    // We don't want to stop playback here, just ensure a clean state if a song was already playing.
    if (currentAudio) {
      currentAudio.pause();
      currentAudio = null;
    }

    const songToPlay = currentQueue[0];

    // Guard against undefined or malformed queue entries
    if (!songToPlay || typeof songToPlay !== "object") {
      showToast("First item in the queue is missing. Skipping...", true);
      currentQueue.shift();
      populateQueueSongList(currentQueue);
      if (currentQueue.length > 0) {
        return KaraokeApp.playFirstSongInQueue(
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
        KaraokeApp.stopPlayback(karaokeScreen, mainContent);
        return;
      }
    }
    if (!songToPlay.song_name || !songToPlay.audio_path) {
      showToast("Song is missing required fields. Skipping...", true);
      currentQueue.shift();
      populateQueueSongList(currentQueue);
      if (currentQueue.length > 0) {
        return KaraokeApp.playFirstSongInQueue(
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
        KaraokeApp.stopPlayback(karaokeScreen, mainContent);
        return;
      }
    }

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
    try {
      await startHandTracking();
    } catch (e) {
      console.warn("Failed to start hand tracking:", e);
    }

    currentAudio = new Audio(songToPlay.audio_path);
    const osuGameContainer = document.getElementById("osu-game-container");
    const osuGame = new OsuGameplay(osuGameContainer, currentAudio);

    if (songToPlay.beatmap_path) {
      fetch(songToPlay.beatmap_path)
        .then((response) => response.json())
        .then((beatmap) => {
          osuGame.loadBeatmap(beatmap);
          osuGame.start();
        });
    }

    lyricsLines = await fetchLyrics(songToPlay.lyrics_path);
    currentLyricLineIndex = 0;

    if (lyricsLines.length > 0) {
      startLyricHighlighting(lyricsDisplay);
    } else {
      lyricsDisplay.innerHTML = "<p>Lyrics not available for this song.</p>";
    }

    currentAudio.play().catch((e) => {
      console.error("Audio play failed:", e);
      showToast(
        "Could not play audio. User interaction might be required.",
        true
      );
    });

    currentAudio.addEventListener("ended", () => {
      osuGame.stop();
      showToast(`Finished: "${songToPlay.song_name}"`);
      currentQueue.shift();
      populateQueueSongList(currentQueue);

      if (currentQueue.length > 0) {
        KaraokeApp.playFirstSongInQueue(
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
        KaraokeApp.stopPlayback();
      }
    });

    currentAudio.addEventListener("error", () => {
      osuGame.stop();
      showToast(`Error playing "${songToPlay.song_name}". Skipping.`, true);
      currentQueue.shift();
      populateQueueSongList(currentQueue);
      if (currentQueue.length > 0) {
        KaraokeApp.playFirstSongInQueue(
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
        KaraokeApp.stopPlayback();
      }
    });
  };

  /**
   * Stops the currently playing song and hides the karaoke screen.
   */
  KaraokeApp.stopPlayback = function () {
    const karaokeScreen = document.getElementById("karaoke-screen");
    const mainContent = document.getElementById("main-content");

    // Stop hand tracking and webcam first
    stopHandTracking();

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

    if (karaokeScreen) karaokeScreen.classList.remove("show");
    if (mainContent) mainContent.style.display = "flex";
  };
})(window.KaraokeApp);
