# 🎓 Smart Video Progress Tracker – SDE Intern Assignment

## 📌 Project Purpose

In online learning platforms, simply reaching the end of a video doesn't prove a student has meaningfully watched the content. This project tracks **real progress** by recording only the **unique** parts of the video that a user watches — ensuring no credit is given for skipping or repeated sections.

---

## 🎯 Core Features

- ✅ Real-time tracking of unique watched intervals
- ✅ Persistent progress saved per user and video
- ✅ Automatically resume from the last watched position
- ✅ Accurate percentage progress calculation
- ✅ Supports YouTube videos

---

## 🧠 How Watched Intervals Are Recorded and Merged

- Every time the user **plays** and then **pauses** the video, the time interval (`start`, `end`) is recorded.
- Re-watched or overlapping intervals are **merged** using a custom algorithm:
  - Sort intervals by start time
  - Combine overlapping or adjacent intervals into a single segment
  - Calculate the **total unique time** watched using merged segments

This ensures that the progress percentage increases **only when new video parts are watched**.

---

## 🔄 Backend API Overview

### `POST /progress`
Save a new watched interval and last watched position.

#### Body
```json
{
  "userId": "abc123",
  "videoId": "xyz456",
  "interval": { "start": 20, "end": 45 },
  "lastPosition": 45
}
 Setup Instructions
📁 Clone the Repository
bash
Copy
Edit
git clone https://github.com/your-username/video-progress-tracker.git
cd video-progress-tracker
📦 Install Dependencies
Server
bash
Copy
Edit
cd server
npm install
node index.js
Client
bash
Copy
Edit
cd client
npm install
npm start
🔗 Local URLs
Frontend: http://localhost:3000

Backend: http://localhost:5000

🧰 Tech Stack
Frontend: React, react-youtube

Backend: Node.js, Express

Database: In-memory JavaScript object (can be replaced with MongoDB)

Other: UUID for user/video simulation, Axios for HTTP requests

🛠️ Challenges Faced
🎬 Time Tracking Precision
YouTube Player only allows polling with getCurrentTime(), which can be slightly imprecise. We used setInterval to poll every second for progress detection.

🧮 Merging Watched Intervals
Merging overlapping or adjacent watched intervals needed a robust algorithm to avoid counting the same seconds multiple times.

📌 Resume Logic
Ensuring users always resume exactly from where they left off required precise coordination between the frontend and backend.

📸 Demo
A working demo video (or screenshots) is optionally included in the repository.

The app auto-resumes from last watched position and updates progress accurately.

🚀 Future Improvements
Add user authentication

Store data in MongoDB

Use YouTube Data API to fetch video duration automatically

✅ Submission
This project is submitted for the SDE Internship Assignment.
For any clarifications, feel free to contact me via the details in my GitHub profile.

yaml
Copy
Edit

---

Let me know if you'd like a custom banner for the GitHub repo or a demo recording script!# videotracker
