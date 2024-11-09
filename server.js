const express = require('express');
const axios = require('axios');
const path = require('path');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8000;

// Middleware
app.use(cors({
    origin: '*', // Replace with your frontend's URL and port if different
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Setup Multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadPath = path.join(__dirname, 'uploads');
        if (!fs.existsSync(uploadPath)){
            fs.mkdirSync(uploadPath);
        }
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        // Save the file with its original name
        cb(null, file.originalname);
    }
});
const upload = multer({ storage: storage });

// Route to handle textbook uploads
app.post('/upload-textbook', upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: "No file uploaded." });
    }

    // Here, you can process the uploaded file as needed
    // For example, extract text from PDF or TXT for AI reference
    // This is a placeholder implementation

    console.log(`Received file: ${req.file.originalname}`);
    res.status(200).json({ message: "Textbook uploaded successfully!" });
});

// Route to handle AI questions
app.post('/ask-question', async (req, res) => {
    const { question } = req.body;

    if (!question) {
        return res.status(400).json({ message: "No question provided." });
    }

    try {
        const aiResponse = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            {
                model: "gpt-4",
                messages: [{ role: "user", content: question }],
                max_tokens: 500,
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                },
            }
        );

        const aiAnswer = aiResponse.data.choices[0].message.content.trim();
        res.status(200).json({ answer: aiAnswer });
    } catch (error) {
        console.error("Error with OpenAI API:", error.response ? error.response.data : error.message);
        res.status(500).json({ message: "Error processing your request." });
    }
});

// Route to handle screen sharing AI questions
app.post('/ask-bot', async (req, res) => {
    const { question, capturedText } = req.body;

    if (!question || !capturedText) {
        return res.status(400).json({ message: "Missing question or screen content." });
    }

    try {
        const combinedPrompt = `${question}\n\nScreen Content:\n${capturedText}`;
        const aiResponse = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            {
                model: "gpt-4",
                messages: [{ role: "user", content: combinedPrompt }],
                max_tokens: 500,
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                },
            }
        );

        const aiAnswer = aiResponse.data.choices[0].message.content.trim();
        res.status(200).json({ answer: aiAnswer });
    } catch (error) {
        console.error("Error with OpenAI API:", error.response ? error.response.data : error.message);
        res.status(500).json({ message: "Error processing your request." });
    }
});

// Placeholder route for screen sharing initiation
app.get('/start-screen-sharing', (req, res) => {
    // Implement screen sharing initiation logic here
    res.status(200).json({ message: "Screen sharing started." });
});

// Serve uploaded files (optional)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Start Server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
