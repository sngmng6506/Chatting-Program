# Chatting Program (Study Project)

This is a **personal study project** created to understand the overall structure of a web-based chatting system.  
The project focuses on implementing both client-side and server-side components of a chat application using
HTML, JavaScript, and Node.js-based technologies.

This is not a production-ready service, but a learning-oriented project aimed at understanding
how real-time web chat systems are structured and implemented.

---

## 🏗 System Architecture

```mermaid
graph LR
    Browser["Web Browser\n(HTML, JavaScript)"]
    Server["Express Server\n+ Socket.IO"]
    DB[(PostgreSQL)]
    Error([에러 발생!])

    Browser -- "HTTP / WS" --> Server
    Server -- "SQL Query" --> DB
    DB -.-> Error
    style Error fill:#f96,stroke:#333,stroke-width:2px
---

## 🎯 Study Goals

- Understand the overall workflow of a web-based chat application  
  - User registration → Login → Enter chat room → Send messages
- Learn how client and server communicate in real time
- Implement session-based authentication
- Design and implement real-time messaging features
- Store and load chat data using a relational database

---

## 🛠 Tech Stack

### Frontend
- HTML
- JavaScript (Vanilla JS)

### Backend
- Node.js
- Express
- Socket.IO (WebSocket-based real-time communication)

### Database & Security
- PostgreSQL
- bcrypt (password hashing)
- express-session (session-based authentication)

---

## 📂 Project Structure

```text
Chatting-Program/
├── index.html        # Main entry page (login)
├── register.html     # User registration page
├── chat_room.html    # Chat room UI
├── index.js          # Server and Socket.IO logic
├── package.json
└── package-lock.json # Dependency lock file
