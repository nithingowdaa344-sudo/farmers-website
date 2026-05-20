const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const OLLAMA_URL = "http://localhost:11434/api/generate";

app.post('/chat', async (req, res) => {
    const { message } = req.body;
    
    const hasKannada = /[\u0C80-\u0CFF]/.test(message);
    const targetLang = hasKannada ? "Kannada" : "English";
    
    const system_prompt = `You are a smart agriculture AI assistant for Karnataka farmers. Reply only in simple, clear ${targetLang}. Help farmers with crops, soil, fertilizers, diseases, irrigation, humidity, rainfall, and agriculture guidance. Keep answers practical, clear, and very concise (max 3 sentences).`;
    
    try {
        const response = await axios.post(OLLAMA_URL, {
            model: "llama3",
            prompt: `${system_prompt}\n\nFarmer: ${message}\nAI:`,
            stream: false
        });
        
        res.json({ response: response.data.response });
    } catch (error) {
        console.error("Ollama error:", error.message);
        const fallbackMsg = hasKannada
            ? "ಕ್ಷಮಿಸಿ, ಒಲ್ಲಾಮ ಸರ್ವರ್ ಕಾರ್ಯನಿರ್ವಹಿಸುತ್ತಿಲ್ಲ."
            : "Sorry, the Ollama server is not responding.";
        res.status(500).json({ response: fallbackMsg });
    }
});

const PORT = 3001;
app.listen(PORT, () => {
    console.log(`Voice Assistant Backend running on http://localhost:${PORT}`);
});
