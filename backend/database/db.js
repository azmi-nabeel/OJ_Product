const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config();

const DBConnection = async () => {
  const MONGO_URI = process.env.MONGODB_URL;
  try {
    await mongoose.connect(MONGO_URI, { useNewUrlParser: true });
    console.log("Database connected successfully");
  } catch (error) {
    console.log("Database connection failed ", error.message);
  }
};

module.exports = DBConnection;
