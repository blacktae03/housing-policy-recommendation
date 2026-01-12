import { useState } from "react";
import api from "@/api/axios";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { UserPlus, ArrowLeft, AlertCircle } from "lucide-react";

const SignUp = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    username: "",
    nickname: "",
    password: "",
    confirmPassword: "",
  });

  const [errorMsg, setErrorMsg] = useState("");

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
    setErrorMsg(""); // 타이핑하면 에러 메시지 초기화
  };

  const handleSignup = async () => {
    // 1. 유효성 검사
    if (!formData.username || !formData.nickname || !formData.password || !formData.confirmPassword) {
      setErrorMsg("모든 정보를 입력해주세요.");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setErrorMsg("비밀번호가 서로 다릅니다.");
      return;
    }

    if (formData.password.length < 4) {
      setErrorMsg("비밀번호는 최소 4자리 이상이어야 합니다.");
      return;
    }

    try {
      // 2. 백엔드 전송 (POST /signup)
      // 백엔드는 username, password, nickname 3가지를 기다립니다.
      const response = await api.post("/signup", {
        username: formData.username,
        password: formData.password,
        nickname: formData.nickname,
      });

      if (response.status === 200) {
        alert("회원가입 성공! 🎉\n로그인 페이지로 이동합니다.");
        
        // ★ 핵심: 로그인 페이지로 이동하되, "아이디 창을 열어둬!"라는 신호(state)를 같이 보냅니다.
        navigate("/login", { state: { autoShowIdLogin: true } });
      }
    } catch (error) {
      console.error("회원가입 실패:", error);
      if (error.response && error.response.data) {
        // 백엔드에서 "이미 있는 아이디입니다" 같은 메시지를 주면 보여줌
        setErrorMsg(error.response.data.detail || "회원가입 중 오류가 발생했습니다.");
      } else {
        setErrorMsg("서버 연결에 실패했습니다.");
      }
    }
  };

  return (
    <div className="flex h-screen w-full items-center justify-center bg-theme-bonjour px-4">
      <Card className="w-full max-w-[500px] border-theme-venus/30 shadow-2xl shadow-theme-venus/20 bg-white relative">
        
        {/* 뒤로가기 버튼 */}
        <Button 
            variant="ghost" 
            size="icon" 
            className="absolute left-4 top-4 text-theme-venus hover:text-theme-livid"
            onClick={() => navigate("/login")}
        >
            <ArrowLeft className="w-6 h-6" />
        </Button>

        <CardHeader className="space-y-2 text-center pt-10 pb-2">
          <div className="flex justify-center mb-4">
            <div className="p-4 rounded-full bg-theme-bonjour shadow-inner">
              <UserPlus className="w-10 h-10 text-theme-livid" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold text-theme-black">
            회원가입
          </CardTitle>
          <CardDescription className="text-theme-venus">
            간편하게 가입하고 맞춤 정책을 추천받으세요.
          </CardDescription>
        </CardHeader>

        <CardContent className="grid gap-4 px-10">
          {/* 아이디 */}
          <div className="grid gap-2">
            <Label htmlFor="username">아이디</Label>
            <Input
              id="username"
              placeholder="아이디 입력"
              value={formData.username}
              onChange={handleChange}
              className="h-12 text-lg focus-visible:ring-theme-livid"
            />
          </div>

          {/* 닉네임 */}
          <div className="grid gap-2">
            <Label htmlFor="nickname">닉네임</Label>
            <Input
              id="nickname"
              placeholder="사용할 이름 (닉네임)"
              value={formData.nickname}
              onChange={handleChange}
              className="h-12 text-lg focus-visible:ring-theme-livid"
            />
          </div>

          {/* 비밀번호 */}
          <div className="grid gap-2">
            <Label htmlFor="password">비밀번호</Label>
            <Input
              id="password"
              type="password"
              placeholder="비밀번호 (4자리 이상)"
              value={formData.password}
              onChange={handleChange}
              className="h-12 text-lg focus-visible:ring-theme-livid"
            />
          </div>

          {/* 비밀번호 확인 */}
          <div className="grid gap-2">
            <Label htmlFor="confirmPassword">비밀번호 확인</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="비밀번호 재입력"
              value={formData.confirmPassword}
              onChange={handleChange}
              className={`h-12 text-lg focus-visible:ring-theme-livid ${
                formData.confirmPassword && formData.password !== formData.confirmPassword 
                ? "border-red-500 ring-red-500" 
                : ""
              }`}
            />
          </div>

          {/* [요청하신 빨간색 경고 문구] */}
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-100 text-red-600 text-sm font-medium mt-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>비밀번호를 잊어버리시면 찾을 수 없습니다.</span>
          </div>
            
          {/* 에러 메시지 출력 영역 */}
          {errorMsg && (
            <p className="text-sm text-red-500 font-bold text-center animate-pulse">
              🚨 {errorMsg}
            </p>
          )}
        </CardContent>

        <CardFooter className="flex flex-col gap-4 px-10 pb-10 pt-4">
          <Button
            className="w-full h-12 text-lg bg-theme-livid hover:bg-theme-livid/90 text-white font-bold shadow-lg transition-all active:scale-95"
            onClick={handleSignup}
          >
            가입하기
          </Button>
          <div className="text-sm text-center text-theme-venus">
             이미 계정이 있으신가요? 
            <Link to="/login" className="text-theme-pink font-bold ml-2 hover:underline">
              로그인
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default SignUp;