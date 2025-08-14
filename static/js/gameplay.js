// This will be a basic implementation of Osu!-like gameplay elements using Pixi.js.

// --- Configuration ---
const HIT_CIRCLE_RADIUS = 50;
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

    this.app.ticker.add(() => this.update());
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

  update() {
    if (!this.beatmap) return;

    const currentTime = this.audio.currentTime * 1000; // in milliseconds

    // --- Create new hit objects based on the beatmap ---
    this.beatmap.hitObjects.forEach((obj) => {
      if (currentTime >= obj.time - APPROACH_TIME && !obj.isSpawned) {
        obj.isSpawned = true;
        this.createHitCircle(obj.x, obj.y);
      }
    });
  }

  // Hand hit logic
  processHit(hitCircle) {
    if (!hitCircle.visible) return;

    const approachCircle = hitCircle.approachCircle;
    const scale = approachCircle.scale.x;

    if (scale < 1.2) {
      this.score += 300;
    } else if (scale < 1.5) {
      this.score += 100;
    } else {
      this.score += 50;
    }
    console.log("Score:", this.score);

    hitCircle.visible = false;
    hitCircle.interactive = false;
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
        for (const hitCircle of this.hitObjects) {
          if (hitCircle.visible && hitCircle.isHitCircle) {
            const dx = landmarkX - hitCircle.x;
            const dy = landmarkY - hitCircle.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance <= HIT_CIRCLE_RADIUS) {
              this.processHit(hitCircle);
              break; // Once a landmark hits a circle, we don't need to check other landmarks against it
            }
          }
        }
      }
    }
  }

  createHitCircle(x, y) {
    const hitCircle = new PIXI.Graphics();
    hitCircle.lineStyle(4, 0xffffff, 1);
    hitCircle.beginFill(0x8b5cf6);
    hitCircle.drawCircle(0, 0, HIT_CIRCLE_RADIUS);
    hitCircle.endFill();
    hitCircle.x = x;
    hitCircle.y = y;
    hitCircle.interactive = true;
    hitCircle.buttonMode = true;
    hitCircle.isHitCircle = true;

    const approachCircle = new PIXI.Graphics();
    approachCircle.lineStyle(4, 0xffffff, 1);
    approachCircle.drawCircle(
      0,
      0,
      HIT_CIRCLE_RADIUS * APPROACH_CIRCLE_START_SCALE
    );
    approachCircle.x = x;
    approachCircle.y = y;
    hitCircle.approachCircle = approachCircle;

    this.app.stage.addChild(hitCircle, approachCircle);
    this.hitObjects.push(hitCircle);

    const animation = (delta) => {
      const newScale =
        approachCircle.scale.x -
        (APPROACH_CIRCLE_START_SCALE - 1) *
          (delta / (APPROACH_TIME / (1000 / 60)));
      if (newScale >= 1) {
        approachCircle.scale.set(newScale);
      } else {
        approachCircle.scale.set(1);
      }
    };

    this.app.ticker.add(animation);

    hitCircle.on("pointerdown", () => this.processHit(hitCircle));

    setTimeout(() => {
      if (hitCircle.visible) {
        this.app.stage.removeChild(hitCircle, approachCircle);
      }

      this.app.ticker.remove(animation);
      this.hitObjects = this.hitObjects.filter((obj) => obj !== hitCircle);
    }, APPROACH_TIME + 200); // Remove after a short delay if not clicked
  }

  // --- Slider and Spinner implementations would go here ---
  createSlider(points) {
    // ...
  }

  createSpinner() {
    // ...
  }
}
