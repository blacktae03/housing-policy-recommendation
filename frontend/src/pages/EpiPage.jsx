import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";
import logoNoFontImg from "@/assets/logoNoFont.png";

const EpiPage = () => {
  const navigate = useNavigate();

  const handleStart = () => {
    // 나중에 실제 로그인 상태 확인 로직
    const isLoggedIn = false; 

    if (isLoggedIn) {
      navigate("/main");
    } else {
      navigate("/login");
    }
  };

  return (
    <div className="relative min-h-screen w-full bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-theme-bonjour via-theme-venus/30 to-theme-pink/40 flex flex-col font-sans overflow-hidden">
      
      {/* 상단 로고 (위치 고정) */}
      <header className="absolute top-0 w-full pt-16 flex justify-center z-10">
        <div className="p-8 rounded-full bg-white/50 backdrop-blur-sm shadow-lg border border-theme-venus/20">
            <img src={logoNoFontImg} alt="집살때 로고" className="h-24 w-auto object-contain" />
        </div>
      </header>

      {/* 메인 컨텐츠 영역 */}
      {/* [수정 1: 로고와 글자 사이 간격 넓히기]
         pt-32 -> pt-60 : 로고로부터 훨씬 더 아래로 내려오게 설정
      */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 text-center animate-in fade-in zoom-in duration-700 pt-60">
        
        {/* [수정 2: 줄 간격 조정 & 버튼과의 거리 좁히기]
           1. leading-[2.2] : 줄 간격을 2.2배로 설정 (br 태그 2개보다는 좁고, 1개보다는 넓은 적절한 간격)
           2. mb-12 : 버튼과의 간격을 mb-32에서 대폭 줄임 (버튼이 따라 올라옴)
        */}
        <h1 className="text-6xl md:text-7xl font-bold text-theme-black mb-20 leading-[2.2] tracking-tight drop-shadow-md"style={{ lineHeight: "1.4" }}>
          내가 받을 수 있는 
          <span className="text-theme-livid"> 정부 지원 정책</span>은?
        </h1>

        <Button
          onClick={handleStart}
          className="text-4xl font-bold py-14 px-32 rounded-full bg-theme-livid hover:bg-theme-livid/90 text-white shadow-[0_20px_50px_rgba(81,41,64,0.3)] hover:-translate-y-2 transition-all duration-300 active:scale-95"
        >
          지금 알아보기
        </Button>

        <p className="mt-12 text-theme-venus text-xl font-medium">
          <span className="text-theme-pink">★</span> 30초 만에 조회가 가능해요
        </p>
      </main>

    </div>
  );
};

export default EpiPage;