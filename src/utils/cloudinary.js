const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Uploads a local file to Cloudinary.
 * @param {string} localFilePath - Path to the local file.
 * @param {string} [folder] - Optional Cloudinary folder name.
 * @returns {Promise<object>} - Cloudinary upload result.
 */
const uploadToCloudinary = async (localFilePath, folder = 'sales_crm') => {
  try {
    if (!localFilePath) {
      throw new Error('Local file path is required');
    }
    const result = await cloudinary.uploader.upload(localFilePath, {
      folder: folder,
      resource_type: 'auto',
    });
    return result;
  } catch (error) {
    console.error('Cloudinary Upload Error:', error);
    throw error;
  }
};

module.exports = {
  cloudinary,
  uploadToCloudinary,
};
