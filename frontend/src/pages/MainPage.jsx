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
} from "@/components/ui/alert-dialog";
// [추가] 화살표 아이콘 추가 (ChevronLeft, ChevronRight)
import { Home, User, LogOut, Heart, Search, ChevronLeft, ChevronRight } from "lucide-react";
import api from "@/api/axios";
import logoImg from "@/assets/logo.png";

// ★ 한 페이지에 보여줄 아이템 개수 상수 선언
const ITEMS_PER_PAGE = 6;

const MainPage = () => {
  const navigate = useNavigate();
  
  // 사용자 정보 상태
  const [userInfo, setUserInfo] = useState({
    nickname: "",
    has_info: false,
    favorite_policies: []
  });

  const [activeTab, setActiveTab] = useState("all");

  // 정책 데이터
  const [allPolicies, setAllPolicies] = useState([]);
  const [filteredPolicies, setFilteredPolicies] = useState([]);
  
  // ★ [추가] 탭별 페이지 상태 관리
  const [pageAll, setPageAll] = useState(1);       // 전체 탭 페이지
  const [pageCustom, setPageCustom] = useState(1); // 맞춤 탭 페이지
  const [pageFav, setPageFav] = useState(1);       // 즐겨찾기 탭 페이지

  // 지역 및 아파트 데이터
  const [allSido, setAllSido] = useState([]);
  const [allSigungu, setAllSigungu] = useState([]);
  const [selectedSido, setSelectedSido] = useState("");
  const [selectedSigungu, setSelectedSigungu] = useState("");

  // 아파트 검색 관련 상태들
  const [aptSearchTerm, setAptSearchTerm] = useState(""); 
  const [rawApartmentList, setRawApartmentList] = useState([]); 
  const [aptSuggestions, setAptSuggestions] = useState([]); 
  const [isAptListOpen, setIsAptListOpen] = useState(false); 
  const [focusIndex, setFocusIndex] = useState(-1); 

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
          const response = await api.get("/regions/apart", {
            params: {
              sido_name: selectedSido,
              sigungu_name: selectedSigungu 
            }
          });
          setRawApartmentList(response.data); 
        } catch (error) {
          console.error("아파트 목록 불러오기 실패:", error);
          setRawApartmentList([]); 
        }
      } else {
        setRawApartmentList([]);
      }
      setAptSuggestions([]);
      setIsAptListOpen(false);
    };

    fetchApartments();
  }, [selectedSido, selectedSigungu]);

  const handleAptSearchChange = (e) => {
    const value = e.target.value;
    setAptSearchTerm(value);
    setFocusIndex(-1); 

    if (value.trim().length > 0) {
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

  const handleSelectApartment = (aptName) => {
    setAptSearchTerm(aptName);
    setIsAptListOpen(false);
    setFocusIndex(-1);
  };

  const handleKeyDown = (e) => {
    if (!isAptListOpen || aptSuggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault(); 
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

  const handleEditInfoClick = () => {
    if (userInfo.has_info) {
      navigate("/mypage");
    } else {
      setIsAlertOpen(true);
    }
  };
  
  const handleLogout = async () => {
    const response = await api.post("/logout", {});
    alert(response.data.message);
    navigate("/"); 
  };

  const handleToggleFavorite = async (policyId) => {
    setAllPolicies((prev) => 
      prev.map((policy) => 
        policy.policy_id === policyId 
          ? { ...policy, isFavorite: !policy.isFavorite } 
          : policy 
      )
    );

    setFilteredPolicies((prev) => 
      prev.map((policy) => 
        policy.policy_id === policyId 
          ? { ...policy, isFavorite: !policy.isFavorite } 
          : policy
      )
    );

    await api.post(`/favorites/${policyId}`)
  };

  const fetchSigunguList = async (sido) => {
    try {
      const response = await api.get(`/regions/sigungu/${sido}`);
      return response.data; 
    } catch (error) {
      console.error("시군구 불러오기 실패:", error);
      return [];
    }
  };

  const handleSidoChange = async (newSido) => {
    setSelectedSido(newSido);
    setSelectedSigungu("");
    setAllSigungu([]); 
    const newList = await fetchSigunguList(newSido);
    setAllSigungu(newList);
  };

  const filterByApart = async () => {
    if (!selectedSido || !selectedSigungu || !aptSearchTerm) {
      alert("지역과 아파트 이름을 모두 선택해주세요.");
      return;
    }

    try {
      setLoading(true); 

      const response = await api.get("/policies/recommended/detail", {
        params: {
          sido_name: selectedSido,
          sigungu_name: selectedSigungu,
          apart_name: aptSearchTerm
        }
      });

      const aptData = response.data;
      
      const checkIsActive = (policy) => {
        const isRegionMatch = policy.region === "전국" || policy.region.includes(selectedSido);
        const isPriceMatch = !policy.max_house_price || aptData <= policy.max_house_price;
        return isRegionMatch && isPriceMatch;
      };

      setAllPolicies((prevPolicies) => 
        prevPolicies.map((policy) => ({
          ...policy,
          isDisabled: !checkIsActive(policy) 
        }))
      );

      setFilteredPolicies((prevPolicies) => 
        prevPolicies.map((policy) => ({
          ...policy,
          isDisabled: !checkIsActive(policy)
        }))
      );

      // ★ [추가] 검색 필터 적용 시 페이지를 1페이지로 초기화
      setPageAll(1);
      setPageCustom(1);
      setPageFav(1);

    } catch (error) {
      console.error("아파트 정보 조회 실패:", error);
      alert("아파트 정보를 불러오는데 실패했습니다.");
    } finally {
      setLoading(false); 
    }
  };
  
  if (loading) {
    return <div className="flex justify-center items-center h-screen">로딩 중...</div>;
  }

  // ★ [추가] 페이지네이션 데이터 계산 함수
  // 전체 데이터 리스트와 현재 페이지 번호를 받아서, 해당 페이지에 보여줄 데이터만 잘라서 반환
  const getPagedData = (data, currentPage) => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return data.slice(startIndex, endIndex);
  };

  // 즐겨찾기 목록 필터링 (렌더링 시에만 필터링하여 페이지네이션 적용)
  const favoritePolicies = allPolicies.filter(p => p.isFavorite);

  return (
    <div className="min-h-screen w-full bg-theme-bonjour font-sans flex flex-col">
      
      {/* 헤더 */}
      <header className="bg-white/80 backdrop-blur-md border-b border-theme-venus/20 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
            <div className="p-2 rounded-full bg-theme-bonjour">
              <img src={logoImg} alt="집살때 로고" className="h-10 w-auto object-contain" />
            </div>  
            <span className="text-xl font-bold text-theme-livid">Logo</span>
          </div> */}
          {/* ▼▼▼ [수정됨] 로고 영역 ▼▼▼ */}
          <div className="flex items-center cursor-pointer" onClick={() => navigate("/")}>
            {/* 1. 감싸고 있던 div(배경색, 패딩)를 제거했습니다. */}
            {/* 2. 이미지 높이를 h-10에서 h-16(헤더 높이랑 맞춤)으로 키웠습니다. */}
            {/* 3. 옆에 있던 불필요한 'Logo' 텍스트 span을 제거했습니다. */}
            <img 
              src={logoImg} 
              alt="집살때 로고" 
              className="h-9 w-auto object-contain" // h-16 (약 64px)으로 키움
            />
          </div>
          {/* ▲▲▲ [수정됨] 로고 영역 ▲▲▲ */}

          <div className="flex items-center gap-3">
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

      {/* 메인 컨텐츠 */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-8">
        
        <div className="mb-8 space-y-6">
          <h1 className="text-3xl font-bold text-theme-black">
            <span className="text-theme-livid">{userInfo.nickname}</span>님을 위한 정책을 찾아볼까요?
          </h1>

          {/* 아파트 검색 필터 (생략 - 기존 코드와 동일) */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-theme-venus/20 space-y-4">
             {/* ... 기존 Select 및 Search Input 영역 ... */}
             <div className="flex flex-col md:flex-row gap-4">
              <Select value={selectedSido} onValueChange={handleSidoChange}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="시/도 선택" />
                </SelectTrigger>
                <SelectContent>
                  {allSido.map((sido) => (
                    <SelectItem value={sido} key={sido}>
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
                  {allSigungu.length === 0 ? (
                      <div className="p-3 text-sm text-center text-theme-venus">
                          시/도를 먼저 선택해주세요 👆
                      </div>
                  ) : (
                      allSigungu.map((sigungu) => (
                          <SelectItem value={sigungu} key={sigungu}>
                              {sigungu}
                          </SelectItem>
                      ))
                  )}
                </SelectContent>
              </Select>

              <div className="flex-1 flex gap-2 relative"> 
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-venus w-4 h-4" />
                  <Input 
                    placeholder="아파트 이름 검색 (예: 래미안)" 
                    className="pl-10"
                    value={aptSearchTerm}
                    onChange={handleAptSearchChange}
                    onKeyDown={handleKeyDown}
                    onFocus={() => {
                        if(aptSearchTerm && aptSuggestions.length > 0) setIsAptListOpen(true);
                    }}
                    onBlur={() => {
                        setTimeout(() => setIsAptListOpen(false), 200);
                    }}
                  />

                  {isAptListOpen && aptSuggestions.length > 0 && (
                    <ul className="absolute z-50 w-full mt-1 bg-white border border-theme-venus/20 rounded-md shadow-lg max-h-60 overflow-y-auto">
                      {aptSuggestions.map((apt, index) => (
                        <li 
                          key={index}
                          className={`px-4 py-2 cursor-pointer text-sm transition-colors
                            ${index === focusIndex ? "bg-theme-bonjour text-theme-livid" : "text-theme-black hover:bg-gray-50"}
                          `}
                          onMouseDown={() => handleSelectApartment(apt)} 
                          onMouseEnter={() => setFocusIndex(index)}
                        >
                          {apt.split(aptSearchTerm).map((part, i) => 
                            i === 0 ? part : <span key={i}><span className="text-theme-pink font-bold">{aptSearchTerm}</span>{part}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
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

          {/* 1. 전체 탭 */}
          <TabsContent value="all" className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
            {/* ★ [수정] min-h-[550px] 추가: 카드가 적어도 2줄 높이만큼의 공간을 강제로 차지하게 함 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 min-h-[460px] content-start">
              {getPagedData(allPolicies, pageAll).map((policy) => (
                <PolicyCard key={policy.policy_id} policy={policy} onToggle={handleToggleFavorite} isDisabled={policy.isDisabled}/>
              ))}
            </div>
            <PaginationControl 
              totalItems={allPolicies.length} 
              currentPage={pageAll} 
              onPageChange={setPageAll} 
            />
          </TabsContent>

          {/* 2. 맞춤 정책 탭 */}
          <TabsContent value="custom" className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
            {userInfo.has_info ? (
              <>
                {/* ★ [수정] 여기도 min-h-[550px] 추가 */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 min-h-[460px] content-start">
                   {getPagedData(filteredPolicies, pageCustom).map((policy) => (
                      <PolicyCard key={policy.policy_id} policy={policy} badge="추천" onToggle={handleToggleFavorite} isDisabled={policy.isDisabled}/>
                    ))}
                </div>
                <PaginationControl 
                  totalItems={filteredPolicies.length} 
                  currentPage={pageCustom} 
                  onPageChange={setPageCustom} 
                />
              </>
            ) : (
              // 정보 없을 때 안내창
              <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-dashed border-theme-venus min-h-[400px]">
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

          {/* 3. 즐겨찾기 탭 */}
          <TabsContent value="favorites" className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
            {/* ★ [수정] 여기도 min-h-[550px] 추가 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 min-h-[460px] content-start">
              {getPagedData(favoritePolicies, pageFav).map((policy) => (
                <PolicyCard key={policy.policy_id} policy={policy} onToggle={handleToggleFavorite} isDisabled={policy.isDisabled}/>
              ))}
              
              {/* 즐겨찾기가 0개일 때 메시지를 그리드 안이나 밖에서 처리 */}
              {favoritePolicies.length === 0 && (
                <div className="col-span-full flex justify-center items-center h-full text-theme-venus">
                   {/* h-full을 쓰면 550px 중앙에 뜹니다 */}
                   <div>아직 즐겨찾기한 정책이 없어요. <Heart className="inline w-4 h-4"/>를 눌러보세요!</div>
                </div>
              )}
            </div>
            
            {favoritePolicies.length > 0 && (
              <PaginationControl 
                totalItems={favoritePolicies.length} 
                currentPage={pageFav} 
                onPageChange={setPageFav} 
              />
            )}
          </TabsContent>
        </Tabs>

      </main>

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
            <AlertDialogCancel className="border-theme-venus/30 text-theme-venus hover:text-theme-black hover:bg-theme-bonjour">
              아니요
            </AlertDialogCancel>
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

// ★ [추가] 재사용 가능한 페이지네이션 컴포넌트
const PaginationControl = ({ totalItems, currentPage, onPageChange }) => {
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

  if (totalPages <= 1) return null;

  return (
    <div className="flex justify-center items-center gap-2 mt-8 py-4">
      {/* 이전 페이지 버튼 */}
      <Button
        variant="ghost" // [수정] outline -> ghost (흰색 사각형 제거)
        size="icon"
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
        // [수정] hover시 배경색도 연하게 처리하거나 없앰
        className="h-8 w-8 text-theme-venus hover:text-theme-livid hover:bg-transparent"
      >
        <ChevronLeft className="h-6 w-6" />
      </Button>

      {/* 페이지 번호 표시 */}
      <div className="flex gap-1">
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
          <Button
            key={pageNum}
            variant={currentPage === pageNum ? "default" : "ghost"}
            size="sm"
            onClick={() => onPageChange(pageNum)}
            // 선택 안 된 버튼도 흰색 박스 없이 글자만 나오게 ghost 처리
            className={`w-8 h-8 p-0 font-normal ${
              currentPage === pageNum 
                ? "bg-theme-livid text-white hover:bg-theme-livid/90 shadow-md" 
                : "text-theme-venus hover:text-theme-black hover:bg-theme-bonjour/50"
            }`}
          >
            {pageNum}
          </Button>
        ))}
      </div>

      {/* 다음 페이지 버튼 */}
      <Button
        variant="ghost" // [수정] outline -> ghost
        size="icon"
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages}
        className="h-8 w-8 text-theme-venus hover:text-theme-livid hover:bg-transparent"
      >
        <ChevronRight className="h-6 w-6" />
      </Button>
    </div>
  );
};

const PolicyCard = ({ policy, badge, onToggle, isDisabled }) => {
  const handleViewDetails = () => {
    // 1. 링크가 있는지 확인 (백엔드 필드명이 policy_link 라고 가정)
    // 만약 필드명이 'url'이라면 policy.url로 수정해주세요!
    const linkUrl = policy.policy_url;

    if (linkUrl) {
      // 2. 새 탭(_blank)에서 열기
      // noopener, noreferrer는 보안상 권장되는 옵션입니다.
      window.open(linkUrl, "_blank", "noopener,noreferrer");
    } else {
      alert("해당 정책의 상세 링크가 없습니다.");
    }
  };

  return (
    <Card className={`hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-theme-venus/30 group
    ${isDisabled 
          ? "opacity-50 grayscale bg-gray-100 pointer-events-none" 
          : "hover:shadow-lg hover:-translate-y-1" 
        }`}>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <Badge variant="secondary" className="bg-theme-bonjour text-theme-livid hover:bg-theme-bonjour">
            {policy.region} · {policy.policy_type}
          </Badge>
          <button className="text-theme-venus hover:text-theme-pink transition-colors"
            onClick={(e) => {
              e.stopPropagation(); 
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
        <Button variant="outline" className="w-full border-theme-venus/30 hover:bg-theme-bonjour hover:text-theme-livid" onClick={handleViewDetails}>
          자세히 보기
        </Button>
      </CardFooter>
    </Card>
  );
};

export default MainPage;