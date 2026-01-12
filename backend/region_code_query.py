import sys

def generate_sql_file(input_file, output_file):
    print("데이터 변환을 시작합니다...")
    
    unique_codes = set() # 중복 방지용
    insert_statements = []

    # 파일 읽기 (인코딩은 보통 'cp949' 또는 'euc-kr' 입니다)
    with open(input_file, 'r', encoding='cp949', errors='replace') as f:
        for line in f:
            # 1. 데이터 파싱
            # 파일 형태: 1111000000 \t 서울특별시 종로구 \t 존재
            parts = line.split('\t')
            if len(parts) < 3:
                continue

            full_code = parts[0].strip() # 10자리 코드
            full_name = parts[1].strip() # 전체 주소
            status = parts[2].strip()    # 존재/폐지

            # 2. 필터링 로직
            # (1) '폐지'된 지역 제외
            if status != '존재':
                continue
            
            # (2) '동/리' 단위 제외하고 '시/군/구' 단위만 추출
            # 법정동코드 뒷자리가 '00000'인 것이 시/도 혹은 시/군/구 입니다.
            if not full_code.endswith('00000'):
                continue
            
            # 3. 데이터 가공
            code_5 = full_code[:5] # 앞 5자리만 추출 (LAWD_CD)
            
            # 이미 처리한 코드는 패스 (중복 방지)
            if code_5 in unique_codes:
                continue

            # 주소 분리 (시/도, 시/군/구)
            address_parts = full_name.split()
            
            sido = ""
            sigungu = ""

            if len(address_parts) >= 1:
                sido = address_parts[0] # 예: 서울특별시
            
            if len(address_parts) >= 2:
                # 예: 종로구 -> 종로구
                # 예: 수원시 장안구 -> 수원시 장안구 (API는 구 단위 코드가 필요하므로 합침)
                sigungu = " ".join(address_parts[1:]) 
            
            # 4. INSERT 문 생성
            # sigungu가 비어있으면(시/도 자체) NULL 처리, 아니면 값 입력
            if sigungu:
                sql = f"INSERT INTO region_code (code, sido, sigungu) VALUES ('{code_5}', '{sido}', '{sigungu}');"
            else:
                # 시/도 자체 데이터 (예: 서울특별시, 11000) - 필요하면 넣고, 필요 없으면 주석 처리
                sql = f"INSERT INTO region_code (code, sido, sigungu) VALUES ('{code_5}', '{sido}', NULL);"
            
            insert_statements.append(sql)
            unique_codes.add(code_5)

    # 파일로 저장
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write("TRUNCATE TABLE region_code;\n") # 기존 데이터 초기화
        for stmt in insert_statements:
            f.write(stmt + "\n")
            
    print(f"변환 완료! '{output_file}' 파일에 {len(insert_statements)}개의 쿼리가 저장되었습니다.")

# --- 실행 ---
input_filename = '법정동코드 전체자료.txt'  # 다운로드 받은 파일 경로
output_filename = 'insert_regions.sql'    # 생성될 SQL 파일
generate_sql_file(input_filename, output_filename)