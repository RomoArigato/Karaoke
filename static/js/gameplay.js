// This will be a basic implementation of Osu!-like gameplay elements using Pixi.js.

// --- Configuration ---
const HIT_CIRCLE_RADIUS = 50;
const SLIDER_BALL_RADIUS = 48;
const FOLLOW_CIRCLE_RADIUS = 150;
const APPROACH_CIRCLE_START_SCALE = 3;
const APPROACH_TIME = 1000; // in milliseconds

// --- Gameplay Class ---
export class OsuGameplay {
  constructor(container, audio) {
    this.container = container;
    this.audio = audio;
    this.app = new PIXI.Application({
      width: container.clientWidth,
      height: container.clientHeight,
      transparent: true,
      antialias: true,
    });
    this.container.appendChild(this.app.view);

    this.hitObjects = [];
    this.beatmap = null;
    this.score = 0;

    this.handleHandMove = this.handleHandMove.bind(this);
    document.addEventListener("handmove", this.handleHandMove);

    this.app.ticker.add((delta) => this.update(delta));
  }

  loadBeatmap(beatmap) {
    this.beatmap = beatmap;
  }

  start() {
    this.score = 0;
    // The update loop will handle the timing of the hit objects
  }

  stop() {
    // Clear all hit objects from the screen
    this.hitObjects.forEach((obj) => obj.destroy());
    this.hitObjects = [];
    document.removeEventListener("handmove", this.handleHandMove);
  }

  update(delta) {
    if (!this.beatmap || !this.audio) return;

    const currentTime = this.audio.currentTime * 1000; // in milliseconds

    // --- Create new hit objects based on the beatmap ---
    this.beatmap.hitObjects.forEach((obj) => {
      if (currentTime >= obj.time - APPROACH_TIME && !obj.isSpawned) {
        obj.isSpawned = true;
        if (obj.type === "slider") {
          this.createSlider(obj);
        } else {
          this.createHitCircle({ x: obj.x, y: obj.y, time: obj.time });
        }
      }
    });

    // Update active sliders
    this.hitObjects.forEach((container) => {
      if (container.isSlider && container.isFollowing) {
        this.updateSlider(container, currentTime);
      }
    });
  }

  // Hand hit logic
  processHit(hitContainer) {
    if (!hitContainer.visible) return;

    const approachCircle = hitContainer.approachCircle;
    const scale = approachCircle.scale.x;

    if (scale < 1.2) {
      this.score += 300;
    } else if (scale < 1.5) {
      this.score += 100;
    } else {
      this.score += 50;
    }
    console.log("Score:", this.score);

    if (hitContainer.isSlider) {
      hitContainer.isFollowing = true;
      hitContainer.followStartTime = this.audio.currentTime * 1000;
      hitContainer.sliderBall.visible = true;
      hitContainer.followCircle.visible = true;
    } else {
      // For hit circles, it disappears
      hitContainer.visible = false;
    }

    hitContainer.interactive = false;
    this.app.stage.removeChild(approachCircle);
  }

  // Handles collisions
  handleHandMove(event) {
    const landmarks = event.detail.landmarks;
    if (!landmarks || this.hitObjects.length === 0) return;

    // Get canvas dimensions for coordinate conversion
    const canvasWidth = this.app.view.width;
    const canvasHeight = this.app.view.height;

    for (const hand of landmarks) {
      for (const landmark of hand) {
        // Convert normalized landmark coordinates to pixel coordinates
        // Webcam feed is flipped, so we flip the x-coordinates back
        const landmarkX = (1 - landmark.x) * canvasWidth;
        const landmarkY = landmark.y * canvasHeight;

        // Check this landmark against all visible hit circles
        for (const container of this.hitObjects) {
          if (container.visible && container.interactive) {
            const dx = landmarkX - container.x;
            const dy = landmarkY - container.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance <= HIT_CIRCLE_RADIUS) {
              this.processHit(container);
              break; // Once a landmark hits a circle, we don't need to check other landmarks against it
            }
          }
        }
      }
    }
  }

  createHitCircle(circleData) {
    const container = new PIXI.Container();
    container.x = circleData.x;
    container.y = circleData.y;
    container.interactive = true;
    container.buttonMode = true;

    const hitCircle = new PIXI.Graphics();
    hitCircle.lineStyle(4, 0xffffff, 1);
    hitCircle.beginFill(0x8b5cf6);
    hitCircle.drawCircle(0, 0, HIT_CIRCLE_RADIUS);
    hitCircle.endFill();
    container.addChild(hitCircle);

    const approachCircle = new PIXI.Graphics();
    approachCircle.lineStyle(4, 0xffffff, 1);
    approachCircle.drawCircle(
      0,
      0,
      HIT_CIRCLE_RADIUS * APPROACH_CIRCLE_START_SCALE
    );
    this.app.stage.addChild(approachCircle);
    approachCircle.x = container.x;
    approachCircle.y = container.y;

    container.approachCircle = approachCircle;
    container.on("pointerdown", () => this.processHit(container));

    const ticker = new PIXI.Ticker();
    ticker.add(() => {
      const newScale =
        approachCircle.scale.x -
        (APPROACH_CIRCLE_START_SCALE - 1) * (ticker.deltaMS / APPROACH_TIME);
      if (newScale >= 1) approachCircle.scale.set(newScale);
    });
    ticker.start();

    this.app.stage.addChild(container);
    this.hitObjects.push(container);

    setTimeout(() => {
      this.app.stage.removeChild(container, approachCircle);
      ticker.destroy();
      this.hitObjects = this.hitObjects.filter((obj) => obj !== container);
    }, circleData.time + APPROACH_TIME - this.audio.currentTime * 1000 + 200);
  }

  // --- Slider and Spinner implementations would go here ---
  // NEW: Method to create a slider
  createSlider(sliderData) {
    const container = new PIXI.Container();
    container.x = sliderData.startX;
    container.y = sliderData.startY;
    container.interactive = true;
    container.buttonMode = true;

    // Add properties to the container for state management
    container.isSlider = true;
    container.isFollowing = false;
    container.sliderData = sliderData;

    // Draw the path
    const path = new PIXI.Graphics();
    path.lineStyle(10, 0xffffff, 0.5);
    path.moveTo(0, 0);
    path.lineTo(
      sliderData.endX - sliderData.startX,
      sliderData.endY - sliderData.startY
    );
    container.addChild(path);

    // Draw the start circle (which is what the user interacts with)
    const startCircle = new PIXI.Graphics();
    startCircle.lineStyle(4, 0xffffff, 1);
    startCircle.beginFill(0x8b5cf6);
    startCircle.drawCircle(0, 0, HIT_CIRCLE_RADIUS);
    startCircle.endFill();
    container.addChild(startCircle);

    // Draw the slider ball and follow circle (initially invisible)
    const sliderBall = new PIXI.Graphics();
    sliderBall.beginFill(0xec4899);
    sliderBall.drawCircle(0, 0, SLIDER_BALL_RADIUS);
    sliderBall.endFill();
    sliderBall.visible = false;
    container.sliderBall = sliderBall;
    container.addChild(sliderBall);

    const followCircle = new PIXI.Graphics();
    followCircle.lineStyle(4, 0xffffff, 0.5);
    followCircle.drawCircle(0, 0, FOLLOW_CIRCLE_RADIUS);
    followCircle.visible = false;
    container.followCircle = followCircle;
    container.addChild(followCircle);

    // Create the approach circle for the start
    const approachCircle = new PIXI.Graphics();
    approachCircle.lineStyle(4, 0xffffff, 1);
    approachCircle.drawCircle(
      0,
      0,
      HIT_CIRCLE_RADIUS * APPROACH_CIRCLE_START_SCALE
    );
    this.app.stage.addChild(approachCircle);
    approachCircle.x = container.x;
    approachCircle.y = container.y;

    container.approachCircle = approachCircle;
    container.on("pointerdown", () => this.processHit(container));

    const ticker = new PIXI.Ticker();
    ticker.add(() => {
      const newScale =
        approachCircle.scale.x -
        (APPROACH_CIRCLE_START_SCALE - 1) * (ticker.deltaMS / APPROACH_TIME);
      if (newScale >= 1) approachCircle.scale.set(newScale);
    });
    ticker.start();

    this.app.stage.addChild(container);
    this.hitObjects.push(container);

    setTimeout(() => {
      if (!container.isFollowing) {
        // Missed the initial hit
        this.app.stage.removeChild(container, approachCircle);
        ticker.destroy();
        this.hitObjects = this.hitObjects.filter((obj) => obj !== container);
      }
    }, sliderData.time + APPROACH_TIME - this.audio.currentTime * 1000 + 200);
  }

  // Method to update a slider's position and check for follow
  updateSlider(container, currentTime) {
    const { startX, startY, endX, endY, duration } = container.sliderData;
    const elapsedTime = currentTime - container.followStartTime;
    let t = elapsedTime / duration;
    if (t > 1) t = 1;

    // Linear interpolation to find the ball's current position
    const currentX = startX + (endX - startX) * t;
    const currentY = startY + (endY - startY) * t;

    container.sliderBall.x = currentX - startX;
    container.sliderBall.y = currentY - startY;
    container.followCircle.x = currentX - startX;
    container.followCircle.y = currentY - startY;

    // Check if user is still following
    const landmark = this.getClosestLandmark(currentX, currentY);
    if (landmark) {
      const dx = landmark.x - currentX;
      const dy = landmark.y - currentY;
      if (Math.sqrt(dx * dx + dy * dy) > FOLLOW_CIRCLE_RADIUS) {
        container.isFollowing = false; // Broke combo
        container.alpha = 0.5; // Indicate failure
      }
    }

    // End of slider
    if (t >= 1) {
      container.isFollowing = false;
      this.score += 300; // Bonus for completing
      this.app.stage.removeChild(container);
      this.hitObjects = this.hitObjects.filter((obj) => obj !== container);
    }
  }

  // Helper for slider following logic
  getClosestLandmark(x, y) {
    // In a real implementation, you would need to get the latest hand data here.
    // This is a simplified placeholder. The logic should be integrated
    // with the main hand tracking loop for better performance.
    return null; // Placeholder
  }

  createSpinner() {
    // ...
  }
}
