const ComputerVisionEngine = require('./computer-vision-engine');

class ComparisonEngine {
  constructor() {
    this.vision = new ComputerVisionEngine();
  }

  compareBeforeAfter(beforeImageData, afterImageData, projectData) {
    const beforeAnalysis = this.vision.analyzeImage(beforeImageData);
    const afterAnalysis = this.vision.analyzeImage(afterImageData);
    const changeDetection = this.vision.detectChanges(beforeImageData, afterImageData);

const beforeObjects = new Set((beforeAnalysis.objects || []).map(o => o.type));
     const afterObjects = new Set((afterAnalysis.objects || []).map(o => o.type));

     const elementsAdded = [...afterObjects].filter(o => !beforeObjects.has(o));
     const elementsRemoved = [...beforeObjects].filter(o => !afterObjects.has(o));

     const transformations = [];
     if (beforeAnalysis.lighting && afterAnalysis.lighting && beforeAnalysis.lighting.brightness !== afterAnalysis.lighting.brightness) {
       transformations.push({
         type: 'lighting_change',
         from: beforeAnalysis.lighting,
         to: afterAnalysis.lighting,
         delta: parseFloat((afterAnalysis.lighting.brightness - beforeAnalysis.lighting.brightness).toFixed(2))
       });
     }
     if (beforeAnalysis.dimensions && afterAnalysis.dimensions && (beforeAnalysis.dimensions.width !== afterAnalysis.dimensions.width || beforeAnalysis.dimensions.height !== afterAnalysis.dimensions.height)) {
       transformations.push({
         type: 'dimension_change',
         from: beforeAnalysis.dimensions,
         to: afterAnalysis.dimensions,
         delta: {
           width: afterAnalysis.dimensions.width - beforeAnalysis.dimensions.width,
           height: afterAnalysis.dimensions.height - beforeAnalysis.dimensions.height
         }
       });
     }

     return {
       beforeUrl: beforeImageData || null,
       afterUrl: afterImageData || null,
      changes: changeDetection.changes,
      similarity: changeDetection.similarityScore,
      elementsAdded: elementsAdded.map(e => ({
        type: e,
        details: afterAnalysis.objects.find(o => o.type === e)
      })),
      elementsRemoved: elementsRemoved.map(e => ({
        type: e,
        details: beforeAnalysis.objects.find(o => o.type === e)
      })),
      transformations,
      projectMetadata: projectData ? {
        projectName: projectData.name || projectData.projectName || 'Unknown',
        phase: projectData.phase || 'unknown',
        dateRange: {
          before: projectData.dateBefore || 'unknown',
          after: projectData.dateAfter || 'unknown'
        }
      } : null,
      summary: `Detected ${changeDetection.changes.length} changes between images. ` +
        `${elementsAdded.length} elements added, ${elementsRemoved.length} elements removed. ` +
        `Images are ${(changeDetection.similarityScore * 100).toFixed(0)}% similar.`,
      recommendations: changeDetection.similarityScore < 0.5
        ? ['Significant changes detected - review required', 'Verify structural integrity']
        : ['Minor changes only', 'Progress is consistent']
    };
  }

  generateComparisonSlider(beforeUrl, afterUrl) {
    const sliderId = `comparison-slider-${Date.now()}`;
    const sliderHtml = `
<div class="comparison-slider-wrapper" style="position:relative;width:100%;max-width:800px;overflow:hidden;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.15);">
  <div id="${sliderId}" style="position:relative;width:100%;padding-bottom:75%;cursor:ew-resize;">
    <div class="comparison-before" style="position:absolute;top:0;left:0;width:100%;height:100%;">
      <img src="${beforeUrl}" alt="Before" style="width:100%;height:100%;object-fit:cover;display:block;" />
      <span style="position:absolute;top:12px;left:12px;background:rgba(0,0,0,0.6);color:#fff;padding:4px 12px;border-radius:4px;font-family:sans-serif;font-size:13px;">Before</span>
    </div>
    <div class="comparison-after" style="position:absolute;top:0;left:0;width:50%;height:100%;overflow:hidden;">
      <img src="${afterUrl}" alt="After" style="width:100%;height:100%;object-fit:cover;display:block;max-width:none;position:absolute;left:0;top:0;" />
      <span style="position:absolute;top:12px;right:12px;background:rgba(0,0,0,0.6);color:#fff;padding:4px 12px;border-radius:4px;font-family:sans-serif;font-size:13px;">After</span>
    </div>
    <div class="comparison-handle" style="position:absolute;top:0;left:50%;width:4px;height:100%;background:#fff;box-shadow:0 0 8px rgba(0,0,0,0.4);z-index:10;transform:translateX(-2px);">
      <div style="position:absolute;top:50%;left:50%;width:36px;height:36px;background:#fff;border-radius:50%;transform:translate(-50%,-50%);box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;">
        <span style="font-size:16px;color:#666;">⇔</span>
      </div>
    </div>
  </div>
  <script>
    (function() {
      var container = document.getElementById('${sliderId}');
      var after = container.querySelector('.comparison-after');
      var handle = container.querySelector('.comparison-handle');
      var isDragging = false;
      function update(x) {
        var rect = container.getBoundingClientRect();
        var pct = Math.max(0, Math.min(100, (x - rect.left) / rect.width * 100));
        after.style.width = pct + '%';
        handle.style.left = pct + '%';
      }
      container.addEventListener('mousedown', function(e) { isDragging = true; update(e.clientX); });
      document.addEventListener('mousemove', function(e) { if (isDragging) update(e.clientX); });
      document.addEventListener('mouseup', function() { isDragging = false; });
      container.addEventListener('touchstart', function(e) { isDragging = true; update(e.touches[0].clientX); });
      document.addEventListener('touchmove', function(e) { if (isDragging) update(e.touches[0].clientX); });
      document.addEventListener('touchend', function() { isDragging = false; });
    })();
  </script>
</div>`;
    return {
      html: sliderHtml,
      id: sliderId,
      config: {
        initialPosition: 50,
        orientation: 'horizontal',
        showLabels: true,
        labelPosition: 'top'
      }
    };
  }

  compareRealityVsPrediction(realPhotoData, predictedImageData, projectParams) {
    const real = this.vision.analyzeImage(realPhotoData);
    const predicted = predictedImageData;
    const predictedAnalysis = typeof predictedImageData === 'string'
      ? this.vision.analyzeImage(predictedImageData)
      : { objects: [], dimensions: { width: 0, height: 0 }, lighting: null, colors: [], detectedFeatures: [] };

    const discrepancies = [];
    for (const realObj of real.objects) {
      const predObj = predictedAnalysis.objects.find(p => p.type === realObj.type);
      if (!predObj) {
        discrepancies.push({
          element: realObj.type,
          expected: 'not_planned',
          actual: 'present',
          impact: 'unexpected_element'
        });
      } else {
        const confidenceDiff = realObj.confidence - predObj.confidence;
        if (Math.abs(confidenceDiff) > 0.1) {
          discrepancies.push({
            element: realObj.type,
            expected: predObj.confidence,
            actual: realObj.confidence,
            impact: confidenceDiff > 0 ? 'exceeds_expectations' : 'below_expectations',
            variance: parseFloat(confidenceDiff.toFixed(2))
          });
        }
      }
    }
    for (const predObj of predictedAnalysis.objects) {
      if (!real.objects.find(r => r.type === predObj.type)) {
        discrepancies.push({
          element: predObj.type,
          expected: 'planned',
          actual: 'missing',
          impact: 'missing_element'
        });
      }
    }

    const totalElements = Math.max(real.objects.length + predictedAnalysis.objects.length, 1);
    const matchedElements = real.objects.filter(r =>
      predictedAnalysis.objects.some(p => p.type === r.type)
    ).length;
    const matchPercentage = Math.round((matchedElements / totalElements) * 100);

    const delays = [];
    if (projectParams && projectParams.expectedProgress !== undefined) {
      const siteData = this.vision.analyzeSitePhoto(realPhotoData);
      const actualProgress = siteData.progress;
      const variance = actualProgress - projectParams.expectedProgress;
      if (variance < -5) {
        delays.push({
          area: 'overall_project',
          expected: projectParams.expectedProgress + '%',
          actual: actualProgress + '%',
          delay: Math.abs(variance) + '% behind schedule',
          impact: 'critical'
        });
      }
    }

    const errors = discrepancies.filter(d =>
      d.impact === 'missing_element' || d.impact === 'unexpected_element'
    );

    return {
      matchPercentage,
      discrepancies,
      delays,
      errors,
      realStats: {
        objectCount: real.objects.length,
        dimensions: real.dimensions,
        lighting: real.lighting
      },
      predictedStats: {
        objectCount: predictedAnalysis.objects.length,
        dimensions: predictedAnalysis.dimensions,
        lighting: predictedAnalysis.lighting
      },
      summary: `Reality vs Prediction analysis complete. Match: ${matchPercentage}%. ` +
        `${discrepancies.length} discrepancies found, ${delays.length} delays detected.`,
      recommendations: matchPercentage < 70
        ? ['Review project plan and actual execution', 'Schedule corrective actions', 'Re-evaluate resource allocation']
        : matchPercentage < 90
          ? ['Minor adjustments needed', 'Continue monitoring progress']
          : ['Project is on track', 'Excellent alignment with plan']
    };
  }

  compareConcepts(conceptImages) {
    if (!Array.isArray(conceptImages) || conceptImages.length < 2) {
      return {
        similarities: [],
        differences: [],
        recommendations: ['Need at least 2 concept images to compare']
      };
    }
    const analyses = conceptImages.map((img, i) => ({
      index: i,
      analysis: this.vision.analyzeImage(img),
      siteData: this.vision.analyzeSitePhoto(img)
    }));

    const similarities = [];
    const allObjectTypes = [...new Set(analyses.flatMap(a =>
      a.analysis.objects.map(o => o.type)
    ))];
    for (const objType of allObjectTypes) {
      const presentIn = analyses.filter(a =>
        a.analysis.objects.some(o => o.type === objType)
      );
      if (presentIn.length === analyses.length) {
        similarities.push({
          element: objType,
          sharedBy: analyses.length,
          averageConfidence: parseFloat((
            presentIn.reduce((sum, a) =>
              sum + (a.analysis.objects.find(o => o.type === objType)?.confidence || 0), 0
            ) / presentIn.length
          ).toFixed(2))
        });
      }
    }

    const differences = [];
    for (let i = 0; i < analyses.length; i++) {
      for (let j = i + 1; j < analyses.length; j++) {
        const a = analyses[i];
        const b = analyses[j];
        const aTypes = a.analysis.objects.map(o => o.type);
        const bTypes = b.analysis.objects.map(o => o.type);
        const uniqueToA = aTypes.filter(t => !bTypes.includes(t));
        const uniqueToB = bTypes.filter(t => !aTypes.includes(t));
        if (uniqueToA.length > 0 || uniqueToB.length > 0) {
          differences.push({
            between: [i, j],
            conceptA: { index: i, uniqueElements: uniqueToA },
            conceptB: { index: j, uniqueElements: uniqueToB }
          });
        }
      }
    }

    const dimensions = analyses.map(a => a.analysis.dimensions);
    const uniqueColors = [...new Set(analyses.flatMap(a =>
      a.analysis.colors.map(c => c.name)
    ))];

    const recommendations = [];
    if (similarities.length > 3) {
      recommendations.push('Concepts share strong common elements - choose based on cost or feasibility');
    } else {
      recommendations.push('Concepts are distinct - evaluate each against project requirements');
    }
    if (differences.length > 0) {
      recommendations.push('Review unique elements in each concept for added value vs cost');
    }
    recommendations.push('Consider combining strongest elements from multiple concepts');

    return {
      conceptsCount: conceptImages.length,
      similarities,
      differences,
      dimensions: {
        all: dimensions,
        consistent: dimensions.every(d =>
          d.width === dimensions[0].width && d.height === dimensions[0].height
        )
      },
      colorPalettes: {
        shared: uniqueColors,
        perConcept: analyses.map(a => a.analysis.colors)
      },
      scores: analyses.map((a, i) => ({
        concept: i,
        complexity: a.analysis.objects.length,
        lightingScore: a.analysis.lighting.brightness,
        featureRichness: a.analysis.detectedFeatures.length
      })),
      recommendations
    };
  }

  trackProgress(imageHistory, timeline) {
    if (!Array.isArray(imageHistory) || imageHistory.length === 0) {
      return {
        completionPercentage: 0,
        expectedVsActual: { expected: 0, actual: 0, variance: 0 },
        nextMilestones: [],
        timelineDelta: null,
        message: 'No image history provided'
      };
    }

    const analyses = imageHistory.map(img => this.vision.analyzeSitePhoto(img));
    const latestAnalysis = analyses[analyses.length - 1];
    const firstAnalysis = analyses[0];
    const actualProgress = latestAnalysis.progress;
    const startProgress = firstAnalysis.progress;

    const expectedProgress = timeline
      ? (timeline.expectedCompletion || timeline.expectedPercentage || actualProgress)
      : actualProgress;

    const variance = expectedProgress - actualProgress;
    const progressRate = imageHistory.length > 1
      ? parseFloat(((actualProgress - startProgress) / (imageHistory.length - 1)).toFixed(2))
      : 0;

    const nextMilestones = [];
    if (actualProgress < 25) {
      nextMilestones.push({ name: 'Foundation complete', targetProgress: 25, estimatedWeeks: 2 });
    }
    if (actualProgress < 50) {
      nextMilestones.push({ name: 'Structural framing complete', targetProgress: 50, estimatedWeeks: 4 });
    }
    if (actualProgress < 75) {
      nextMilestones.push({ name: 'MEP rough-in complete', targetProgress: 75, estimatedWeeks: 6 });
    }
    if (actualProgress < 90) {
      nextMilestones.push({ name: 'Interior finishing', targetProgress: 90, estimatedWeeks: 8 });
    }
    nextMilestones.push({ name: 'Project handover', targetProgress: 100, estimatedWeeks: 10 });

    const timelineDelta = timeline ? {
      plannedStart: timeline.startDate || 'N/A',
      plannedEnd: timeline.endDate || 'N/A',
      currentProgressDate: timeline.currentDate || 'N/A',
      daysBehind: variance > 5 ? Math.round(variance * 1.5) : 0,
      daysAhead: variance < -5 ? Math.round(Math.abs(variance) * 1.2) : 0,
      status: variance > 5 ? 'behind' : variance < -3 ? 'ahead' : 'on_track'
    } : null;

    return {
      completionPercentage: actualProgress,
      progressRate,
      snapshots: imageHistory.length,
      expectedVsActual: {
        expected: expectedProgress,
        actual: actualProgress,
        variance: parseFloat(variance.toFixed(1)),
        status: variance > 5 ? 'behind_schedule' : variance < -3 ? 'ahead_of_schedule' : 'on_schedule'
      },
      nextMilestones,
      timelineDelta,
      activities: latestAnalysis.activities,
      safetyTrend: analyses.map(a => a.safetyIssues.length),
      summary: `Project at ${actualProgress}% completion. ${variance > 5 ? `${variance}% behind schedule` : variance < -3 ? `${Math.abs(variance)}% ahead of schedule` : 'On schedule'}. ` +
        `${nextMilestones.length} upcoming milestones identified.`
    };
  }

  generateTransformationVideo(frames, fps) {
    const frameCount = Array.isArray(frames) ? frames.length : 24;
    const resolvedFps = fps || 30;
    const duration = frameCount / resolvedFps;
    const resolvedFrames = [];
    for (let i = 0; i < Math.min(frameCount, 10); i++) {
      const progress = i / Math.min(frameCount, 10);
      const frameData = Array.isArray(frames) && frames[i] ? frames[i] : null;
      resolvedFrames.push({
        index: i,
        timestamp: parseFloat((i / resolvedFps).toFixed(2)),
        progress: parseFloat((progress * 100).toFixed(1)),
        frameData
      });
    }
    return {
      url: null,
      format: 'mp4',
      duration: parseFloat(duration.toFixed(2)),
      fps: resolvedFps,
      totalFrames: frameCount,
      resolution: { width: 1920, height: 1080 },
      codec: 'h264',
      frames: resolvedFrames,
      keyframes: [
        { at: 0, label: 'Start', progress: 0 },
        { at: parseFloat((duration * 0.25).toFixed(2)), label: '25% Complete', progress: 25 },
        { at: parseFloat((duration * 0.5).toFixed(2)), label: '50% Complete', progress: 50 },
        { at: parseFloat((duration * 0.75).toFixed(2)), label: '75% Complete', progress: 75 },
        { at: parseFloat(duration.toFixed(2)), label: 'Complete', progress: 100 }
      ],
      metadata: {
        created: new Date().toISOString(),
        engine: 'comparison-engine',
        estimatedSize: `${(duration * 2).toFixed(1)}MB`
      }
    };
  }

  createSideBySide(images, labels) {
    if (!Array.isArray(images) || images.length === 0) {
      return { html: '<p>No images provided</p>', layout: null };
    }
    const resolvedLabels = labels || images.map((_, i) => `Image ${i + 1}`);
    const containerId = `side-by-side-${Date.now()}`;
    const gridTemplateColumns = `repeat(${Math.min(images.length, 4)}, 1fr)`;
    const itemsHtml = images.slice(0, 12).map((imgUrl, i) => `
    <div style="position:relative;overflow:hidden;border-radius:6px;box-shadow:0 2px 8px rgba(0,0,0,0.1);background:#f0f0f0;">
      <img src="${imgUrl}" alt="${resolvedLabels[i] || 'Image ' + (i + 1)}" style="width:100%;height:100%;object-fit:cover;display:block;aspect-ratio:4/3;" />
      <div style="position:absolute;bottom:0;left:0;right:0;background:linear-gradient(transparent,rgba(0,0,0,0.7));padding:8px 12px;">
        <span style="color:#fff;font-family:sans-serif;font-size:12px;font-weight:500;">${resolvedLabels[i] || 'Image ' + (i + 1)}</span>
      </div>
    </div>`).join('');

    const html = `
<div id="${containerId}" style="width:100%;max-width:1200px;margin:0 auto;">
  <div style="display:grid;grid-template-columns:${gridTemplateColumns};gap:12px;">
    ${itemsHtml}
  </div>
  ${images.length > 4 ? `<div style="text-align:center;margin-top:12px;color:#888;font-family:sans-serif;font-size:13px;">Showing ${Math.min(images.length, 12)} of ${images.length} images</div>` : ''}
</div>`;

    return {
      html,
      id: containerId,
      layout: {
        type: 'grid',
        columns: Math.min(images.length, 4),
        rows: Math.ceil(Math.min(images.length, 12) / Math.min(images.length, 4)),
        gap: 12,
        maxImages: 12,
        totalImages: images.length
      },
      images: images.slice(0, 12).map((url, i) => ({
        url,
        label: resolvedLabels[i] || `Image ${i + 1}`,
        index: i
      }))
    };
  }
}

module.exports = ComparisonEngine;
