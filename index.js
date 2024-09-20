import express from 'express';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import { SMTPServer } from 'smtp-server';
import cors from 'cors';
import connectDB from './db.js';
import session from 'express-session';
import bcrypt from 'bcrypt';  
import User from './models/user.models.js';
import jwt from 'jsonwebtoken'

dotenv.config();
connectDB()

const PORT = process.env.PORT || 5050;
const app = express();

app.use(cors());  
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
  })
);

// Create SMTP server
const smtpServer = new SMTPServer({
  authOptional: true,
  onData(stream, session, callback) {
    stream.pipe(process.stdout); // This will print received messages to console
    stream.on('end', callback);
  }
});

smtpServer.listen(process.env.SMTP_PORT, () => {
  console.log(`SMTP Server running on port ${process.env.SMTP_PORT}`);
});

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// validate email
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}


// generate token
const generateToken = (user) => {
  return jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
    expiresIn: '1h',
  });
};



// register route and email';
app.post('/api/send-email' , async(req , res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: "fields are required" });
    if (!isValidEmail(email)) {
      return res.status(400).json({ message: "Invalid email address" });
    }

    let message = {
      from: process.env.SMTP_USER,
      to: email,
      subject: "Sign Email ✅",
      html: "<h4>Congratulations! You have successfully signed up for our service.</h4>",
    };

    const isUserExits = await User.findOne({ email });
    if (isUserExits)  return res.status(400).json({ message: "User already exists" });

    const hashPassword = await bcrypt.hash(password, 10);
    const newUser = await User.create({ email, password: hashPassword });
    await transporter.sendMail(message);
    res.status(200).json({ message: "Email sent successfully", newUser});
  } catch (error) {
    console.error("Error sending email:", error);
    res.status(500).json({ message: "Failed to send email" });
  }
});


// login route
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log(email, password);
    if (!email || !password)
      return res.status(400).json({ message: "fields are required" });

    if (!isValidEmail(email)) {
      return res.status(400).json({ message: "Invalid email address" });
    }

    const isUserExits = await User.findOne({ email });
    if (!isUserExits) return res.status(400).json({ message: "User not found"});

    const isPasswordValid = await bcrypt.compare(password, isUserExits.password);
    if (!isPasswordValid) return res.status(400).json({ message: "Invalid password" });

    const token = await generateToken(isUserExits);
    req.session.user = isUserExits;
    res.status(200).json({ message: "Login successful", token , email : isUserExits.email}); 

  }catch(error){
    console.log(error)
  }
});

// logout
app.post("/api/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res
        .status(500)
        .json({ message: "Could not log out, please try again." });
    }
    res.clearCookie("connect.sid"); // Clear the session cookie
    res.status(200).json({ message: "Successfully logged out." });
  });
});


// server is listening
app.listen(PORT, () => {
  console.log(`Server is running at port ${PORT}`);
});