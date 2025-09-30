const express = require('express');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const cors = require('cors');
const path = require('path');
const nodemailer = require('nodemailer');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Configure Nodemailer transporter with your Gmail account
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'YOUR_EMAIL@gmail.com', // Replace with your Gmail address
        pass: 'YOUR_APP_PASSWORD'    // Replace with the App Password you generated
    }
});

// Initialize the database
const db = new sqlite3.Database(':memory:', (err) => {
    if (err) {
        return console.error(err.message);
    }
    console.log('Connected to the in-memory SQLite database.');
    
    // Create the users table
    db.run(`CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL
    )`, (createTableErr) => {
        if (createTableErr) {
            console.error('Failed to create table:', createTableErr.message);
        } else {
            console.log('Users table created.');
        }
    });
});

// Registration Endpoint
app.post('/api/register', async (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ message: 'All fields are required.' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        db.run('INSERT INTO users (name, email, password) VALUES (?, ?, ?)', [name, email, hashedPassword], function(err) {
            if (err) {
                if (err.message.includes('UNIQUE constraint failed')) {
                    return res.status(409).json({ message: 'Email already in use.' });
                }
                return res.status(500).json({ message: 'Error registering user.' });
            }
            res.status(201).json({ message: 'Registration successful!', userId: this.lastID });
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error during registration.' });
    }
});

// Login Endpoint
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;

    db.get('SELECT * FROM users WHERE email = ?', [email], async (err, row) => {
        if (err) {
            return res.status(500).json({ message: 'Server error during login.' });
        }
        if (!row) {
            return res.status(400).json({ message: 'Invalid email or password.' });
        }

        const isMatch = await bcrypt.compare(password, row.password);
        if (isMatch) {
            res.status(200).json({ message: 'Login successful!', user: { id: row.id, name: row.name, email: row.email } });
        } else {
            res.status(400).json({ message: 'Invalid email or password.' });
        }
    });
});

// Inquiry Endpoint
app.post('/api/inquiry', (req, res) => {
    const { orgName, contactEmail, message } = req.body;

    const mailOptions = {
        from: 'YOUR_EMAIL@gmail.com',
        to: 'pankajkalonia11@gmail.com',
        subject: `New Product Inquiry from ${orgName}`,
        html: `<p>You have a new product inquiry from the Satviran website.</p>
               <p><strong>Name:</strong> ${orgName}</p>
               <p><strong>Email:</strong> ${contactEmail}</p>
               <p><strong>Message:</strong> ${message}</p>`
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error('Email sending error:', error);
            return res.status(500).json({ message: 'Error sending inquiry.' });
        }
        console.log('Email sent: ' + info.response);
        res.status(200).json({ message: 'Inquiry sent successfully!' });
    });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});