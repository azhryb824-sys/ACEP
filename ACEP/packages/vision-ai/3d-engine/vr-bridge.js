class VRBridge {
  constructor(scene) {
    this.scene = scene;
    this.supported = false;
    this._arMode = false;
    this._vrMode = false;
  }

  async checkSupport() {
    if (navigator.xr) {
      const vr = await navigator.xr.isSessionSupported('immersive-vr');
      const ar = await navigator.xr.isSessionSupported('immersive-ar');
      this.supported = vr || ar;
      return { vr, ar, supported: this.supported };
    }
    return { vr: false, ar: false, supported: false };
  }

  async enterVR() {
    if (!navigator.xr) throw new Error('WebXR not available');
    try {
      const session = await navigator.xr.requestSession('immersive-vr', {
        requiredFeatures: ['local-floor'],
      });
      this._vrMode = true;
      this.scene.emit('vrMode', true);
      return session;
    } catch (e) {
      throw new Error(`VR failed: ${e.message}`);
    }
  }

  async enterAR() {
    if (!navigator.xr) throw new Error('WebXR not available');
    try {
      const session = await navigator.xr.requestSession('immersive-ar', {
        requiredFeatures: ['local-floor', 'hit-test'],
      });
      this._arMode = true;
      this.scene.emit('arMode', true);
      return session;
    } catch (e) {
      throw new Error(`AR failed: ${e.message}`);
    }
  }

  exit() {
    this._vrMode = false;
    this._arMode = false;
    this.scene.emit('vrMode', false);
    this.scene.emit('arMode', false);
  }

  isVR() { return this._vrMode; }
  isAR() { return this._arMode; }
}

module.exports = { VRBridge };
