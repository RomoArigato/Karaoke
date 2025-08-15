// static/js/osu-gameplay.js

// --- CONFIGURATION ---
const HIT_CIRCLE_RADIUS = 50;
const SLIDER_BALL_RADIUS = 48;
const FOLLOW_CIRCLE_RADIUS = 150;
const SPINNER_RADIUS = 250;
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

    this.hitObjects = []; // Stores containers for circles, sliders, etc.
    this.beatmap = null;
    this.score = 0;
    this.latestLandmarks = []; // Stores the most recent hand data

    this.handleHandMove = this.handleHandMove.bind(this);
    document.addEventListener("handmove", this.handleHandMove);

    this.app.ticker.add((delta) => this.update(delta));
  }

  loadBeatmap(beatmap) {
    // this.beatmap = beatmap;
    this.beatmap = JSON.parse(JSON.stringify(beatmap));
  }

  start() {
    this.score = 0;
  }

  stop() {
    this.hitObjects.forEach((obj) => {
      if (obj.ticker) obj.ticker.destroy();
      obj.destroy();
    });
    this.hitObjects = [];
    document.removeEventListener("handmove", this.handleHandMove);
  }

  update(delta) {
    if (!this.beatmap || !this.audio) return;
    const currentTime = this.audio.currentTime * 1000;

    // Create new hit objects from the beatmap
    this.beatmap.hitObjects.forEach((obj) => {
      if (currentTime >= obj.time - APPROACH_TIME && !obj.isSpawned) {
        obj.isSpawned = true;
        if (obj.type === "slider") {
          this.createSlider(obj);
        } else if (obj.type === "spinner") {
          this.createSpinner(obj);
        } else {
          this.createHitCircle(obj);
        }
      }
    });

    // Update active sliders and spinners
    this.hitObjects.forEach((container) => {
      if (container.isSlider && container.isFollowing) {
        this.updateSlider(container, currentTime);
      } else if (container.isSpinner && container.isActive) {
        this.updateSpinner(container);
      }
    });
  }

  processHit(hitContainer) {
    if (!hitContainer.visible) return;

    const approachCircle = hitContainer.approachCircle;
    const scale = approachCircle.scale.x;
    if (scale < 1.2) this.score += 300;
    else if (scale < 1.5) this.score += 100;
    else this.score += 50;
    console.log("Score:", this.score);

    if (hitContainer.isSlider) {
      hitContainer.isFollowing = true;
      hitContainer.followStartTime = this.audio.currentTime * 1000;
      hitContainer.sliderBall.visible = true;
      hitContainer.followCircle.visible = true;
    } else {
      hitContainer.visible = false;
    }

    hitContainer.interactive = false;
    this.app.stage.removeChild(approachCircle);
  }

  handleHandMove(event) {
    this.latestLandmarks = event.detail.landmarks; // Save latest data
    if (!this.latestLandmarks || this.hitObjects.length === 0) return;

    const canvasWidth = this.app.view.width;
    const canvasHeight = this.app.view.height;

    for (const hand of this.latestLandmarks) {
      for (const landmark of hand) {
        const landmarkX = (1 - landmark.x) * canvasWidth;
        const landmarkY = landmark.y * canvasHeight;

        for (const container of this.hitObjects) {
          if (container.visible && container.interactive) {
            const dx = landmarkX - container.x;
            const dy = landmarkY - container.y;
            if (Math.sqrt(dx * dx + dy * dy) <= HIT_CIRCLE_RADIUS) {
              this.processHit(container);
              break;
            }
          }
        }
      }
    }
  }

  createHitCircle(circleData) {
    const [startPoint] = circleData.points;
    const container = new PIXI.Container();
    container.x = startPoint.x;
    container.y = startPoint.y;
    container.interactive = true;
    container.buttonMode = true;

    const hitCircle = new PIXI.Graphics()
      .lineStyle(4, 0xffffff, 1)
      .beginFill(0x8b5cf6)
      .drawCircle(0, 0, HIT_CIRCLE_RADIUS)
      .endFill();
    container.addChild(hitCircle);

    const approachCircle = new PIXI.Graphics()
      .lineStyle(4, 0xffffff, 1)
      .drawCircle(0, 0, HIT_CIRCLE_RADIUS * APPROACH_CIRCLE_START_SCALE);
    this.app.stage.addChild(approachCircle);
    approachCircle.x = container.x;
    approachCircle.y = container.y;

    container.approachCircle = approachCircle;
    container.on("pointerdown", () => this.processHit(container));

    container.ticker = new PIXI.Ticker();
    container.ticker.add(() => {
      const newScale =
        approachCircle.scale.x -
        (APPROACH_CIRCLE_START_SCALE - 1) *
          (container.ticker.deltaMS / APPROACH_TIME);
      if (newScale >= 1) approachCircle.scale.set(newScale);
    });
    container.ticker.start();

    this.app.stage.addChild(container);
    this.hitObjects.push(container);

    // Ensure the ticker is always destroyed
    setTimeout(() => {
      this.app.stage.removeChild(container, approachCircle);
      this.hitObjects = this.hitObjects.filter((obj) => obj !== container);
      if (container.ticker) container.ticker.destroy(); // This is the important change
      container.destroy();
    }, circleData.time - this.audio.currentTime * 1000 + APPROACH_TIME + 200);
  }

  createSlider(sliderData) {
    const startPoint = sliderData.points[0];
    const container = new PIXI.Container();
    container.x = startPoint.x;
    container.y = startPoint.y;
    container.interactive = true;
    container.buttonMode = true;

    container.isSlider = true;
    container.isFollowing = false;
    container.sliderData = sliderData;

    const path = new PIXI.Graphics().lineStyle(10, 0xffffff, 0.5).moveTo(0, 0);

    let endPoint, beforeEndPoint;
    if (sliderData.points.length === 2) {
      // Straight line
      endPoint = sliderData.points[1];
      beforeEndPoint = startPoint;
      path.lineTo(endPoint.x - startPoint.x, endPoint.y - startPoint.y);
    } else if (sliderData.points.length === 3) {
      // Curved line
      const controlPoint = sliderData.points[1];
      endPoint = sliderData.points[2];
      beforeEndPoint = controlPoint;
      path.quadraticCurveTo(
        controlPoint.x - startPoint.x,
        controlPoint.y - startPoint.y,
        endPoint.x - startPoint.x,
        endPoint.y - startPoint.y
      );
    }
    container.addChild(path);

    if (sliderData.repeats && sliderData.repeats > 0) {
      const arrow = new PIXI.Graphics();
      const angle = Math.atan2(
        beforeEndPoint.y - endPoint.y,
        beforeEndPoint.x - endPoint.x
      );
      arrow
        .lineStyle(5, 0xec4899, 1)
        .moveTo(0, 0)
        .lineTo(20, 10)
        .moveTo(0, 0)
        .lineTo(20, -10);
      arrow.x = endPoint.x - startPoint.x;
      arrow.y = endPoint.y - startPoint.y;
      arrow.rotation = angle;
      container.addChild(arrow);
    }

    const startCircle = new PIXI.Graphics()
      .lineStyle(4, 0xffffff, 1)
      .beginFill(0x8b5cf6)
      .drawCircle(0, 0, HIT_CIRCLE_RADIUS)
      .endFill();
    container.addChild(startCircle);

    const sliderBall = new PIXI.Graphics()
      .beginFill(0xec4899)
      .drawCircle(0, 0, SLIDER_BALL_RADIUS)
      .endFill();
    sliderBall.visible = false;
    container.sliderBall = sliderBall;
    container.addChild(sliderBall);

    const followCircle = new PIXI.Graphics()
      .lineStyle(4, 0xffffff, 0.5)
      .drawCircle(0, 0, FOLLOW_CIRCLE_RADIUS);
    followCircle.visible = false;
    container.followCircle = followCircle;
    container.addChild(followCircle);

    const approachCircle = new PIXI.Graphics()
      .lineStyle(4, 0xffffff, 1)
      .drawCircle(0, 0, HIT_CIRCLE_RADIUS * APPROACH_CIRCLE_START_SCALE);
    this.app.stage.addChild(approachCircle);
    approachCircle.x = container.x;
    approachCircle.y = container.y;

    container.approachCircle = approachCircle;
    container.on("pointerdown", () => this.processHit(container));

    container.ticker = new PIXI.Ticker();
    container.ticker.add(() => {
      const newScale =
        approachCircle.scale.x -
        (APPROACH_CIRCLE_START_SCALE - 1) *
          (container.ticker.deltaMS / APPROACH_TIME);
      if (newScale >= 1) approachCircle.scale.set(newScale);
    });
    container.ticker.start();

    this.app.stage.addChild(container);
    this.hitObjects.push(container);

    // Ensure the ticker is always destroyed
    setTimeout(() => {
      if (!container.isFollowing) {
        this.app.stage.removeChild(container, approachCircle);
        this.hitObjects = this.hitObjects.filter((obj) => obj !== container);
        if (container.ticker) container.ticker.destroy(); // This is the important change
        container.destroy();
      }
    }, sliderData.time - this.audio.currentTime * 1000 + APPROACH_TIME + 200);
  }

  updateSlider(container, currentTime) {
    const { points, duration, repeats } = container.sliderData;
    const numTraversals = (repeats || 0) + 1;
    const totalDuration = duration * numTraversals;
    const elapsedTime = currentTime - container.followStartTime;

    const traversalIndex = Math.floor(elapsedTime / duration);
    let t = (elapsedTime % duration) / duration;
    if (traversalIndex % 2 === 1) {
      t = 1 - t;
    }

    let currentX, currentY;
    if (points.length === 2) {
      const [p0, p1] = points;
      currentX = p0.x + (p1.x - p0.x) * t;
      currentY = p0.y + (p1.y - p0.y) * t;
    } else if (points.length === 3) {
      const [p0, p1, p2] = points;
      const t_inv = 1 - t;
      currentX = t_inv ** 2 * p0.x + 2 * t_inv * t * p1.x + t ** 2 * p2.x;
      currentY = t_inv ** 2 * p0.y + 2 * t_inv * t * p1.y + t ** 2 * p2.y;
    }

    const startPoint = points[0];
    container.sliderBall.x = currentX - startPoint.x;
    container.sliderBall.y = currentY - startPoint.y;
    container.followCircle.x = currentX - startPoint.x;
    container.followCircle.y = currentY - startPoint.y;

    if (!this.isFollowingCorrectly(currentX, currentY)) {
      container.isFollowing = false;
      container.alpha = 0.5;
    }

    if (elapsedTime >= totalDuration) {
      container.isFollowing = false;
      if (container.alpha === 1) this.score += 300;
      this.app.stage.removeChild(container);
      this.hitObjects = this.hitObjects.filter((obj) => obj !== container);
    }
  }

  // NEW: Method to create a spinner
  createSpinner(spinnerData) {
    const container = new PIXI.Container();
    container.x = this.app.view.width / 2;
    container.y = this.app.view.height / 2;

    container.isSpinner = true;
    container.isActive = false;
    container.totalRotation = 0;
    container.lastAngle = null;

    const bg = new PIXI.Graphics()
      .beginFill(0x8b5cf6, 0.2)
      .drawCircle(0, 0, SPINNER_RADIUS)
      .endFill();
    container.addChild(bg);

    const progress = new PIXI.Graphics();
    container.progress = progress;
    container.addChild(progress);

    const center = new PIXI.Graphics()
      .beginFill(0xffffff, 1)
      .drawCircle(0, 0, 20)
      .endFill();
    container.addChild(center);

    this.app.stage.addChild(container);
    this.hitObjects.push(container);

    setTimeout(() => {
      container.isActive = true;
    }, spinnerData.time - this.audio.currentTime * 1000);

    setTimeout(() => {
      container.isActive = false;
      this.score += Math.floor(container.totalRotation / (2 * Math.PI)) * 1000; // Bonus per rotation
      this.app.stage.removeChild(container);
      this.hitObjects = this.hitObjects.filter((obj) => obj !== container);
    }, spinnerData.time + spinnerData.duration - this.audio.currentTime * 1000);
  }

  // NEW: Method to update a spinner's rotation and progress
  updateSpinner(container) {
    if (
      this.latestLandmarks.length === 0 ||
      this.latestLandmarks[0].length === 0
    ) {
      container.lastAngle = null;
      return;
    }

    const canvasWidth = this.app.view.width;
    const canvasHeight = this.app.view.height;
    const landmark = this.latestLandmarks[0][8]; // Use the index finger tip
    const landmarkX = (1 - landmark.x) * canvasWidth;
    const landmarkY = landmark.y * canvasHeight;

    const dx = landmarkX - container.x;
    const dy = landmarkY - container.y;

    // Only spin if hand is inside the spinner area
    if (Math.sqrt(dx * dx + dy * dy) > SPINNER_RADIUS) {
      container.lastAngle = null;
      return;
    }

    const currentAngle = Math.atan2(dy, dx);

    if (container.lastAngle !== null) {
      let deltaAngle = currentAngle - container.lastAngle;
      // Handle angle wraparound from +PI to -PI and vice-versa
      if (deltaAngle > Math.PI) deltaAngle -= 2 * Math.PI;
      if (deltaAngle < -Math.PI) deltaAngle += 2 * Math.PI;

      container.totalRotation += deltaAngle;
      this.score += Math.abs(Math.round(deltaAngle * 10)); // Constant stream of points
    }

    container.lastAngle = currentAngle;

    // Update visual progress meter
    const rotations = Math.abs(container.totalRotation / (2 * Math.PI));
    const fullRotations = Math.floor(rotations);
    const partialRotation = rotations - fullRotations;

    container.progress
      .clear()
      .beginFill(0xffffff, 0.5)
      .moveTo(0, 0)
      .arc(
        0,
        0,
        SPINNER_RADIUS,
        -Math.PI / 2,
        -Math.PI / 2 + partialRotation * 2 * Math.PI
      )
      .endFill();
  }

  isFollowingCorrectly(followX, followY) {
    if (this.latestLandmarks.length === 0) return false;

    const canvasWidth = this.app.view.width;
    const canvasHeight = this.app.view.height;

    for (const hand of this.latestLandmarks) {
      for (const landmark of hand) {
        const landmarkX = (1 - landmark.x) * canvasWidth;
        const landmarkY = landmark.y * canvasHeight;
        const dx = landmarkX - followX;
        const dy = landmarkY - followY;

        if (Math.sqrt(dx * dx + dy * dy) <= FOLLOW_CIRCLE_RADIUS) {
          return true;
        }
      }
    }
    return false;
  }
}
