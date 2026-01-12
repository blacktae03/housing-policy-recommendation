import requests
import os
from datetime import date
from dateutil.relativedelta import relativedelta # 월 단위 계산용
from dotenv import load_dotenv

# 환경변수 로드 (.env 파일에 SERVICE_KEY가 있어야 함)
load_dotenv()

def get_recent_3months_apt_trades(region_code: str):
    """
    region_code(예: 11110)를 받아서
    최근 3개월(이번 달 포함)의 아파트 실거래가 데이터를 모두 가져와 리스트로 반환
    """
    
    # 1. 공공데이터포털 API 기본 설정
    # (반드시 'Decoding' 키를 사용하세요. .env에 저장된 키를 가져옵니다)
    service_key = os.getenv("PUBLIC_DATA_DECODING_KEY") 
    base_url = "http://apis.data.go.kr/1613000/RTMSDataSvcAptTrade/getRTMSDataSvcAptTrade"
    
    all_apt_list = [] # 결과를 모두 담을 리스트
    
    # 2. 오늘 날짜 기준 최근 3개월 계산 (0: 이번 달, 1: 지난달, 2: 지지난달)
    today = date.today()
    
    for i in range(3):
        # i개월 전 날짜 계산
        target_date = today - relativedelta(months=i)
        deal_ymd = target_date.strftime("%Y%m") # 예: 202407
        
        print(f"📡 API 요청 중... 지역: {region_code}, 기간: {deal_ymd}")
        
        params = {
            "serviceKey": service_key,
            "LAWD_CD": region_code, # 지역코드 5자리
            "DEAL_YMD": deal_ymd,   # 계약월 (YYYYMM)
            "pageNo": "1",
            "numOfRows": "1000",    # 한 번에 많이 가져오기 (보통 구 단위 한 달 거래량은 1000건 안 넘음)
            "_type": "json"         # 결과 형식을 JSON으로 요청
        }
        
        try:
            # [디버깅 코드] 요청 직전에 URL을 출력해서 클릭해보기
            # print(f"👉 실제 요청 URL: {base_url}?serviceKey={service_key}&LAWD_CD={region_code}&DEAL_YMD={deal_ymd}&_type=json")
            response = requests.get(base_url, params=params)
            # print(response.text)
            
            # 응답 상태 확인
            if response.status_code != 200:
                print(f"❌ API 오류 발생: {response.status_code}")
                continue
                
            data = response.json()
            # print(data)
            
            # 3. 데이터 파싱 및 예외 처리
            # 데이터 구조: response -> body -> items -> item
            items = data.get('response', {}).get('body', {}).get('items')
            # print(items)
            
            if items:
                item_list = items.get('item')
                
                # 거래 내역이 1개일 경우 dict로 오고, 여러 개일 경우 list로 옴 -> list로 통일
                if isinstance(item_list, dict):
                    all_apt_list.append(item_list)
                elif isinstance(item_list, list):
                    all_apt_list.extend(item_list) # 리스트 합치기
                    
        except Exception as e:
            print(f"⚠️ 데이터 처리 중 에러 발생 ({deal_ymd}): {e}")
            # JSON 변환 실패 등(XML로 오는 경우) 에러가 나도 다음 달 데이터는 조회해야 하므로 pass
            pass

    print(f"✅ 총 {len(all_apt_list)}건의 거래 정보를 가져왔습니다.")
    return all_apt_list

# --- 사용 예시 (테스트용) ---
# if __name__ == "__main__":
#     # 종로구(11110) 테스트
#     result = get_recent_3months_apt_trades("11110")
#     print(result[0] if result else "데이터 없음")