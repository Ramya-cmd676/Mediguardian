const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const IMG_DIR = path.join(__dirname, '..', 'test-images');
if (!fs.existsSync(IMG_DIR)) fs.mkdirSync(IMG_DIR, { recursive: true });
const IMG_PATH = path.join(IMG_DIR, 'pill1.png');

// A tiny 1x1 PNG (red pixel) base64
const base64png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=';
fs.writeFileSync(IMG_PATH, Buffer.from(base64png, 'base64'));

const registerCmd = `curl -s -X POST http://localhost:4000/register-pill -F "image=@${IMG_PATH}" -F "name=testpill"`;
const verifyCmd = `curl -s -X POST http://localhost:4000/verify-pill -F "image=@${IMG_PATH}"`;

console.log('Wrote test image to', IMG_PATH);

exec(registerCmd, (err, stdout, stderr) => {
  if (err) {
    console.error('Register error:', err, stderr);
    process.exit(1);
  }
  console.log('Register response:', stdout);

  // wait a moment and then verify
  setTimeout(() => {
    exec(verifyCmd, (err2, stdout2, stderr2) => {
      if (err2) {
        console.error('Verify error:', err2, stderr2);
        process.exit(1);
      }
      console.log('Verify response:', stdout2);
      process.exit(0);
    });
  }, 1500);
});
