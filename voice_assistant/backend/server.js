const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const OLLAMA_URL = "http://localhost:11434/api/generate";

app.post('/chat', async (req, res) => {
    const { message } = req.body;
    
    const system_prompt = "You are a smart agriculture AI assistant for Karnataka farmers. Reply only in simple Kannada language. Help farmers with crops, soil, fertilizers, diseases, irrigation, humidity, rainfall, and agriculture guidance. Keep answers practical and very concise.";
    
    try {
        const response = await axios.post(OLLAMA_URL, {
            model: "llama3",
            prompt: `${system_prompt}\n\nFarmer: ${message}\nAI:`,
            stream: false
        });
        
        res.json({ response: response.data.response });
    } catch (error) {
        console.error("Ollama error:", error.message);
        res.status(500).json({ response: "ಕ್ಷಮಿಸಿ, ಒಲ್ಲಾಮ ಸರ್ವರ್ ಕಾರ್ಯನಿರ್ವಹಿಸುತ್ತಿಲ್ಲ." });
    }
});

const PORT = 3001;
app.listen(PORT, () => {
    console.log(`Voice Assistant Backend running on http://localhost:${PORT}`);
});
