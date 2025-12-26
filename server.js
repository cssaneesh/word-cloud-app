const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Store data in memory (Note: On free servers, this resets if the app 'sleeps')
let userData = {}; 

app.use(express.static(__dirname));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

function getAggregatedCloud() {
  const frequency = {};
  Object.values(userData).forEach(words => {
    words.forEach(word => {
      const w = word.toLowerCase().trim();
      if (w) frequency[w] = (frequency[w] || 0) + 1;
    });
  });
  // Format for wordcloud2.js
  return Object.entries(frequency).map(([text, count]) => [text, 20 + (count * 10)]);
}

io.on('connection', (socket) => {
  // Send existing cloud to new user
  socket.emit('update_cloud', getAggregatedCloud());

  socket.on('login', (phoneNumber) => {
    socket.phoneNumber = phoneNumber;
    const existingWords = userData[phoneNumber] || ['', '', '', '', ''];
    socket.emit('load_user_entries', existingWords);
  });

  socket.on('submit_words', (words) => {
    if (!socket.phoneNumber) return;
    userData[socket.phoneNumber] = words.slice(0, 5);
    io.emit('update_cloud', getAggregatedCloud());
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
