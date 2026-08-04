/**
 * ACEP Simulation Camera — التحكم بالكاميرا في فيديو المحاكاة
 *
 * 12 وضع كاميرا مع إمكانية توليد مسارات orbit و walkthrough و dynamic.
 */
class SimulationCamera {
  constructor() {
    this.modes = this._initCameraModes();
  }

  _initCameraModes() {
    return {
      front_view: {
        id: 'front_view',
        nameAr: 'واجهة أمامية',
        nameEn: 'Front View',
        position: { x: 0, y: 5, z: 50 },
        target: { x: 0, y: 0, z: 0 },
        fov: 60,
        orbit: false,
        orbitSpeed: 0,
        elevation: 5,
        azimuth: 0,
        distance: 50
      },
      rear_view: {
        id: 'rear_view',
        nameAr: 'واجهة خلفية',
        nameEn: 'Rear View',
        position: { x: 0, y: 5, z: -50 },
        target: { x: 0, y: 0, z: 0 },
        fov: 60,
        orbit: false,
        orbitSpeed: 0,
        elevation: 5,
        azimuth: 180,
        distance: 50
      },
      side_view: {
        id: 'side_view',
        nameAr: 'واجهة جانبية',
        nameEn: 'Side View',
        position: { x: 50, y: 5, z: 0 },
        target: { x: 0, y: 0, z: 0 },
        fov: 60,
        orbit: false,
        orbitSpeed: 0,
        elevation: 5,
        azimuth: 90,
        distance: 50
      },
      top_view: {
        id: 'top_view',
        nameAr: 'مخطط علوي',
        nameEn: 'Top View',
        position: { x: 0, y: 80, z: 0 },
        target: { x: 0, y: 0, z: 0 },
        fov: 45,
        orbit: false,
        orbitSpeed: 0,
        elevation: 90,
        azimuth: 0,
        distance: 80
      },
      drone_view: {
        id: 'drone_view',
        nameAr: 'تصوير جوي',
        nameEn: 'Drone View',
        position: { x: 56, y: 30, z: 56 },
        target: { x: 0, y: 0, z: 0 },
        fov: 70,
        orbit: false,
        orbitSpeed: 0,
        elevation: 30,
        azimuth: 45,
        distance: 80
      },
      bird_eye: {
        id: 'bird_eye',
        nameAr: 'عين الطائر',
        nameEn: "Bird's Eye",
        position: { x: 0, y: 100, z: 0 },
        target: { x: 0, y: 0, z: 0 },
        fov: 40,
        orbit: false,
        orbitSpeed: 0,
        elevation: 90,
        azimuth: 0,
        distance: 100
      },
      street_view: {
        id: 'street_view',
        nameAr: 'مستوى الشارع',
        nameEn: 'Street View',
        position: { x: 0, y: 1.7, z: 30 },
        target: { x: 0, y: 0, z: 0 },
        fov: 75,
        orbit: false,
        orbitSpeed: 0,
        elevation: 0,
        azimuth: 0,
        distance: 30
      },
      section_view: {
        id: 'section_view',
        nameAr: 'مقطع عرضي',
        nameEn: 'Section View',
        position: { x: 0, y: 10, z: 40 },
        target: { x: 0, y: 5, z: 0 },
        fov: 50,
        orbit: false,
        orbitSpeed: 0,
        elevation: 10,
        azimuth: 0,
        distance: 40
      },
      exploded_view: {
        id: 'exploded_view',
        nameAr: 'منظور انفجاري',
        nameEn: 'Exploded View',
        position: { x: 30, y: 20, z: 30 },
        target: { x: 0, y: 0, z: 0 },
        fov: 65,
        orbit: true,
        orbitSpeed: 0.5,
        elevation: 20,
        azimuth: 45,
        distance: 50
      },
      walkthrough: {
        id: 'walkthrough',
        nameAr: 'تجول داخلي',
        nameEn: 'Walkthrough',
        position: { x: 5, y: 1.7, z: 5 },
        target: { x: 10, y: 1.7, z: 5 },
        fov: 80,
        orbit: false,
        orbitSpeed: 0,
        elevation: 0,
        azimuth: 0,
        distance: 10
      },
      orbit_360: {
        id: 'orbit_360',
        nameAr: 'دوران 360',
        nameEn: '360 Orbit',
        position: { x: 60, y: 15, z: 0 },
        target: { x: 0, y: 5, z: 0 },
        fov: 60,
        orbit: true,
        orbitSpeed: 1,
        elevation: 15,
        azimuth: 0,
        distance: 60
      },
      dynamic_auto: {
        id: 'dynamic_auto',
        nameAr: 'تلقائي ديناميكي',
        nameEn: 'Dynamic Auto',
        position: { x: 0, y: 5, z: 50 },
        target: { x: 0, y: 0, z: 0 },
        fov: 60,
        orbit: false,
        orbitSpeed: 0,
        elevation: 5,
        azimuth: 0,
        distance: 50
      }
    };
  }

  /**
   * يرجع إعدادات الكاميرا حسب نوع العرض والمشروع
   */
  getCameraProfile(viewType, projectGeometry = {}) {
    const base = this.modes[viewType];
    if (!base) return null;

    const { width = 20, height = 10, depth = 20 } = projectGeometry;
    const maxDim = Math.max(width, depth, height || 1);
    let profile = { ...base };

    if (viewType === 'dynamic_auto') {
      profile = this._getDynamicAutoProfile(projectGeometry);
    }

    // ضبط المسافة حسب أبعاد المشروع
    const scale = maxDim / 20;
    if (viewType !== 'dynamic_auto') {
      profile.distance = (base.distance || 50) * Math.max(1, scale * 0.8);
      profile.position = this._sphericalToCartesian(
        profile.distance,
        base.elevation || 0,
        base.azimuth || 0,
        base.target || { x: 0, y: 0, z: 0 }
      );
    }

    return profile;
  }

  _getDynamicAutoProfile(projectGeometry) {
    const { width = 20, height = 10, depth = 20 } = projectGeometry;
    const maxDim = Math.max(width, depth);
    const center = { x: 0, y: height / 2, z: 0 };
    return {
      id: 'dynamic_auto',
      nameAr: 'تلقائي ديناميكي',
      nameEn: 'Dynamic Auto',
      position: { x: maxDim * 1.5, y: height * 0.8, z: maxDim * 1.5 },
      target: center,
      fov: 60,
      orbit: true,
      orbitSpeed: 0.3,
      elevation: 25,
      azimuth: 45,
      distance: maxDim * 2
    };
  }

  /**
   * يحول الإحداثيات الكروية إلى ديكارتية
   */
  _sphericalToCartesian(distance, elevationDeg, azimuthDeg, target) {
    const elevRad = (elevationDeg * Math.PI) / 180;
    const azimRad = (azimuthDeg * Math.PI) / 180;
    const x = target.x + distance * Math.cos(elevRad) * Math.sin(azimRad);
    const y = target.y + distance * Math.sin(elevRad);
    const z = target.z + distance * Math.cos(elevRad) * Math.cos(azimRad);
    return { x, y, z };
  }

  /**
   * يرجع مسار orbit لدوران الكاميرا حول نقطة مركزية
   */
  getOrbitPath(frames, center = { x: 0, y: 0, z: 0 }, radius = 50, elevation = 15) {
    const path = [];
    for (let i = 0; i < frames; i++) {
      const angle = (i / frames) * 2 * Math.PI;
      const elevRad = (elevation * Math.PI) / 180;
      path.push({
        frame: i,
        position: {
          x: center.x + radius * Math.cos(angle) * Math.cos(elevRad),
          y: center.y + radius * Math.sin(elevRad),
          z: center.z + radius * Math.sin(angle) * Math.cos(elevRad)
        },
        target: { ...center },
        fov: 60
      });
    }
    return path;
  }

  /**
   * يرجع مسار تجول داخلي
   */
  getWalkthroughPath(projectGeometry, frames = 300) {
    const { width = 20, depth = 20 } = projectGeometry;
    const waypoints = [
      { x: -width * 0.4, y: 1.7, z: -depth * 0.4 },
      { x: width * 0.4, y: 1.7, z: -depth * 0.3 },
      { x: width * 0.3, y: 1.7, z: depth * 0.3 },
      { x: -width * 0.3, y: 1.7, z: depth * 0.4 },
      { x: -width * 0.4, y: 1.7, z: -depth * 0.4 }
    ];
    const path = [];
    const segments = waypoints.length - 1;
    const framesPerSegment = Math.floor(frames / segments);
    for (let seg = 0; seg < segments; seg++) {
      const p1 = waypoints[seg];
      const p2 = waypoints[seg + 1];
      for (let f = 0; f < framesPerSegment; f++) {
        const t = f / framesPerSegment;
        const pos = this.interpolatePosition(p1, p2, t);
        path.push({
          frame: path.length,
          position: pos,
          target: this.interpolatePosition(
            { x: p2.x, y: p2.y, z: p2.z },
            { x: p2.x * 1.5, y: p2.y, z: p2.z * 1.5 },
            t
          ),
          fov: 80
        });
      }
    }
    return path;
  }

  /**
   * يرجع مسار ديناميكي يتغير مع مراحل المشروع
   */
  getDynamicPath(stages, projectGeometry = {}) {
    const { width = 20, depth = 20 } = projectGeometry;
    const path = [];
    stages.forEach((stage, index) => {
      const progress = index / Math.max(stages.length - 1, 1);
      const distance = this._getDynamicDistance(stage, progress);
      const elevation = 5 + progress * 25;
      const angle = (index / stages.length) * 2 * Math.PI;
      const center = { x: 0, y: 0, z: 0 };
      path.push({
        stage: stage.id || stage.nameEn,
        position: {
          x: center.x + distance * Math.cos(angle),
          y: center.y + elevation,
          z: center.z + distance * Math.sin(angle)
        },
        target: { ...center },
        fov: 55 + progress * 15,
        elevation,
        distance
      });
    });
    return path;
  }

  /**
   * تحسب مسافة الكاميرا حسب مرحلة التنفيذ
   * قريبة للحفر، بعيدة للهيكل، متوسطة للتشطيبات
   */
  _getDynamicDistance(stage, progress) {
    const stageName = (stage.nameAr || stage.nameEn || '').toLowerCase();
    if (stageName.includes('حفر') || stageName.includes('excavation')) return 20;
    if (stageName.includes('هيكل') || stageName.includes('structure') || stageName.includes('frame')) return 60;
    if (stageName.includes('تشطيب') || stageName.includes('finishing') || progress > 0.7) return 35;
    return 50;
  }

  /**
   * يحسب موقع بيني بين موقعين
   */
  interpolatePosition(pos1, pos2, t) {
    return {
      x: pos1.x + (pos2.x - pos1.x) * t,
      y: pos1.y + (pos2.y - pos1.y) * t,
      z: pos1.z + (pos2.z - pos1.z) * t
    };
  }

  /**
   * يولد keyframes للكاميرا حسب نوع العرض
   */
  generateCameraKeyframes(viewType, totalFrames, projectGeometry = {}) {
    const profile = this.getCameraProfile(viewType, projectGeometry);
    if (!profile) return [];

    let keyframes = [];

    if (profile.orbit) {
      keyframes = this.getOrbitPath(
        totalFrames,
        profile.target,
        profile.distance,
        profile.elevation
      ).map((kf, i) => ({
        frame: i,
        position: { ...kf.position },
        target: { ...kf.target },
        fov: profile.fov
      }));
    } else if (viewType === 'walkthrough') {
      keyframes = this.getWalkthroughPath(projectGeometry, totalFrames);
    } else if (viewType === 'dynamic_auto') {
      const stages = projectGeometry.stages || [];
      if (stages.length > 0) {
        const dynPath = this.getDynamicPath(stages, projectGeometry);
        keyframes = [];
        const framesPerStage = Math.floor(totalFrames / Math.max(dynPath.length, 1));
        dynPath.forEach((dp, si) => {
          for (let f = 0; f < framesPerStage; f++) {
            const t = f / framesPerStage;
            const next = dynPath[Math.min(si + 1, dynPath.length - 1)];
            const pos = this.interpolatePosition(dp.position, next.position, t);
            keyframes.push({
              frame: keyframes.length,
              position: pos,
              target: this.interpolatePosition(dp.target, next.target, t),
              fov: dp.fov
            });
          }
        });
      } else {
        keyframes.push({
          frame: 0,
          position: { ...profile.position },
          target: { ...profile.target },
          fov: profile.fov
        });
      }
    } else {
      // وضع ثابت
      keyframes.push({
        frame: 0,
        position: { ...profile.position },
        target: { ...profile.target },
        fov: profile.fov
      });
      if (totalFrames > 1) {
        keyframes.push({
          frame: totalFrames - 1,
          position: { ...profile.position },
          target: { ...profile.target },
          fov: profile.fov
        });
      }
    }

    return keyframes;
  }
}

module.exports = SimulationCamera;
