const express = require('express');
const router = express.Router();
const multer = require('multer');
const { verifyToken } = require('../middleware/authMiddleware');
const { Storage } = require('@google-cloud/storage');

// Initialize Cloud Storage
const storage = new Storage({
  credentials: require('../serviceAccountKey.json')
});

// Initialize multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

// Configure bucket names
const BUCKETS = {
  DOCUMENTS: 'genai-documents',
  IMAGES: 'genai-images',
  PRESENTATIONS: 'genai-presentations'
};

// Upload file to Cloud Storage
async function uploadToCloudStorage(file, bucketName, folder) {
  const bucket = storage.bucket(bucketName);
  const fileName = `${folder}/${Date.now()}-${file.originalname}`;
  const blob = bucket.file(fileName);

  const blobStream = blob.createWriteStream({
    metadata: {
      contentType: file.mimetype,
    },
  });

  return new Promise((resolve, reject) => {
    blobStream.on('error', (error) => reject(error));
    blobStream.on('finish', () => {
      const publicUrl = `https://storage.googleapis.com/${bucketName}/${fileName}`;
      resolve(publicUrl);
    });
    blobStream.end(file.buffer);
  });
}

// Upload document
router.post('/upload-document', verifyToken, upload.single('document'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const { folder = 'general' } = req.body;
    const publicUrl = await uploadToCloudStorage(req.file, BUCKETS.DOCUMENTS, folder);

    // Store file reference in Firestore
    await admin.firestore().collection('files')
      .doc(req.user.uid)
      .collection('documents')
      .add({
        fileName: req.file.originalname,
        fileUrl: publicUrl,
        uploadDate: admin.firestore.FieldValue.serverTimestamp(),
        folder
      });

    res.json({ fileUrl: publicUrl });
  } catch (error) {
    console.error('Document Upload Error:', error);
    res.status(500).json({ error: 'Failed to upload document' });
  }
});

// Upload image
router.post('/upload-image', verifyToken, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image provided' });
    }

    const { folder = 'general' } = req.body;
    const publicUrl = await uploadToCloudStorage(req.file, BUCKETS.IMAGES, folder);

    // Store image reference in Firestore
    await admin.firestore().collection('files')
      .doc(req.user.uid)
      .collection('images')
      .add({
        fileName: req.file.originalname,
        fileUrl: publicUrl,
        uploadDate: admin.firestore.FieldValue.serverTimestamp(),
        folder
      });

    res.json({ fileUrl: publicUrl });
  } catch (error) {
    console.error('Image Upload Error:', error);
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

// Upload presentation
router.post('/upload-presentation', verifyToken, upload.single('presentation'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No presentation provided' });
    }

    const { folder = 'general' } = req.body;
    const publicUrl = await uploadToCloudStorage(req.file, BUCKETS.PRESENTATIONS, folder);

    // Store presentation reference in Firestore
    await admin.firestore().collection('files')
      .doc(req.user.uid)
      .collection('presentations')
      .add({
        fileName: req.file.originalname,
        fileUrl: publicUrl,
        uploadDate: admin.firestore.FieldValue.serverTimestamp(),
        folder
      });

    res.json({ fileUrl: publicUrl });
  } catch (error) {
    console.error('Presentation Upload Error:', error);
    res.status(500).json({ error: 'Failed to upload presentation' });
  }
});

// List user's files
router.get('/list-files/:type', verifyToken, async (req, res) => {
  try {
    const { type } = req.params; // 'documents', 'images', or 'presentations'
    const { folder } = req.query;

    let query = admin.firestore().collection('files')
      .doc(req.user.uid)
      .collection(type);

    if (folder) {
      query = query.where('folder', '==', folder);
    }

    const snapshot = await query.orderBy('uploadDate', 'desc').get();
    const files = [];

    snapshot.forEach(doc => {
      files.push({
        id: doc.id,
        ...doc.data()
      });
    });

    res.json({ files });
  } catch (error) {
    console.error('List Files Error:', error);
    res.status(500).json({ error: 'Failed to list files' });
  }
});

// Delete file
router.delete('/delete-file/:type/:fileId', verifyToken, async (req, res) => {
  try {
    const { type, fileId } = req.params;

    // Get file reference from Firestore
    const fileRef = admin.firestore().collection('files')
      .doc(req.user.uid)
      .collection(type)
      .doc(fileId);

    const doc = await fileRef.get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'File not found' });
    }

    const fileData = doc.data();
    const fileUrl = new URL(fileData.fileUrl);
    const fileName = fileUrl.pathname.split('/').slice(2).join('/');

    // Delete from Cloud Storage
    const bucketName = fileUrl.pathname.split('/')[1];
    await storage.bucket(bucketName).file(fileName).delete();

    // Delete from Firestore
    await fileRef.delete();

    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('Delete File Error:', error);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

module.exports = router;