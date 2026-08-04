class MiniMap {
  constructor(scene) {
    this.scene = scene;
    this.canvas = null;
    this.ctx = null;
    this.size = 180;
    this.show = true;
  }

  init(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    this.canvas = document.createElement('canvas');
    this.canvas.width = this.size;
    this.canvas.height = this.size;
    this.canvas.style.cssText = 'border-radius:8px;border:1px solid rgba(255,255,255,0.1);background:rgba(0,0,0,0.6);';
    container.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');

    this.scene.on('cameraMoved', () => this._render());
    this._render();
  }

  toggle() {
    this.show = !this.show;
    if (this.canvas) this.canvas.style.display = this.show ? 'block' : 'none';
  }

  _render() {
    if (!this.ctx || !this.show) return;
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(0, 0, w, h);

    const cx = w / 2;
    const cy = h / 2;
    const scale = 2;

    for (const elem of this.scene.objects.values()) {
      if (!elem.visible || !elem.userData?.id) continue;
      const pos = elem.position;
      const sx = cx + pos.x * scale;
      const sy = cy + pos.z * scale;
      if (sx < 0 || sx > w || sy < 0 || sy > h) continue;

      ctx.fillStyle = elem.userData.type === 'wall' ? '#4488ff' :
                      elem.userData.type === 'column' ? '#66aaff' :
                      elem.userData.type === 'slab' ? '#4488aa' : '#6688aa';
      ctx.fillRect(sx - 1.5, sy - 1.5, 3, 3);
    }

    const camPos = this.scene.camera.position;
    ctx.strokeStyle = '#ff6644';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx + camPos.x * scale, cy + camPos.z * scale, 4, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#ff6644';
    ctx.font = '8px sans-serif';
    ctx.fillText('N', cx, 10);
  }
}

module.exports = { MiniMap };
