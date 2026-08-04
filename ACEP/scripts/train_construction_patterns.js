const VisionTraining = require('../packages/vision-training');
const path = require('path');
const fs = require('fs');

// Configuration
const DATASET_PATH = path.join(__dirname, '..', 'packages', 'vision-training', 'dataset', 'datasets', 'construction_patterns');
const OUTPUT_DIR = path.join(__dirname, '..', 'packages', 'vision-training', 'training', 'checkpoints', 'construction_lora');

class ConstructionPatternTrainer {
  constructor() {
    this.visionTraining = VisionTraining;
  }

  async train() {
    console.log('=== ACEP Construction Pattern Training ===\n');

    try {
      // Initialize vision training
      await this.visionTraining.initialize();
      console.log('✅ Vision Training initialized\n');

      // Check dataset
      if (!fs.existsSync(DATASET_PATH)) {
        throw new Error(`Dataset not found at ${DATASET_PATH}`);
      }

      const metadata = JSON.parse(fs.readFileSync(path.join(DATASET_PATH, 'metadata.json'), 'utf8'));
      console.log('📊 Dataset Info:');
      console.log(`   Total images: ${metadata.totalImages}`);
      console.log(`   Categories: ${metadata.categoriesList.length}`);
      console.log(`   Categories: ${metadata.categoriesList.join(', ')}\n`);

      // Training configuration
      const trainingConfig = {
        baseModel: 'stabilityai/stable-diffusion-xl-base-1.0',
        outputDir: OUTPUT_DIR,
        learningRate: 1e-4,
        trainBatchSize: 1,
        maxTrainSteps: 500,
        resolution: 1024,
        loraRank: 16,
        loraAlpha: 32,
        mixedPrecision: 'fp16',
        seed: 42,
        simulate: true, // Use simulation for testing
        checkpointingSteps: 100
      };

      console.log('⚙️ Training Configuration:');
      console.log(`   Base Model: ${trainingConfig.baseModel}`);
      console.log(`   Learning Rate: ${trainingConfig.learningRate}`);
      console.log(`   Max Steps: ${trainingConfig.maxTrainSteps}`);
      console.log(`   Resolution: ${trainingConfig.resolution}`);
      console.log(`   LoRA Rank: ${trainingConfig.loraRank}`);
      console.log(`   Simulation Mode: ${trainingConfig.simulate}\n`);

      // Prepare dataset
      const dataset = this.prepareDataset(metadata);
      console.log(`📦 Prepared dataset with ${dataset.length} images\n`);

      // Start training
      console.log('🚀 Starting training...\n');
      const result = await this.visionTraining.loraTrainer.train(dataset, trainingConfig);

      console.log('\n✅ Training completed!');
      console.log(`   Run ID: ${result.runId}`);
      console.log(`   Status: ${result.status}`);
      console.log(`   Output: ${result.outputDir}`);
      console.log(`   Weights: ${result.loraWeightsPath}`);

      if (result.simulated) {
        console.log('\n⚠ Note: This was a simulated training run.');
        console.log('   To train for real, set simulate: false in the config.');
      }

      // Save training metadata
      this.saveTrainingMetadata(result, trainingConfig, metadata);

      return result;

    } catch (error) {
      console.error('\n❌ Training failed:', error.message);
      throw error;
    }
  }

  prepareDataset(metadata) {
    const dataset = [];
    const categories = metadata.categoriesList;

    for (const category of categories) {
      const categoryPath = path.join(DATASET_PATH, category.replace(/\s+/g, '_'));
      
      if (!fs.existsSync(categoryPath)) continue;

      const files = fs.readdirSync(categoryPath).filter(f => f.endsWith('.png') || f.endsWith('.jpg'));
      
      for (const file of files) {
        const imagePath = path.join(categoryPath, file);
        const captionPath = imagePath.replace(/\.(png|jpg)$/i, '.txt');
        
        let caption = '';
        if (fs.existsSync(captionPath)) {
          caption = fs.readFileSync(captionPath, 'utf8').trim();
        }

        dataset.push({
          image: imagePath,
          caption: caption,
          category: category
        });
      }
    }

    return dataset;
  }

  saveTrainingMetadata(result, config, datasetMetadata) {
    const trainingMetadata = {
      runId: result.runId,
      timestamp: new Date().toISOString(),
      config: config,
      dataset: {
        totalImages: datasetMetadata.totalImages,
        categories: datasetMetadata.categories
      },
      result: {
        status: result.status,
        outputDir: result.outputDir,
        loraWeightsPath: result.loraWeightsPath,
        simulated: result.simulated
      }
    };

    const metadataPath = path.join(OUTPUT_DIR, 'training_metadata.json');
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }
    fs.writeFileSync(metadataPath, JSON.stringify(trainingMetadata, null, 2));
    console.log(`\n📄 Training metadata saved to: ${metadataPath}`);
  }
}

// Run training
const trainer = new ConstructionPatternTrainer();
trainer.train().catch(console.error);
