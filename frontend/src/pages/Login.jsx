import { useState, useEffect } from "react";
import api from "@/api/axios";
import { Link, useNavigate, useLocation } from "react-router-dom"; // ★ useLocation 추가
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
import { Home, ArrowLeft } from "lucide-react";

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation(); // ★ 여기! 전달받은 신호를 읽기 위한 훅

  // [상태 관리] 
  // location.state?.autoShowIdLogin이 true면 -> 아이디 창(true)으로 시작
  // 없으면 -> 버튼 선택 화면(false)으로 시작
  const [isIdLogin, setIsIdLogin] = useState(location.state?.autoShowIdLogin || false);
  
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  // ★ 페이지 들어올 때 신호가 있으면 state 초기화 (혹시 모를 오류 방지용 useEffect)
  useEffect(() => {
    if (location.state?.autoShowIdLogin) {
        setIsIdLogin(true);
        // 상태를 썼으면 청소해주는 게 좋습니다 (새로고침 시 유지 안 되도록)
        window.history.replaceState({}, document.title);
    }
  }, [location]);

  const handleLogin = async () => {
    if (!username || !password) {
        alert("아이디와 비밀번호를 입력해주세요.");
        return;
    }
    try {
      const response = await api.post("/login", {
        username: username,
        password: password,
      });

      if (response.status === 200) {
        alert("로그인 되었습니다! 🎉");
        navigate("/main");
      }
    } catch (error) {
      if (error.response && error.response.status === 401) {
        alert("아이디나 비밀번호가 일치하지 않습니다.");
      } else {
        alert("로그인 서버 연결에 실패했습니다.");
      }
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleLogin();
  };

  return (
    <div className="flex h-screen w-full items-center justify-center bg-theme-bonjour px-4">
      <Card className="w-full max-w-[500px] border-theme-venus/30 shadow-2xl shadow-theme-venus/20 bg-white relative min-h-[550px] flex flex-col justify-center transition-all duration-700">
        
        {/* 공통 헤더 (홈 아이콘) */}
        <div className="absolute top-10 left-0 w-full flex justify-center z-10">
            <Link to="/" className="cursor-pointer transition-transform hover:scale-110">
                <div className="p-4 rounded-full bg-theme-bonjour group hover:bg-theme-venus/20 transition-colors shadow-sm">
                    <Home className="w-10 h-10 text-theme-livid group-hover:text-theme-livid/80" />
                </div>
            </Link>
        </div>

        {/* --- [화면 1] 로그인 방식 선택 --- */}
        {!isIdLogin && (
            <div className="w-full animate-in fade-in slide-in-from-bottom-8 duration-700 pt-24 pb-10 px-10">
                <div className="text-center mb-5">
                    <h2 className="text-3xl font-bold text-theme-black mb-2">반가워요! 👋</h2>
                    <p className="text-theme-venus text-lg">1분 만에 시작해보세요</p>
                </div>
                
                <div className="space-y-4">
                    {/* 카카오 */}
                    <Button className="w-full h-16 bg-[#FEE500] hover:bg-[#FEE500]/90 border-0 shadow-md transition-transform hover:-translate-y-1 p-0 flex items-center justify-center">
                        <svg viewBox="0 0 24 24" className="!w-8 !h-8 fill-black">
                            <path d="M12 3C5.373 3 0 8.373 0 15c0 6.627 5.373 12 12 12s12-5.373 12-12c0-6.627-5.373-12-12-12zm6 13h-2v-2h2v2zm-4 0h-2v-2h2v2zm-4 0H8v-2h2v2zm-4 0H4v-2h2v2zm8-4H8V9h6v3z" fillOpacity="0" />
                            <path d="M12 3c-5.25 0-9.5 3.35-9.5 7.5 0 2.65 1.75 5 4.5 6.35-.2.75-.75 2.7-1.55 3.85 2.25-.2 4.35-1.2 5.55-2.05.65.1 1.35.15 2.05.15 5.25 0 9.5-3.35 9.5-7.5S17.25 3 12 3z"/>
                        </svg>
                    </Button>
                    
                    {/* 구글 */}
                    <Button variant="outline" className="w-full h-16 bg-white hover:bg-gray-50 border-gray-200 shadow-sm transition-transform hover:-translate-y-1 p-0 flex items-center justify-center">
                        <svg viewBox="0 0 24 24" className="!w-8 !h-8">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.84z" fill="#FBBC05"/>
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                        </svg>
                    </Button>

                    <div className="relative py-2">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-theme-venus/30" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-white px-2 text-theme-venus">Or continue with</span>
                        </div>
                    </div>
                    
                    {/* 아이디 */}
                    <Button 
                        className="w-full h-16 text-lg font-bold bg-theme-livid hover:bg-theme-livid/90 text-white shadow-md transition-all active:scale-95"
                        onClick={() => setIsIdLogin(true)}
                    >
                        아이디로 시작하기
                    </Button>
                </div>
            </div>
        )}

        {/* --- [화면 2] 아이디 로그인 폼 --- */}
        {isIdLogin && (
            <div className="w-full animate-in zoom-in-90 fade-in duration-700 pt-24">
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="absolute top-4 left-4 text-theme-venus hover:text-theme-black"
                    onClick={() => setIsIdLogin(false)}
                >
                    <ArrowLeft className="w-6 h-6" />
                </Button>

                <CardHeader className="space-y-2 text-center pb-6">
                    <CardTitle className="text-2xl font-bold text-theme-black">
                        환영합니다!
                    </CardTitle>
                    <CardDescription className="text-theme-venus text-base">
                        서비스 이용을 위해 로그인해주세요.
                    </CardDescription>
                </CardHeader>
                
                <CardContent className="grid gap-5 px-10">
                    <div className="grid gap-2">
                        <Label htmlFor="username">아이디</Label>
                        <Input 
                            id="username" 
                            placeholder="user_id" 
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            onKeyDown={handleKeyDown}
                            className="h-12 text-lg focus-visible:ring-theme-livid"
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="password">비밀번호</Label>
                        <Input 
                            id="password" 
                            type="password" 
                            placeholder="••••••" 
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            onKeyDown={handleKeyDown}
                            className="h-12 text-lg focus-visible:ring-theme-livid"
                        />
                    </div>
                </CardContent>
                
                <CardFooter className="flex flex-col gap-4 px-10 pb-10 pt-4">
                    <Button 
                        className="w-full h-12 text-lg bg-theme-livid hover:bg-theme-livid/90 text-white font-bold shadow-lg transition-all active:scale-95" 
                        onClick={handleLogin}
                    >
                        로그인 하기
                    </Button>
                    
                    <p className="text-sm text-center text-theme-venus">
                        아직 계정이 없으신가요?{" "}
                        <span 
                            className="text-theme-pink font-bold cursor-pointer hover:underline ml-1"
                            onClick={() => navigate("/signup")}
                        >
                            회원가입
                        </span>
                    </p>
                </CardFooter>
            </div>
        )}
      </Card>
    </div>
  );
};

export default Login;