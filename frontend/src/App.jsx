import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
// import './App.css'
import { Routes, Route } from "react-router-dom";
import EpiPage from "@/pages/EpiPage";
import Login from "@/pages/Login";
import MainPage from "@/pages/MainPage"; // 추가
import UserInfo from "@/pages/UserInfo"; // 추가
import MyPage from "@/pages/MyPage"; // 추가
import SignUp from "@/pages/SignUp";
import Test from "@/pages/Test";

function App() {
  return (
    <Routes>
      <Route path="/" element={<EpiPage />} />
      <Route path="/login" element={<Login />} />
      
      {/* 메인 페이지 연결 */}
      <Route path="/main" element={<MainPage />} />
      
      {/* 임시 페이지들 (나중에 만들 예정) */}
      {/* <Route path="/mypage" element={<div className="p-10">마이 페이지 준비중</div>} /> */}
      {/* <Route path="/user-info" element={<div className="p-10">정보 입력 페이지 준비중</div>} /> */}

      <Route path="/user-info" element={<UserInfo />} />

      <Route path="/mypage" element={<MyPage />} />
      <Route path="/signup" element={<SignUp />} />
      <Route path="/test" element={<Test />} />
    </Routes>
  );
}

export default App;