const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const path = require('path');
const bodyParser = require('body-parser'); // Needed to read the input text

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// DATA STORAGE
let userData = {}; 
let history = []; 
let currentSessionName = "Welcome! Waiting for question..."; // Default Title
const MAX_SUBMISSIONS = 2; 

app.use(express.static(__dirname));
app.use(bodyParser.urlencoded({ extended: true })); // Enable reading form data

// --- ROUTES ---

// 1. Participant View
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

// 2. Projector View (Full Screen)
app.get('/live', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>Live Cloud</title>
        <script src="/socket.io/socket.io.js"></script>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/wordcloud2.js/1.2.2/wordcloud2.min.js"></script>
        <style>
            body { margin: 0; overflow: hidden; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; background: white; font-family: sans-serif; }
            h1 { margin: 10px 0; font-size: 3rem; color: #333; }
            #cloud-canvas { width: 98vw; height: 85vh; }
        </style>
    </head>
    <body>
        <h1 id="projector-title">${currentSessionName}</h1>
        <canvas id="cloud-canvas"></canvas>
        <script>
            const socket = io();
            const canvas = document.getElementById('cloud-canvas');
            const title = document.getElementById('projector-title');
            
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight * 0.85;

            socket.on('update_cloud', (list) => {
                const ctx = canvas.getContext('2d');
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                
                WordCloud(canvas, { 
                    list: list, 
                    gridSize: 15, 
                    weightFactor: 3, 
                    fontFamily: 'Impact, sans-serif', 
                    color: 'random-dark', 
                    rotateRatio: 0, 
                    backgroundColor: '#ffffff',
                    shrinkToFit: true
                });
            });

            // Update Title on Projector automatically
            socket.on('session_name', (name) => {
                title.innerText = name;
            });
        </script>
    </body>
    </html>
    `);
});

// 3. Admin Dashboard
app.get('/admin', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>Admin Panel</title>
        <style>
            body { font-family: sans-serif; padding: 30px; max-width: 800px; margin: 0 auto; background: #f4f4f9; }
            .card { border: 1px solid #ccc; padding: 25px; border-radius: 8px; margin-bottom: 20px; background: white; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
            input[type="text"] { padding: 10px; width: 70%; font-size: 16px; border: 1px solid #ccc; border-radius: 5px; }
            button { background: #28a745; color: white; border: none; padding: 10px 20px; cursor: pointer; font-size: 16px; border-radius: 5px; margin-left: 10px; }
            button:hover { background: #218838; }
            h2 { margin-top: 0; }
        </style>
    </head>
    <body>
        <h1>Admin Control Panel</h1>
        
        <div class="card">
            <h2>Start New Session</h2>
            <p>Current Active Users: <strong>${Object.keys(userData).length}</strong></p>
            <form action="/reset" method="POST">
                <label><strong>Name of Next Session / Question:</strong></label><br><br>
                <input type="text" name="sessionName" placeholder="e.g. What is your favorite animal?" required>
                <button type="submit">Set & Start</button>
            </form>
            <p style="font-size: 0.9em; color: #666;">(Clicking this archives current data, wipes the screen, and updates the title for everyone)</p>
        </div>

        <div class="card">
            <h2>History</h2>
            <pre style="background: #eee; padding: 10px; overflow: auto; max-height: 300px;">${JSON.stringify(history, null, 2)}</pre>
        </div>
    </body>
    </html>
    `);
});

// 4. Reset & Rename Logic
app.post('/reset', (req, res) => {
    // Archive old data
    if (Object.keys(userData).length > 0) {
        history.push({ 
            timestamp: new Date(), 
            name: currentSessionName,
            data: userData,
            cloud: getAggregatedCloud()
        });
    }

    // Set New Name
    currentSessionName = req.body.sessionName || "New Session";
    
    // Wipe Data
    userData = {};

    // Broadcast Changes
    io.emit('reset_client'); // Reset phones
    io.emit('session_name', currentSessionName); // Update Titles
    io.emit('update_cloud', []); // Clear Cloud

    res.redirect('/admin');
});


// --- LOGIC ---

function getAggregatedCloud() {
  const frequency = {};
  Object.values(userData).forEach(entry => {
    entry.words.forEach(word => {
      const w = word.toLowerCase().trim();
      if (w) frequency[w] = (frequency[w] || 0) + 1;
    });
  });
  return Object.entries(frequency).map(([text, count]) => [text, 30 + (count * 15)]);
}

io.on('connection', (socket) => {
  // Send current state to new connections
  socket.emit('update_cloud', getAggregatedCloud());
  socket.emit('session_name', currentSessionName); 

  socket.on('login', (phoneNumber) => {
    socket.phoneNumber = phoneNumber;
    if (!userData[phoneNumber]) {
        userData[phoneNumber] = { words: ['', '', '', '', ''], submitCount: 0 };
    }
    const user = userData[phoneNumber];
    socket.emit('load_user_entries', { 
        words: user.words, 
        isLocked: user.submitCount >= MAX_SUBMISSIONS,
        remaining: MAX_SUBMISSIONS - user.submitCount
    });
  });

  socket.on('submit_words', (words) => {
    if (!socket.phoneNumber) return;
    const user = userData[socket.phoneNumber];

    if (user.submitCount >= MAX_SUBMISSIONS) {
        socket.emit('error_msg', "Locked.");
        return;
    }

    user.words = words.slice(0, 5).map(w => w.toLowerCase());
    user.submitCount += 1;

    io.emit('update_cloud', getAggregatedCloud());

    socket.emit('load_user_entries', { 
        words: user.words, 
        isLocked: user.submitCount >= MAX_SUBMISSIONS,
        remaining: MAX_SUBMISSIONS - user.submitCount
    });
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Running on ${PORT}`));
