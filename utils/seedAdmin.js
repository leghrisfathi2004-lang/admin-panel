require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const username = (process.env.SEED_ADMIN_USERNAME || 'admin').toLowerCase();
    const password = process.env.SEED_ADMIN_PASSWORD;

    if (!password || password.length < 8) {
      console.error('SEED_ADMIN_PASSWORD must be set and at least 8 chars long.');
      process.exit(1);
    }

    const existing = await User.findOne({ username });
    if (existing) {
      console.log(`Admin "${username}" already exists. Skipping.`);
      process.exit(0);
    }

    await User.create({ username, password, role: 'superadmin' });
    console.log(`Created admin "${username}"`);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
