/* global AFRAME */
const COLLISION_LAYERS = require("../constants").COLLISION_LAYERS;

AFRAME.registerComponent("sticky-object", {
  schema: {
    autoLockOnLoad: { default: false },
    modifyGravityOnRelease: { default: false },
    gravitySpeedLimit: { default: 1.85 } // Set to 0 to never apply gravity
  },

  init() {
    this.onGrab = this.onGrab.bind(this);
    this.onRelease = this.onRelease.bind(this);
  },

  tick() {
    const interaction = AFRAME.scenes[0].systems.interaction;
    const isHeld = interaction.isHeld(this.el);
    if (isHeld && !this.wasHeld) {
      this.onGrab();
    }
    if (this.wasHeld && !isHeld) {
      this.onRelease();
    }
    this.wasHeld = isHeld;
  },

  play() {
    // We do this in play instead of in init because otherwise NAF.utils.isMine fails
    if (this.hasBeenHereBefore) return;
    this.hasBeenHereBefore = true;
    if (this.el.body) {
      this._onBodyLoaded();
    } else {
      this._onBodyLoaded = this._onBodyLoaded.bind(this);
      this.el.addEventListener("body-loaded", this._onBodyLoaded, { once: true });
    }
  },

  setLocked(locked) {
    if (this.el.components.networked && !NAF.utils.isMine(this.el)) return;

    this.locked = locked;
    this.el.setAttribute("ammo-body", { type: locked ? "kinematic" : "dynamic" });
  },

  _onBodyLoaded() {
    if (this.data.autoLockOnLoad) {
      this.setLocked(true);
    }
  },

  onRelease() {
    if (
      this.data.modifyGravityOnRelease &&
      (this.data.gravitySpeedLimit === 0 ||
        this.el.components["ammo-body"].getVelocity().length() < this.data.gravitySpeedLimit)
    ) {
      // 0.7 0.15 0.5 0.3
      this.el.setAttribute("ammo-body", {
        gravity: { x: 0, y: 0, z: 0 },
        angularDamping: 0.5,
        linearDamping: 0.95,
        linearSleepingThreshold: 0.1,
        angularSleepingThreshold: 0.1
      });
    } else {
      this.el.setAttribute("ammo-body", {
        gravity: { x: 0, y: -1, z: 0 },
        angularDamping: 0.01,
        linearDamping: 0.01,
        linearSleepingThreshold: 1.6,
        angularSleepingThreshold: 2.5
      });
    }

    this.el.setAttribute("ammo-body", { collisionFilterMask: COLLISION_LAYERS.DEFAULT_INTERACTABLE });
  },

  onGrab() {
    this.el.setAttribute("ammo-body", {
      collisionFilterMask: this.locked ? COLLISION_LAYERS.HANDS : COLLISION_LAYERS.DEFAULT_INTERACTABLE
    });
    this.setLocked(false);
  },

  remove() {
    this.el.removeEventListener("body-loaded", this._onBodyLoaded);
    if (this.stuckTo) {
      const stuckTo = this.stuckTo;
      delete this.stuckTo;
      stuckTo._unstickObject();
    }
  }
});
