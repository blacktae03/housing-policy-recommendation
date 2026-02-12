from fastapi import APIRouter, FastAPI, HTTPException, Request, Depends
from fastapi.responses import JSONResponse, RedirectResponse
from requests import Session
from starlette.middleware.sessions import SessionMiddleware # 세션 관리 도구
from fastapi.middleware.cors import CORSMiddleware
import database as db
from database import init_db
from pydantic import BaseModel, Field
from datetime import date
import openapi as oa
from collections import OrderedDict, defaultdict # 상단에 import 필요
import numpy as np
import secrets # 파이썬 내장 라이브러리 (랜덤 문자열 생성용)
import httpx
import os
from dotenv import load_dotenv
import sys

load_dotenv()

# try:
#     init_db()
# except Exception as e:
#     print(f"DB 초기화 실패로 서버를 시작할 수 없습니다: {e}")
#     sys.exit(1) # 필요하면 주석 해제 (에러나면 아예 서버 안 켜지게 함)

app = FastAPI()

router = APIRouter(prefix="/api")

origins = [
    "http://localhost:5173",
    "https://jipsalddae.co.kr",        # 구매하신 도메인 (HTTPS 필수)
    "https://www.jipsalddae.co.kr",    # www 포함 버전도 추가
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,      # 위에서 정한 주소만 허용
    allow_credentials=True,     # 쿠키/인증정보 포함 허용
    allow_methods=["*"],        # GET, POST, PUT, DELETE 등 모든 방법 허용
    allow_headers=["*"],        # 모든 헤더 허용
)

app.add_middleware(
    SessionMiddleware,
    secret_key="diunfansid33482nd9@#Nbd1!",
    https_only=False,      # 로컬은 http니까 False
    same_site="lax"        # lax로 두면 로컬에서도 쿠키 잘 먹습니다
)


def calculate_age(birth_date: date):
    """
    생년월일(date 객체)을 받아서 오늘 기준 '만 나이'를 계산하는 함수
    """
    if not birth_date:
        return 0 # 혹은 None
        
    today = date.today()
    # 1. 일단 연도만 뺌
    age = today.year - birth_date.year
    
    # 2. 생일이 안 지났으면 1살 뺌 (만 나이 계산의 핵심)
    # (오늘 월,일) < (생일 월,일) 이면 True(=1)가 돼서 빠짐
    if (today.month, today.day) < (birth_date.month, birth_date.day):
        age -= 1
        
    return age

def get_recommended_policies(request: Request):
    # 1. 로그인 여부 확인
    user_id = request.session.get('user_id')
    if not user_id:
        raise HTTPException(status_code=401, detail="로그인이 필요합니다.")

    # 2. 사용자 상세 정보 가져오기 (DB 조회 1)
    user_info = db.get_user_info(user_id)
    if not user_info:
        raise HTTPException(status_code=400, detail="사용자 정보를 먼저 입력해주세요.")

    # 3. 전체 정책 목록 가져오기 (DB 조회 2)
    # (나중에는 DB 쿼리 단계에서 지역(region) 등으로 1차 필터링을 하면 더 좋습니다)
    all_policies = db.get_all_policies()
    # all_policies_output = db.get_all_policies_output() # list[dict]
    # all_policies = OrderedDict()
    # 4. 진짜 나이(만) 가져오기
    real_age = calculate_age(user_info['birth_date'])
    # print(real_age)
    
    recommended_list = []
    my_household_income_standard = db.get_household_income_standard(user_info['household_size'])['monthly_income'] # 우리 가구 수에 대한 월 평균 소득의 100%

    # 4. 필터링 로직 (파이썬으로 한 땀 한 땀 비교)
    for policy in all_policies:
        # --- 조건 1: 나이 (min_age ~ max_age) ---
        # 정책에 나이 제한이 없거나(0 or null), 내 나이가 범위 안에 있어야 통과
        # (DB에 값이 없으면 보통 0이나 아주 큰 수로 처리되어 있을 수 있으니 데이터 확인 필요)
        if policy['min_age'] and real_age < policy['min_age']: continue
        if policy['max_age'] and real_age > policy['max_age']: continue

        # --- 조건 2: 자산 (asset_limit) ---
        # 내 자산이 정책 제한보다 많으면 탈락
        if policy['asset_limit'] and user_info['asset'] > policy['asset_limit']: continue

        # --- 조건 3: 결혼 여부 (req_newlywed) ---
        # 정책이 신혼부부를 요구(True)하는데, 내가 미혼(False)이면 탈락
        # (기혼자만 가능한 정책을 미혼자가 못 보게)
        # 만약 정책이 'req_newlywed'가 False라면 누구나 가능하므로 통과
        if policy['req_newlywed'] and not user_info['is_newlywed']: continue 

        # --- 조건 4: 신생아 여부 (req_newborn) ---
        # 정책이 신생아 부모를 요구하는데 내가 아니면 탈락
        if policy['req_newborn'] and not user_info['has_newborn']: continue

        # --- 조건 5: 무주택자 전용 확인 (house_owner_allowed) ---
        # house_owner_allowed가 False(무주택자만 가능)인데, 내가 집이 있으면(True) 탈락
        if not policy['house_owner_allowed'] and user_info['is_house_owner']: continue

        # --- 조건 6: 자녀 수 (min_children) ---
        # 내 자녀 수가 정책 요구보다 적으면 탈락
        if policy['min_children'] and user_info['child_count'] < policy['min_children']: continue

        # --- 조건 7: income (income) ---
        # 내 수입이 정책 상한선보다 크면 탈락
        income_limit = policy['income'] if policy['income'] > 1000 else policy['income'] * 12 * my_household_income_standard / 100
        if income_limit < user_info['income']: continue
            
        # (참고) 소득 조건(Income)은 income_rules 테이블과 조인해야 해서 로직이 조금 복잡합니다.
        # 일단 위 조건들을 다 통과하면 리스트에 넣습니다.
        recommended_list.append(policy)

    policy_ids = set([policy['policy_id'] for policy in recommended_list])
    recommended_list2 = []

    for id in policy_ids :
        output = db.get_policy_output_by_id(id)
        recommended_list2.append(output)


    # for policy in recommended_list :
    #     policy_income = db.get_income_rule(policy['policy_id'])

    #     income_limit = 0.0

    #     # --- income_limit 정하기 ---
    #     if len(policy_income) == 1 :
    #         if policy_income[0]['income_limit'] < 1000 :
    #             income_limit = my_household_income_standard * 12 / 100 * policy_income[0]['income_limit'] 

    #         else :
    #             income_limit = policy_income[0]['income_limit']
        
    #     else :
    #         match policy['policy_id'] :
    #             case 100 :
    #                 if user_info['is_newlywed'] :
    #                     income_limit = policy_income['신혼부부']
                    
    #                 elif not user_info['is_house_owner'] and user_info['child_count'] >= 2 :
    #                     income_limit = policy_income['생애최초/2자녀']
                    
    #                 else :
    #                     income_limit = policy_income['기본(디딤돌)']
                
    #             case 101 :
    #                 if user_info['dual_income']  :
    #                     income_limit = policy_income['맞벌이(예정)']
                    
    #                 else :
    #                     income_limit = policy_income['기본(신생아구입)']
                
    #             case 204 :
    #                 if user_info['dual_income'] :
    #                     income_limit = my_household_income_standard * 12 / 100 * policy_income['신혼I형(매입)(맞벌이)']
                    
    #                 else :
    #                     income_limit = my_household_income_standard * 12 / 100 * policy_income['신혼I형(매입)(기본)']

    #             case 401 :
    #                 if user_info['dual_income'] :
    #                     income_limit = my_household_income_standard * 12 / 100 * policy_income['신혼II형(매입)(맞벌이)']
                    
    #                 else :
    #                     income_limit = my_household_income_standard * 12 / 100 * policy_income['신혼II형(매입)(기본)']
    #     # --- income_limit 정하기 ---

    #     # print(policy['policy_name'])
    #     # print(income_limit, ' > ', user_info['income'])
        
    #     # 사용자의 연 수입이 연 소득 제한보다 높으면 탈락
    #     if user_info['income'] > income_limit : continue

    #     recommended_list2.append(policy)

    return {
        "count": len(recommended_list2),
        "policies": recommended_list2
    }

@router.get("/test")
def test(request: Request):
    user_info = db.get_user_info(request.session.get('user_id'))
    bd = user_info.get('birth_date')
    print(type(bd))

# [추가] 사용자 상세 정보 입력용 데이터 모델



# 2. 데이터 형식 정의 (Pydantic)
# 사용자가 정보를 저장할 때 쓰는 class 251231
class UserInfoRequest(BaseModel):
    birth_date: date     # 나이
    # 생일로 나이 계산하게 로직 변경 260101
    income: int          # 소득 (DB는 BigInt지만 Python은 int로 처리 가능)
    asset: int           # 자산
    is_house_owner: bool # 주택 소유 여부
    is_married: bool
    is_newlywed: bool     # 결혼 여부
    has_newborn: bool    # 신생아 여부
    child_count: int     # 자녀 수
    #260101 추가
    household_size: int  # 가구 수
    dual_income: bool    # 맞벌이 여부
    #260106 추가
    etc: list[str]

# 프론트에서 "username", "password"를 안 보내면 알아서 에러를 냅니다.
# 251231 로그인할 때 사용하는 class
class LoginRequest(BaseModel):
    username: str
    password: str


# 251230 회원가입 때 사용하는 클래스
# 1. [주문서 양식] 회원가입 데이터 모델 정의
class UserSignup(BaseModel):
    username: str        # 아이디
    password: str        # 비밀번호
    nickname: str        # 닉네임
    # age: int             # 나이 (정책 min_age, max_age 비교용)
    # income: int          # 연소득 (income_rules 비교용)
    # asset: int           # 자산 (asset_limit 비교용)
    # is_house_owner: bool # 주택 소유 여부 (house_owner_allowed 비교용)
    # has_newborn: bool    # 신생아 여부 (req_newborn 비교용)
    # is_married: bool     # 결혼 여부 (req_newlywed 비교용)
    # child_count: int     # 자녀 수 (min_children 비교용)

# 260102 아파트 지역 및 이름 클래스
class ApartInfo(BaseModel):
    sido_name: str
    sigungu_name: str
    apart_name: str


# 2. [API] 회원가입 엔드포인트
# 사용 중 260106
@router.post("/signup")
def signup(user: UserSignup):
    # 1. 아이디 중복 검사 (DB 부하를 줄이기 위해 먼저 체크)
    if db.get_user_by_username(user.username):
        raise HTTPException(status_code=400, detail="이미 사용 중인 아이디입니다.")

    # 2. 비밀번호 암호화 (Hashing) - 프로덕션 표준 방식
    # bcrypt는 bytes 타입을 요구하므로 encode() 필수
    # password_bytes = user.password.encode('utf-8')
    
    # salt(소금)를 쳐서 해싱 (매번 다른 결과가 나와야 안전함)
    # hashed_bytes = bcrypt.hashpw(password_bytes, bcrypt.gensalt())
    
    # # DB 저장을 위해 다시 문자열로 변환 (decode)
    # hashed_password_str = hashed_bytes.decode('utf-8')
    hashed_password_str = db.hash_password(user.password)
    
    # 3. 데이터 준비 및 저장
    user_data = user.model_dump()
    user_data['password'] = hashed_password_str  # 평문 비밀번호를 암호문으로 교체
    
    print(user_data)

    success = db.create_user(user_data)
    
    if not success:
        # 동시성 이슈 등으로 실패할 경우 대비
        raise HTTPException(status_code=500, detail="회원가입 처리 중 오류가 발생했습니다.")
    
    return {"message": f"환영합니다, {user.nickname}님! 회원가입이 완료되었습니다."}

# 사용 중 260109
@router.get("/user/me")
def check_my_info(request: Request):
    # 1. 요청에 붙어온 세션(쿠키)를 백엔드가 뜯어봅니다.
    user_id = request.session.get("user_id")
    nickname = request.session.get("nickname")
    has_info = request.session.get("has_info")

    result = db.get_user_info(user_id)
    
    # 2. 세션에 정보가 없으면 (로그인 안 한 상태)
    if not user_id:
        raise HTTPException(status_code=401, detail="로그인이 필요합니다.")
    
    # 3. 정보가 있으면 돌려줍니다.
    return {
        "user_id": user_id,
        "nickname": nickname,
        "has_info": has_info,
        "result": result,
        "message": "세션 정보 확인 완료! 당신은 로그인 상태입니다."
    }

# 3. 로그인 API
# async 제거
# 사용 중 260106
@router.post("/login")
def login(login_data: LoginRequest, request: Request):
    # Pydantic(LoginRequest) 덕분에 데이터가 깔끔하게 들어옵니다.
    input_id = login_data.username
    input_pw = login_data.password
    
    # 아까 만든 로그인 로직 함수 호출
    user_result = db.authenticate_user(input_id, input_pw)
    
    if user_result:
        # ★ 로그인 성공! 세션(쿠키)에 정보 저장
        # request.session 딕셔너리에 넣으면 알아서 암호화되어 사용자에게 전달됩니다.
        request.session['user_id'] = user_result['user_id']
        request.session['nickname'] = user_result['nickname']
        request.session['has_info'] = user_result['has_info']
        
        return {
            "message": "로그인 성공!",
            "has_info": user_result['has_info'], # 정보 입력 여부
            # "user_id": user_result['user_id']
        }
    else:
        # 로그인 실패 시 401 에러 전송
        raise HTTPException(status_code=401, detail="아이디 또는 비밀번호가 틀렸습니다.")

# 4. 로그아웃 API (세션 삭제)
# async 제거
# 사용 중 260109
@router.post("/logout")
def logout(request: Request):
    request.session.clear() # 세션 비우기
    return {"message": "로그아웃 되었습니다."}



@router.get("/user/info/me")
def get_my_info(request: Request):
    user_id = request.session.get('user_id')
    if not user_id:
        raise HTTPException(status_code=401, detail="로그인이 필요한 서비스입니다.")
    
    user_info = db.get_user_info(user_id)
    if not user_info:
        raise HTTPException(status_code=400, detail="사용자 정보를 먼저 입력해주세요.")
    
    birth_date = user_info.get('birth_date')
    formatted_birth_year = str(birth_date.year)
    formatted_birth_month = str(birth_date.month)
    formatted_birth_day = str(birth_date.day)
    
    formatted_user_info = {
        "name": request.session.get('nickname'),
        "birthYear": formatted_birth_year,
        "birthMonth": formatted_birth_month,
        "birthDay": formatted_birth_day,
        "income": str(user_info.get('income')),
        "assets": str(user_info.get('asset')),
        "hasHouse": user_info.get('is_house_owner'),
        "isMarried": user_info.get('is_married'),
        "isNewlywed": user_info.get('is_newlywed'),
        "hasNewborn": user_info.get('has_newborn'),
        "childCount": str(user_info.get('child_count')),
        "householdCount": str(user_info.get('household_size')),
        "isDualIncome": user_info.get('dual_income'),
        "etc": []
    }

    if user_info.get('is_single_parent') : formatted_user_info['etc'].append("한부모가정")
    if user_info.get('is_disabled') : formatted_user_info['etc'].append("장애인가구")
    if user_info.get('is_multicultural') : formatted_user_info['etc'].append("다문화가정")
    if len(formatted_user_info['etc']) == 0 : formatted_user_info['etc'].append("해당없음")

    return formatted_user_info
    
# [추가] 사용자 상세 정보 저장/수정 API
# async 제거
# 사용 중 260106
@router.put("/user/info/me")
def update_my_info(info: UserInfoRequest, request: Request):
    # 1. 세션에서 로그인한 유저 ID 확인 (로그인 안 했으면 튕겨냄)
    user_id = request.session.get('user_id')
    
    if not user_id:
        raise HTTPException(status_code=401, detail="로그인이 필요한 서비스입니다.")

    # 2. Pydantic 모델을 딕셔너리로 변환
    # (database.py의 save_user_info 함수가 딕셔너리를 받도록 되어 있음)
    info_data = info.model_dump()

    # 3. DB 저장 함수 호출
    # user_id는 세션에서, 나머지 정보는 바디에서 받아서 넘김
    success = db.save_user_info(user_id, info_data)

    if success:
        # 4. 세션 정보 업데이트 
        # (정보를 저장했으므로, 세션의 has_info 상태도 True로 변경해줘야 프론트에서 바로 반영됨)
        request.session['has_info'] = True

        return {
            "message": "정보가 성공적으로 저장되었습니다.",
            "has_info": True  # 바로 여기서 같이 리턴!
        }
    else:
        raise HTTPException(status_code=500, detail="정보 저장 중 오류가 발생했습니다.")
    


# [main.py]

# ... 기존 import 문들 아래에 ...
# (database.py에 get_user_info가 추가되었다고 가정)

# 사용 중 260109
@router.get("/policies/recommended")
def get_recommended_policies_user_info(request: Request):
    return get_recommended_policies(request)

# 사용 중 260109
@router.get("/policies/recommended/detail")
def get_recommended_policies_with_detail(request: Request, apart_info: ApartInfo = Depends()) :
    basic_recommended_list = get_recommended_policies(request)['policies']

    # 0. 지역 코드와 아파트 이름을 동시에 받음.
    stripped_apart_name = apart_info.apart_name.replace(" ", "")

    # 1. 지역 코드로 아파트를 필터링 (국토부 API 호출)
    region_code = db.get_region_code(apart_info.sido_name, apart_info.sigungu_name)
    apart_list = oa.get_recent_3months_apt_trades(region_code)
    # print(apart_list)
    print(region_code)

    # 2. 아파트 이름으로 아파트를 필터링.
    apart_list2 = defaultdict(list)

    for apart in apart_list :
        apart_name = apart.get('aptNm')
        apart_cdealtype = apart.get('cdealType')

        if stripped_apart_name == apart_name and apart_cdealtype != "O":
            apart_list2[apart_name].append(apart)

    # print(apart_list2)
    if len(apart_list2) == 0 :
        raise HTTPException(status_code=404, detail="해당 아파트를 찾을 수 없습니다.")
    
    selected_name = list(apart_list2.keys())[0] # 아파트 이름 입력 (래미안) 시 관련 아파트 중 선택 (래미안장전) 로직 수정 예정
        
    apart_list3 = apart_list2[selected_name]
    # print(apart_list3)

    # for apart in apart_list2 :
    #     print(apart['cdealType'], apart['aptNm'], apart['aptDong'], apart['dealAmount'])

    # 3. 거래(평균)가 및 최솟값 계산
    # 3-2. 오늘의 연월 기준 3개월 안의 모든 정보 검색 후 계산
    # 3-3. 3개월 내 정보가 없으면 직접 가격 입력하게 하기.
    apart_list4 = defaultdict(list)

    for apart in apart_list3 :
        apart_dong = apart.get('aptDong')
        
        clean_amount = int(apart.get('dealAmount').replace(',', '').strip())

        apart_list4[apart_dong].append(clean_amount)

    # print(apart_list4)

    apart_amounts_mean = [np.mean(amounts) for amounts in apart_list4.values()]
    apart_amounts_min = min(apart_amounts_mean) * 10000 # 단위(만)
    # print(apart_amounts_mean)
    # print(apart_amounts_min)
    

    # 4. 지역이랑 거래가 기준으로 정책을 필터링
    # final_policies_list = []

    # for policy in basic_recommended_list :
    #     # 1. 정책의 요구 지역이 전국이 아닐 때, 아파트의 시/도가 정책의 요구 지역과 다를 때 거름
    #     if policy['region'] != "전국" and apart_info.sido_name != policy['region'] : continue

    #     # 2. 정책의 최대 집 가격이 아파트의 최근 3개월 간 거래 최솟값 보다 작으면 거름
    #     if apart_amounts_min > policy['max_house_price'] : continue

    #     final_policies_list.append(policy)

    # for policy in final_policies_list :
    #     print(policy['policy_name'])

    # return {
    #     "count": len(final_policies_list),
    #     "policies": final_policies_list
    # }
    return apart_amounts_min

# 사용 중 260109
@router.get("/regions/sido")
def get_sido_list():
    sido_list = db.get_sido()
    simple_sido_list = sorted(set([dic['sido'] for dic in sido_list]))

    return simple_sido_list

# 사용 중 260109
@router.get("/regions/sigungu/{sido_name}")
def get_sigungu_list(sido_name):
    sigungu_list = db.get_sigungu(sido_name)
    simple_sigungu_list = sorted(set([dic['sigungu'] for dic in sigungu_list if dic['sigungu'] is not None]))

    if len(simple_sigungu_list) == 0 :
        raise HTTPException(status_code=404, detail="해당 지역(시/도)을 찾을 수 없습니다.")
    
    return simple_sigungu_list

# 사용 중 260109
# 이렇게 하면 근데 parameter로 sigungu가 안넘어왔을 때 예외처리를 안해도 되나?
@router.get("/regions/apart")
def get_apart_list(sido_name, sigungu_name) :
    region_code = db.get_region_code(sido_name, sigungu_name)
    apart_list = oa.get_recent_3months_apt_trades(region_code)
    apart_name_list = sorted(set([apart.get('aptNm') for apart in apart_list]))
    # print(apart_name_list)

    return apart_name_list


# 사용 중 260109
@router.post("/favorites/{policy_id}")
def toggle_favorite(policy_id: str, request: Request):
    user_id = request.session.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="로그인 필요")

    return db.toggle_favorite(user_id, policy_id)


# 사용 중 260109
@router.get("/favorites/me")
def get_favorite_policies_list(request: Request):
    return db.get_my_favorite_ids(request.session.get('user_id'))


# 1. 기본 접속 테스트
@router.get("/")
def read_root():
    return {"message": "부동산 정책 추천 서비스 API에 오신 것을 환영합니다! 🚀"}

# 2. 전체 정책 조회 API
@router.get("/policies")
def read_policies():
    return db.get_all_policies_output()

# 3. 특정 정책 상세 조회 API
@router.get("/policies/{policy_id}")
def read_policy_detail(policy_id: int):
    policy = db.get_policy_output_by_id(policy_id)
    if policy is None:
        raise HTTPException(status_code=404, detail="해당 정책을 찾을 수 없습니다.")
    return policy

# (참고) 서버 실행은 터미널에서: uvicorn main:app --reload


@router.get("/auth/kakao")
def kakao_login():
    # 사용자를 카카오 로그인 페이지로 튕겨버리는 역할
    kakao_auth_url = (
        f"https://kauth.kakao.com/oauth/authorize?"
        f"client_id={os.getenv('KAKAO_CLIENT_ID')}&"
        f"redirect_uri={os.getenv('KAKAO_REDIRECT_URI')}&"
        f"response_type=code"
    )
    return RedirectResponse(kakao_auth_url)


@router.get("/auth/kakao/callback")
async def kakao_callback(code: str, request: Request):
    # 1. 받은 코드(code)로 토큰(Token) 달라고 카카오에 요청
    try :
        async with httpx.AsyncClient() as client:
            token_res = await client.post(
                "https://kauth.kakao.com/oauth/token",
                headers={"Content-Type": "application/x-www-form-urlencoded"},
                data={
                    "grant_type": "authorization_code",
                    "client_id": os.getenv("KAKAO_CLIENT_ID"),
                    "redirect_uri": os.getenv("KAKAO_REDIRECT_URI"),
                    "code": code,
                    "client_secret": os.getenv("KAKAO_CLIENT_SECRET"),
                },
            )
            token_json = token_res.json()

            if "error" in token_json:
                print(f"카카오 토큰 발급 실패: {token_json}")
                return RedirectResponse("https://jipsalddae.co.kr/login?error=kakao_failed")

            access_token = token_json.get("access_token")

            # 2. 토큰으로 사용자 정보 가져오기
            user_info_res = await client.get(
                "https://kapi.kakao.com/v2/user/me",
                headers={"Authorization": f"Bearer {access_token}"},
            )
            user_info = user_info_res.json()
        
        kakao_id = user_info.get("id")
        if not kakao_id:
            print(f"카카오 유저 정보 조회 실패: {user_info}")
            return RedirectResponse("https://jipsalddae.co.kr/login?error=kakao_failed")

        # 카카오에서 준 정보 파싱
        kakao_id = str(user_info.get("id"))
        nickname = user_info.get("properties", {}).get("nickname")
        # 이메일은 동의 안 하면 없을 수도 있음
        email = user_info.get("kakao_account", {}).get("email") 
        
        # 3. DB 처리 (회원가입 or 로그인) -> database.py에 함수 만들어야 함
        # username을 'kakao_12345' 이런 식으로 만들어서 중복 방지
        username = f"kakao_{kakao_id}"
        
        # 이 함수는 아래 4단계에서 만들 예정입니다.
        user_data = db.get_or_create_social_user(
            username=username, 
            nickname=nickname, 
            social_id=kakao_id, 
            provider="kakao"
        )
        
        # 4. 세션 생성 (로그인 처리)
        request.session['user_id'] = str(user_data['user_id'])
        request.session['nickname'] = user_data['nickname']
        request.session['has_info'] = user_data['has_info']
        
        # 5. 프론트엔드 메인페이지로 리다이렉트
        return RedirectResponse("https://jipsalddae.co.kr/main")
    
    except Exception as e:
        print(f"카카오 로그인 에러: {e}")
        # [추가] 예상치 못한 에러가 나도 로그인 페이지로 반송
        return RedirectResponse("https://jipsalddae.co.kr/login?error=server_error")

@router.get("/auth/naver")
def naver_login():
    # state: 사이트 간 위조 공격 방지용 랜덤 문자열 (네이버 필수 권장)
    state = secrets.token_hex(16)
    
    naver_auth_url = (
        f"https://nid.naver.com/oauth2.0/authorize?"
        f"response_type=code&"
        f"client_id={os.getenv('NAVER_CLIENT_ID')}&"
        f"redirect_uri={os.getenv('NAVER_REDIRECT_URI')}&"
        f"state={state}"
    )
    return RedirectResponse(naver_auth_url)


@router.get("/auth/naver/callback")
async def naver_callback(code: str, state: str, request: Request):
    # 1. 토큰 발급 요청
    try :
        async with httpx.AsyncClient() as client:
            token_res = await client.post(
                "https://nid.naver.com/oauth2.0/token",
                data={
                    "grant_type": "authorization_code",
                    "client_id": os.getenv("NAVER_CLIENT_ID"),
                    "client_secret": os.getenv("NAVER_CLIENT_SECRET"),
                    "code": code,
                    "state": state,
                },
            )
            token_json = token_res.json()
            access_token = token_json.get("access_token")

            # 2. 사용자 정보 요청
            user_info_res = await client.get(
                "https://openapi.naver.com/v1/nid/me",
                headers={"Authorization": f"Bearer {access_token}"},
            )
            user_info_json = user_info_res.json()
        
        # [중요] 네이버는 정보가 'response'라는 키 안에 한 번 더 감싸져 있습니다.
        # if user_info_json.get("resultcode") != "00":
        #     raise HTTPException(status_code=400, detail="네이버 로그인 실패")
        if user_info_json.get("resultcode") != "00":
                # [수정 전] raise HTTPException(...)
                # [수정 후] 에러 꼬리표 달고 로그인 페이지로 반송
            return RedirectResponse("https://jipsalddae.co.kr/login?error=naver_failed")

        naver_account = user_info_json.get("response") # 여기를 잘 꺼내야 함!
        
        social_id = naver_account.get("id")          # 네이버 고유 ID
        nickname = naver_account.get("nickname")     # 별명
        email = naver_account.get("email")           # 이메일
        
        # 3. DB 처리 (database.py에 이미 만들어둔 함수 재사용!)
        # provider를 'naver'로 넘깁니다.
        username = f"naver_{social_id}"
        
        user_data = db.get_or_create_social_user(
            username=username, 
            nickname=nickname, 
            social_id=social_id, 
            provider="naver"
        )
        
        # 4. 세션 생성 (로그인 처리)
        request.session['user_id'] = str(user_data['user_id'])
        request.session['nickname'] = user_data['nickname']
        request.session['has_info'] = user_data['has_info']
        
        # 5. 메인으로 복귀
        return RedirectResponse("https://jipsalddae.co.kr/main")
    
    except Exception as e:
        print(f"네이버 로그인 에러: {e}")
        # [추가] 예상치 못한 에러가 나도 로그인 페이지로 반송
        return RedirectResponse("https://jipsalddae.co.kr/login?error=server_error")
    
app.include_router(router)

if __name__ == "__main__":
    import uvicorn
    # 여기에 host="0.0.0.0"을 적어두면, 앞으로는 그냥 실행해도 외부 접속이 됩니다.
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)