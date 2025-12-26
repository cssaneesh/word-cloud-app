// ... existing code ...

// HIDDEN ADMIN PAGE
// Go to your-url.com/admin to see the list of phone numbers
app.get('/admin', (req, res) => {
  let html = `
    <html>
      <head>
        <title>Admin Dashboard</title>
        <style>
          body { font-family: sans-serif; padding: 20px; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
          tr:nth-child(even) { background-color: #f9f9f9; }
        </style>
      </head>
      <body>
        <h1>Participant Data</h1>
        <table>
          <tr>
            <th>Phone Number / ID</th>
            <th>Words Submitted</th>
          </tr>
  `;

  // Loop through the data and create table rows
  for (const [phone, words] of Object.entries(userData)) {
    // specific check to avoid showing empty entries
    const wordList = words.filter(w => w).join(', '); 
    if (phone) {
        html += `
          <tr>
            <td>${phone}</td>
            <td>${wordList || '<em>No words yet</em>'}</td>
          </tr>`;
    }
  }

  html += `
        </table>
      </body>
    </html>
  `;
  
  res.send(html);
});

// ... server.listen code ...
