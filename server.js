const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// DATA STORAGE
let userData = {}; 
let history = []; // Stores past questions
const MAX_SUBMISSIONS = 2; 

app.use(express.static(__dirname));

// --- ROUTES ---

// 1. Participant View
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

// 2. Projector View
app.get('/live', (req, res) => {
    // Basic HTML wrapper for the cloud
    res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>Live Cloud</title>
        <script src="/socket.io/socket.io.js"></script>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/wordcloud2.js/1.2.2/wordcloud2.min.js"></script>
        <style>
            body { margin: 0; overflow: hidden; display: flex; align-items: center; justify-content: center; height: 100vh; background: white; }
            #cloud-canvas { width: 98vw; height: 95vh; }
        </style>
    </head>
    <body>
        <canvas id="cloud-canvas"></canvas>
        <script>
            const socket = io();
            const canvas = document.getElementById('cloud-canvas');
            
            // Auto-resize canvas
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;

            socket.on('update_cloud', (list) => {
                // Clear canvas before redraw
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
        </script>
    </body>
    </html>
    `);
});

// 3. Admin Dashboard (Control Panel)
app.get('/admin', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>Admin Panel</title>
        <style>
            body { font-family: sans-serif; padding: 30px; max-width: 800px; margin: 0 auto; }
            .card { border: 1px solid #ccc; padding: 20px; border-radius: 8px; margin-bottom: 20px; background: #f9f9f9; }
            button { background: #d9534f; color: white; border: none; padding: 10px 20px; cursor: pointer; font-size: 16px; border-radius: 5px; }
            button:hover { background: #c9302c; }
            h2 { margin-top: 0; }
        </style>
    </head>
    <body>
        <h1>Admin Control Panel</h1>
        
        <div class="card">
            <h2>Current Session</h2>
            <p>Active Participants: <strong>${Object.keys(userData).length}</strong></p>
            <form action="/reset" method="POST">
                <p>Finished with Question 1? Click below to archive this data and reset everyone's screens for Question 2.</p>
                <button type="submit">⚠️ Archive & Start Next Question</button>
            </form>
        </div>

        <div class="card">
            <h2>History (Past Questions)</h2>
            <pre>${JSON.stringify(history, null, 2)}</pre>
        </div>
    </body>
    </html>
    `);
});

// 4. Reset Logic
app.post('/reset', (req, res) => {
    // 1. Archive current data
    if (Object.keys(userData).length > 0) {
        history.push({ 
            timestamp: new Date(), 
            data: userData,
            cloud: getAggregatedCloud()
        });
    }

    // 2. Wipe current data
    userData = {};

    // 3. Tell all phones (and projector) to reset
    io.emit('reset_client');
    io.emit('update_cloud', []); // Clear the projector

    res.redirect('/admin'); // Send admin back to dashboard
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
  socket.emit('update_cloud', getAggregatedCloud());

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

    // Force Lowercase
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
