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
// [수정] X 아이콘, ExternalLink, 화살표 아이콘 추가
import { Home, User, LogOut, Heart, Search, ChevronLeft, ChevronRight, X, ExternalLink, ArrowUp, ArrowDown, Building, PiggyBank, Users, Info, AlertTriangle, FileText, Target, Calendar, Wallet, RefreshCw } from "lucide-react";
import api from "@/api/axios";
import logoImg from "@/assets/logo.png";

// ★ 한 페이지에 보여줄 아이템 개수 상수 선언
const ITEMS_PER_PAGE = 6;

// [추가] 카테고리별 정책 유형 매핑 객체
const POLICY_TYPE_MAP = {
  "모두": ["모두"],
  "주택공급": ["모두", "공공임대", "민간임대", "공공분양"],
  "금융지원": ["모두", "주택구입자금 대출", "주택전·월세자금 대출", "금융연계 지원"],
  "주거비지원": ["모두", "현금급여"],
  "기타지원": ["모두", "현금급여", "공공임대"],
};

const MainPage = () => {
  const navigate = useNavigate();
  
  // 사용자 정보 상태
  const [userInfo, setUserInfo] = useState({
    nickname: "",
    has_info: false,
  });

  // 원본 데이터 (API에서 받은 후 변경되지 않음)
  const [rawAllPolicies, setRawAllPolicies] = useState([]);
  const [rawFilteredPolicies, setRawFilteredPolicies] = useState([]);

  // 화면에 표시될 데이터 (필터링/정렬 후)
  const [allPolicies, setAllPolicies] = useState([]);
  const [filteredPolicies, setFilteredPolicies] = useState([]);
  
  const [activeTab, setActiveTab] = useState("all");
  
  // 페이지네이션 상태
  const [pageAll, setPageAll] = useState(1);
  const [pageCustom, setPageCustom] = useState(1);
  const [pageFav, setPageFav] = useState(1);

  // [추가] 필터링 및 정렬 상태
  const [sortType, setSortType] = useState("popular"); // 'popular' or 'alpha'
  const [sortOrder, setSortOrder] = useState("desc"); // 'asc' or 'desc'
  const [selectedCategory, setSelectedCategory] = useState("모두");
  const [selectedPolicyType, setSelectedPolicyType] = useState("모두");
  const [policyTypeOptions, setPolicyTypeOptions] = useState(["모두"]);

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

  // 로딩 및 모달 상태
  const [loading, setLoading] = useState(true);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [selectedPolicy, setSelectedPolicy] = useState(null);

  // 데이터 최초 로딩
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
          isFavorite: myFavoriteIds.includes(item.policy_id),
          visit_count: item.visit_count || 0, // visit_count가 null일 경우 0으로 초기화
        }));
        
        // ★[수정] 초기 데이터를 인기순(내림차순)으로 정렬
        const sortedPolicies = processedAllPolicies.sort((a, b) => (b.visit_count || 0) - (a.visit_count || 0));
  
        // 원본 데이터와 화면 표시용 데이터 모두 초기화
        setRawAllPolicies(sortedPolicies);
        setAllPolicies(sortedPolicies);

        setUserInfo({
          nickname: userInfoRes.data.nickname,
          has_info: userInfoRes.data.has_info,
        });
        setAllSido(allSidoRes.data);

        if (userInfoRes.data.has_info === true) {
          const allUserRes = await api.get("/policies/recommended");
          const processedFilteredPolicies = allUserRes.data.policies.map((item) => ({
            ...item,
            isFavorite: myFavoriteIds.includes(item.policy_id),
            visit_count: item.visit_count || 0,
          }));
          const sortedFilteredPolicies = processedFilteredPolicies.sort((a, b) => (b.visit_count || 0) - (a.visit_count || 0));
          setRawFilteredPolicies(sortedFilteredPolicies);
          setFilteredPolicies(sortedFilteredPolicies);
        }
  
      } catch (error) {
        console.error("데이터 로딩 실패: ", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);
  
  // [추가] 카테고리 변경 시 정책 유형 옵션 업데이트
  useEffect(() => {
    setPolicyTypeOptions(POLICY_TYPE_MAP[selectedCategory] || ["모두"]);
    setSelectedPolicyType("모두"); // 카테고리 바뀌면 유형은 '모두'로 리셋
  }, [selectedCategory]);

  // 아파트 검색 관련 useEffect 등 기존 코드 유지
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

  // 핸들러 함수들
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
    const toggle = (policies) => policies.map(p => p.policy_id === policyId ? { ...p, isFavorite: !p.isFavorite } : p);
    setAllPolicies(toggle);
    setFilteredPolicies(toggle);
    setRawAllPolicies(toggle); // 원본 데이터도 동기화
    setRawFilteredPolicies(toggle);

    if (selectedPolicy && selectedPolicy.policy_id === policyId) {
      setSelectedPolicy((prev) => ({ ...prev, isFavorite: !prev.isFavorite }));
    }

    await api.post(`/favorites/${policyId}`);
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

      const updateDisabled = (policies) => policies.map(p => ({ ...p, isDisabled: !checkIsActive(p) }));
      setAllPolicies(updateDisabled);
      setFilteredPolicies(updateDisabled);
      
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

  const handleOpenDetail = (policy) => {
    try {
      api.post(`/policies/${policy.policy_id}/visit`);
      // visit_count를 프론트엔드에서도 즉시 반영
      const incrementVisitCount = (policies) => policies.map(p => p.policy_id === policy.policy_id ? {...p, visit_count: (p.visit_count || 0) + 1} : p);
      setAllPolicies(incrementVisitCount);
      setFilteredPolicies(incrementVisitCount);
      setRawAllPolicies(incrementVisitCount);
      setRawFilteredPolicies(incrementVisitCount);
    } catch (error) {
      console.error("조회수 업데이트 실패:", error);
    }
    setSelectedPolicy(policy);
  };

  const handleCloseDetail = () => {
    setSelectedPolicy(null);
  };

  // [추가] 검색 버튼 핸들러
  const handleSearch = () => {
    const process = (source) => {
      let result = [...source];

      // 1. 필터링
      if (selectedCategory !== "모두") {
        result = result.filter(p => p.category === selectedCategory);
      }
      if (selectedPolicyType !== "모두") {
        result = result.filter(p => p.policy_type === selectedPolicyType);
      }

      // 2. 정렬
      result.sort((a, b) => {
        if (sortType === 'popular') {
          return sortOrder === 'asc' ? (a.visit_count || 0) - (b.visit_count || 0) : (b.visit_count || 0) - (a.visit_count || 0);
        }
        if (sortType === 'alpha') {
          return sortOrder === 'asc' ? a.policy_name.localeCompare(b.policy_name) : b.policy_name.localeCompare(a.policy_name);
        }
        return 0;
      });
      
      return result;
    };

    setAllPolicies(process(rawAllPolicies));
    setFilteredPolicies(process(rawFilteredPolicies));

    // 검색 후 첫 페이지로 이동
    setPageAll(1);
    setPageCustom(1);
  };

  if (loading) {
    return <div className="flex justify-center items-center h-screen">로딩 중...</div>;
  }

  const getPagedData = (data, currentPage) => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return data.slice(startIndex, endIndex);
  };

  const favoritePolicies = rawAllPolicies.filter(p => p.isFavorite);

  return (
    <div className="min-h-screen w-full bg-theme-bonjour font-sans flex flex-col relative">
      
      {/* 헤더 */}
      <header className="bg-white/80 backdrop-blur-md border-b border-theme-venus/20 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center cursor-pointer" onClick={() => navigate("/")}>
            <img 
              src={logoImg} 
              alt="집살때 로고" 
              className="h-9 w-auto object-contain" 
            />
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            <Button variant="ghost" size="sm" onClick={handleEditInfoClick} className="text-theme-venus hover:text-theme-livid">
              <User className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">정보 수정</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-theme-venus hover:text-red-500">
              <LogOut className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">로그아웃</span>
            </Button>
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-8">
        
        <div className="mb-8 space-y-6">
          <h1 className="text-xl sm:text-3xl font-bold text-theme-black">
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
                    className="pl-10 text-sm sm:text-base"
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
                              <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                                <TabsList className="grid w-full md:w-[400px] grid-cols-3 bg-theme-venus/10 p-1 rounded-xl">
                                  <TabsTrigger value="all" className="data-[state=active]:bg-white data-[state=active]:text-theme-livid data-[state=active]:shadow-sm rounded-lg">전체</TabsTrigger>
                                  <TabsTrigger value="custom" className="data-[state=active]:bg-white data-[state=active]:text-theme-pink data-[state=active]:shadow-sm rounded-lg">맞춤 정책</TabsTrigger>
                                  <TabsTrigger value="favorites" className="data-[state=active]:bg-white data-[state=active]:text-theme-livid data-[state=active]:shadow-sm rounded-lg">즐겨찾기</TabsTrigger>
                                </TabsList>
                                
                                {/* [수정] 필터링 및 정렬 컨트롤 (탭 리스트 오른쪽으로 이동) */}
                                            <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                                              <div className="flex items-center gap-2 w-full sm:w-auto">
                                                <Select value={sortType} onValueChange={setSortType}>
                                                  <SelectTrigger className="w-full sm:w-[120px] bg-white">
                                                    <SelectValue />
                                                  </SelectTrigger>
                                                  <SelectContent>
                                                    <SelectItem value="popular">인기순</SelectItem>
                                                    <SelectItem value="alpha">사전순</SelectItem>
                                                  </SelectContent>
                                                </Select>
                                                <Button 
                                                  variant="outline" 
                                                  size="icon" 
                                                  className="border-theme-venus/30 bg-white"
                                                  onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                                                >
                                                  {sortOrder === 'asc' ? <ArrowUp className="w-5 h-5" /> : <ArrowDown className="w-5 h-5" />}
                                                </Button>
                                              </div>
                                              
                                              <div className="flex items-center gap-2 w-full sm:w-auto">
                                                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                                                  <SelectTrigger className="w-full sm:w-[130px] bg-white">
                                                    <SelectValue />
                                                  </SelectTrigger>
                                                  <SelectContent>
                                                    {Object.keys(POLICY_TYPE_MAP).map(cat => (
                                                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                                    ))}
                                                  </SelectContent>
                                                </Select>
                                
                                                <Select value={selectedPolicyType} onValueChange={setSelectedPolicyType} disabled={selectedCategory === '모두'}>
                                                  <SelectTrigger className="w-full sm:w-[180px] bg-white">
                                                    <SelectValue />
                                                  </SelectTrigger>
                                                  <SelectContent>
                                                    {policyTypeOptions.map(type => (
                                                      <SelectItem key={type} value={type}>{type}</SelectItem>
                                                    ))}
                                                  </SelectContent>
                                                </Select>
                                              </div>
                                
                                              <Button className="bg-theme-livid hover:bg-theme-livid/90 w-full sm:w-auto" onClick={handleSearch}>
                                                <Search className="w-4 h-4 mr-2" />
                                                검색
                                              </Button>
                                            </div>                              </div>
                              
                              {/* 1. 전체 탭 */}
                              <TabsContent value="all" className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 min-h-[460px] content-start">
                                  {getPagedData(allPolicies, pageAll).map((policy) => (                            <PolicyCard 
                              key={policy.policy_id} 
                              policy={policy} 
                              onToggle={handleToggleFavorite} 
                              isDisabled={policy.isDisabled}
                              onDetail={() => handleOpenDetail(policy)}
                            />
                          ))}
                           {allPolicies.length === 0 && (
                            <div className="col-span-full flex justify-center items-center h-full text-theme-venus">
                               <div>해당 조건에 맞는 정책이 없어요.</div>
                            </div>
                          )}
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
                                {filteredPolicies.length === 0 && (
                                  <div className="col-span-full flex justify-center items-center h-full text-theme-venus">
                                    <div>해당 조건에 맞는 맞춤 정책이 없어요.</div>
                                  </div>
                                )}
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
                      {policy.summary}
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
            const FlippableBox = ({ frontTitle, frontValue, backValue, icon: Icon }) => {
                          const [isFlipped, setIsFlipped] = useState(false);
                        
                          // frontValue나 backValue가 비어있거나 "-"일 경우 뒤집기 기능을 비활성화
                          const canFlip = frontValue && frontValue !== '-' && backValue && backValue !== '-';
                        
                          const handleFlip = (e) => {
                            e.stopPropagation();
                            if (canFlip) {
                              setIsFlipped(!isFlipped);
                            }
                          };
                        
                          return (
                            <div
                              className={`flip-card group h-[150px] ${canFlip ? 'cursor-pointer' : ''}`}
                              onClick={handleFlip}
                            >
                              <div
                                className="flip-card-inner relative w-full h-full"
                                style={{
                                  transformStyle: 'preserve-3d',
                                  transition: 'transform 0.6s',
                                  transform: isFlipped ? 'rotateY(180deg)' : 'none',
                                }}
                              >
                                {/* Grid container to stack front and back for auto-height */}
                                <div className="grid [grid-template-areas:'card'] w-full h-full">
                                    {/* Back face (for sizing) */}
                                    <div
                                        className="[grid-area:card] flip-card-back flex flex-col p-4 rounded-xl border border-gray-200/80 bg-white invisible"
                                    >
                                        <div className="text-sm text-theme-black whitespace-pre-wrap leading-relaxed">
                                          {backValue}
                                        </div>
                                    </div>
            
                                    {/* Front face (for sizing) */}
                                    <div className="[grid-area:card] flip-card-front flex flex-col p-4 rounded-xl border border-gray-200/80 bg-white invisible">
                                      <div className="flex items-center text-base text-theme-venus mb-2">
                                        {Icon && <Icon className="w-5 h-5 mr-2" />}
                                        <span>{frontTitle}</span>
                                      </div>
                                      <span className="text-lg font-medium text-theme-black">{frontValue}</span>
                                    </div>
                                </div>
            
            
                                {/* Back face (visible) */}
                                <div
                                    className="absolute top-0 left-0 [grid-area:card] flip-card-back flex flex-col p-4 rounded-xl border border-gray-200/80 bg-white w-full h-full"
                                    style={{
                                        backfaceVisibility: 'hidden',
                                        transform: 'rotateY(180deg)',
                                    }}
                                >
                                    <div className="text-sm text-theme-black whitespace-pre-wrap leading-relaxed">
                                      {backValue.replace(/\n\s*\n/g, '\n')}
                                    </div>
                                </div>
            
                                {/* Front face (visible) */}
                                <div className="absolute top-0 left-0 [grid-area:card] flip-card-front flex flex-col p-4 rounded-xl border border-gray-200/80 bg-white hover:border-theme-venus/30 transition-colors shadow-sm w-full h-full" style={{ backfaceVisibility: 'hidden' }}>
                                  <div className="flex items-center text-base text-theme-venus mb-2">
                                    {Icon && <Icon className="w-5 h-5 mr-2" />}
                                    <span>{frontTitle}</span>
                                  </div>
                                  <span className="text-lg font-medium text-theme-black">{frontValue}</span>
                                </div>
            
                              </div>
                            </div>
                          );
                        };            
            
            const PolicyDetailModal = ({ policy, onClose, onToggle }) => {
              const handleGoToSite = () => {
                if (policy.policy_url) {
                  window.open(policy.policy_url, "_blank", "noopener,noreferrer");
                } else {
                  alert("링크 정보가 없습니다.");
                }
              };
            
              // 주택 공급 카테고리 (임대/분양)에 대한 라벨 및 값 정의
              const isRental = policy.category === '주택공급' && (policy.policy_type === '공공임대' || policy.policy_type === '민간임대');
              const isSale = policy.category === '주택공급' && (policy.policy_type === '공공분양' || policy.policy_type === '민간분양');
            
              let details;
            
              // 기본값 설정 (향후 다른 카테고리를 위해 확장 가능)
              details = {
                benefitLabel: "혜택",
                benefitValue: policy.benefit || (policy.max_benefit_amount ? `${(policy.max_benefit_amount / 10000).toLocaleString()}만원` : "상세 참조"),
                // Flippable
                durationLabel: "거주 기간",
                durationFront: policy.duration || "-",
                durationBack: policy.duration_detail,
                // Flippable
                priorityLabel: "소득 기준",
                priorityFront: policy.priority || "-",
                priorityBack: policy.priority_detail,
                // Not flippable
                targetBeneficiaryLabel: "혜택 대상자",
                targetBeneficiaryValue: policy.limit_detail || "-",
                // Not flippable
                benefitDetailLabel: "혜택 상세",
                benefitDetailValue: policy.benefit_detail || "-",
                // Not flippable
                supportMethodLabel: "지원 방식",
                supportMethodValue: policy.limit || "-",
              };
            
              if (isRental || isSale) {
                details.benefitLabel = isRental ? "임대료 수준" : "분양가";
                details.priorityLabel = isRental ? "소득 기준" : "신청 조건";
              }
            
            
              return (
                <>
                  <style>{`
                    @keyframes spring-pop { 0% { transform: scale(0.8); opacity: 0; } 50% { transform: scale(1.02); opacity: 1; } 100% { transform: scale(1); opacity: 1; } }
                    .animate-spring-pop { animation: spring-pop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
                    .shadow-inner-lg { box-shadow: inset 0 2px 4px 0 rgb(0 0 0 / 0.05); }
                    /* Perspective is needed for the 3D effect */
                    .flip-card { perspective: 1000px; }
                  `}</style>
                  <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300" onClick={onClose}>
                    <div className="bg-white w-full max-w-6xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col relative animate-spring-pop overflow-y-auto custom-scrollbar" onClick={(e) => e.stopPropagation()}>
                      <button onClick={onClose} className="absolute top-4 right-4 sm:top-6 sm:right-6 p-2 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-black transition-colors z-20"><X className="w-6 h-6" /></button>
                      
                      <div className="flex h-full flex-col md:flex-row">
                        {/* Left Pane */}
                        <div className="w-full md:w-[40%] bg-theme-bonjour/40 p-6 sm:p-8 flex flex-col border-r border-gray-200">
                          <div className="flex flex-wrap gap-2 mb-4">
                            <Badge className="bg-theme-livid text-white px-3 py-1 text-sm rounded-md shadow">{policy.category}</Badge>
                            <Badge variant="outline" className="border-theme-venus/50 text-theme-venus bg-white shadow-sm">{policy.policy_type}</Badge>
                          </div>
                          <h2 className="text-3xl font-extrabold text-theme-black leading-normal mb-3 break-keep">{policy.policy_name}</h2>
                          <p className="text-lg text-theme-venus mb-6">{policy.summary}</p>
              
                          <div className="bg-white/60 p-5 rounded-2xl shadow-inner-lg border border-gray-200/80 mb-6">
                            <div className="flex items-center text-theme-pink mb-4">
                              <PiggyBank className="w-7 h-7 mr-3" />
                              <span className="text-lg font-bold">{details.benefitLabel}</span>
                            </div>
                            <p className="text-3xl font-bold text-theme-livid">{details.benefitValue}</p>
                          </div>
            
                          <div className="bg-white/60 p-5 rounded-2xl shadow-inner-lg border border-gray-200/80 mb-8">
                            <div className="flex items-center text-theme-livid mb-4">
                              <Building className="w-7 h-7 mr-3" />
                              <span className="text-lg font-bold">{details.supportMethodLabel}</span>
                            </div>
                            <p className="text-xl font-bold text-theme-black">{details.supportMethodValue}</p>
                          </div>
              
                          <div className="mt-auto grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <Button 
                                variant="outline"
                                size="lg"
                                className="h-auto py-3 text-base border-gray-300 text-gray-600 hover:border-theme-pink hover:text-theme-pink hover:bg-white"
                                onClick={() => onToggle(policy.policy_id)} >
                                <Heart className={`w-5 h-5 mr-2 ${policy.isFavorite ? "fill-theme-pink text-theme-pink" : ""}`} />
                                <span>{policy.isFavorite ? "관심 정책" : "관심 추가"}</span>
                              </Button>
                              <Button onClick={handleGoToSite} size="lg" className="h-auto py-3 text-base bg-theme-livid hover:bg-theme-livid/90 text-white shadow-lg hover:shadow-xl transition-all">
                                신청하러 가기 <ExternalLink className="w-5 h-5 ml-2" />
                              </Button>
                          </div>
                        </div>
              
                        {/* Right Pane */}
                        <div className="w-full md:w-[60%] flex flex-col bg-white">
                          <div className="flex-1 p-6 sm:p-8 space-y-4">
                            <section>
                              <h3 className="text-xl font-bold text-theme-black mb-4 flex items-center gap-3"><Info className="text-theme-livid"/>정책 소개</h3>
                              <p className="text-gray-600 text-sm leading-normal whitespace-pre-wrap bg-gray-50 p-4 rounded-xl border border-gray-100">{(policy.desc || "상세 설명이 제공되지 않았습니다.").replace(/\n\s*\n/g, '\n')}</p>
                            </section>
                            
                            <section>
                               <h3 className="text-xl font-bold text-theme-black mb-4 flex items-center gap-3"><Target className="text-theme-pink"/>신청 자격 및 상세 내용</h3>
                              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                                <FlippableBox icon={Calendar} frontTitle={details.durationLabel} frontValue={details.durationFront} backValue={details.durationBack} />
                                <FlippableBox icon={Users} frontTitle={details.priorityLabel} frontValue={details.priorityFront} backValue={details.priorityBack} />
                                <DetailItem icon={Wallet} label={details.targetBeneficiaryLabel} value={details.targetBeneficiaryValue} />
                                <DetailItem icon={Wallet} label={details.benefitDetailLabel} value={details.benefitDetailValue} />
                              </div>
                            </section>
              
                            {policy.caution && (
                              <section>
                                <h3 className="text-xl font-bold text-theme-black mb-4 flex items-center gap-3"><AlertTriangle className="text-yellow-500"/>주의 사항</h3>
                                <div className="text-gray-700 bg-yellow-50 p-5 rounded-xl border border-yellow-200/80 text-base flex items-start gap-3">
                                  <AlertTriangle className="w-5 h-5 text-yellow-500 mt-1 flex-shrink-0" />
                                  <span className="whitespace-pre-wrap leading-normal">{(policy.caution || '').replace(/\n\s*\n/g, '\n')}</span>
                                </div>
                              </section>
                            )}
                          </div>
                        </div>
                      </div>
            
                    </div>
                  </div>
                </>
              );
            };
            
            const DetailItem = ({ icon: Icon, label, value }) => (
              <div className="flex flex-col p-4 rounded-xl border border-gray-200/80 bg-white hover:border-theme-venus/30 transition-colors shadow-sm h-full">
                <div className="flex items-center text-base text-theme-venus mb-2">
                  {Icon && <Icon className="w-5 h-5 mr-2" />}
                  <span>{label}</span>
                </div>
                <span className="text-lg font-medium text-theme-black whitespace-pre-wrap leading-relaxed">{(value || '').replace(/\n\s*\n/g, '\n')}</span>
              </div>
            );
            
            export default MainPage;