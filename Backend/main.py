from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from supabase import create_client, Client # pip install supabase 필요

app = FastAPI()

# --- Supabase 설정 ---
# 본인의 주소와 anon key로 교체하세요
SUPABASE_URL = "https://yjeyfgvcifpbxufmunnt.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlqZXlmZ3ZjaWZwYnh1Zm11bm50Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzMTc1NTMsImV4cCI6MjA4NDg5MzU1M30.SlpgOES74QxDoBfj5qrTeUib_9pnRdImG-XHVbCeTS0"
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

app.add_middleware(
    CORSMiddleware,
    # allow_origins=["http://localhost:5173"],
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class UserJoin(BaseModel):
    nickname: str
    university: str

@app.post("/api/join")
async def join_game(user: UserJoin):
    # Supabase의 'users' 테이블에 데이터 삽입
    data, count = supabase.table("users").insert({
        "nickname": user.nickname, 
        "university": user.university
    }).execute()
    
    print(f"DB 저장 완료: {data}")
    
    return {"status": "success", "message": f"{user.university} 로비 입장 완료"}