require('dotenv').config();
const path = require('path');
const fs = require('fs');
const { uploadToCloudinary } = require('./src/utils/cloudinary');

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Existing images to process
const imagesToProcess = [
  {
    name: 'logo.png',
    sourcePath: path.join(__dirname, '../frontend/public/logo.png')
  },
  {
    name: 'hero.png',
    sourcePath: path.join(__dirname, '../frontend/src/assets/hero.png')
  },
  {
    name: 'react.svg',
    sourcePath: path.join(__dirname, '../frontend/src/assets/react.svg')
  },
  {
    name: 'vite.svg',
    sourcePath: path.join(__dirname, '../frontend/src/assets/vite.svg')
  }
];

async function run() {
  console.log('🚀 Processing and uploading existing project images...');
  console.log('----------------------------------------------------');

  const results = [];

  for (const image of imagesToProcess) {
    if (!fs.existsSync(image.sourcePath)) {
      console.log(`⚠️  Source file not found: ${image.sourcePath}`);
      continue;
    }

    try {
      console.log(`📦 Found existing image: ${image.name}`);

      // 1. Store file locally by copying it to the local uploads directory
      const localDestPath = path.join(uploadsDir, image.name);
      fs.copyFileSync(image.sourcePath, localDestPath);
      console.log(`   └─ Successfully stored locally at: backend/uploads/${image.name}`);

      // 2. Upload to Cloudinary using our utility
      console.log(`   └─ Uploading to Cloudinary...`);
      const cloudinaryResult = await uploadToCloudinary(localDestPath);
      console.log(`   └─ Successfully uploaded! Cloudinary URL: ${cloudinaryResult.secure_url}`);

      results.push({
        name: image.name,
        localPath: `backend/uploads/${image.name}`,
        localStaticUrl: `/uploads/${image.name}`,
        cloudinaryUrl: cloudinaryResult.secure_url,
        publicId: cloudinaryResult.public_id
      });
    } catch (err) {
      console.error(`❌ Error processing ${image.name}:`, err.message);
    }
  }

  console.log('\n====================================================');
  console.log('✅ Upload & Storing Summary:');
  console.log('====================================================');
  console.log(JSON.stringify(results, null, 2));
}

run();
