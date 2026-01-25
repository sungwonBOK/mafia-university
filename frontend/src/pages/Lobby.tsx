// src/pages/Lobby.tsx
import React from 'react';

export const Lobby: React.FC = () => {
  return (
    <div className="home-container">
      <div className="login-box">
        <h1 className="title">LOBBY</h1>
        <p className="subtitle">접속 중인 플레이어</p>
        
        <div style={{ 
          backgroundColor: 'rgba(255, 255, 255, 0.1)', 
          padding: '20px', 
          borderRadius: '8px',
          marginBottom: '20px',
          textAlign: 'left'
        }}>
          <ul style={{ listStyle: 'none', color: 'white' }}>
            <li>• 플레이어 1 (준비 완료)</li>
            <li>• 플레이어 2 (대기 중...)</li>
          </ul>
        </div>

        <button className="start-button">게임 시작</button>
      </div>
    </div>
  );
};

export default Lobby;