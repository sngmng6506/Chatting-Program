const express = require('express')
const { Pool } = require('pg'); 
const path = require('path');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const app = express()
const port = 3000
const SocketIO = require('socket.io');
const session = require('express-session');
const sessionStore = new session.MemoryStore();


const sessionMiddleware = session({
    store: sessionStore,
    secret: 'lsm',
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true
      }
});

app.use(sessionMiddleware);


// 정적 파일 제공 
app.use(express.static(path.join(__dirname, 'public')));  


// 바디 파서 미들웨어 : 사용자로부터 데이터를 받기 위해 , req body를 url 형태로 파싱함. 
app.use(bodyParser.urlencoded({ extended: false }));




// 데이터베이스 연결 
const db = new Pool({ user: 'postgres', host: 'localhost', database: 'chatting', password: '@650650chzl', port: 5432 }); 


db.connect(err => {
    if(err) console.log(err)
    else console.log('데이터베이스 연결 성공')
})




// 루트 경로 요청 처리 : ./ 로 요청이오면 클라이언트한테 index.html 파일을 제공함. 
app.get('/', (req, res) => { 
    res.sendFile(path.join(__dirname, '', 'index.html')); 
});


app.get('/index.html', (req, res) => { res.sendFile(path.join(__dirname, '', 'index.html')); });         // 재요청할때 
app.get('/register.html', (req, res) => { res.sendFile(path.join(__dirname, '', 'register.html')); });   // 회원가입할때 
app.get('/chat_room.html', (req, res) => { 
    res.sendFile(path.join(__dirname, '', 'chat_room.html'));
}); // 채팅방들어갈때 



//  회원가입 등록 요청 처리 --> PostgreDB에 저장 
app.post('/register',(req,res,next) => {

    const username = req.body.userName;
    const password = req.body.userPassword;

    
    // 형식 검증 
    if (typeof username !== 'string' || username.length < 1) {
        return res.status(400).send('Invalid username');
    }
    if (typeof password !== 'string' || password.length < 1) {
        return res.status(400).send('Invalid password');
    }

    const hashedPassword = bcrypt.hashSync(password, 10);


    const user_table = [
        username,
        hashedPassword,
        ]


    const sql = 'insert into users(username, password_hash) values($1,$2)' //SQL문 작성 
    
    

    try {
        db.query(sql,user_table,(err,row) => {
            if(err) console.log(err)
        });

    

    return res.redirect('/');
    
    }catch (error) {
        console.error('Error registering user:', error);
        return res.status(500).send('Internal Server Error');
    }
});



// 로그인 요청처리 
app.post('/login', async(req,res,next) => {
    
    const username = req.body.userName;
    const password = req.body.userPassword;


    // 검증 로직 
    try{
        // 1. username으로 사용자 조회 
        const result = await db.query('select username, password_hash FROM users WHERE username = $1', [username]);

        // 2. username 있으면 비밀번호 비교
        if (result.rows.length === 0) {  // 아이디 없음 
            return res.status(400).send('0');
        }

        const isMatch = bcrypt.compareSync(password, result.rows[0].password_hash);
        if (!isMatch) {
            return res.status(400).send('0');
        }

        req.session.username = username; 

        return res.redirect('/chat_room.html');


    } catch (error) {
        console.error('Error logging in:', error);
        return res.status(500).send('Internal Server Error');
    }
});





// 채팅방용 Websocket 연결 , socket.io는 ws처럼 마찬가지로 웹 소켓 구현체 중 하나임. 
const server = app.listen(port, '0.0.0.0', () => { console.log(`Server listening on port ${port}`); });



// 서버 연결
const io = SocketIO(server, {path: '/socket.io'}); 

io.use((socket, next) => {
    sessionMiddleware(socket.request, {}, next);
});

// 온라인 사용자 목록 관리 : 귓속말 용 
const onlineUsers = new Map();

// 웹소켓 연결시 
io.on('connection', async(socket) => {

    // 온라인 사용자 목록 관리 
    const username = socket.request.session.username; 
    if (username != undefined)   {
        onlineUsers.set(username, socket.id);
        console.log('온라인 사용자 목록:', onlineUsers);
    }

    // 이전 채팅 불러오기 
    try {
        const result = await db.query(`
          SELECT username, message, created_at
          FROM chat_messages
          ORDER BY created_at ASC, id ASC
          LIMIT 100
        `);
    
        socket.emit('chat_history', result.rows);
    
      } catch (err) {
        console.error('채팅 이력 로드 실패:', err);
      }



    // 메세지 전송 : 전체
    socket.on('receive_message', async(data) => {
        io.emit('send_message', {
            username : username,
            msg : data.msg,
        });

  
        // DB 저장 
        const sql = `
        INSERT INTO chat_messages (username, message, created_at) VALUES ($1, $2, NOW())`;
        
        try{
            await db.query(sql,[username,data.msg]);
        } catch (error) {
            console.error('Error saving chat message:', error);
        }

    });


    // 메세지 전송 : 귓속말 
    socket.on('receive_message_to_one', (data) => {

        // to가 접속해 있다면 to에게 메세지 전송 
        if (onlineUsers.has(data.to)) {
            io.to(onlineUsers.get(data.to)).emit('send_message_to_one', {
                username : username,
                to : data.to,
                msg : data.msg,
            });
        } else {
            console.log('온라인 사용자 목록:', onlineUsers);
            console.log('귓속말 대상자:', data.to, '가 온라인 상태가 아닙니다.');
        }

        // 보낸 사람화면에도 떠야하니까 메세지 전송 
        if (onlineUsers.has(username)) {
            io.to(onlineUsers.get(username)).emit('send_message_to_one', {
                username : username,
                to : data.to,
                msg : data.msg,
            });
        }
    
    });


    // 연결 종료
    socket.on('disconnect', () => {
        onlineUsers.delete(socket.id);
        console.log('연결 종료:', username);
    });

    

    
    

});


