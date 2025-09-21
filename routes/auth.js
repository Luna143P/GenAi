const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const { verifyToken } = require('../middleware/auth');

// User Registration
router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    // Create user in Firebase Auth
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: name
    });

    // Create user profile in Firestore
    await admin.firestore().collection('users').doc(userRecord.uid).set({
      name,
      email,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      startups: [],
      skills: [],
      preferences: {}
    });

    // Generate custom token
    const token = await admin.auth().createCustomToken(userRecord.uid);

    res.json({
      token,
      user: {
        uid: userRecord.uid,
        email: userRecord.email,
        name: userRecord.displayName
      }
    });
  } catch (error) {
    console.error('Registration Error:', error);
    res.status(500).json({ error: 'Failed to register user' });
  }
});

// User Profile
router.get('/profile', verifyToken, async (req, res) => {
  try {
    const userDoc = await admin.firestore()
      .collection('users')
      .doc(req.user.uid)
      .get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    res.json({ profile: userDoc.data() });
  } catch (error) {
    console.error('Profile Error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Update Profile
router.put('/profile', verifyToken, async (req, res) => {
  try {
    const { name, skills, preferences } = req.body;

    await admin.firestore()
      .collection('users')
      .doc(req.user.uid)
      .update({
        name,
        skills,
        preferences,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Profile Update Error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Save Startup
router.post('/startup', verifyToken, async (req, res) => {
  try {
    const startupData = {
      ...req.body,
      userId: req.user.uid,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };

    const startupRef = await admin.firestore()
      .collection('startups')
      .add(startupData);

    // Add startup reference to user's startups array
    await admin.firestore()
      .collection('users')
      .doc(req.user.uid)
      .update({
        startups: admin.firestore.FieldValue.arrayUnion(startupRef.id)
      });

    res.json({
      startupId: startupRef.id,
      message: 'Startup saved successfully'
    });
  } catch (error) {
    console.error('Save Startup Error:', error);
    res.status(500).json({ error: 'Failed to save startup' });
  }
});

// Get User's Startups
router.get('/startups', verifyToken, async (req, res) => {
  try {
    const startups = [];
    const userDoc = await admin.firestore()
      .collection('users')
      .doc(req.user.uid)
      .get();

    const startupIds = userDoc.data().startups || [];

    // Fetch all startup documents
    for (const startupId of startupIds) {
      const startupDoc = await admin.firestore()
        .collection('startups')
        .doc(startupId)
        .get();

      if (startupDoc.exists) {
        startups.push({
          id: startupDoc.id,
          ...startupDoc.data()
        });
      }
    }

    res.json({ startups });
  } catch (error) {
    console.error('Get Startups Error:', error);
    res.status(500).json({ error: 'Failed to fetch startups' });
  }
});

module.exports = router;