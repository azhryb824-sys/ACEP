const API_URL = 'http://localhost:3000';

async function testProjectCreation() {
  console.log('=== Testing ACEP Project Creation ===\n');

  // Test project description
  const testDescription = 'فيلا سكنية بمساحة 300 متر مربع، دورين، خمس غرف وحمامين، تشمل تأسيس وتشطيب في الرياض';

  try {
    // Analyze project description
    console.log('1. Analyzing project description...');
    const analyzeResponse = await fetch(`${API_URL}/api/v1/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: testDescription })
    });

    if (!analyzeResponse.ok) {
      throw new Error(`Failed to analyze: ${analyzeResponse.statusText}`);
    }

    const analyzeData = await analyzeResponse.json();
    console.log('✅ Project analyzed:');
    console.log(`   Type: ${analyzeData.extracted?.type}`);
    console.log(`   Area: ${analyzeData.extracted?.area} m²`);
    console.log(`   Floors: ${analyzeData.extracted?.floors}`);
    console.log(`   Phase: ${analyzeData.extracted?.finishing}`);

    const projectId = analyzeData.projectId;

    // Test quantity generation (BOQ) - Create project with BOQ
    console.log('\n2. Testing quantity generation...');
    const projectResponse = await fetch(`${API_URL}/api/v1/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Villa Project',
        description: testDescription,
        type: analyzeData.extracted?.type,
        area: analyzeData.extracted?.area,
        floors: analyzeData.extracted?.floors,
        region: 'الرياض',
        finishing: 'Foundation_Finishing'
      })
    });

    if (!projectResponse.ok) {
      throw new Error(`Failed to create project with BOQ: ${projectResponse.statusText}`);
    }

    const projectData = await projectResponse.json();
    console.log('✅ Project created with BOQ:');
    console.log(`   Project ID: ${projectData.id}`);
    console.log(`   Total items: ${projectData.boq?.items?.length || 0}`);
    console.log(`   Total cost: ${projectData.boq?.totalCost || projectData.estimatedCost || 0} SAR`);

    const boqData = projectData.boq || { items: projectData.items, totalCost: projectData.estimatedCost };

    // Display some quantities
    if (boqData.items && boqData.items.length > 0) {
      console.log('\n   Sample quantities:');
      boqData.items.slice(0, 5).forEach((item, idx) => {
        console.log(`   ${idx + 1}. ${item.description || item.category}: ${item.quantity} ${item.unit} - ${item.cost} SAR`);
      });
    }

    // Verify quantities are appropriate
    console.log('\n3. Verifying quantities are appropriate...');
    const verification = verifyQuantities(boqData, analyzeData.extracted);
    console.log(verification.status ? '✅ Quantities are appropriate' : '⚠ Quantities may need adjustment');
    console.log(`   ${verification.message}`);

    // Test image generation
    console.log('\n4. Testing image generation...');
    const imageResponse = await fetch(`${API_URL}/api/v1/visualizer/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: projectId,
        params: {
          phase: analyzeData.extracted?.finishing || 'Foundation_Finishing',
          imageType: 'front',
          model: 'flux'
        }
      })
    });

    if (!imageResponse.ok) {
      throw new Error(`Failed to generate image: ${imageResponse.statusText}`);
    }

    const imageData = await imageResponse.json();
    console.log('✅ Image generation initiated:');
    console.log(`   Status: ${imageData.status}`);
    console.log(`   Job ID: ${imageData.jobId}`);

    // Poll for completion
    if (imageData.status === 'queued' && imageData.jobId) {
      console.log('\n5. Polling for image completion...');
      const finalImage = await pollImageCompletion(imageData.jobId);
      console.log('✅ Image generation completed:');
      console.log(`   Image ID: ${finalImage.imageId}`);
      console.log(`   Provider: ${finalImage.provider}`);
      console.log(`   Generation time: ${finalImage.generationTime}ms`);

      // Verify image matches project
      console.log('\n6. Verifying image matches project...');
      const imageVerification = verifyImage(finalImage, analyzeData.extracted);
      console.log(imageVerification.status ? '✅ Image matches project' : '⚠ Image may not fully match project');
      console.log(`   ${imageVerification.message}`);
    }

    console.log('\n=== All Tests Completed ===');
    return {
      projectId,
      analysis: analyzeData,
      boq: boqData,
      image: imageData
    };

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    throw error;
  }
}

async function pollImageCompletion(jobId, maxAttempts = 60) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const response = await fetch(`${API_URL}/api/v1/visualizer/status/${jobId}`);
    const data = await response.json();

    console.log(`   Progress: ${data.progress}% - ${data.step}`);

    if (data.status === 'completed' && data.result) {
      return data.result;
    }

    if (data.status === 'failed') {
      throw new Error(data.error || 'Image generation failed');
    }

    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  throw new Error('Image generation timeout');
}

function verifyQuantities(quantityData, project) {
  if (!quantityData.items || quantityData.items.length === 0) {
    return { status: false, message: 'No quantities generated' };
  }

  // Check if quantities are reasonable for project size
  const totalCost = quantityData.totalCost || 0;
  const expectedCostRange = project.budget * 0.8; // Allow 20% variance

  if (totalCost > project.budget * 1.5) {
    return { status: false, message: `Total cost (${totalCost}) exceeds budget significantly` };
  }

  if (totalCost < project.budget * 0.5) {
    return { status: false, message: `Total cost (${totalCost}) is too low for project size` };
  }

  // Check for essential categories
  const categories = new Set(quantityData.items.map(i => i.category));
  const essentialCategories = ['concrete', 'steel', 'finishing'];
  const hasEssential = essentialCategories.some(cat => 
    categories.has(cat) || Array.from(categories).some(c => c.toLowerCase().includes(cat))
  );

  if (!hasEssential) {
    return { status: false, message: 'Missing essential construction categories' };
  }

  return { status: true, message: `Quantities are reasonable: ${quantityData.items.length} items, total cost ${totalCost} SAR` };
}

function verifyImage(imageData, project) {
  if (!imageData) {
    return { status: false, message: 'No image generated' };
  }

  // Check if image has proper metadata
  if (!imageData.metadata) {
    return { status: false, message: 'Image missing metadata' };
  }

  // Check if provider is real (not mock)
  if (imageData.metadata.provider === 'mock') {
    return { status: false, message: 'Image generated with mock provider' };
  }

  // Check if generation time is reasonable
  if (imageData.generationTime && imageData.generationTime < 1000) {
    return { status: false, message: 'Generation time too short (possibly mock)' };
  }

  return { status: true, message: `Image generated with ${imageData.metadata.provider} in ${imageData.generationTime}ms` };
}

// Run the test
testProjectCreation().catch(console.error);
