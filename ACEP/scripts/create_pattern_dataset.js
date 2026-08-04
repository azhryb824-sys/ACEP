const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const IMAGES_ROOT = path.join('C:', 'Users', 'Abdulrahman', 'Documents', 'مقاولات إلكترونية 2', 'الصور');
const DATASET_OUTPUT = path.join(__dirname, '..', 'packages', 'vision-training', 'dataset', 'datasets', 'construction_patterns');

// Pattern categories
const CATEGORIES = {
  'أشكال وأنماط جبسمبورد': 'gypsum board patterns and shapes',
  'تكييف مركزي': 'central air conditioning systems',
  'سيراميك حمام جداري': 'bathroom wall ceramic tiles',
  'شبيه الرخام نصف جداري': 'marble-like half-wall tiles',
  'شقق': 'apartment buildings',
  'عمائر': 'multi-story buildings',
  'فلل': 'villas',
  'مساجد': 'mosques',
  'مستشفيات': 'hospitals'
};

class PatternDatasetCreator {
  constructor() {
    this.imageCount = 0;
    this.categoryStats = {};
  }

  async createDataset() {
    console.log('=== ACEP Pattern Dataset Creator ===\n');
    
    // Create output directory
    if (!fs.existsSync(DATASET_OUTPUT)) {
      fs.mkdirSync(DATASET_OUTPUT, { recursive: true });
      console.log(`Created dataset directory: ${DATASET_OUTPUT}`);
    }

    // Process each category
    for (const [arabicName, englishName] of Object.entries(CATEGORIES)) {
      await this.processCategory(arabicName, englishName);
    }

    // Create metadata file
    this.createMetadata();

    console.log('\n=== Dataset Creation Complete ===');
    console.log(`Total images: ${this.imageCount}`);
    console.log(`Categories: ${Object.keys(this.categoryStats).length}`);
    console.log(`Output: ${DATASET_OUTPUT}`);
  }

  async processCategory(arabicName, englishName) {
    const categoryPath = path.join(IMAGES_ROOT, arabicName);
    
    if (!fs.existsSync(categoryPath)) {
      console.log(`⚠ Category not found: ${arabicName}`);
      return;
    }

    const files = fs.readdirSync(categoryPath).filter(f => f.endsWith('.png') || f.endsWith('.jpg') || f.endsWith('.jpeg'));
    
    if (files.length === 0) {
      console.log(`⚠ No images in category: ${arabicName}`);
      return;
    }

    console.log(`\n📁 Processing: ${arabicName} (${englishName})`);
    console.log(`   Images: ${files.length}`);

    // Create category directory
    const categoryDir = path.join(DATASET_OUTPUT, englishName.replace(/\s+/g, '_'));
    if (!fs.existsSync(categoryDir)) {
      fs.mkdirSync(categoryDir, { recursive: true });
    }

    let categoryCount = 0;
    
    for (const file of files) {
      const srcPath = path.join(categoryPath, file);
      const dstPath = path.join(categoryDir, file);
      
      // Copy image
      fs.copyFileSync(srcPath, dstPath);
      
      // Generate caption from filename
      const caption = this.generateCaption(file, englishName);
      
      // Save caption
      const captionPath = path.join(categoryDir, file.replace(/\.(png|jpg|jpeg)$/i, '.txt'));
      fs.writeFileSync(captionPath, caption);
      
      categoryCount++;
      this.imageCount++;
    }

    this.categoryStats[englishName] = categoryCount;
    console.log(`   ✅ Copied ${categoryCount} images with captions`);
  }

  generateCaption(filename, category) {
    // Extract descriptive parts from filename
    const baseName = filename.replace(/^Firefly_Gemini Flash_/i, '').replace(/\.png$/i, '');
    
    // Common patterns in filenames
    const patterns = {
      'قبل التشطيب': 'before finishing',
      'بعد التشطيب': 'after finishing',
      'التشطيب النهائي': 'final finishing',
      'بدون بشر': 'without people',
      'ثلاثي الأبعاد': '3D rendering',
      'أثناء التشطيب': 'during finishing',
      'أساسات': 'foundations',
      'حفر أساسات': 'foundation excavation',
      'جداري': 'wall-mounted',
      'نصف جداري': 'half-wall',
      'مع شطاف': 'with shower',
      'خمس أدوار': 'five stories',
      'ثلاث طوابق': 'three stories',
      'خمس غرف': 'five rooms',
      'ثلاث غرف': 'three rooms',
      'دورين': 'two floors',
      'من الداخل': 'interior view',
      'مع جميع المرافق': 'with all facilities',
      'بدون كائنات حية': 'without living beings'
    };

    let description = baseName;
    for (const [arabic, english] of Object.entries(patterns)) {
      description = description.replace(new RegExp(arabic, 'g'), english);
    }

    // Clean up the description
    description = description.replace(/\s+/g, ' ').trim();
    description = description.charAt(0).toUpperCase() + description.slice(1);

    // Build full caption
    const captions = [
      `Professional architectural photograph of ${category}`,
      description,
      'high quality',
      'detailed',
      'construction industry'
    ];

    return captions.join(', ') + '.';
  }

  createMetadata() {
    const metadata = {
      name: 'ACEP Construction Patterns Dataset',
      version: '1.0',
      created: new Date().toISOString(),
      totalImages: this.imageCount,
      categories: this.categoryStats,
      categoriesList: Object.keys(CATEGORIES),
      description: 'Dataset of construction patterns including gypsum board, air conditioning, tiles, buildings, villas, mosques, and hospitals',
      source: 'ACEP Project Image Collection',
      license: 'Internal Use Only'
    };

    const metadataPath = path.join(DATASET_OUTPUT, 'metadata.json');
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
    console.log(`\n📄 Metadata saved to: ${metadataPath}`);
  }
}

// Run the dataset creator
const creator = new PatternDatasetCreator();
creator.createDataset().catch(console.error);
