require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { uploadToCloudinary } = require('./src/utils/cloudinary');

const logPath = 'C:\\Users\\Student\'s Pc\\.gemini\\antigravity-ide\\brain\\0bc7afe7-e3a6-463b-af84-ad10b5d2ef9b\\.system_generated\\logs\\transcript.jsonl';
const uploadsDir = path.join(__dirname, 'uploads');

async function run() {
  try {
    console.log('📖 Reading transcript.jsonl to extract base64 image...');
    if (!fs.existsSync(logPath)) {
      throw new Error(`Transcript file not found at: ${logPath}`);
    }

    const content = fs.readFileSync(logPath, 'utf8');
    const lines = content.trim().split('\n');
    
    // Find the last USER_INPUT step that contains base64 image
    let base64String = null;
    for (let i = lines.length - 1; i >= 0; i--) {
      if (!lines[i]) continue;
      const step = JSON.parse(lines[i]);
      if (step.type === 'USER_INPUT' && step.content.includes('data:image/')) {
        // Extract the base64 part
        const match = step.content.match(/data:image\/[a-zA-Z+]+;base64,([a-zA-Z0-9+/=\r\n\s]+)/);
        if (match && match[1]) {
          // Remove newlines and whitespace if any
          base64String = match[1].replace(/\s/g, '');
          console.log(`✅ Base64 string successfully extracted! (Length: ${base64String.length} chars)`);
          break;
        }
      }
    }

    if (!base64String) {
      throw new Error('Could not find base64 image content in USER_INPUT steps of transcript.jsonl');
    }

    // Ensure uploads directory exists
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Write base64 to local file
    const outputFilename = 'uploaded_from_user.png';
    const outputPath = path.join(uploadsDir, outputFilename);
    const imageBuffer = Buffer.from(base64String, 'base64');
    fs.writeFileSync(outputPath, imageBuffer);
    console.log(`💾 Image saved locally at: backend/uploads/${outputFilename}`);

    // Upload to Cloudinary
    console.log('☁️  Uploading to Cloudinary...');
    const cloudinaryResult = await uploadToCloudinary(outputPath);
    console.log('✅ Successfully uploaded to Cloudinary!');
    console.log('----------------------------------------------------');
    console.log('📊 Upload Details:');
    console.log(`   └─ File Name: ${outputFilename}`);
    console.log(`   └─ Local Path: backend/uploads/${outputFilename}`);
    console.log(`   └─ Local URL: http://localhost:5000/uploads/${outputFilename}`);
    console.log(`   └─ Cloudinary URL: ${cloudinaryResult.secure_url}`);
    console.log(`   └─ Cloudinary Public ID: ${cloudinaryResult.public_id}`);
    console.log('----------------------------------------------------');

  } catch (err) {
    console.error('❌ Error during extraction and upload:', err);
  }
}

run();
