require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios'); 
const nodemailer = require('nodemailer'); 
const app = express();
const port = 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static('public'));

let users = [];
let otps = {}; // Store OTPs temporarily for each email

const emailVerificationApiKey = process.env.API_VARI;

// Function to verify email existence
async function verifyEmail(email) {
    const url = `https://emailvalidation.abstractapi.com/v1/?api_key=${emailVerificationApiKey}&email=${email}`;
    try {
        const response = await axios.get(url);
        const data = response.data;

        // Check if email is valid and deliverable
        return data.is_valid_format.value && data.deliverability === 'DELIVERABLE';
    } catch (error) {
        console.error('Error verifying email:', error);
        return false;
    }
}

// Generate random 6-digit OTP
function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// Send OTP to user's email
async function sendOTP(email, otp) {
    let transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: 'mohitsinghx4@gmail.com', // Replace with your email
            pass: process.env.PASS, // Replace with your email password
        },
    });

    let mailOptions = {
        from: 'mohitsinghx4@gmail.com', 
        to: email,
        subject: 'Your OTP for verification',
        text: `Your OTP for email verification is ${otp}`,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log('OTP sent to email:', email);
    } catch (error) {
        console.error('Error sending email:', error);
    }
}

// Function to validate password strength
function validatePassword(password) {
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return passwordRegex.test(password);
}

// Route to handle form submission
app.post('/signup', async (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.send('All fields are required!');
    }

    // Validate password strength
    if (!validatePassword(password)) {
        return res.send('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character.');
    }

    // Check if user already exists
    const userExists = users.some(user => user.email === email);
    if (userExists) {
        return res.send('User already exists!');
    }

    // Verify email existence using Abstract API
    const emailIsValid = await verifyEmail(email);
    if (!emailIsValid) {
        return res.send('Invalid email or email does not exist!');
    }

    // Generate and send OTP
    const otp = generateOTP();
    otps[email] = otp; // Store OTP temporarily
    await sendOTP(email, otp);

    res.send('OTP has been sent to your email. Please verify to complete registration.');
});

// Route to verify OTP
app.post('/verify-otp', (req, res) => {
    const { email, otp } = req.body;

    if (otps[email] && otps[email] === otp) {
        users.push({ email });
        delete otps[email]; // OTP verified, remove it
        res.send('OTP verified, signup successful!');
    } else {
        res.send('Invalid OTP or OTP has expired.');
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server running on ${port}`);
});
