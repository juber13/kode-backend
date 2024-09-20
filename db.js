import mongoose from "mongoose";

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI).then((conn) => {
      console.log(`MongoDB Connected 🚀: ${conn.connection.host}`);
    });
  } catch (error) {
    console.log(error);
    process.exit(1);
  }
};

export default connectDB;