const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// DATA STRUCTURE: 
// userData[phone] = { words: ['apple', 'banana'], submitCount: 0 }
let userData = {}; 
const MAX_SUBMISSIONS = 2; // 1 Initial + 1 Edit

app.use(express.static(__dirname));

// 1. Participant View
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// 2. Projector View (Full Screen Cloud Only)
app.get('/live', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>Live Cloud</title>
        <script src="/socket.io/socket.io.js"></script>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/wordcloud2.js/1.2.2/wordcloud2.min.js"></script>
        <style>
            body { margin: 0; padding: 0; overflow: hidden; background: white; display: flex; align-items: center; justify-content: center; height: 100vh; }
            #cloud-canvas { width: 95vw; height: 90vh; }
        </style>
    </head>
    <body>
        <canvas id="cloud-canvas"></canvas>
        <script>
            const socket = io();
            const canvas = document.getElementById('cloud-canvas');
            
            // Resize canvas to fit screen
            canvas.width = window.innerWidth * 0.95;
            canvas.height = window.innerHeight * 0.9;

            socket.on('update_cloud', (list) => {
                WordCloud(canvas, { 
                    list: list, 
                    gridSize: 10, 
                    weightFactor: 3, // Bigger words for projector
                    fontFamily: 'Impact, sans-serif', 
                    color: 'random-dark', 
                    rotateRatio: 0.5, 
                    backgroundColor: '#ffffff'
                });
            });
        </script>
    </body>
    </html>
    `);
});

// 3. Admin Data View
app.get('/admin', (req, res) => {
    let html = '<h1>Data</h1><table border="1"><tr><th>ID</th><th>Words</th><th>Edits Used</th></tr>';
    for (const [phone, data] of Object.entries(userData)) {
        html += `<tr><td>${phone}</td><td>${data.words.join(', ')}</td><td>${data.submitCount}/${MAX_SUBMISSIONS}</td></tr>`;
    }
    html += '</table>';
    res.send(html);
});

// Logic
function getAggregatedCloud() {
  const frequency = {};
  Object.values(userData).forEach(entry => {
    entry.words.forEach(word => {
      // Clean word again just in case
      const w = word.toLowerCase().trim();
      if (w) frequency[w] = (frequency[w] || 0) + 1;
    });
  });
  return Object.entries(frequency).map(([text, count]) => [text, 30 + (count * 15)]);
}

io.on('connection', (socket) => {
  // Send cloud to anyone who connects
  socket.emit('update_cloud', getAggregatedCloud());

  socket.on('login', (phoneNumber) => {
    socket.phoneNumber = phoneNumber;
    
    // Initialize user if new
    if (!userData[phoneNumber]) {
        userData[phoneNumber] = { words: ['', '', '', '', ''], submitCount: 0 };
    }

    const user = userData[phoneNumber];
    
    // Send back their words and whether they are locked
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
        socket.emit('error_msg', "You have used your edits. Submissions locked.");
        return;
    }

    // UPDATED LINE: Force lowercase before saving
    user.words = words.slice(0, 5).map(w => w.toLowerCase());
    
    user.submitCount += 1;

    io.emit('update_cloud', getAggregatedCloud());

    socket.emit('load_user_entries', { 
        words: user.words, 
        isLocked: user.submitCount >= MAX_SUBMISSIONS,
        remaining: MAX_SUBMISSIONS - user.submitCount
    });
  });

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
