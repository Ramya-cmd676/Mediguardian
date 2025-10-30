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

// image buffer -> embedding (1D array)
async function imageBufferToEmbedding(buffer) {
  try {
    // Use tfjs-node's native image decoding
    const tfnode = require('@tensorflow/tfjs-node');
    const img = tfnode.node.decodeImage(buffer, 3);
    
    // Resize to 224x224
    const resized = tf.image.resizeBilinear(img, [224, 224]);
    const normalized = resized.toFloat().div(127.5).sub(1);
    const batched = normalized.expandDims(0);
    
    const activation = model.infer(batched, 'conv_preds');
    const arr = await activation.array();
    
    // cleanup
    img.dispose();
    resized.dispose();
    normalized.dispose();
    batched.dispose();
    activation.dispose();
    
    return arr[0];
  } catch (error) {
    console.error('Image embedding error:', error);
    throw error;
  }
}

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

module.exports = { ensureModelLoaded, imageBufferToEmbedding, cosineSimilarity, loadDatabase, saveDatabase };
