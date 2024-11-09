// Initialize Bootstrap tooltips
document.addEventListener('DOMContentLoaded', () => {
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    const tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
});

// ---------------------- Upload Textbook Functionality ----------------------
const uploadButton = document.getElementById('uploadButton');
const textbookUploader = document.getElementById('textbookUploader');
const uploadStatus = document.getElementById('uploadStatus');

uploadButton.addEventListener('click', async () => {
    const file = textbookUploader.files[0];
    if (!file) {
        uploadStatus.innerHTML = "<span class='text-danger'>Please select a file to upload.</span>";
        return;
    }

    const formData = new FormData();
    formData.append('file', file);

    uploadStatus.innerHTML = "<span class='text-primary'>Uploading...</span>";

    try {
        const response = await axios.post('http://localhost:8000/upload-textbook', formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });

        if (response.status === 200) {
            uploadStatus.innerHTML = "<span class='text-success'>Textbook uploaded successfully!</span>";
        } else {
            uploadStatus.innerHTML = `<span class='text-danger'>Failed to upload textbook: ${response.data.message || response.statusText}</span>`;
        }
    } catch (error) {
        console.error(error);
        uploadStatus.innerHTML = `<span class='text-danger'>Error uploading textbook: ${error.message}</span>`;
    }
});

// ---------------------- Chat with AI Functionality ----------------------
const chatHistory = document.getElementById('chatHistory');
const userQuestionInput = document.getElementById('userQuestion');
const askButton = document.getElementById('askButton');

// Initialize chat history
let chatMessages = [];

// Load chat history from localStorage
window.onload = () => {
    const storedChat = localStorage.getItem('chatMessages');
    if (storedChat) {
        chatMessages = JSON.parse(storedChat);
        renderChat();
    }
};

askButton.addEventListener('click', async () => {
    const userQuestion = userQuestionInput.value.trim();
    if (userQuestion === "") {
        alert("Please enter a valid question.");
        return;
    }

    // Append user question to chat
    chatMessages.push({ sender: 'You', message: userQuestion });
    renderChat();
    userQuestionInput.value = "";

    // Send question to backend
    try {
        const response = await axios.post('http://localhost:8000/ask-question', {
            question: userQuestion
        });

        if (response.status === 200) {
            const aiAnswer = response.data.answer;
            chatMessages.push({ sender: 'Chat JU', message: aiAnswer });
            renderChat();
        } else {
            chatMessages.push({ sender: 'Chat JU', message: `Error: ${response.data.message || response.statusText}` });
            renderChat();
        }
    } catch (error) {
        console.error(error);
        chatMessages.push({ sender: 'Chat JU', message: `Error: ${error.message}` });
        renderChat();
    }

    // Save chat history to localStorage
    localStorage.setItem('chatMessages', JSON.stringify(chatMessages));
});

// Function to render chat messages
function renderChat() {
    chatHistory.innerHTML = "";
    chatMessages.forEach(chat => {
        const chatEntry = document.createElement('p');
        if (chat.sender === 'You') {
            chatEntry.innerHTML = `<strong class="text-primary">You:</strong> ${chat.message}`;
        } else {
            chatEntry.innerHTML = `<strong class="text-success">Chat JU:</strong> ${chat.message}`;
        }
        chatHistory.appendChild(chatEntry);
    });

    // Smooth scroll to the bottom
    chatHistory.scroll({
        top: chatHistory.scrollHeight,
        behavior: 'smooth'
    });
}

// ---------------------- Screen Share Functionality ----------------------
const shareScreenButton = document.getElementById('shareScreenButton');
const screenVideo = document.getElementById('screenVideo');
const screenUserQuestionInput = document.getElementById('screenUserQuestion');
const screenAskButton = document.getElementById('screenAskButton');
const screenResponseDisplay = document.getElementById('screenResponseDisplay');
const captureTextButton = document.getElementById('captureTextButton');

let capturedText = '';
let captureInterval = null;

// Share Screen Functionality
shareScreenButton.addEventListener('click', async () => {
    try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
            video: true
        });
        screenVideo.srcObject = screenStream;

        // Start capturing frames for OCR every 10 seconds
        if (!captureInterval) {
            captureInterval = setInterval(() => {
                captureAndRecognize(screenVideo);
            }, 10000);
        }

        // Handle stream end
        screenStream.getVideoTracks()[0].addEventListener('ended', () => {
            clearInterval(captureInterval);
            captureInterval = null;
            capturedText = '';
            screenVideo.srcObject = null;
            screenResponseDisplay.innerHTML += `<p class="text-muted"><em>Screen sharing ended.</em></p>`;
        });
    } catch (err) {
        console.error("Error accessing display media: ", err);
        alert("Error accessing screen sharing: " + err.message);
    }
});

// Capture and Recognize Text from Video Frames
const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');

function captureAndRecognize(video) {
    if (video.videoWidth === 0 || video.videoHeight === 0) {
        console.warn("Video not ready for capturing");
        return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    Tesseract.recognize(
        canvas,
        'eng',
        { logger: m => console.log(m) }
    ).then(({ data: { text } }) => {
        console.log("Extracted Text from OCR:", text);
        capturedText = text;
    }).catch(err => {
        console.error("OCR Error:", err);
    });
}

// Handle Capture Text Now button
captureTextButton.addEventListener('click', () => {
    if (screenVideo.srcObject) {
        captureAndRecognize(screenVideo);
    } else {
        alert("Please start screen sharing first.");
    }
});

// Handle Ask Button in Screen Share Section
screenAskButton.addEventListener('click', async () => {
    const screenQuestion = screenUserQuestionInput.value.trim();
    if (screenQuestion === "") {
        alert("Please enter a valid question.");
        return;
    }

    if (capturedText.trim() === "") {
        alert("Captured text is empty. Please capture text before asking a question.");
        return;
    }

    // Append user's question to the screen response display
    screenResponseDisplay.innerHTML += `<p><strong>You:</strong> ${screenQuestion}</p>`;

    // Send question and capturedText to backend
    try {
        const response = await axios.post('http://localhost:8000/ask-bot', {
            question: screenQuestion,
            capturedText: capturedText
        });

        if (response.status === 200) {
            const botAnswer = response.data.answer;
            screenResponseDisplay.innerHTML += `<p><strong>Chat JU:</strong> ${botAnswer}</p>`;
        } else {
            screenResponseDisplay.innerHTML += `<p><strong>Chat JU:</strong> Error: ${response.data.message || response.statusText}</p>`;
        }
    } catch (error) {
        console.error("Error Response:", error.response ? error.response.data : error.message);
        screenResponseDisplay.innerHTML += `<p><strong>Chat JU:</strong> Error: ${error.message}</p>`;
    }

    // Scroll to the bottom
    screenResponseDisplay.scrollTop = screenResponseDisplay.scrollHeight;

    // Clear input
    screenUserQuestionInput.value = "";
});
