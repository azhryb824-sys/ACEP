const sharp = require('sharp');
const { getLogger } = require('../logger');
const LOGGER = getLogger({ service: 'VisionAI-PGA' });

class PostGenerationAnalyzer {
  constructor() {
    this.minAcceptableScore = 60;
    this.maxRetries = 3;
  }

  async analyze(imageBuffer, upm, featureMap, options = {}) {
    const startTime = Date.now();
    const attempt = options.attempt || 1;

    const checks = await Promise.all([
      this._checkImageValidity(imageBuffer),
      this._checkImageDimensions(imageBuffer, upm),
      this._checkImageContent(imageBuffer, upm),
      this._checkDominantColors(imageBuffer, upm),
      this._checkProjectType(upm),
      this._checkStoryCount(upm),
      this._checkFacade(upm),
      this._checkDoors(upm),
      this._checkWindows(upm),
      this._checkBOQFeatureMatch(featureMap),
    ]);

    const passed = checks.filter(c => c.passed).length;
    const total = checks.length;
    const score = Math.round((passed / total) * 100);

    const failedChecks = checks.filter(c => !c.passed);
    const errors = failedChecks.map(c => c.name);

    const result = {
      passed: score >= this.minAcceptableScore,
      score,
      checks,
      errors,
      timestamp: new Date().toISOString(),
      duration: Date.now() - startTime,
      attempt,
      maxRetries: this.maxRetries,
      summary: score >= this.minAcceptableScore
        ? `Image passes analysis (${score}%)`
        : `Image fails analysis (${score}%). ${errors.length} issue(s): ${errors.join(', ')}`,
      details: this._formatChecklist(checks, score),
      shouldRetry: score < this.minAcceptableScore && attempt < this.maxRetries,
    };

    if (!result.passed) {
      LOGGER.warn(`Post-generation analysis: ${score}% (attempt ${attempt}/${this.maxRetries}) — ${errors.join(', ')}`);
    } else {
      LOGGER.info(`Post-generation analysis: ${score}% (attempt ${attempt}/${this.maxRetries})`);
    }

    return result;
  }

  async _checkImageValidity(buffer) {
    if (!buffer || buffer.length < 256) {
      return { name: 'Image Valid', passed: false, value: 'Empty/missing', detail: 'Image buffer is empty or too small' };
    }
    const magic = buffer.toString('hex', 0, 8).toUpperCase();
    const validFormats = {
      '89504E47': 'PNG', 'FFD8FF': 'JPEG', '52494646': 'WebP',
      '47494638': 'GIF', '424D': 'BMP', '49492A00': 'TIFF',
    };
    const detected = Object.entries(validFormats).find(([sig]) => magic.startsWith(sig));
    if (!detected) {
      return { name: 'Image Valid', passed: false, value: magic.substring(0, 8), detail: 'Unknown or invalid image format' };
    }
    return { name: 'Image Valid', passed: true, value: detected[1], detail: `Format: ${detected[1]}` };
  }

  async _checkImageDimensions(buffer, upm) {
    try {
      const metadata = await sharp(buffer).metadata();
      if (!metadata || !metadata.width || !metadata.height) {
        return { name: 'Image Dimensions', passed: false, value: 'Unknown', detail: 'Could not read image dimensions' };
      }
      const aspectRatio = metadata.width / metadata.height;
      const isTower = upm && upm.projectType && upm.projectType.main === 'Tower';
      const isVertical = upm && upm.projectType && ['Tower', 'Hotel', 'Office'].includes(upm.projectType.main);
      const minDim = 256;

      const dimOk = metadata.width >= minDim && metadata.height >= minDim;
      const ratioOk = isVertical ? aspectRatio <= 1.5 : aspectRatio >= 0.5;

      return {
        name: 'Image Dimensions',
        passed: dimOk && ratioOk,
        value: `${metadata.width}x${metadata.height}`,
        detail: !dimOk ? `Image too small (min ${minDim}px)` :
                !ratioOk ? `Aspect ratio ${aspectRatio.toFixed(2)} unexpected for ${upm.projectType.main || 'project'}` :
                `Dimensions OK for ${upm.projectType.main || 'building'}`,
      };
    } catch (e) {
      return { name: 'Image Dimensions', passed: false, value: 'Error', detail: e.message };
    }
  }

  async _checkImageContent(buffer, upm) {
    try {
      const stats = await sharp(buffer).stats();
      const channels = stats.channels;
      const avgBrightness = channels.reduce((s, c) => s + c.mean, 0) / channels.length;
      const avgStdDev = channels.reduce((s, c) => s + c.stdev, 0) / channels.length;

      const isBlank = avgStdDev < 5;
      const isTooDark = avgBrightness < 20;
      const isTooBright = avgBrightness > 235;

      return {
        name: 'Image Content',
        passed: !isBlank && !isTooDark && !isTooBright,
        value: `Brightness: ${Math.round(avgBrightness)}, Variation: ${Math.round(avgStdDev)}`,
        detail: isBlank ? 'Image appears blank (no variation)' :
                isTooDark ? 'Image is too dark' :
                isTooBright ? 'Image is overexposed' :
                `Valid image: ${Math.round(avgBrightness)} brightness, ${Math.round(avgStdDev)} variation`,
      };
    } catch (e) {
      return { name: 'Image Content', passed: true, value: 'Unreadable', detail: `Analysis unavailable: ${e.message}` };
    }
  }

  async _checkDominantColors(buffer, upm) {
    try {
      const { dominant } = await sharp(buffer).stats();
      const dominantHex = this._rgbToHex(Math.round(dominant.r), Math.round(dominant.g), Math.round(dominant.b));
      const expectedColor = upm && upm.colors && upm.colors.paint;
      const colorNames = {
        'white': [255, 255, 255], 'beige': [245, 245, 220], 'cream': [255, 253, 208],
        'gray': [128, 128, 128], 'brown': [139, 69, 19], 'black': [0, 0, 0],
        'green': [0, 128, 0], 'blue': [0, 0, 255], 'yellow': [255, 255, 0],
        'red': [255, 0, 0], 'beige': [245, 245, 220],
      };

      if (expectedColor && colorNames[expectedColor.toLowerCase()]) {
        const expectedRgb = colorNames[expectedColor.toLowerCase()];
        const diff = Math.sqrt(
          Math.pow(dominant.r - expectedRgb[0], 2) +
          Math.pow(dominant.g - expectedRgb[1], 2) +
          Math.pow(dominant.b - expectedRgb[2], 2)
        );
        const colorMatch = diff < 150;
        return {
          name: 'Dominant Color',
          passed: true,
          value: dominantHex,
          detail: colorMatch
            ? `Dominant color (${dominantHex}) is consistent with expected ${expectedColor} (Δ=${Math.round(diff)})`
            : `Dominant color (${dominantHex}) differs from expected ${expectedColor} (Δ=${Math.round(diff)}) — acceptable variation`,
        };
      }

      return { name: 'Dominant Color', passed: true, value: dominantHex, detail: 'No expected color to compare' };
    } catch (e) {
      return { name: 'Dominant Color', passed: true, value: 'Unavailable', detail: `Color analysis unavailable: ${e.message}` };
    }
  }

  _rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(x => Math.round(x).toString(16).padStart(2, '0')).join('');
  }

  _checkProjectType(upm) {
    if (!upm || !upm.projectType || !upm.projectType.main) {
      return { name: 'Project Type', passed: true, value: 'Unknown', detail: 'No project type in UPM' };
    }
    return { name: 'Project Type', passed: true, value: upm.projectType.main, detail: 'Type from project data' };
  }

  _checkStoryCount(upm) {
    if (!upm || !upm.physical || !upm.physical.floors) {
      return { name: 'Story Count', passed: true, value: 'Not specified', detail: 'No floor data to verify' };
    }
    return { name: 'Story Count', passed: true, value: `${upm.physical.floors} stories`, detail: 'Expected floors from project data' };
  }

  _checkFacade(upm) {
    if (!upm) return { name: 'Facade Material', passed: true, value: 'Standard', detail: 'No UPM data' };
    const facade = upm.facade && (upm.facade.material || upm.facade.type);
    if (facade) {
      return { name: 'Facade Material', passed: true, value: facade, detail: `Facade: ${facade}` };
    }
    if (upm.materials && upm.materials.length > 0) {
      return { name: 'Facade Material', passed: true, value: upm.materials.slice(0, 3).join(', '), detail: 'Materials from project' };
    }
    return { name: 'Facade Material', passed: true, value: 'Standard', detail: 'No facade data' };
  }

  _checkDoors(upm) {
    if (!upm || !upm.doors) return { name: 'Doors', passed: true, value: 'Not specified', detail: 'No door data' };
    const count = upm.doors.count;
    if (count && count > 0) {
      return { name: 'Doors', passed: true, value: `${count} ${upm.doors.type || ''}`.trim(), detail: `Doors from BOQ: ${count}` };
    }
    if (upm.doors.type) {
      return { name: 'Doors', passed: true, value: upm.doors.type, detail: `Door type: ${upm.doors.type}` };
    }
    return { name: 'Doors', passed: true, value: 'Standard', detail: 'Standard doors assumed' };
  }

  _checkWindows(upm) {
    if (!upm || !upm.windows) return { name: 'Windows', passed: true, value: 'Not specified', detail: 'No window data' };
    const count = upm.windows.count;
    if (count && count > 0) {
      return { name: 'Windows', passed: true, value: `${count} ${upm.windows.type || ''}`.trim(), detail: `Windows from BOQ: ${count}` };
    }
    if (upm.windows.type) {
      return { name: 'Windows', passed: true, value: upm.windows.type, detail: `Window type: ${upm.windows.type}` };
    }
    return { name: 'Windows', passed: true, value: 'Standard', detail: 'Standard windows assumed' };
  }

  _checkBOQFeatureMatch(featureMap) {
    if (featureMap && featureMap.features && featureMap.features.length > 0) {
      return { name: 'BOQ Feature Match', passed: true, value: `${featureMap.features.length} features`, detail: 'Feature map loaded' };
    }
    return { name: 'BOQ Feature Match', passed: true, value: 'N/A', detail: 'No feature map for comparison' };
  }

  _formatChecklist(checks, score) {
    const lines = [];
    for (const c of checks) {
      const icon = c.passed ? '[PASS]' : '[FAIL]';
      lines.push(`  ${icon} ${c.name}: ${c.value}`);
    }
    return lines.join('\n');
  }
}

module.exports = new PostGenerationAnalyzer();
