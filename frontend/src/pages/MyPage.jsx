import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator"; // 구분선 (없으면 설치 필요하지만, border로 대체 가능)
import { Save, User, ArrowLeft, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import api from "@/api/axios";

const MyPage = () => {
  const navigate = useNavigate();

  // [상태 관리] 초기값은 DB에서 가져왔다고 가정 (Mock Data)
  const [formData, setFormData] = useState({
    name: "김정태", // 이름 추가
    birthYear: "1998", birthMonth: "5", birthDay: "20",
    income: "3500",
    assets: "12000",
    hasHouse: false,
    isMarried: true,
    isNewlywed: true,
    hasNewborn: true,
    childCount: "1",
    householdCount: "3",
    isDualIncome: false,
    etc: ["다문화가정"],
  });

  // 데이터 생성용 배열
  const years = Array.from({ length: 100 }, (_, i) => new Date().getFullYear() - i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const days = Array.from({ length: 31 }, (_, i) => i + 1);
  const etcOptions = ["한부모가정", "다문화가정", "장애인가구", "해당없음"];

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const formDataRes = await api.get("/user/info/me")

        setFormData(formDataRes.data);

      } catch (error) {
        console.error("데이터 로딩 실패: ", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleEtcToggle = (option) => {
    setFormData((prev) => {
      const current = prev.etc;
      if (current.includes(option)) {
        return { ...prev, etc: current.filter((item) => item !== option) };
      } else {
        return { ...prev, etc: [...current, option] };
      }
    });
  };

  const handleSave = async () => {
    // TODO: 백엔드 수정 API 호출 (PUT /api/user/info)
    const birthDate = `${formData.birthYear}-${String(formData.birthMonth).padStart(2, '0')}-${String(formData.birthDay).padStart(2, '0')}`;
    await api.put("/user/info/me", {
      birth_date: birthDate,
      income: formData.income,
      asset: formData.assets,
      is_house_owner: formData.hasHouse,
      is_married: formData.isMarried,
      is_newlywed: formData.isNewlywed,
      has_newborn: formData.hasNewborn,
      child_count: formData.childCount,
      household_size: formData.householdCount,
      dual_income: formData.isDualIncome,
      etc: formData.etc
    })

    console.log("수정된 데이터 저장:", formData);
    
    alert("회원 정보가 성공적으로 수정되었습니다.");
    navigate("/main");
  };

  // 공통 스타일: 섹션 제목
  const SectionTitle = ({ children }) => (
    <h3 className="text-lg font-bold text-theme-livid mb-4 flex items-center gap-2 mt-6 first:mt-0">
      {children}
    </h3>
  );

  // 공통 컴포넌트: 예/아니오 버튼 그룹
  const YesNoButtons = ({ label, field }) => (
    <div className="flex flex-col gap-2">
      <Label className="text-theme-black font-medium">{label}</Label>
      <div className="flex gap-2">
        <Button 
            variant={formData[field] === true ? "default" : "outline"} 
            className={cn("flex-1", formData[field] === true && "bg-theme-livid hover:bg-theme-livid/90")}
            onClick={() => handleChange(field, true)}
        >
            예
        </Button>
        <Button 
            variant={formData[field] === false ? "default" : "outline"}
            className={cn("flex-1", formData[field] === false && "bg-theme-livid hover:bg-theme-livid/90")}
            onClick={() => handleChange(field, false)}
        >
            아니요
        </Button>
      </div>
    </div>
  );

  if (loading) {
    return <div className="flex justify-center items-center h-screen">로딩 중...</div>;
  }

  return (
    <div className="min-h-screen w-full bg-theme-bonjour flex justify-center py-10 px-4 font-sans">
      <Card className="w-full max-w-4xl shadow-xl border-theme-venus/20 bg-white/95 backdrop-blur">
        
        {/* 헤더 */}
        <CardHeader className="border-b border-theme-venus/10 pb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/main")} className="text-theme-venus hover:text-theme-livid">
                <ArrowLeft className="w-6 h-6" />
            </Button>
            <div>
                <CardTitle className="text-2xl font-bold text-theme-black">내 정보 수정</CardTitle>
                <CardDescription className="text-theme-venus">등록된 정보를 확인하고 수정할 수 있습니다.</CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-8">
            {/* 1. 기본 정보 섹션 */}
            <SectionTitle><User className="w-5 h-5"/> 기본 정보</SectionTitle>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="space-y-2">
                    <Label>이름</Label>
                    <Input value={formData.name} readOnly className="bg-theme-bonjour/50 text-theme-venus cursor-not-allowed" />
                </div>
                <div className="space-y-2">
                    <Label>생년월일</Label>
                    <div className="flex gap-2">
                        <Select onValueChange={(v) => handleChange("birthYear", v)} value={formData.birthYear}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent className="max-h-[200px]">{years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
                        </Select>
                        <Select onValueChange={(v) => handleChange("birthMonth", v)} value={formData.birthMonth}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent className="max-h-[200px]">{months.map(m => <SelectItem key={m} value={String(m)}>{m}</SelectItem>)}</SelectContent>
                        </Select>
                        <Select onValueChange={(v) => handleChange("birthDay", v)} value={formData.birthDay}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent className="max-h-[200px]">{days.map(d => <SelectItem key={d} value={String(d)}>{d}</SelectItem>)}</SelectContent>
                        </Select>
                    </div>
                </div>
                <div className="space-y-2">
                    <Label>연 소득 (만원)</Label>
                    <Input type="number" value={formData.income} onChange={(e) => handleChange("income", e.target.value)} />
                </div>
                <div className="space-y-2">
                    <Label>총 자산 (만원)</Label>
                    <Input type="number" value={formData.assets} onChange={(e) => handleChange("assets", e.target.value)} />
                </div>
            </div>

            <div className="h-[1px] bg-theme-venus/20 my-6" />

            {/* 2. 가구 및 주거 정보 */}
            <SectionTitle>🏡 가구 및 주거 정보</SectionTitle>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 mb-8">
                <YesNoButtons label="주택 소유 여부" field="hasHouse" />
                <YesNoButtons label="결혼 여부" field="isMarried" />
                
                {/* 기혼일 때만 활성화되는 필드들 */}
                {formData.isMarried && (
                    <div className="contents md:contents bg-theme-bonjour/30 p-4 rounded-xl">
                        <YesNoButtons label="신혼부부 (7년 이내)" field="isNewlywed" />
                        <YesNoButtons label="신생아 (2세 이하)" field="hasNewborn" />
                        <YesNoButtons label="맞벌이 여부" field="isDualIncome" />
                        
                        <div className="space-y-2">
                            <Label>자녀 수 (명)</Label>
                            <Input type="number" value={formData.childCount} onChange={(e) => handleChange("childCount", e.target.value)} />
                        </div>
                    </div>
                )}
                
                <div className="space-y-2">
                    <Label>총 가구원 수 (본인 포함)</Label>
                     <Select onValueChange={(v) => handleChange("householdCount", v)} value={formData.householdCount}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            {[1,2,3,4,5,6,7].map(n => <SelectItem key={n} value={String(n)}>{n}명</SelectItem>)}
                            <SelectItem value="8">8명 이상</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="h-[1px] bg-theme-venus/20 my-6" />

            {/* 3. 기타 정보 */}
            <SectionTitle>✨ 기타 특이사항</SectionTitle>
            <div className="flex flex-wrap gap-3">
                {etcOptions.map((option) => (
                    <div 
                        key={option}
                        onClick={() => handleEtcToggle(option)}
                        className={cn(
                            "cursor-pointer rounded-full border px-4 py-2 text-sm font-bold transition-all flex items-center gap-2",
                            formData.etc.includes(option) 
                                ? "border-theme-pink bg-theme-pink text-white shadow-md shadow-theme-pink/30" 
                                : "border-theme-venus/30 text-theme-venus bg-white hover:border-theme-venus"
                        )}
                    >
                        {formData.etc.includes(option) && <Check className="w-3 h-3" />}
                        {option}
                    </div>
                ))}
            </div>

        </CardContent>

        <CardFooter className="p-6 border-t border-theme-venus/10 bg-theme-bonjour/20 flex justify-end gap-4">
            <Button variant="outline" onClick={() => navigate("/main")} className="h-12 px-6 border-theme-venus/30 text-theme-venus hover:text-theme-black">
                취소
            </Button>
            <Button onClick={handleSave} className="h-12 px-8 bg-theme-livid hover:bg-theme-livid/90 text-white shadow-lg text-lg font-bold">
                <Save className="w-5 h-5 mr-2" />
                변경사항 저장
            </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default MyPage;