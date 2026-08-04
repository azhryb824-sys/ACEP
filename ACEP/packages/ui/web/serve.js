const express = require('express');
const path = require('path');
const app = express();
const PORT = 4000;

app.use(express.static(path.join(__dirname)));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n  🎨 ACEP UI Design System Prototype`);
  console.log(`  ─────────────────────────────────────`);
  console.log(`  📍 Local:   http://localhost:${PORT}`);
  console.log(`  📍 Network: http://192.168.1.1:${PORT}`);
  console.log(`  ─────────────────────────────────────`);
  console.log(`  Press Ctrl+C to stop\n`);
});
