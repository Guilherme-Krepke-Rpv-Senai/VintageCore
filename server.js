// server.js
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();

// Ensure upload directory exists
const uploadDir = path.join(__dirname, 'img', 'produtos')
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true })

// Store files with a timestamp + original extension
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || ''
    const name = Date.now().toString(36) + '-' + Math.round(Math.random() * 1e9).toString(36)
    cb(null, `${name}${ext}`)
  }
})

const upload = multer({ storage })

app.use(express.static('.')) // Serve arquivos estáticos

app.post('/upload', upload.single('imagem'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado' })
  // Return the relative path that can be used by the client
  const relative = path.join('img', 'produtos', req.file.filename).replace(/\\/g, '/')
  res.json({ arquivo: req.file.filename, path: relative })
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`))