

const User = require('./models/User');
const authMiddleware = require('./middleware/authMiddleware');
require('dotenv').config();
const mongoose = require('mongoose');
const cors = require('cors');
const express = require('express');
const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('SkillUp API running');
});
mongoose.connect(process.env.MONGO_URI)
.then(() => console.log("MongoDB connected"))
.catch(err => console.log(err));

const authRoutes = require('./routes/auth');
app.use('/api', authRoutes);

app.get('/api/profile', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');

    res.json({
      message: "User profile fetched",
      user
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

app.put('/api/profile', authMiddleware, async (req, res) => {
  try {
    const { skills } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { skills },
      { new: true }
    ).select('-password');

    res.json({
      message: "Profile updated",
      user
    });

  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

app.get('/api/users', authMiddleware, async (req, res) => {
  try {
    const users = await User.find().select('-password');

    res.json({
      message: "All users fetched",
      users
    });

  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});
app.get('/api/match', authMiddleware, async (req, res) => {
  try {
    // Get current user
    const currentUser = await User.findById(req.user.userId);

    // Find users with at least one matching skill
    const matchedUsers = await User.find({
      _id: { $ne: currentUser._id }, // exclude self
      skills: { $in: currentUser.skills }
    }).select('-password');

    res.json({
      message: "Matched users",
      matches: matchedUsers
    });

  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});