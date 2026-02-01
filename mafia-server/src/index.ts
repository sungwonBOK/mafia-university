//src/index.ts

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { roomManager, Player } from './roomManager';

// 환경 변수 로드
dotenv.config();

const app = express();
const httpServer = createServer(app);

// 1. CORS 설정 (프런트엔드 접속 허용)
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));
app.use(express.json());

// 2. Supabase 연결 (환경 변수 사용)
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// 3. Socket.IO 설정 (실시간 게임용)
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || '*',
    methods: ["GET", "POST"],
    credentials: true
  }
});

// 사용자 세션 저장 (socketId -> 사용자 정보)
const userSessions = new Map<string, Player>();

// [API] 유저 입장 (기존 Python의 /api/join 로직)
app.post('/api/join', async (req, res) => {
  const { nickname, university } = req.body;

  const { data, error } = await supabase
    .from('user-login')
    .insert([{ nickname, university }])
    .select();

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  res.json({ message: "입장 성공!", data });
});

// [API] 서버 상태 확인
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    rooms: roomManager.getAllRooms().length,
    timestamp: new Date().toISOString()
  });
});

// [Socket] 실시간 통신 연결
io.on('connection', (socket) => {
  console.log('새로운 유저 접속:', socket.id);

  // 사용자 정보 등록
  socket.on('register', (userData: { nickname: string; university: string; userId?: string }) => {
    const player: Player = {
      id: socket.id,
      nickname: userData.nickname,
      university: userData.university,
      userId: userData.userId,
      isReady: false
    };
    
    userSessions.set(socket.id, player);
    console.log(`사용자 등록: ${userData.nickname} (${socket.id})`);
    
    // 현재 방 목록 전송
    socket.emit('roomListUpdate', roomManager.getAllRooms());
  });

  // 방 목록 요청
  socket.on('getRooms', () => {
    socket.emit('roomListUpdate', roomManager.getAllRooms());
  });

  // 방 생성
  socket.on('createRoom', (data: { roomName: string; maxPlayers: number }) => {
    const player = userSessions.get(socket.id);
    
    if (!player) {
      socket.emit('error', { message: '사용자 정보를 찾을 수 없습니다. 다시 로그인해주세요.' });
      return;
    }

    try {
      const room = roomManager.createRoom(data.roomName, player, data.maxPlayers);
      
      // 방 생성자를 해당 방의 소켓 룸에 추가
      socket.join(room.id);
      
      // 방 생성 성공 알림
      socket.emit('roomCreated', room);
      
      // 모든 사용자에게 방 목록 업데이트 브로드캐스트
      io.emit('roomListUpdate', roomManager.getAllRooms());
      
      console.log(`방 생성: ${room.name} by ${player.nickname}`);
    } catch (error) {
      socket.emit('error', { message: '방 생성에 실패했습니다.' });
    }
  });

  // 방 참가
  socket.on('joinRoom', (roomId: string) => {
    const player = userSessions.get(socket.id);
    
    if (!player) {
      socket.emit('error', { message: '사용자 정보를 찾을 수 없습니다.' });
      return;
    }

    const result = roomManager.joinRoom(roomId, player);
    
    if (!result.success) {
      socket.emit('error', { message: result.error });
      return;
    }

    // 소켓 룸에 참가
    socket.join(roomId);
    
    // 참가자에게 방 정보 전송
    socket.emit('roomJoined', result.room);
    
    // 같은 방의 모든 사용자에게 업데이트 알림
    io.to(roomId).emit('roomUpdate', result.room);
    
    // 모든 사용자에게 방 목록 업데이트
    io.emit('roomListUpdate', roomManager.getAllRooms());
    
    console.log(`${player.nickname}이(가) 방 ${roomId}에 참가했습니다.`);
  });

  // 방 나가기
  socket.on('leaveRoom', () => {
    const result = roomManager.leaveRoom(socket.id);
    
    if (result.roomId) {
      socket.leave(result.roomId);
      
      // 방이 아직 존재하면 업데이트 전송
      if (result.room) {
        io.to(result.roomId).emit('roomUpdate', result.room);
      }
      
      // 모든 사용자에게 방 목록 업데이트
      io.emit('roomListUpdate', roomManager.getAllRooms());
      
      socket.emit('leftRoom');
      console.log(`사용자 ${socket.id}이(가) 방을 나갔습니다.`);
    }
  });

  // 준비 상태 토글
  socket.on('toggleReady', () => {
    const result = roomManager.toggleReady(socket.id);
    
    if (!result.success) {
      socket.emit('error', { message: result.error });
      return;
    }

    const roomId = roomManager.getPlayerRoom(socket.id);
    if (roomId && result.room) {
      // 같은 방의 모든 사용자에게 업데이트
      io.to(roomId).emit('roomUpdate', result.room);
      io.emit('roomListUpdate', roomManager.getAllRooms());
    }
  });

  // 게임 시작
  socket.on('startGame', () => {
    const result = roomManager.startGame(socket.id);
    
    if (!result.success) {
      socket.emit('error', { message: result.error });
      return;
    }

    const roomId = roomManager.getPlayerRoom(socket.id);
    if (roomId && result.room) {
      // 방의 모든 플레이어에게 게임 시작 알림
      io.to(roomId).emit('gameStarted', result.room);
      io.emit('roomListUpdate', roomManager.getAllRooms());
      
      console.log(`게임 시작: 방 ${roomId}`);
    }
  });

  // 캐릭터 이동 이벤트 (기존 기능 유지)
  socket.on('move', (data) => {
    const roomId = roomManager.getPlayerRoom(socket.id);
    if (roomId) {
      // 같은 방의 다른 플레이어들에게만 전송
      socket.to(roomId).emit('playerMoved', {
        id: socket.id,
        x: data.x,
        y: data.y
      });
    }
  });

  // 연결 해제
  socket.on('disconnect', () => {
    console.log('유저 접속 종료:', socket.id);
    
    // 방에서 나가기 처리
    const result = roomManager.leaveRoom(socket.id);
    
    if (result.roomId) {
      // 방이 아직 존재하면 업데이트 전송
      if (result.room) {
        io.to(result.roomId).emit('roomUpdate', result.room);
      }
      
      // 모든 사용자에게 방 목록 업데이트
      io.emit('roomListUpdate', roomManager.getAllRooms());
    }
    
    // 사용자 세션 삭제
    userSessions.delete(socket.id);
  });
});

const PORT = process.env.PORT || 8000;
httpServer.listen(PORT, () => {
  console.log(`🚀 서버가 포트 ${PORT}에서 실행 중입니다!`);
  console.log(`📡 Frontend URL: ${process.env.FRONTEND_URL || '*'}`);
});
