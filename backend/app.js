const mongoose = require('mongoose');
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const http = require('http');
const socketIo = require('socket.io');
const Progress = require('./model/progress.model');
const jwt = require('jsonwebtoken');

const app = express();
const server = http.createServer(app);
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl}`);
  next();
});

let io;


io = socketIo(server, {
  cors: {
    origin: "*", 
    methods: ["GET", "POST"]
  },
  pingTimeout: 60000, 
  pingInterval: 25000,
  transports: ['polling'], 
  allowUpgrades: false, 
  path: '/api/socketio' 
});

io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error("Authentication error"));
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    socket.userId = decoded.id;
    next();
  } catch (err) {
    next(new Error("Authentication error"));
  }
});

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.userId}`);
  
  socket.on('progress_update', async (data) => {
    try {
      const { videoId, watchedIntervals, currentTime } = data;
      
      if (!socket.userId || !videoId) {
        console.log('Missing userId or videoId in progress update');
        return;
      }
      
      if (!Array.isArray(watchedIntervals)) {
        console.log(`Invalid watchedIntervals format for video ${videoId}, received:`, watchedIntervals);
        socket.emit('progress_error', { error: 'Invalid watchedIntervals format' });
        return;
      }
      
      console.log(`Received progress update for video ${videoId} at position ${currentTime}`);
      
      let progress = await Progress.findOne({ userId: socket.userId, videoId });
      
      if (progress) {
        progress.watchedIntervals = mergeIntervals(progress.watchedIntervals || [], watchedIntervals);
        progress.lastPosition = currentTime;
        
        const totalUniqueSeconds = calculateUniqueTime(progress.watchedIntervals);
        const videoDuration = data.duration || 100;
        progress.percent = Math.min(100, (totalUniqueSeconds / videoDuration) * 100);
      } else {
        progress = new Progress({ 
          userId: socket.userId, 
          videoId, 
          watchedIntervals,
          lastPosition: currentTime,
          percent: 0
        });
      }
      
      await progress.save();

      socket.emit('progress_saved', { 
        videoId, 
        percent: progress.percent,
        timestamp: new Date().toISOString(),
        totalWatchedSeconds: calculateUniqueTime(progress.watchedIntervals)
      });
      
    } catch (error) {
      console.error('Error saving progress via socket:', error);
      socket.emit('progress_error', { error: error.message });
    }
  });
  
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.userId}`);
  });
});

const PORT = 5000;

app.use(cors({
  origin: function(origin, callback) {
    callback(null, true);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(bodyParser.json());

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

app.use((req, res, next) => {
  const url = req.originalUrl;
  if (url.includes(':') && !url.match(/:\w+/)) {
    return res.status(400).json({ 
      error: 'Invalid URL format', 
      message: 'URL contains invalid parameter format'
    });
  }
  next();
});

app.get('/favicon.ico', (req, res) => {
  res.status(204).end();
});

const progressRoutes = require('./routers/progress.routers');
const authRoutes = require('./routers/auth.routers');
const playlistRoutes = require('./routers/playlist.routers');
const videoRoutes = require('./routers/video.routers');

app.use('/api/progress', progressRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/playlists', playlistRoutes);
app.use('/api/videos', videoRoutes);

app.get('/api/debug/progress', async (req, res) => {
  try {
    const dbState = mongoose.connection.readyState;
    
    const progressCount = await Progress.countDocuments();
    
    const recentProgress = await Progress.find().limit(5).sort({_id: -1});
    
    res.json({
      serverTime: new Date().toISOString(),
      dbConnected: dbState === 1,
      progressCount,
      recentProgress: recentProgress.map(p => ({
        userId: p.userId,
        videoId: p.videoId,
        percent: p.percent,
        timestamp: p._id.getTimestamp()
      }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/',(req,res)=>{    
    res.send('Hello World');
});

app.use('/*', (req, res) => {
  res.status(404).json({ 
    error: 'Not Found',
    message: `Route ${req.originalUrl} not found`,
    availableRoutes: ['/api/progress', '/api/auth', '/api/playlists', '/api/videos']
  });
});

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/VideoProgress', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(()=>{console.log('MongoDB Connected ...')})
.catch(e=> console.log(e));

function mergeIntervals(existing, newIntervals) {
  const existingArray = Array.isArray(existing) ? existing : [];
  const newArray = Array.isArray(newIntervals) ? newIntervals : [];
  
  if (!existingArray.length && !newArray.length) return [];
  
  const allIntervals = [...existingArray, ...newArray];
  allIntervals.sort((a, b) => a.start - b.start);
  
  if (allIntervals.length === 0) return [];
  
  const merged = [];
  let current = allIntervals[0];

  for (let i = 1; i < allIntervals.length; i++) {
    if (current.end >= allIntervals[i].start) {
      current.end = Math.max(current.end, allIntervals[i].end);
    } else {
      merged.push(current);
      current = allIntervals[i];
    }
  }
  merged.push(current);

  return merged;
}

function calculateUniqueTime(intervals) {
  if (!intervals || intervals.length === 0) return 0;
  
  const mergedIntervals = mergeIntervals([...intervals]);
  
  let totalTime = 0;
  for (const interval of mergedIntervals) {
    totalTime += interval.end - interval.start;
  }
  
  return totalTime;
}

app.use((err, req, res, next) => {
  console.error('Express error:', err);
  res.status(500).json({
    error: 'Server Error',
    message: process.env.NODE_ENV === 'production' ? 
      'An unexpected error occurred' : 
      err.message
  });
});

if (process.env.NODE_ENV !== 'production') {
  server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
} else {
  module.exports = { app, server };
}

module.exports = app;