// --- CONFIGURATION ---
const API_BASE_URL = ""; // API is on the same server

// --- GLOBAL STATE ---
let currentAudio = null;
let lyricHighlightTimeout = null;
let titleFadeTimeout = null;
let currentLyricLineIndex = 0;
let lyricsLines = [];
let cameraStream = null; // To hold the camera stream

/**
 * Fetches and parses lyrics from a given path.
 * @param {string} path - The path to the lyrics file.
 * @returns {Promise<Array<string[]>>} Parsed lyrics.
 */
async function fetchLyrics(path) {
  try {
    const response = await fetch(`/static/${path}`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
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
 * Simulates the karaoke highlighting effect line by line.
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
    const averageWordDuration = 450;
    const pauseBetweenLines = 800;
    const lineDurationMs = currentLineWords.length * averageWordDuration;

    lyricsDisplay.innerHTML = `<p class="lyric-line" data-text="${lineText}">${lineText}</p>`;
    const lineElement = lyricsDisplay.querySelector(".lyric-line");

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
 * Starts the camera and displays the feed in the background.
 * @param {HTMLVideoElement} videoElement - The video element to display the stream.
 * @returns {Promise<boolean>} A promise that resolves to true if the camera started, false otherwise.
 */
async function startCamera(videoElement) {
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    try {
      cameraStream = await navigator.mediaDevices.getUserMedia({ video: true });
      videoElement.srcObject = cameraStream;
      return true; // Indicate success
    } catch (error) {
      console.error("Error accessing camera:", error);
      return false; // Indicate failure
    }
  }
  return false;
}

/**
 * Stops the camera stream.
 */
function stopCamera() {
  if (cameraStream) {
    cameraStream.getTracks().forEach((track) => track.stop());
    cameraStream = null;
  }
}

/**
 * Plays the first song from the server's queue.
 */
export async function playFirstSongInQueue(
  showToast,
  nowPlayingTitle,
  lyricsDisplay,
  mainContent,
  karaokeScreen
) {
  // Stop any current playback before starting the new one.
  stopPlayback(karaokeScreen, mainContent);

  try {
    // --- Start Camera Feed First ---
    const cameraVideo = document.getElementById("camera-feedback");
    const cameraStarted = await startCamera(cameraVideo);

    if (!cameraStarted) {
      showToast("Camera not available. Continuing without video.", true);
    }

    // --- Now, fetch the song from the server ---
    const response = await fetch(`${API_BASE_URL}/api/queue/play`, {
      method: "POST",
    });

    if (response.status === 404) {
      showToast("Queue is empty! Add some songs first.");
      stopPlayback(karaokeScreen, mainContent);
      return;
    }
    if (!response.ok) {
      throw new Error("Failed to get the next song from the server.");
    }

    const songToPlay = await response.json();

    // --- Start Playback UI ---
    if (titleFadeTimeout) clearTimeout(titleFadeTimeout);
    nowPlayingTitle.classList.remove("fade-out");
    nowPlayingTitle.textContent = `Now Playing: "${songToPlay.song_name}" by ${songToPlay.artist}`;
    titleFadeTimeout = setTimeout(() => {
      nowPlayingTitle.classList.add("fade-out");
    }, 4000);

    lyricsDisplay.innerHTML = "";
    mainContent.style.display = "none";
    karaokeScreen.classList.add("show");

    // --- Fetch Lyrics and Start Highlighting ---
    lyricsLines = await fetchLyrics(songToPlay.lyrics_path);
    currentLyricLineIndex = 0;
    if (lyricsLines.length > 0) {
      startLyricHighlighting(lyricsDisplay);
    } else {
      lyricsDisplay.innerHTML = "<p>Lyrics not available for this song.</p>";
    }

    // --- Play Audio ---
    const audioPath = `/static/${songToPlay.audio_path}`;
    currentAudio = new Audio(audioPath);
    currentAudio.play().catch((e) => {
      console.error("Audio play failed:", e);
      showToast("Could not play audio.", true);
    });

    // --- Setup Event Listeners for the Audio ---
    currentAudio.addEventListener("ended", () => {
      showToast(`Finished: "${songToPlay.song_name}"`);
      playFirstSongInQueue(
        showToast,
        nowPlayingTitle,
        lyricsDisplay,
        mainContent,
        karaokeScreen
      );
    });

    currentAudio.addEventListener("error", () => {
      showToast(`Error playing "${songToPlay.song_name}". Skipping.`, true);
      playFirstSongInQueue(
        showToast,
        nowPlayingTitle,
        lyricsDisplay,
        mainContent,
        karaokeScreen
      );
    });
  } catch (error) {
    console.error("Error playing song:", error);
    showToast("Could not play song from server.", true);
    stopPlayback(karaokeScreen, mainContent);
  }
}

/**
 * Stops the currently playing song and hides the karaoke screen.
 */
export function stopPlayback(karaokeScreen, mainContent) {
  // Stop the camera feed
  stopCamera();

  if (currentAudio) {
    currentAudio.pause();
    currentAudio.src = "";
    currentAudio = null;
  }
  if (lyricHighlightTimeout) clearTimeout(lyricHighlightTimeout);
  if (titleFadeTimeout) clearTimeout(titleFadeTimeout);

  lyricHighlightTimeout = null;
  titleFadeTimeout = null;
  currentLyricLineIndex = 0;
  lyricsLines = [];

  const nowPlayingTitle = document.getElementById("now-playing-title");
  if (nowPlayingTitle) {
    nowPlayingTitle.classList.remove("fade-out");
  }

  if (karaokeScreen) {
    karaokeScreen.classList.remove("show");
  }
  if (mainContent) {
    mainContent.style.display = "flex";
  }
}
