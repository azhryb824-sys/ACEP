class Metrics {
  static calculateFID(features1, features2) {
    return { value: 0, note: 'FID calculation requires Python scipy' };
  }

  static calculateCLIPScore(imageFeatures, textFeatures) {
    return { value: 0, note: 'CLIP score requires Python CLIP model' };
  }

  static calculateImageSimilarity(img1Path, img2Path) {
    return { value: 0, note: 'Image similarity requires Python torchvision' };
  }

  static calculatePromptAlignment(prompt, generatedDescription) {
    const promptTokens = prompt.toLowerCase().split(/\s+/);
    const descTokens = generatedDescription.toLowerCase().split(/\s+/);
    const intersection = promptTokens.filter(t => descTokens.includes(t));
    const score = intersection.length / Math.max(promptTokens.length, 1);
    return { value: Math.round(score * 100) / 100, intersection, promptLength: promptTokens.length };
  }

  static calculateStructuralSimilarity(generated, reference) {
    return { value: 0, note: 'SSIM requires Python skimage' };
  }

  static calculateGenerationMetrics(generations, prompt) {
    const total = generations.length;
    const success = generations.filter(g => g.status === 'success').length;
    const avgTime = generations.filter(g => g.duration).reduce((a, g) => a + g.duration, 0) / Math.max(success, 1);

    return {
      total,
      success,
      failed: total - success,
      successRate: total > 0 ? Math.round((success / total) * 100) : 0,
      averageGenerationTimeMs: Math.round(avgTime),
      promptAlignment: this.calculatePromptAlignment(prompt, prompt),
    };
  }

  static getMetricDefinitions() {
    return {
      fid: { name: 'Fréchet Inception Distance', type: 'lower_is_better', description: 'Measures quality of generated images vs real' },
      clipScore: { name: 'CLIP Score', type: 'higher_is_better', description: 'Measures alignment between image and text prompt' },
      ssim: { name: 'Structural Similarity', type: 'higher_is_better', description: 'Measures structural similarity to reference' },
      successRate: { name: 'Generation Success Rate', type: 'percentage', description: 'Percentage of successful generations' },
      avgGenerationTime: { name: 'Average Generation Time', type: 'ms', description: 'Average time per generation' },
      promptAlignment: { name: 'Prompt Alignment Score', type: 'higher_is_better', description: 'Text overlap between prompt and output description' },
    };
  }
}

module.exports = Metrics;
