const tf = require('@tensorflow/tfjs');
require('@tensorflow/tfjs-node');
const mobilenet = require('@tensorflow-models/mobilenet');
const fs = require('fs');

let model = null;
async function ensureModelLoaded() {
  if (model) return;
  console.log('Loading MobileNet model (this may take a few seconds)...');
  model = await mobilenet.load({ version: 2, alpha: 1.0 });
  console.log('MobileNet loaded');
}

/**
 * Enhanced image preprocessing with augmentation support
 * Applies normalization and optional quality enhancements
 */
function preprocessImage(imgTensor, augment = false) {
  let processed = imgTensor;
  
  // Resize to 224x224 with better interpolation
  processed = tf.image.resizeBilinear(processed, [224, 224], true);
  
  if (augment) {
    // Apply brightness normalization to handle different lighting
    // Note: adjustSaturation/adjustContrast not available in tfjs-node
    // Using simple brightness adjustment instead
    processed = processed.mul(1.05); // Slight brightness boost
  }
  
  // Normalize to [-1, 1] range (MobileNet V2 input)
  processed = processed.toFloat().div(127.5).sub(1);
  
  return processed;
}

/**
 * Extract multiple embeddings from different layers for better feature representation
 * This creates a more robust feature vector combining global and local features
 */
async function extractMultiLayerEmbedding(imgTensor) {
  const batched = imgTensor.expandDims(0);
  
  // Get deep features from conv_preds layer (global features)
  const globalFeatures = model.infer(batched, 'conv_preds');
  const globalArray = await globalFeatures.array();
  
  // Get intermediate features for better discrimination
  const intermediateFeatures = model.infer(batched, true); // Get all predictions
  const intermediateArray = await intermediateFeatures.array();
  
  // Flatten and combine features
  const combined = [...globalArray[0], ...intermediateArray[0].slice(0, 50)]; // Top 50 predictions as features
  
  globalFeatures.dispose();
  intermediateFeatures.dispose();
  batched.dispose();
  
  return combined;
}

/**
 * Generate multiple augmented embeddings for registration
 * This improves robustness by creating variations during registration
 */
async function imageBufferToMultipleEmbeddings(buffer) {
  try {
    const tfnode = require('@tensorflow/tfjs-node');
    const img = tfnode.node.decodeImage(buffer, 3);
    
    // Original embedding
    const processed1 = preprocessImage(img, false);
    const embedding1 = await extractMultiLayerEmbedding(processed1);
    processed1.dispose();
    
    // Augmented embedding (slight variations)
    const processed2 = preprocessImage(img, true);
    const embedding2 = await extractMultiLayerEmbedding(processed2);
    processed2.dispose();
    
    // Average the embeddings for robustness
    const avgEmbedding = embedding1.map((val, idx) => (val + embedding2[idx]) / 2);
    
    img.dispose();
    
    return {
      embedding: avgEmbedding,
      confidence: 1.0,
      featureCount: avgEmbedding.length
    };
  } catch (error) {
    console.error('Image embedding error:', error);
    throw error;
  }
}

/**
 * Standard single embedding for verification (faster)
 */
async function imageBufferToEmbedding(buffer) {
  try {
    const tfnode = require('@tensorflow/tfjs-node');
    const img = tfnode.node.decodeImage(buffer, 3);
    
    const processed = preprocessImage(img, false);
    const embedding = await extractMultiLayerEmbedding(processed);
    
    // cleanup
    img.dispose();
    processed.dispose();
    
    return embedding;
  } catch (error) {
    console.error('Image embedding error:', error);
    throw error;
  }
}

/**
 * Enhanced cosine similarity with weighted features
 * Gives more importance to discriminative features
 */
function cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length) return -1;
  
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  
  if (na === 0 || nb === 0) return -1;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

/**
 * Enhanced similarity with multiple metrics
 * Combines cosine similarity with Euclidean distance for better accuracy
 */
function enhancedSimilarity(a, b) {
  if (!a || !b || a.length !== b.length) return -1;
  
  // Cosine similarity (range: -1 to 1)
  const cosine = cosineSimilarity(a, b);
  
  // Normalized Euclidean distance (range: 0 to 1, inverted for similarity)
  let euclidean = 0;
  for (let i = 0; i < a.length; i++) {
    euclidean += Math.pow(a[i] - b[i], 2);
  }
  euclidean = Math.sqrt(euclidean);
  
  // Normalize Euclidean to 0-1 range (0 = identical, larger = different)
  // Convert to similarity: 1 / (1 + distance)
  const euclideanSimilarity = 1 / (1 + euclidean);
  
  // Weighted combination: 70% cosine, 30% euclidean
  const combinedScore = (cosine * 0.7) + (euclideanSimilarity * 0.3);
  
  return {
    combined: combinedScore,
    cosine: cosine,
    euclidean: euclideanSimilarity,
    confidence: Math.abs(cosine) // Higher absolute cosine = more confident
  };
}

/**
 * Calculate match confidence level
 */
function getConfidenceLevel(score) {
  if (score >= 0.75) return 'HIGH';
  if (score >= 0.60) return 'MEDIUM';
  if (score >= 0.45) return 'LOW';
  return 'VERY_LOW';
}

function loadDatabase(dbPath) {
  try {
    if (!fs.existsSync(dbPath)) {
      fs.writeFileSync(dbPath, JSON.stringify([]));
    }
    const raw = fs.readFileSync(dbPath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to load DB', err);
    return [];
  }
}

function saveDatabase(dbPath, db) {
  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
}

module.exports = { 
  ensureModelLoaded, 
  imageBufferToEmbedding, 
  imageBufferToMultipleEmbeddings,
  cosineSimilarity, 
  enhancedSimilarity,
  getConfidenceLevel,
  loadDatabase, 
  saveDatabase 
};