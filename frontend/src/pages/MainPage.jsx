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
// [수정] X 아이콘 (닫기 버튼용) 및 ExternalLink 아이콘 추가
import { Home, User, LogOut, Heart, Search, ChevronLeft, ChevronRight, X, ExternalLink } from "lucide-react";
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

  // ★ [추가] 상세 보기(확대) 모달을 위한 상태
  const [selectedPolicy, setSelectedPolicy] = useState(null);

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

  // ... (아파트 검색 관련 useEffect 등 기존 코드 유지)
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

  // ... (핸들러 함수들 기존 유지)
  const handleAptSearchChange = (e) => {
    const value = e.target.value;
    setAptSearchTerm(value);
    setFocusIndex(-1); 
    if (value.trim().length > 0) {
      const filtered = rawApartmentList.filter((apt) => apt.includes(value));
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

    if (selectedPolicy && selectedPolicy.policy_id === policyId) {
    setSelectedPolicy((prev) => ({
      ...prev,
      isFavorite: !prev.isFavorite // 현재 모달의 상태도 뒤집어줌 -> 즉시 색상 변경됨
    }));
  }

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
  
  // ★ [추가] 모달 열기 핸들러 (PolicyCard에서 호출됨)
  const handleOpenDetail = (policy) => {
    setSelectedPolicy(policy);
  };

  // ★ [추가] 모달 닫기 핸들러
  const handleCloseDetail = () => {
    setSelectedPolicy(null);
  };

  if (loading) {
    return <div className="flex justify-center items-center h-screen">로딩 중...</div>;
  }

  const getPagedData = (data, currentPage) => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return data.slice(startIndex, endIndex);
  };

  const favoritePolicies = allPolicies.filter(p => p.isFavorite);

  return (
    <div className="min-h-screen w-full bg-theme-bonjour font-sans flex flex-col relative">
      
      {/* 헤더 */}
      <header className="bg-white/80 backdrop-blur-md border-b border-theme-venus/20 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center cursor-pointer" onClick={() => navigate("/")}>
            <img 
              src={logoImg} 
              alt="집살때 로고" 
              className="h-9 w-auto object-contain" 
            />
          </div>

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

          {/* 아파트 검색 필터 */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-theme-venus/20 space-y-4">
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 min-h-[460px] content-start">
              {getPagedData(allPolicies, pageAll).map((policy) => (
                <PolicyCard 
                  key={policy.policy_id} 
                  policy={policy} 
                  onToggle={handleToggleFavorite} 
                  isDisabled={policy.isDisabled}
                  // ★ [수정] 상세보기 핸들러 전달
                  onDetail={() => handleOpenDetail(policy)}
                />
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 min-h-[460px] content-start">
                   {getPagedData(filteredPolicies, pageCustom).map((policy) => (
                      <PolicyCard 
                        key={policy.policy_id} 
                        policy={policy} 
                        badge="추천" 
                        onToggle={handleToggleFavorite} 
                        isDisabled={policy.isDisabled}
                        onDetail={() => handleOpenDetail(policy)}
                      />
                    ))}
                </div>
                <PaginationControl 
                  totalItems={filteredPolicies.length} 
                  currentPage={pageCustom} 
                  onPageChange={setPageCustom} 
                />
              </>
            ) : (
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 min-h-[460px] content-start">
              {getPagedData(favoritePolicies, pageFav).map((policy) => (
                <PolicyCard 
                  key={policy.policy_id} 
                  policy={policy} 
                  onToggle={handleToggleFavorite} 
                  isDisabled={policy.isDisabled}
                  onDetail={() => handleOpenDetail(policy)}
                />
              ))}
              
              {favoritePolicies.length === 0 && (
                <div className="col-span-full flex justify-center items-center h-full text-theme-venus">
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

      {/* 알림 다이얼로그 (기존 코드) */}
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

      {/* ★ [추가] 상세 보기(확대) 모달 컴포넌트 렌더링 */}
      {selectedPolicy && (
        <PolicyDetailModal 
          policy={selectedPolicy} 
          onClose={handleCloseDetail} 
          onToggle={handleToggleFavorite}
        />
      )}

    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* 서브 컴포넌트                                 */
/* -------------------------------------------------------------------------- */

// 1. 페이지네이션 컴포넌트
const PaginationControl = ({ totalItems, currentPage, onPageChange }) => {
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
  if (totalPages <= 1) return null;

  return (
    <div className="flex justify-center items-center gap-2 mt-8 py-4">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
        className="h-8 w-8 text-theme-venus hover:text-theme-livid hover:bg-transparent"
      >
        <ChevronLeft className="h-6 w-6" />
      </Button>
      <div className="flex gap-1">
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
          <Button
            key={pageNum}
            variant={currentPage === pageNum ? "default" : "ghost"}
            size="sm"
            onClick={() => onPageChange(pageNum)}
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
      <Button
        variant="ghost"
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

// 2. 정책 카드 컴포넌트 (수정됨: onDetail prop 사용)
const PolicyCard = ({ policy, badge, onToggle, isDisabled, onDetail }) => {
  return (
    <Card className={`hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-theme-venus/30 group flex flex-col h-full
    ${isDisabled 
          ? "opacity-50 grayscale bg-gray-100 pointer-events-none" 
          : "bg-white hover:shadow-xl hover:-translate-y-1" 
        }`}>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <Badge variant="secondary" className="bg-theme-bonjour text-theme-livid hover:bg-theme-bonjour">
            {policy.region} · {policy.policy_type}
          </Badge>
          <button className="text-theme-venus hover:text-theme-pink transition-colors p-1"
            onClick={(e) => {
              e.stopPropagation(); 
              onToggle(policy.policy_id);
            }}
          >
            <Heart className={`w-5 h-5 ${policy.isFavorite ? "fill-theme-pink text-theme-pink" : ""}`} />
          </button>
        </div>
        <CardTitle className="text-lg mt-3 text-theme-black group-hover:text-theme-livid transition-colors line-clamp-1">
            {policy.policy_name}
        </CardTitle>
        {badge && <Badge className="mt-1 w-fit bg-theme-pink hover:bg-theme-pink">{badge}</Badge>}
      </CardHeader>
      <CardContent className="flex-1">
        <CardDescription className="line-clamp-2 min-h-[40px]">
          {policy.desc}
        </CardDescription>
      </CardContent>
      <CardFooter>
        <Button variant="outline" className="w-full border-theme-venus/30 hover:bg-theme-bonjour hover:text-theme-livid" onClick={onDetail}>
          자세히 보기
        </Button>
      </CardFooter>
    </Card>
  );
};

// ★ [추가] 상세 보기(확대) 모달 컴포넌트
// ★ [수정됨] 대형 사이즈 & 팝업 모션이 적용된 상세 모달
const PolicyDetailModal = ({ policy, onClose, onToggle }) => {
  
  const handleGoToSite = () => {
    if (policy.policy_url) {
      window.open(policy.policy_url, "_blank", "noopener,noreferrer");
    } else {
      alert("링크 정보가 없습니다.");
    }
  };

  return (
    <>
      {/* 1. 커스텀 애니메이션 정의 (Style 태그 삽입) */}
      <style>{`
        @keyframes spring-pop {
          0% { transform: scale(0.8); opacity: 0; }
          50% { transform: scale(1.02); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-spring-pop {
          animation: spring-pop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }
      `}</style>

      {/* 2. 배경 (Backdrop) */}
      <div 
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300"
        onClick={onClose}
      >
        {/* 3. 모달 컨텐츠 (대형 사이즈 & 팝업 애니메이션 적용) */}
        <div 
          className="bg-white w-full max-w-6xl h-[85vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col relative animate-spring-pop"
          onClick={(e) => e.stopPropagation()}
        >
          {/* 닫기 버튼 */}
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 p-2 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-black transition-colors z-20"
          >
            <X className="w-6 h-6" />
          </button>

          <div className="flex h-full flex-col md:flex-row">
            
            {/* [좌측] 헤더 및 요약 정보 (35% 너비) */}
            <div className="w-full md:w-[35%] bg-theme-bonjour/30 p-8 flex flex-col border-r border-gray-100 overflow-y-auto custom-scrollbar">
              
              {/* 상단 뱃지 그룹 */}
              <div className="flex flex-wrap gap-2 mb-6">
                 <Badge className="bg-theme-livid text-white px-3 py-1 text-sm rounded-md shadow-sm">
                    {policy.category || "정책"}
                 </Badge>
                 <Badge variant="outline" className="border-theme-venus/50 text-theme-venus bg-white">
                    {policy.region}
                 </Badge>
              </div>

              {/* 제목 */}
              <h2 className="text-3xl font-extrabold text-theme-black leading-tight mb-6 break-keep">
                {policy.policy_name}
              </h2>

              {/* 즐겨찾기 버튼 (크게) */}
              <div className="mb-8">
                <button 
                  className={`flex items-center justify-center w-full gap-2 py-3 rounded-xl border transition-all duration-200 
                    ${policy.isFavorite 
                      ? "bg-theme-pink/10 border-theme-pink text-theme-pink" 
                      : "bg-white border-gray-200 text-gray-500 hover:border-theme-pink hover:text-theme-pink"
                    }`}
                  onClick={() => onToggle(policy.policy_id)}
                >
                  <Heart className={`w-5 h-5 ${policy.isFavorite ? "fill-theme-pink" : ""}`} />
                  <span className="font-semibold">{policy.isFavorite ? "관심 정책에 저장됨" : "관심 정책으로 저장"}</span>
                </button>
              </div>

              {/* 요약 카드 */}
              <div className="space-y-4 mt-auto">
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                   <span className="text-sm text-theme-venus font-bold uppercase tracking-wider block mb-2">지원 금액</span>
                   <p className="text-2xl font-bold text-theme-livid">
                      {policy.max_benefit_amount 
                        ? `${(policy.max_benefit_amount / 10000).toLocaleString()}만원` 
                        : "상세 내용 참조"}
                      <span className="text-sm font-normal text-gray-500 ml-1">최대</span>
                   </p>
                </div>

                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                   <span className="text-sm text-theme-venus font-bold uppercase tracking-wider block mb-2">대상 주택</span>
                   <p className="text-lg font-bold text-theme-black">
                     {policy.max_house_price ? `${(policy.max_house_price / 100000000).toFixed(1)}억 이하` : "제한 없음"}
                   </p>
                </div>
              </div>
            </div>

            {/* [우측] 상세 내용 (65% 너비) */}
            <div className="w-full md:w-[65%] flex flex-col bg-white">
              
              {/* 스크롤 영역 */}
              <div className="flex-1 p-8 md:p-10 overflow-y-auto custom-scrollbar space-y-10">
                
                {/* 1. 정책 소개 */}
                <section>
                  <h3 className="text-xl font-bold text-theme-black mb-4 flex items-center gap-2">
                    <span className="w-1 h-6 bg-theme-livid rounded-full"></span>
                    어떤 정책인가요?
                  </h3>
                  <div className="text-gray-600 text-lg leading-8 whitespace-pre-wrap bg-gray-50 p-6 rounded-2xl border border-gray-100">
                    {policy.desc || "상세 설명이 제공되지 않았습니다."}
                  </div>
                </section>

                {/* 2. 상세 조건 (테이블 형태) */}
                <section>
                  <h3 className="text-xl font-bold text-theme-black mb-4 flex items-center gap-2">
                    <span className="w-1 h-6 bg-theme-pink rounded-full"></span>
                    누가 신청할 수 있나요?
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                     <DetailItem label="거주 지역" value={policy.region} />
                     <DetailItem label="정책 유형" value={policy.policy_type} />
                     <DetailItem label="최대 대출/지원 기간" value={policy.max_duration_year ? `${policy.max_duration_year}년` : "-"} />
                     <DetailItem label="금리 수준" value={policy.min_rate ? `${policy.min_rate}% ~ ${policy.max_rate}%` : "-"} />
                  </div>
                </section>
              </div>

              {/* 하단 버튼 영역 (고정) */}
              <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-white/90 backdrop-blur-sm">
                {/* <Button variant="ghost" onClick={onClose} size="lg" className="text-gray-500 hover:text-black text-lg">
                  닫기
                </Button> */}
                <Button 
                  onClick={handleGoToSite}
                  size="lg"
                  className="bg-theme-livid hover:bg-theme-livid/90 text-white px-8 text-lg font-semibold shadow-lg hover:shadow-xl transition-all"
                >
                  신청하러 가기 <ExternalLink className="w-5 h-5 ml-2" />
                </Button>
              </div>

            </div>
          </div>
        </div>
      </div>
    </>
  );
};

// [보조 컴포넌트] 상세 정보 아이템 (반복되는 디자인 통일)
const DetailItem = ({ label, value }) => (
  <div className="flex flex-col p-4 rounded-xl border border-gray-100 bg-white hover:border-theme-venus/30 transition-colors">
    <span className="text-sm text-theme-venus mb-1">{label}</span>
    <span className="text-lg font-medium text-theme-black">{value}</span>
  </div>
);

export default MainPage;