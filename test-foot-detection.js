const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const { createCanvas, loadImage } = require('canvas');

// Using dynamic import for node-fetch since it's an ESM module
let fetch;

// Function to validate if an image contains a foot using the server endpoint
async function testFootDetection(imagePath) {
  try {
    // Create form data
    const form = new FormData();
    form.append('image', fs.createReadStream(imagePath));
    
    // Set up authentication (this is just an example, real auth would be different)
    const token = 'test_token';
    
    // Send request to server
    const response = await fetch('http://localhost:3000/api/validate-foot-detection', {
      method: 'POST',
      body: form,
      headers: {
        'Authorization': `Bearer ${token}`,
        ...form.getHeaders()
      }
    });
    
    const result = await response.json();
    
    console.log(`\nFoot Detection Results for ${path.basename(imagePath)}:`);
    console.log('--------------------------------------------------------------');
    console.log(`Is foot detected: ${result.isFootDetected ? 'YES ✓' : 'NO ✗'}`);
    console.log(`Confidence: ${(result.confidence * 100).toFixed(1)}%`);
    console.log(`Foot type: ${result.footType || 'N/A'}`);
    console.log(`Image quality: ${result.imageQuality || 'N/A'}`);
    console.log(`Message: ${result.message}`);
    
    if (result.recommendations && result.recommendations.length > 0) {
      console.log('\nRecommendations:');
      result.recommendations.forEach((rec, i) => {
        console.log(`  ${i + 1}. ${rec}`);
      });
    }
    
    return result;
  } catch (error) {
    console.error('Error testing foot detection:', error);
    return {
      isFootDetected: false,
      message: `Error: ${error.message}`
    };
  }
}

// Function to process an image locally without using the server endpoint
// This simulates what the server-side foot detection would do
async function localFootDetection(imagePath) {
  try {
    // Load the image
    const image = await loadImage(imagePath);
    
    // Create canvas with the same dimensions as the image
    const canvas = createCanvas(image.width, image.height);
    const ctx = canvas.getContext('2d');
    
    // Draw the image on the canvas
    ctx.drawImage(image, 0, 0);
    
    // Get the image data
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    // Calculate the brightness histogram to detect skin tones
    const brightness = new Array(256).fill(0);
    let totalPixels = 0;
    
    // Calculate brightness for each pixel and populate histogram
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      
      // Calculate brightness (simple average)
      const value = Math.floor((r + g + b) / 3);
      brightness[value]++;
      totalPixels++;
    }
    
    // Analyze histogram to detect skin tones (skin typically has brightness values in middle range)
    // Foot images usually have a large portion (> 15%) of pixels in the skin tone range
    const skinToneStart = 80;
    const skinToneEnd = 200;
    
    let skinTonePixels = 0;
    for (let i = skinToneStart; i <= skinToneEnd; i++) {
      skinTonePixels += brightness[i];
    }
    
    const skinToneRatio = skinTonePixels / totalPixels;
    
    // Simple analysis - if enough skin tone pixels are present, we'll assume it's a foot
    const isFootByColor = skinToneRatio > 0.15;
    
    // Analyze aspect ratio of the non-background area of the image (simplified approach)
    // Most foot pictures have a specific aspect ratio
    let footAspectRatioConfidence = 0.5; // Default middle confidence
    
    if (image.width / image.height > 0.6 && image.width / image.height < 1.8) {
      footAspectRatioConfidence = 0.8;
    }
    
    // Combine color analysis and aspect ratio for overall detection
    const isFootDetected = isFootByColor;
    const confidence = isFootByColor ? 0.7 * skinToneRatio + 0.3 * footAspectRatioConfidence : 0.1;
    
    // Determine image quality based on average brightness and contrast
    let sumBrightness = 0;
    for (let i = 0; i < 256; i++) {
      sumBrightness += i * brightness[i];
    }
    const avgBrightness = sumBrightness / totalPixels;
    
    // Calculate standard deviation for contrast
    let sumSquaredDiff = 0;
    for (let i = 0; i < 256; i++) {
      sumSquaredDiff += brightness[i] * Math.pow(i - avgBrightness, 2);
    }
    const stdDev = Math.sqrt(sumSquaredDiff / totalPixels);
    
    // Determine image quality based on brightness and contrast
    let imageQuality = "poor";
    if (stdDev > 40 && avgBrightness > 50 && avgBrightness < 200) {
      imageQuality = "good";
    } else if (stdDev > 20 && avgBrightness > 30 && avgBrightness < 220) {
      imageQuality = "acceptable";
    }
    
    // Use a heuristic for foot type based on brightness distribution
    let footType = "unknown";
    if (isFootDetected && confidence > 0.6) {
      const midToneBrightness = brightness.slice(100, 150).reduce((a, b) => a + b, 0) / totalPixels;
      const darkBrightness = brightness.slice(50, 100).reduce((a, b) => a + b, 0) / totalPixels;
      
      if (midToneBrightness > 0.3) {
        footType = "flat";
      } else if (darkBrightness > 0.2) {
        footType = "high arch";
      } else {
        footType = "normal";
      }
    }
    
    const result = {
      isFootDetected,
      confidence,
      footType: isFootDetected ? footType : undefined,
      imageQuality,
      message: isFootDetected 
        ? "Foot detected successfully"
        : "No foot detected in the image",
      recommendations: !isFootDetected ? [
        "Make sure your foot is fully visible in the frame",
        "Ensure adequate lighting",
        "Position the camera at the recommended distance"
      ] : []
    };
    
    console.log(`\nLocal Foot Detection Results for ${path.basename(imagePath)}:`);
    console.log('--------------------------------------------------------------');
    console.log(`Is foot detected: ${result.isFootDetected ? 'YES ✓' : 'NO ✗'}`);
    console.log(`Confidence: ${(result.confidence * 100).toFixed(1)}%`);
    console.log(`Foot type: ${result.footType || 'N/A'}`);
    console.log(`Image quality: ${result.imageQuality || 'N/A'}`);
    console.log(`Message: ${result.message}`);
    
    if (result.recommendations && result.recommendations.length > 0) {
      console.log('\nRecommendations:');
      result.recommendations.forEach((rec, i) => {
        console.log(`  ${i + 1}. ${rec}`);
      });
    }
    
    console.log('\nImage Analysis:');
    console.log(`  Image dimensions: ${image.width}x${image.height}`);
    console.log(`  Aspect ratio: ${(image.width / image.height).toFixed(2)}`);
    console.log(`  Average brightness: ${avgBrightness.toFixed(1)}`);
    console.log(`  Contrast (StdDev): ${stdDev.toFixed(1)}`);
    console.log(`  Skin tone pixel ratio: ${(skinToneRatio * 100).toFixed(1)}%`);
    
    return result;
  } catch (error) {
    console.error('Error in local foot detection:', error);
    return {
      isFootDetected: false,
      message: `Error: ${error.message}`
    };
  }
}

// Test with attached assets
async function main() {
  console.log('Testing Foot Detection with attached assets');
  console.log('===========================================');
  
  try {
    // Test with the pressure map image
    console.log('\n===== PRESSURE MAP IMAGE TEST =====');
    await localFootDetection('./attached_assets/IMG-20250401-WA0034.jpg');
    
    // Test with the foot diagram
    console.log('\n===== FOOT DIAGRAM IMAGE TEST =====');
    await localFootDetection('./attached_assets/image-1024x625.png');
    
    console.log('\nFoot detection tests completed!');
  } catch (error) {
    console.error('Error running tests:', error);
  }
}

// Run the tests
main();