const micBtn = document.getElementById('mic-btn');
const statusText = document.getElementById('status');
const chatArea = document.getElementById('chat-area');
const micIcon = document.getElementById('mic-icon');

// Speech Recognition Setup
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = new SpeechRecognition();
recognition.lang = 'kn-IN';
recognition.interimResults = false;

// Speech Synthesis Setup
const speak = (text) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'kn-IN';
    window.speechSynthesis.speak(utterance);
};

// UI Helpers
const addMessage = (role, content) => {
    const div = document.createElement('div');
    div.className = `message ${role}-message`;
    div.innerText = content;
    chatArea.appendChild(div);
    chatArea.scrollTop = chatArea.scrollHeight;
};

// Event Handlers
micBtn.addEventListener('click', () => {
    if (micBtn.classList.contains('listening')) {
        recognition.stop();
    } else {
        recognition.start();
    }
});

recognition.onstart = () => {
    micBtn.classList.add('listening');
    statusText.innerText = 'ಕೇಳಿಸಿಕೊಳ್ಳುತ್ತಿದ್ದೇನೆ... (Listening...)';
    lucide.createIcons(); // To refresh icons if needed
};

recognition.onend = () => {
    micBtn.classList.remove('listening');
    statusText.innerText = 'ಪ್ರಾರಂಭಿಸಲು ಮೈಕ್ರೊಫೋನ್ ಒತ್ತಿರಿ';
};

recognition.onresult = async (event) => {
    const transcript = event.results[0][0].transcript;
    addMessage('user', transcript);
    
    statusText.innerText = 'ಯೋಚಿಸುತ್ತಿದ್ದೇನೆ... (Thinking...)';

    try {
        const response = await fetch('http://localhost:3001/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: transcript })
        });
        
        const data = await response.json();
        addMessage('ai', data.response);
        speak(data.response);
    } catch (error) {
        addMessage('ai', 'ಕ್ಷಮಿಸಿ, ಸಂಪರ್ಕದಲ್ಲಿ ತೊಂದರೆಯಾಗಿದೆ.');
    } finally {
        statusText.innerText = 'ಪ್ರಾರಂಭಿಸಲು ಮೈಕ್ರೊಫೋನ್ ಒತ್ತಿರಿ';
    }
};

recognition.onerror = (event) => {
    console.error('Speech recognition error:', event.error);
    statusText.innerText = 'ದೋಷ ಸಂಭವಿಸಿದೆ. ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.';
};
