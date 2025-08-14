// This will be created at /static/js/handtracking.js
import {
  HandLandmarker,
  FilesetResolver,
  DrawingUtils,
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/vision_bundle.js";

let handLandmarker;
let runningMode = "VIDEO";
let videoStream;
let lastVideoTime = -1;
let animationFrameId;

const video = document.getElementById("webcam");
const canvasElement = document.getElementById("output_canvas");
const canvasCtx = canvasElement.getContext("2d");
const drawingUtils = new DrawingUtils(canvasCtx);

// Initializes the HandLandmarker model
const createHandLandmarker = async () => {
  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.12/wasm"
  );
  handLandmarker = await HandLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
      delegate: "GPU",
    },
    runningMode: runningMode,
    numHands: 2,
  });
};

// Starts the webcam feed and the prediction loop
export async function startHandTracking() {
  if (!handLandmarker) {
    await createHandLandmarker();
  }

  if (videoStream) {
    console.log("A video stream is already active.");
    return;
  }

  const constraints = { video: { width: 1280, height: 720 } };
  try {
    videoStream = await navigator.mediaDevices.getUserMedia(constraints);
    video.srcObject = videoStream;
    video.addEventListener("loadeddata", predictWebcam);
  } catch (error) {
    console.error("Error accessing webcam:", error);
    alert(
      "Could not access webcam. Please ensure it is connected and you have granted permission."
    );
  }
}

// Stops the webcam and clears the canvas
export function stopHandTracking() {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
  }
  if (videoStream) {
    videoStream.getTracks().forEach((track) => track.stop());
  }
  video.srcObject = null;
  videoStream = null;
  video.removeEventListener("loadeddata", predictWebcam);
  canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
  lastVideoTime = -1;
  console.log("Hand tracking stopped.");
}

// The main prediction loop
async function predictWebcam() {
  const videoWidth = video.videoWidth;
  const videoHeight = video.videoHeight;

  // Set canvas dimensions if they don't match
  if (canvasElement.width !== videoWidth) {
    canvasElement.width = videoWidth;
  }
  if (canvasElement.height !== videoHeight) {
    canvasElement.height = videoHeight;
  }

  let startTimeMs = performance.now();
  if (lastVideoTime !== video.currentTime) {
    lastVideoTime = video.currentTime;
    const results = handLandmarker.detectForVideo(video, startTimeMs);

    if (results.landmarks && results.landmarks.length > 0) {
      document.dispatchEvent(
        new CustomEvent("handmove", {
          detail: { landmarks: results.landmarks },
        })
      );
    }

    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    if (results.landmarks) {
      for (const landmarks of results.landmarks) {
        drawingUtils.drawConnectors(
          landmarks,
          HandLandmarker.HAND_CONNECTIONS,
          {
            color: "#FFFFFF", // White lines
            lineWidth: 5,
          }
        );
        drawingUtils.drawLandmarks(landmarks, {
          color: "#8b5cf6", // Purple dots
          lineWidth: 2,
        });
      }
    }
    canvasCtx.restore();
  }

  // Keep predicting as long as the stream is active
  if (videoStream) {
    animationFrameId = requestAnimationFrame(predictWebcam);
  }
}
