import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"; // 알림창 컴포넌트 추가
import { Home, User, LogOut, Heart, Search } from "lucide-react";
import api from "@/api/axios";

// 가짜 정책 데이터 (Mock Data)
// const MOCK_POLICIES = await api.get("/policies", {});
  // { id: 1, title: "신생아 특례 디딤돌 대출", desc: "최저 1%대 금리로 주택 구입 자금 대출", region: "전국", type: "대출", isFavorite: true },
  // { id: 2, title: "부산 청년 임차보증금 지원", desc: "부산 거주 청년에게 전세 보증금 이자 지원", region: "부산", type: "주거", isFavorite: false },
  // { id: 3, title: "중소기업 취업청년 전월세", desc: "중소기업 재직 청년 대상 저리 대출", region: "전국", type: "대출", isFavorite: true },
  // { id: 4, title: "서울 역세권 청년주택", desc: "대중교통이 편리한 곳에 시세보다 저렴하게 공급", region: "서울", type: "주거", isFavorite: false },

const MainPage = () => {
  const navigate = useNavigate();
  
  // 사용자 정보 상태
  const [userInfo, setUserInfo] = useState({
    nickname: "",
    has_info: false, // ★ 테스트할 때 이걸 true/false로 바꿔가며 확인해보세요!
    favorite_policies: []
  });

  const [activeTab, setActiveTab] = useState("all");

  // 정책 데이터
  const [allPolicies, setAllPolicies] = useState([]);
  const [filteredPolicies, setFilteredPolicies] = useState([]);
  
  // 지역 및 아파트 데이터
  const [allSido, setAllSido] = useState([]);
  const [allSigungu, setAllSigungu] = useState([]);
  const [selectedSido, setSelectedSido] = useState("");
  const [selectedSigungu, setSelectedSigungu] = useState("");

  // 아파트 검색 관련 상태들
  const [aptSearchTerm, setAptSearchTerm] = useState(""); // 검색어 입력값
  const [rawApartmentList, setRawApartmentList] = useState([]); // 해당 지역 전체 아파트 목록 (API에서 가져옴)
  const [aptSuggestions, setAptSuggestions] = useState([]); // 검색어에 맞춰 필터링된 목록
  const [isAptListOpen, setIsAptListOpen] = useState(false); // 리스트 보여줄지 여부
  const [focusIndex, setFocusIndex] = useState(-1); // 키보드 선택용 인덱스 (-1은 선택 안됨)

  // 로딩 변수
  const [loading, setLoading] = useState(true);
  
  // 알림창 열림/닫힘 상태 관리
  const [isAlertOpen, setIsAlertOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [userInfoRes, allPolicyRes, allSidoRes, favoritePoliciesRes] = await Promise.all([
          api.get("/user/me"),
          api.get("/policies"),
          api.get("/regions/sido"),
          api.get("/favorites/me")
        ]);

        const myFavoriteIds = favoritePoliciesRes.data || [];
        
        const processedAllPolicies = allPolicyRes.data.map((item) => ({
          ...item,
          isFavorite: myFavoriteIds.includes(item.policy_id)
        }));
  
        setAllPolicies(processedAllPolicies);
        setUserInfo({
          nickname: userInfoRes.data.nickname,
          has_info: userInfoRes.data.has_info,
          favorite_policies: myFavoriteIds
        });
        setAllSido(allSidoRes.data);

        // has_info가 true일 때만 맞춤 정책을 탐색하는 api를 호출할 수 있음.
        if (userInfoRes.data.has_info === true) {
          const allUserRes = await api.get("/policies/recommended");

          const processedFilteredPolicies = allUserRes.data.policies.map((item) => ({
            ...item,
            isFavorite: myFavoriteIds.includes(item.policy_id)
          }));

          setFilteredPolicies(processedFilteredPolicies);
        }
  
  
      } catch (error) {
        console.error("데이터 로딩 실패: ", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    const fetchApartments = async () => {
      if (selectedSido && selectedSigungu) {
        try {
          // ★ try 시작: 에러가 날 수 있는 위험한 코드
          const response = await api.get("/regions/apart", {
            params: {
              sido_name: selectedSido,
              sigungu_name: selectedSigungu 
            }
          });

          // ★ [중요 수정] response 통째로 넣으면 안 되고, .data를 꺼내야 합니다!
          // 백엔드가 리스트([..])를 보냈다면 response.data가 그 리스트입니다.
          setRawApartmentList(response.data); 
          
        } catch (error) {
          // ★ catch: 에러 발생 시 실행됨
          console.error("아파트 목록 불러오기 실패:", error);
          setRawApartmentList([]); // 에러나면 빈 목록으로 초기화 (안전장치)
        }
      } else {
        setRawApartmentList([]);
      }
      // 지역이 바뀌면 검색어 초기화
      // setAptSearchTerm("");
      setAptSuggestions([]);
      setIsAptListOpen(false);
    };

    fetchApartments();
  }, [selectedSido, selectedSigungu]); // 시/도, 시/군/구가 바뀔 때마다 실행

  // 아파트 검색어 입력 핸들러
  const handleAptSearchChange = (e) => {
    const value = e.target.value;
    setAptSearchTerm(value);
    setFocusIndex(-1); // 키보드 포커스 초기화

    if (value.trim().length > 0) {
      // 입력된 글자가 포함된 아파트만 필터링 (영어 대소문자 무시 등 로직 추가 가능)
      const filtered = rawApartmentList.filter((apt) => 
        apt.includes(value)
      );
      setAptSuggestions(filtered);
      setIsAptListOpen(true);
    } else {
      setAptSuggestions([]);
      setIsAptListOpen(false);
    }
  };

  // 아파트 선택 핸들러 (마우스 클릭 or 엔터)
  const handleSelectApartment = (aptName) => {
    setAptSearchTerm(aptName);
    setIsAptListOpen(false);
    setFocusIndex(-1);
    // 여기서 나중에 최종 검색 API 호출 등을 하면 됩니다.
    console.log("선택된 아파트:", aptName);
  };

  // 키보드 이벤트 핸들러 (화살표 위/아래, 엔터)
  const handleKeyDown = (e) => {
    if (!isAptListOpen || aptSuggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault(); // 커서 이동 방지
      setFocusIndex((prev) => (prev < aptSuggestions.length - 1 ? prev + 1 : prev));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusIndex((prev) => (prev > 0 ? prev - 1 : prev));
    } else if (e.key === "Enter") {
      if (focusIndex >= 0) {
        e.preventDefault();
        handleSelectApartment(aptSuggestions[focusIndex]);
      }
    } else if (e.key === "Escape") {
      setIsAptListOpen(false);
    }
  };

  
  // [수정된 로직] 정보 수정 버튼 클릭 핸들러
  const handleEditInfoClick = () => {
    if (userInfo.has_info) {
      // 정보가 있으면 -> 마이페이지(수정)로 이동
      navigate("/mypage");
    } else {
      // 정보가 없으면 -> 알림창 띄우기
      setIsAlertOpen(true);
    }
  };
  
  const handleLogout = async () => {
    const response = await api.post("/logout", {});
    
    alert(response.data.message);
    navigate("/"); 
  };

  const handleToggleFavorite = async (policyId) => {
    // 1. 전체 정책 목록에서 찾아서 뒤집기
    setAllPolicies((prev) => 
      prev.map((policy) => 
        policy.policy_id === policyId 
          ? { ...policy, isFavorite: !policy.isFavorite } // 타겟 발견! 뒤집어!
          : policy // 아니면 그대로 둬
      )
    );

    // 2. 맞춤 정책 목록에서도 찾아서 뒤집기 (동기화)
    setFilteredPolicies((prev) => 
      prev.map((policy) => 
        policy.policy_id === policyId 
          ? { ...policy, isFavorite: !policy.isFavorite } 
          : policy
      )
    );

    // 3. DB에 반영하기
    await api.post(`/favorites/${policyId}`)
  };

  // [API 호출 함수] 시/도 이름을 주면 시/군/구 리스트를 반환
  const fetchSigunguList = async (sido) => {
    try {
      // GET 요청은 데이터를 params에 넣어서 보냅니다.
      // 예: /regions/sigungu?sido=서울특별시
      const response = await api.get(`/regions/sigungu/${sido}`);
      return response.data; // ["강남구", "서초구", ...]
    } catch (error) {
      console.error("시군구 불러오기 실패:", error);
      return [];
    }
  };

  // [이벤트 핸들러] 시/도 선택 상자가 바뀌었을 때 실행!
  const handleSidoChange = async (newSido) => {
    // 1. 선택된 시/도 업데이트
    setSelectedSido(newSido);
    
    // 2. 시/군/구 선택 초기화 (시/도가 바뀌었으니 기존 구 선택은 의미 없음)
    setSelectedSigungu("");
    setAllSigungu([]); // 일단 비워두기 (로딩 느낌)

    // setAptSearchTerm(""); // 시도가 바뀌면 아파트 검색어도 초기화

    // 3. API 호출해서 리스트 받아오기
    const newList = await fetchSigunguList(newSido);
    
    // 4. 받아온 리스트 저장 -> 화면이 자동으로 바뀜
    setAllSigungu(newList);
  };

  const filterByApart = async () => {
    // 1. 유효성 검사: 선택된 값이 없으면 실행 안 함
    if (!selectedSido || !selectedSigungu || !aptSearchTerm) {
      alert("지역과 아파트 이름을 모두 선택해주세요.");
      return;
    }

    try {
      setLoading(true); // 로딩 시작 (선택 사항)

      // 2. API 호출하여 아파트 상세 정보 가져오기
      // GET 방식 권장: await api.get("/policies/recommended/detail", { params: { sido: selectedSido, sigungu: selectedSigungu, apt: aptSearchTerm } });
      const response = await api.get("/policies/recommended/detail", {
        params: {
          sido_name: selectedSido,
          sigungu_name: selectedSigungu,
          apart_name: aptSearchTerm
        }
      });

      // 백엔드에서 받아온 아파트 데이터 아파트의 가격을 가져 옴. (단위: 원)
      const aptData = response.data;
      
      console.log("선택된 아파트 정보:", aptData);

      // 3. 정책 필터링 로직 함수
      // 정책이 활성화(Active) 상태여야 하는 조건을 정의합니다.
      const checkIsActive = (policy) => {
        // 조건 1: 지역 확인 (정책 지역이 '전국'이거나 아파트 지역과 같아야 함)
        const isRegionMatch = policy.region === "전국" || policy.region.includes(selectedSido);
        
        // 조건 2: 가격 확인 (정책에 가격 제한이 있다면 아파트 가격이 그보다 낮아야 함)
        // policy.limit_price가 없으면(null/undefined) 가격 제한 없는 정책으로 간주
        const isPriceMatch = !policy.max_house_price || aptData <= policy.max_house_price;

        return isRegionMatch && isPriceMatch;
      };

      // 4. 전체 정책 리스트 업데이트 (기존 데이터 유지 + isDisabled 속성 추가)
      setAllPolicies((prevPolicies) => 
        prevPolicies.map((policy) => ({
          ...policy,
          // 조건에 맞지 않으면(false) isDisabled를 true로 설정
          isDisabled: !checkIsActive(policy) 
        }))
      );

      // 5. 맞춤 정책 리스트 업데이트 (동일 로직)
      setFilteredPolicies((prevPolicies) => 
        prevPolicies.map((policy) => ({
          ...policy,
          isDisabled: !checkIsActive(policy)
        }))
      );

    } catch (error) {
      console.error("아파트 정보 조회 실패:", error);
      alert("아파트 정보를 불러오는데 실패했습니다.");
    } finally {
      setLoading(false); // 로딩 끝
    }
  };
  
  if (loading) {
    return <div className="flex justify-center items-center h-screen">로딩 중...</div>;
  }

  return (
    <div className="min-h-screen w-full bg-theme-bonjour font-sans flex flex-col">
      
      {/* 1. 상단 헤더 (GNB) */}
      <header className="bg-white/80 backdrop-blur-md border-b border-theme-venus/20 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
            <div className="p-2 rounded-full bg-theme-bonjour">
              <Home className="w-5 h-5 text-theme-livid" />
            </div>
            <span className="text-xl font-bold text-theme-livid">Logo</span>
          </div>

          <div className="flex items-center gap-3">
            {/* 버튼 클릭 시 handleEditInfoClick 실행 */}
            <Button variant="ghost" size="sm" onClick={handleEditInfoClick} className="text-theme-venus hover:text-theme-livid">
              <User className="w-4 h-4 mr-2" />
              정보 수정
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-theme-venus hover:text-red-500">
              <LogOut className="w-4 h-4 mr-2" />
              로그아웃
            </Button>
          </div>
        </div>
      </header>

      {/* 2. 메인 컨텐츠 영역 */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-8">
        
        <div className="mb-8 space-y-6">
          <h1 className="text-3xl font-bold text-theme-black">
            <span className="text-theme-livid">{userInfo.nickname}</span>님을 위한 정책을 찾아볼까요?
          </h1>

          {/* 아파트 검색 필터 */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-theme-venus/20 space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              <Select value={selectedSido} onValueChange={handleSidoChange}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="시/도 선택" />
                </SelectTrigger>
                <SelectContent>
                  {allSido.map((sido) => (
                    <SelectItem value={sido}>
                      {sido}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedSigungu} onValueChange={setSelectedSigungu}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="시/군/구 선택" />
                </SelectTrigger>
                <SelectContent>
                  {/* 리스트가 비어있으면(길이가 0이면) 안내 문구 표시 */}
                  {allSigungu.length === 0 ? (
                      <div className="p-3 text-sm text-center text-theme-venus">
                          시/도를 먼저 선택해주세요 👆
                      </div>
                  ) : (
                      // 리스트가 있으면 map으로 뿌려주기
                      allSigungu.map((sigungu) => (
                          <SelectItem value={sigungu}>
                              {sigungu}
                          </SelectItem>
                      ))
                  )}
                </SelectContent>
              </Select>

              <div className="flex-1 flex gap-2 relative"> 
                {/* relative 클래스가 중요합니다! 드롭다운의 기준점이 됩니다. */}
                
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-venus w-4 h-4" />
                  <Input 
                    placeholder="아파트 이름 검색 (예: 래미안)" 
                    className="pl-10"
                    value={aptSearchTerm}
                    onChange={handleAptSearchChange}
                    onKeyDown={handleKeyDown}
                    onFocus={() => {
                        // 다시 포커스 잡았을 때 검색어가 있으면 리스트 다시 보여주기
                        if(aptSearchTerm && aptSuggestions.length > 0) setIsAptListOpen(true);
                    }}
                    onBlur={() => {
                        // 바로 닫으면 클릭 이벤트가 씹힐 수 있어서 살짝 지연 (선택적)
                        setTimeout(() => setIsAptListOpen(false), 200);
                    }}
                    // disabled={!selectedSigungu} // 시군구 선택 전엔 입력 불가하게 막기
                  />

                  {/* ★ 자동완성 리스트 (Dropdown) */}
                  {isAptListOpen && aptSuggestions.length > 0 && (
                    <ul className="absolute z-50 w-full mt-1 bg-white border border-theme-venus/20 rounded-md shadow-lg max-h-60 overflow-y-auto">
                      {aptSuggestions.map((apt, index) => (
                        <li 
                          key={index}
                          className={`px-4 py-2 cursor-pointer text-sm transition-colors
                            ${index === focusIndex ? "bg-theme-bonjour text-theme-livid" : "text-theme-black hover:bg-gray-50"}
                          `}
                          // 마우스 클릭 시 선택 (onMouseDown을 써야 onBlur보다 먼저 실행됨)
                          onMouseDown={() => handleSelectApartment(apt)} 
                          // 마우스 올리면 포커스 인덱스도 같이 이동
                          onMouseEnter={() => setFocusIndex(index)}
                        >
                          {/* 검색어 부분 하이라이트 처리 (선택사항) */}
                          {apt.split(aptSearchTerm).map((part, i) => 
                            i === 0 ? part : <><span className="text-theme-pink font-bold">{aptSearchTerm}</span>{part}</>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                  {/* 검색 결과 없음 표시 */}
                  {isAptListOpen && aptSuggestions.length === 0 && aptSearchTerm && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-theme-venus/20 rounded-md shadow-lg p-3 text-center text-sm text-theme-venus">
                          검색 결과가 없습니다.
                      </div>
                  )}
                </div>

                <Button className="bg-theme-livid hover:bg-theme-livid/90" onClick={filterByApart}>
                  검색
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* 탭 영역 */}
        <Tabs defaultValue="all" className="w-full" onValueChange={setActiveTab}>
          <TabsList className="grid w-full md:w-[400px] grid-cols-3 bg-theme-venus/10 p-1 rounded-xl mb-6">
            <TabsTrigger value="all" className="data-[state=active]:bg-white data-[state=active]:text-theme-livid data-[state=active]:shadow-sm rounded-lg">전체</TabsTrigger>
            <TabsTrigger value="custom" className="data-[state=active]:bg-white data-[state=active]:text-theme-pink data-[state=active]:shadow-sm rounded-lg">맞춤 정책</TabsTrigger>
            <TabsTrigger value="favorites" className="data-[state=active]:bg-white data-[state=active]:text-theme-livid data-[state=active]:shadow-sm rounded-lg">즐겨찾기</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {allPolicies.map((policy) => (
                <PolicyCard key={policy.policy_id} policy={policy} onToggle={handleToggleFavorite} isDisabled={policy.isDisabled}/>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="custom" className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
            {userInfo.has_info ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {filteredPolicies.map((policy) => (
                    <PolicyCard key={policy.policy_id} policy={policy} badge="추천" onToggle={handleToggleFavorite} isDisabled={policy.isDisabled}/>
                  ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-dashed border-theme-venus">
                <div className="p-4 bg-theme-bonjour rounded-full mb-4">
                  <User className="w-10 h-10 text-theme-venus" />
                </div>
                <h3 className="text-xl font-bold text-theme-black mb-2">나에게 딱 맞는 정책을 찾고 싶다면?</h3>
                <p className="text-theme-venus mb-6">간단한 정보를 입력하고 맞춤 추천을 받아보세요.</p>
                <Button onClick={() => navigate("/user-info")} className="bg-theme-pink hover:bg-theme-pink/90 text-white px-8">
                  내 정보 입력하러 가기
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="favorites" className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {allPolicies.filter(p => p.isFavorite).map((policy) => (
                <PolicyCard key={policy.policy_id} policy={policy} onToggle={handleToggleFavorite} isDisabled={policy.isDisabled}/>
              ))}
            </div>
            {allPolicies.filter(p => p.isFavorite).length === 0 && (
              <div className="text-center py-20 text-theme-venus">
                아직 즐겨찾기한 정책이 없어요. <Heart className="inline w-4 h-4"/>를 눌러보세요!
              </div>
            )}
          </TabsContent>
        </Tabs>

      </main>

      {/* [추가됨] 알림창 컴포넌트 (Alert Dialog) */}
      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-theme-black">알림</AlertDialogTitle>
            <AlertDialogDescription className="text-theme-venus text-base">
              등록된 정보가 없습니다.<br/>
              정보를 입력하시겠습니까?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            {/* 아니요: 단순히 창을 닫음 */}
            <AlertDialogCancel className="border-theme-venus/30 text-theme-venus hover:text-theme-black hover:bg-theme-bonjour">
              아니요
            </AlertDialogCancel>
            {/* 예: User Info 페이지로 이동 */}
            <AlertDialogAction 
              onClick={() => navigate("/user-info")}
              className="bg-theme-livid hover:bg-theme-livid/90 text-white"
            >
              예
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
};

const PolicyCard = ({ policy, badge, onToggle, isDisabled }) => {
  return (
    <Card className={`hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-theme-venus/30 group
    ${isDisabled 
          ? "opacity-50 grayscale bg-gray-100 pointer-events-none" // 🔴 비활성 상태 스타일
          : "hover:shadow-lg hover:-translate-y-1" // 🟢 활성 상태일 때만 호버 효과 적용
        }`}>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <Badge variant="secondary" className="bg-theme-bonjour text-theme-livid hover:bg-theme-bonjour">
            {policy.region} · {policy.policy_type}
          </Badge>
          <button className="text-theme-venus hover:text-theme-pink transition-colors"
            onClick={(e) => {
              e.stopPropagation(); // 카드 클릭 이벤트와 겹치지 않게 방지
              onToggle(policy.policy_id);
            }}
          >
            
            <Heart className={`w-5 h-5 ${policy.isFavorite ? "fill-theme-pink text-theme-pink" : ""}`} />
          </button>
        </div>
        <CardTitle className="text-lg mt-3 text-theme-black group-hover:text-theme-livid transition-colors">
            {policy.policy_name}
        </CardTitle>
        {badge && <Badge className="mt-1 w-fit bg-theme-pink hover:bg-theme-pink">{badge}</Badge>}
      </CardHeader>
      <CardContent>
        <CardDescription className="line-clamp-2 h-10">
          {policy.desc}
        </CardDescription>
      </CardContent>
      <CardFooter>
        <Button variant="outline" className="w-full border-theme-venus/30 hover:bg-theme-bonjour hover:text-theme-livid">
          자세히 보기
        </Button>
      </CardFooter>
    </Card>
  );
};

export default MainPage;