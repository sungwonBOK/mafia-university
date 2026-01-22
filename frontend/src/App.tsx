// src/App.tsx
import { Home } from './pages/Home';
import './App.css'; 

function App() {
  // 나중에 여기서 '로그인 성공 여부'에 따라 
  // Home을 보여줄지 Lobby를 보여줄지 결정하게 됩니다.
  return (
    <div className="App">
      <Home />
    </div>
  );
}

export default App;