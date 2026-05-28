const router = require('express').Router();
const upload = require('../middleware/upload');
const { uploadToCloudinary } = require('../utils/cloudinary');
const fs = require('fs');

// POST /api/upload - Upload an image to both local storage and Cloudinary
router.post('/', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Please upload an image file' });
    }

    const localFilePath = req.file.path;

    // Upload local file to Cloudinary
    const cloudinaryResult = await uploadToCloudinary(localFilePath);

    // Construct local URL path
    const localUrlPath = `/uploads/${req.file.filename}`;
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const localUrl = `${baseUrl}${localUrlPath}`;

    // Return successfully uploaded image URLs
    res.status(201).json({
      message: 'Image uploaded successfully to local storage and Cloudinary!',
      fileName: req.file.filename,
      localPath: localUrlPath,
      localUrl: localUrl,
      cloudinaryUrl: cloudinaryResult.secure_url,
      cloudinaryPublicId: cloudinaryResult.public_id,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      sizeBytes: req.file.size
    });
  } catch (error) {
    console.error('Upload Route Error:', error);
    
    // Clean up local file if Cloudinary upload failed
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkErr) {
        console.error('Failed to delete temporary local file:', unlinkErr);
      }
    }
    
    res.status(500).json({ message: error.message || 'Server error during upload' });
  }
});

module.exports = router;
