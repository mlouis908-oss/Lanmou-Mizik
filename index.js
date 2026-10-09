const express = require('express');
const path = require('path');
const multer = require('multer');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

const DB_FILE = path.join(__dirname, 'songs.json');
const DELETE_PASSWORD = "lanmou123";

function getSongs() {
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify([]));
    return [];
  }
  const data = fs.readFileSync(DB_FILE, 'utf8');
  return JSON.parse(data || '[]');
}

function saveSongs(songs) {
  fs.writeFileSync(DB_FILE, JSON.stringify(songs, null, 2));
}

if (!fs.existsSync('./uploads')) {
  fs.mkdirSync('./uploads');
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage: storage });

app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.json());

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/upload', (req, res) => res.sendFile(path.join(__dirname, 'public', 'upload.html')));
app.get('/song/:id', (req, res) => res.sendFile(path.join(__dirname, 'public', 'song.html')));
app.get('/artist/:name', (req, res) => res.sendFile(path.join(__dirname, 'public', 'artist.html')));

app.get('/api/songs', (req, res) => res.json(getSongs()));

app.get('/api/songs/:id', (req, res) => {
  const song = getSongs().find(s => s.id === Number(req.params.id));
  if (song) return res.json(song);
  res.status(404).json({ message: 'Mizik pa jwenn' });
});

app.get('/api/artist-songs/:name', (req, res) => {
  const artistName = req.params.name.toLowerCase();
  const songs = getSongs().filter(s => s.artist.toLowerCase() === artistName);
  res.json(songs);
});

app.post('/api/songs/:id/play', (req, res) => {
  const songs = getSongs();
  const song = songs.find(s => s.id === Number(req.params.id));
  if (song) {
    song.plays = (song.plays || 0) + 1;
    saveSongs(songs);
    return res.json({ success: true, plays: song.plays });
  }
  res.status(404).json({ success: false });
});

app.post('/api/songs/:id/download', (req, res) => {
  const songs = getSongs();
  const song = songs.find(s => s.id === Number(req.params.id));
  if (song) {
    song.downloads = (song.downloads || 0) + 1;
    saveSongs(songs);
    return res.json({ success: true, downloads: song.downloads });
  }
  res.status(404).json({ success: false });
});

app.post('/upload', upload.fields([{ name: 'cover' }, { name: 'audio' }]), (req, res) => {
  const songs = getSongs();
  
  const newSong = {
    id: Date.now(),
    title: req.body.title || 'San Tit',
    artist: req.body.artist || 'Atis Enkoni',
    genre: req.body.genre || 'Rap',
    lyrics: req.body.lyrics || '',
    coverUrl: (req.files && req.files['cover']) ? `/uploads/${req.files['cover'][0].filename}` : '',
    audioUrl: (req.files && req.files['audio']) ? `/uploads/${req.files['audio'][0].filename}` : '',
    plays: 0,
    downloads: 0
  };

  songs.unshift(newSong);
  saveSongs(songs);

  res.send(`
    <div style="background-color: #0b0b0b; color: #fff; font-family: Arial; padding: 40px; text-align: center; min-height: 100vh;">
      <h1 style="color: #e50914;">Mizik la voye ak siksè! 🔥</h1>
      <p>Tit: <strong>${newSong.title}</strong></p>
      <p>Atis: <strong>${newSong.artist}</strong></p>
      <br><br>
      <a href="/" style="color: #fff; background-color: #e50914; text-decoration: none; font-weight: bold; padding: 10px 20px; border-radius: 5px; margin-right: 10px;">Tounen sou Paj Akèy la</a>
      <a href="/upload" style="color: #e50914; text-decoration: none; font-weight: bold; border: 1px solid #e50914; padding: 10px 20px; border-radius: 5px;">Voye yon lòt mizik</a>
    </div>
  `);
});

app.delete('/api/songs/:id', (req, res) => {
  const { password } = req.body;
  if (password !== DELETE_PASSWORD) {
    return res.status(403).json({ success: false, message: 'Mot de passe la pa bon!' });
  }

  let songs = getSongs();
  const songId = Number(req.params.id);
  const song = songs.find(s => s.id === songId);

  if (song) {
    if (song.coverUrl && fs.existsSync(path.join(__dirname, song.coverUrl))) {
      fs.unlinkSync(path.join(__dirname, song.coverUrl));
    }
    if (song.audioUrl && fs.existsSync(path.join(__dirname, song.audioUrl))) {
      fs.unlinkSync(path.join(__dirname, song.audioUrl));
    }

    songs = songs.filter(s => s.id !== songId);
    saveSongs(songs);
    return res.json({ success: true, message: 'Mizik la efase ak siksè!' });
  }

  res.status(404).json({ success: false, message: 'Mizik la pa jwenn.' });
});

app.listen(PORT, () => console.log(`Sèvè Lanmou Mizik ap mache sou port ${PORT}`));