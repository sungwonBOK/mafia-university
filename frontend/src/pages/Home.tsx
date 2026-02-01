// frontend/src/pages/Home.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

export function Home() {
  const [nickname, setNickname] = useState<string>('');
  const [university, setUniversity] = useState<string>('');
  const navigate = useNavigate();

  // 백엔드 서버 주소 (환경 변수 사용)
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";

  const handleStart = async () => {
    if (nickname.trim() === '' || university.trim() === '') {
      alert('닉네임과 대학교를 입력해주세요!');
      return;
    }

    try {
      // 2. 노드 서버의 API 엔드포인트로 데이터 전송
      const response = await axios.post(`${BACKEND_URL}/api/join`, {
        nickname: nickname,
        university: university
      });

      // 3. 노드 서버는 성공 시 HTTP 상태 코드 200을 반환합니다.
      if (response.status === 200) {
        console.log("서버 응답:", response.data);
        
        // 4. 로비로 이동하면서 필요한 정보(닉네임, 학교, 유저ID 등)를 전달
        navigate('/lobby', { 
          state: { 
            nickname, 
            university,
            userId: response.data.data?.[0]?.id // DB에서 생성된 ID가 있다면 전달
          } 
        });
      }
    } catch (error: unknown) {
      console.error("백엔드 연결 실패:", error);
      
      // 에러 메시지를 좀 더 구체적으로 표시
      // 2. 에러가 axios 에러인지 확인하는 '타입 가드' 추가
  if (axios.isAxiosError(error)) {
    // 이제 이 안에서 error는 AxiosError 타입으로 안전하게 인식
    const errorMsg = error.response?.data?.error || "서버와 연결할 수 없습니다.";
    alert(errorMsg);
  } else {
    // 일반적인 에러 처리
    alert("알 수 없는 오류가 발생했습니다.");
    }
  }
  };

  return (
    <div className="home-container">
      <div className="login-box">
        <h1 className="title">MAFIA UNIVERSITY</h1>
        <p className="subtitle">우주선에 탑승할 준비가 되셨나요?</p>
        <input 
          className="main-input"
          type="text" 
          placeholder="닉네임을 입력하세요..." 
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
        />
        <input 
          className="main-input"
          type="text"
          placeholder="대학교를 입력하세요... ex) OO대학교"
          value={university}
          onChange={(e) => setUniversity(e.target.value)}
        />
        <button className="start-button" onClick={handleStart}>
          대기실 입장
        </button>
      </div>
    </div>
  );
}