import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/api/axios"; // 방금 만든 설정 파일 import (경로 주의!)
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Smile, Home, ChevronLeft, ChevronRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";

const UserInfo = () => {
    const navigate = useNavigate();

  // --- [상태 관리] ---
  const [step, setStep] = useState(1); // 메인 단계 (1~7)
  const [subStep, setSubStep] = useState(0); 
  // 5번 질문 내부 단계 변경됨:
  // 0:기혼여부, 1:신혼, 2:신생아, 3:자녀수, 4:맞벌이
  
  // 입력 데이터 저장소
  const [formData, setFormData] = useState({
    birthYear: "", birthMonth: "", birthDay: "", // 1. 생년월일
    income: "", // 2. 연 소득
    asset: "", // 3. 총 자산
    is_house_owner: null, // 4. 주택 소유
    is_married: null, // 5. 기혼 여부
    is_newlywed: null, // 5-1. 신혼부부
    has_newborn: null, // 5-2. 신생아
    child_count: "", // 5-3. 자녀 수
    household_size: "", // 6. 가구원 수 (독립)
    dual_income: null, // 5-4. 맞벌이 (순서 당겨짐)
    etc: [], // 7. 기타 (다중선택)
  });

  // --- [데이터 생성용 배열] ---
  const years = Array.from({ length: 100 }, (_, i) => new Date().getFullYear() - i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const days = Array.from({ length: 31 }, (_, i) => i + 1);
  const etcOptions = ["한부모가정", "다문화가정", "장애인가구", "해당없음"];

  // --- [핸들러: 입력값 변경] ---
  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // 해당없음 vs 나머지 옵션 상호 배타 로직
  const handleEtcToggle = (option) => {
    setFormData((prev) => {
      const current = prev.etc;
      
      if (option === "해당없음") {
          if (current.includes("해당없음")) {
              return { ...prev, etc: [] };
          } 
          return { ...prev, etc: ["해당없음"] };
      }

      if (current.includes("해당없음")) {
          return { ...prev, etc: [option] };
      }

      if (current.includes(option)) {
        return { ...prev, etc: current.filter((item) => item !== option) };
      } else {
        return { ...prev, etc: [...current, option] };
      }
    });
  };

  // --- [네비게이션 로직] ---
  const handleNext = () => {
    // 5번(결혼) 단계의 특수 로직
    if (step === 5) {
      if (subStep === 0) {
        // 기혼 여부 질문
        if (formData.is_married === false) {
          // 미혼이면 결혼 관련 질문(신혼~맞벌이) 다 건너뛰고 바로 6번(가구원 수)으로
          setStep(6);
          setSubStep(0);
        } else {
          // 기혼이면 5-1(신혼)로 진입
          setSubStep(1);
        }
      } else if (subStep < 4) {
        // 5-1(신혼) ~ 5-3(자녀) 질문이면 다음 서브 스텝으로
        // (가구원 수는 6번으로 갔으므로, 여기서 5-4는 맞벌이가 됨)
        setSubStep(subStep + 1);
      } else {
        // 5-4(맞벌이)까지 다 했으면 6번(가구원 수)으로
        setStep(6);
        setSubStep(0);
      }
      return;
    }

    // 일반적인 경우 다음 단계로 (6 -> 7 포함)
    if (step < 7) setStep(step + 1);
  };

  const handlePrev = () => {
    // 5번 단계 특수 로직
    if (step === 5) {
        if (subStep > 0) {
            setSubStep(subStep - 1);
            return;
        }
    }
    
    // 6번(가구원 수)에서 뒤로 갈 때
    if (step === 6) {
        if (formData.is_married) {
            // 기혼자였다면 5-4(맞벌이)로 복귀
            setStep(5);
            setSubStep(4);
        } else {
            // 미혼자였다면 5-0(기혼여부)으로 복귀
            setStep(5);
            setSubStep(0);
        }
        return;
    }

    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = async () => {
    const birthDate = `${formData.birthYear}-${String(formData.birthMonth).padStart(2, '0')}-${String(formData.birthDay).padStart(2, '0')}`;

    const payload = {
      birth_date: birthDate,
      income: Number(formData.income) || 0,
      asset: Number(formData.asset) || 0,
      is_house_owner: !!formData.is_house_owner,
      is_married: !!formData.is_married,
      is_newlywed: !!formData.is_newlywed,
      has_newborn: !!formData.has_newborn,
      child_count: Number(formData.child_count) || 0,
      household_size: Number(formData.household_size) || 1, 
      dual_income: !!formData.dual_income,
      etc: formData.etc 
    };

    console.log("전송할 데이터:", payload);
    
    try {
      await api.put("/user/info/me", payload); 
      alert("정보 입력이 완료되었습니다! 맞춤 정책을 확인해보세요.");
      navigate("/main"); 
    } catch (error) {
      console.error("에러 발생:", error);
      if (error.response && error.response.status === 422) {
          const reason = error.response.data.detail[0];
          alert(`[전송 실패] 데이터 형식이 안 맞아요!\n\n문제 필드: ${reason.loc[1]}\n이유: ${reason.msg}`);
      } else {
          alert("서버 오류가 발생했습니다.");
      }
    }
  };

  // --- [유효성 검사: 다음 버튼 활성화 여부] ---
  const canProceed = () => {
    if (step === 1) return formData.birthYear && formData.birthMonth && formData.birthDay;
    if (step === 2) return formData.income !== "";
    if (step === 3) return formData.asset !== "";
    if (step === 4) return formData.is_house_owner !== null;
    if (step === 5) {
        if (subStep === 0) return formData.is_married !== null;
        if (subStep === 1) return formData.is_newlywed !== null;
        if (subStep === 2) return formData.has_newborn !== null;
        if (subStep === 3) return formData.child_count !== "";
        if (subStep === 4) return formData.dual_income !== null; // 5-4: 맞벌이
    }
    if (step === 6) return formData.household_size !== ""; // 6: 가구원 수
    if (step === 7) return formData.etc.length > 0; // 7: 기타
    return false;
  };

  // --- [화면 렌더링 헬퍼] ---
  const renderQuestion = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4 animate-in fade-in slide-in-from-right duration-300">
            <h2 className="text-2xl font-bold text-theme-black text-center mb-6">생년월일을 알려주세요 🎂</h2>
            <div className="flex gap-2">
              <Select onValueChange={(v) => handleChange("birthYear", v)} value={formData.birthYear}>
                <SelectTrigger><SelectValue placeholder="년" /></SelectTrigger>
                <SelectContent className="max-h-[200px]">{years.map(y => <SelectItem key={y} value={String(y)}>{y}년</SelectItem>)}</SelectContent>
              </Select>
              <Select onValueChange={(v) => handleChange("birthMonth", v)} value={formData.birthMonth}>
                <SelectTrigger><SelectValue placeholder="월" /></SelectTrigger>
                <SelectContent className="max-h-[200px]">{months.map(m => <SelectItem key={m} value={String(m)}>{m}월</SelectItem>)}</SelectContent>
              </Select>
              <Select onValueChange={(v) => handleChange("birthDay", v)} value={formData.birthDay}>
                <SelectTrigger><SelectValue placeholder="일" /></SelectTrigger>
                <SelectContent className="max-h-[200px]">{days.map(d => <SelectItem key={d} value={String(d)}>{d}일</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-4 animate-in fade-in slide-in-from-right duration-300">
            <h2 className="text-2xl font-bold text-theme-black text-center mb-2">연 소득을 알려주세요 💰</h2>
            <p className="text-center text-theme-venus mb-6 text-sm">세전 기준 / 단위: 만원</p>
            <div className="relative">
                <Input 
                    type="number" 
                    placeholder="예: 3500" 
                    className="text-right pr-12 text-lg h-14" 
                    value={formData.income}
                    onChange={(e) => handleChange("income", e.target.value)}
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-theme-venus font-bold">만원</span>
            </div>
          </div>
        );
      case 3:
        return (
            <div className="space-y-4 animate-in fade-in slide-in-from-right duration-300">
              <h2 className="text-2xl font-bold text-theme-black text-center mb-2">총 자산을 알려주세요 🏦</h2>
              <p className="text-center text-theme-venus mb-6 text-sm">부채 포함 / 단위: 만원</p>
              <div className="relative">
                  <Input 
                      type="number" 
                      placeholder="예: 5000" 
                      className="text-right pr-12 text-lg h-14" 
                      value={formData.asset}
                      onChange={(e) => handleChange("asset", e.target.value)}
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-theme-venus font-bold">만원</span>
              </div>
            </div>
          );
      case 4:
        return (
            <div className="space-y-4 animate-in fade-in slide-in-from-right duration-300">
              <h2 className="text-2xl font-bold text-theme-black text-center mb-8">현재 주택을 소유하고 계신가요? 🏠</h2>
              <div className="flex flex-col gap-3">
                <Button 
                    variant={formData.is_house_owner === true ? "default" : "outline"} 
                    className={cn("h-14 text-lg", formData.is_house_owner === true && "bg-theme-livid hover:bg-theme-livid/90")}
                    onClick={() => handleChange("is_house_owner", true)}
                >
                    예, 소유하고 있습니다
                </Button>
                <Button 
                    variant={formData.is_house_owner === false ? "default" : "outline"}
                    className={cn("h-14 text-lg", formData.is_house_owner === false && "bg-theme-livid hover:bg-theme-livid/90")}
                    onClick={() => handleChange("is_house_owner", false)}
                >
                    아니요, 없습니다
                </Button>
              </div>
            </div>
          );
      case 5:
        return (
            <div className="space-y-4 animate-in fade-in slide-in-from-right duration-300">
                {/* 5-0. 기혼 여부 */}
                {subStep === 0 && (
                    <>
                        <h2 className="text-2xl font-bold text-theme-black text-center mb-8">기혼이신가요? 💍</h2>
                        <div className="flex flex-col gap-3">
                            <Button 
                                variant={formData.is_married === true ? "default" : "outline"} 
                                className={cn("h-14 text-lg", formData.is_married === true && "bg-theme-livid hover:bg-theme-livid/90")}
                                onClick={() => handleChange("is_married", true)}
                            >
                                예, 기혼입니다
                            </Button>
                            <Button 
                                variant={formData.is_married === false ? "default" : "outline"}
                                className={cn("h-14 text-lg", formData.is_married === false && "bg-theme-livid hover:bg-theme-livid/90")}
                                onClick={() => handleChange("is_married", false)}
                            >
                                아니요
                            </Button>
                        </div>
                    </>
                )}
                
                {/* 5-1. 신혼 부부 */}
                {subStep === 1 && (
                    <>
                        <h2 className="text-2xl font-bold text-theme-black text-center mb-2">신혼부부이신가요? 💒</h2>
                        <p className="text-center text-theme-venus mb-8 text-sm">(혼인 신고일 기준 7년 이내)</p>
                        <div className="flex flex-col gap-3">
                            <Button variant={formData.is_newlywed === true ? "default" : "outline"} className={cn("h-14 text-lg", formData.is_newlywed === true && "bg-theme-livid")} onClick={() => handleChange("is_newlywed", true)}>예, 신혼부부입니다</Button>
                            <Button variant={formData.is_newlywed === false ? "default" : "outline"} className={cn("h-14 text-lg", formData.is_newlywed === false && "bg-theme-livid")} onClick={() => handleChange("is_newlywed", false)}>아니요</Button>
                        </div>
                    </>
                )}

                {/* 5-2. 신생아 */}
                {subStep === 2 && (
                    <>
                        <h2 className="text-2xl font-bold text-theme-black text-center mb-2">신생아가 있으신가요? 👶</h2>
                        <p className="text-center text-theme-venus mb-8 text-sm">(만 2세 이하)</p>
                        <div className="flex flex-col gap-3">
                            <Button variant={formData.has_newborn === true ? "default" : "outline"} className={cn("h-14 text-lg", formData.has_newborn === true && "bg-theme-livid")} onClick={() => handleChange("has_newborn", true)}>예, 있습니다</Button>
                            <Button variant={formData.has_newborn === false ? "default" : "outline"} className={cn("h-14 text-lg", formData.has_newborn === false && "bg-theme-livid")} onClick={() => handleChange("has_newborn", false)}>아니요</Button>
                        </div>
                    </>
                )}

                 {/* 5-3. 자녀 수 */}
                 {subStep === 3 && (
                    <>
                        <h2 className="text-2xl font-bold text-theme-black text-center mb-8">자녀는 몇 명이신가요? 🐥</h2>
                        <div className="relative">
                            <Input type="number" placeholder="0" className="text-right pr-12 text-lg h-14" value={formData.child_count} onChange={(e) => handleChange("child_count", e.target.value)}/>
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-theme-venus font-bold">명</span>
                        </div>
                    </>
                )}

                {/* 5-4. 맞벌이 (순서 변경됨) */}
                {subStep === 4 && (
                    <>
                        <h2 className="text-2xl font-bold text-theme-black text-center mb-8">맞벌이이신가요? 💼</h2>
                        <div className="flex flex-col gap-3">
                            <Button variant={formData.dual_income === true ? "default" : "outline"} className={cn("h-14 text-lg", formData.dual_income === true && "bg-theme-livid")} onClick={() => handleChange("dual_income", true)}>예, 맞벌이입니다</Button>
                            <Button variant={formData.dual_income === false ? "default" : "outline"} className={cn("h-14 text-lg", formData.dual_income === false && "bg-theme-livid")} onClick={() => handleChange("dual_income", false)}>아니요, 외벌이입니다</Button>
                        </div>
                    </>
                )}
            </div>
        );
      
      // [신설] 6. 가구원 수
      case 6:
        return (
            <div className="space-y-4 animate-in fade-in slide-in-from-right duration-300">
                <h2 className="text-2xl font-bold text-theme-black text-center mb-2">가구원은 몇 명인가요? 👨‍👩‍👧‍👦</h2>
                <p className="text-center text-theme-venus mb-8 text-sm">(본인 포함, 실제 생계 공유 기준)</p>
                <div className="relative">
                    <Select onValueChange={(v) => handleChange("household_size", v)} value={formData.household_size}>
                        <SelectTrigger className="h-14 text-lg"><SelectValue placeholder="인원 선택" /></SelectTrigger>
                        <SelectContent>
                            {[1,2,3,4,5,6,7].map(n => <SelectItem key={n} value={String(n)}>{n}명</SelectItem>)}
                            <SelectItem value="8">8명 이상</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
        );

      // [변경] 7. 기타 질문
      case 7:
        return (
            <div className="space-y-4 animate-in fade-in slide-in-from-right duration-300">
              <h2 className="text-2xl font-bold text-theme-black text-center mb-2">마지막이에요! 해당되는 사항이 있나요?</h2>
              <p className="text-center text-theme-venus mb-6 text-sm">중복 선택 가능</p>
              <div className="grid grid-cols-2 gap-3">
                {etcOptions.map((option) => (
                    <div 
                        key={option}
                        onClick={() => handleEtcToggle(option)}
                        className={cn(
                            "cursor-pointer rounded-xl border-2 p-4 text-center font-bold transition-all",
                            formData.etc.includes(option) 
                                ? "border-theme-pink bg-theme-pink/10 text-theme-pink" 
                                : "border-theme-venus/20 text-theme-venus hover:border-theme-venus/50"
                        )}
                    >
                        {option}
                        {formData.etc.includes(option) && <Check className="inline-block ml-2 w-4 h-4" />}
                    </div>
                ))}
              </div>
            </div>
          );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen w-full bg-theme-bonjour flex items-center justify-center p-4">
      <Card className="w-full max-w-[500px] shadow-2xl border-0 bg-white/90 backdrop-blur-sm min-h-[600px] flex flex-col relative overflow-hidden">
        
        {/* 상단 진척도 영역 */}
        <div className="w-full h-32 bg-theme-bonjour/50 flex items-center justify-center relative">
            <div className="w-[80%] h-2 bg-theme-venus/20 rounded-full relative z-0">
                {/* 움직이는 행복한 사람 아이콘 */}
                <div 
                    className="absolute top-1/2 transition-all duration-700 ease-in-out z-20"
                    // 총 7단계이므로 분모를 6으로 변경 (0% ~ 100%)
                    style={{ left: `${((step - 1) / 6) * 100}%` }}
                >
                    <div className="flex flex-col items-center -translate-x-1/2 -translate-y-1/2 -mt-4">
                        <div className="bg-white p-2 rounded-full shadow-md border border-theme-livid/20">
                            {/* 마지막 단계(7)에서만 아이콘 변경 */}
                            {step === 7 ? <Home className="w-8 h-8 text-theme-pink animate-bounce" /> : <Smile className="w-8 h-8 text-theme-livid" />}
                        </div>
                        <div className="mt-1 px-2 py-0.5 bg-theme-livid text-white text-[10px] rounded-full font-bold">
                            {step}/7
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <CardHeader>
            {/* 뒤로가기 버튼 */}
            {step > 1 && (
                <Button variant="ghost" size="icon" onClick={handlePrev} className="absolute left-4 top-4 text-theme-venus hover:text-theme-livid">
                    <ChevronLeft className="w-6 h-6" />
                </Button>
            )}
        </CardHeader>

        <CardContent className="flex-1 flex flex-col justify-center px-8 pb-10">
            {renderQuestion()}
        </CardContent>

        <CardFooter className="px-8 pb-8">
            <Button 
                className={cn(
                    "w-full h-14 text-xl font-bold rounded-xl transition-all shadow-lg",
                    // 마지막 단계(7)일 때 색상 변경
                    step === 7 
                        ? "bg-theme-pink hover:bg-theme-pink/90 text-white" 
                        : "bg-theme-livid hover:bg-theme-livid/90 text-white"
                )}
                disabled={!canProceed()}
                onClick={step === 7 ? handleSubmit : handleNext}
            >
                {step === 7 ? "제출하고 결과 보기" : "다음"}
                {step !== 7 && <ChevronRight className="ml-2 w-5 h-5" />}
            </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default UserInfo;