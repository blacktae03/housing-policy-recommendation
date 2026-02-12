import psycopg2
from psycopg2.extras import RealDictCursor # 결과를 딕셔너리로 받기 위함
import os
from dotenv import load_dotenv
import bcrypt
import pandas as pd

# .env 파일에서 정보 읽어오기
load_dotenv()

def test():
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    cursor.execute("SELECT * FROM policies")
    # result = cursor.fetchone()
    # print(result['policy_name'])
    # result = cursor.fetchone()
    # print(result['policy_name'])
    # result = cursor.fetchone()
    # print(result['policy_name'])
    result = cursor.fetchall()
    print(type(result))

    for content in result:
        print(content['policy_name'])
    
    print("-----")
    print(result[0]['policy_name'])
    print(result[2]['policy_name'])
    
    cursor.close()
    conn.close()
    return result

# policies is_first 추가
# policies_output house_size 추가

def init_db():
    """서버 시작 시 DB 테이블을 자동 생성하고 기초 데이터를 입력함"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        print("--- [DB 초기화 및 테이블 점검 시작] ---")
        
        # 1. 확장 기능 및 기본 테이블 생성
        cursor.execute('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";')

        # [부모] policies_output
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS policies_output (
                policy_id INT PRIMARY KEY,
                policy_name VARCHAR(255),
                category VARCHAR(100),
                policy_type VARCHAR(100),
                max_house_price VARCHAR(255),
                region VARCHAR(100),
                max_benefit_amount BIGINT,
                min_rate VARCHAR(50),
                max_rate VARCHAR(50),
                house_size VARCHAR(100),
                max_duration_year VARCHAR(100),
                policy_url TEXT,
                "desc" TEXT
            );
        """)

        # [자식] policies
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS policies (
                id SERIAL PRIMARY KEY,
                policy_id INT REFERENCES policies_output(policy_id) ON DELETE CASCADE,
                policy_name VARCHAR(255),
                income BIGINT,
                req_newborn BOOLEAN,
                req_newlywed BOOLEAN,
                min_children INT,
                min_age INT,
                max_age INT,
                house_owner_allowed BOOLEAN,
                asset_limit BIGINT,
                is_first BOOLEAN
            );
        """)

        # Users 테이블
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                username VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255),
                nickname VARCHAR(100),
                provider VARCHAR(50),
                social_id VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)

        # User_info 테이블
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS user_info (
                info_id SERIAL PRIMARY KEY,
                user_id UUID UNIQUE REFERENCES users(user_id) ON DELETE CASCADE,
                birth_date DATE,
                income BIGINT,
                asset BIGINT,
                is_house_owner BOOLEAN DEFAULT FALSE,
                has_newborn BOOLEAN DEFAULT FALSE,
                is_newlywed BOOLEAN DEFAULT FALSE,
                child_count INT DEFAULT 0,
                household_size INT,
                dual_income BOOLEAN,
                is_married BOOLEAN DEFAULT FALSE,
                is_single_parent BOOLEAN DEFAULT FALSE,
                is_disabled BOOLEAN DEFAULT FALSE,
                is_multicultural BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)

        # Favorites 테이블
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS favorites (
                favorite_id SERIAL PRIMARY KEY,
                user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
                policy_id INT REFERENCES policies_output(policy_id) ON DELETE CASCADE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, policy_id)
            );
        """)

        conn.commit()
        print("✅ 테이블 구조 확인 완료")

        # 2. 기초 데이터 자동 입력 (데이터가 없을 때만 실행)
        cursor.execute("SELECT COUNT(*) FROM policies_output;")
        if cursor.fetchone()[0] == 0:
            print("📦 정책 데이터 입력을 시작합니다...")
            
            # 파일 경로 (서버 환경에 맞춰 수정)
            out_csv = '주택공급정책_출력.csv' 
            cond_csv = '주택공급정책_조건.csv'

            if os.path.exists(out_csv) and os.path.exists(cond_csv):
                # 출력 데이터 입력
                df_out = pd.read_csv(out_csv)
                df_out = df_out.where(pd.notnull(df_out), None)
                for _, row in df_out.iterrows():
                    cursor.execute("""
                        INSERT INTO policies_output VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """, tuple(row))

                # 조건 데이터 입력 (이미 True/False로 변환됨)
                df_cond = pd.read_csv(cond_csv)
                df_cond = df_cond.where(pd.notnull(df_cond), None)
                for _, row in df_cond.iterrows():
                    cursor.execute("""
                        INSERT INTO policies (policy_id, policy_name, income, req_newborn, req_newlywed, min_children, min_age, max_age, house_owner_allowed, asset_limit, is_first)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """, tuple(row))
                
                conn.commit()
                print("✅ 정책 데이터 입력 성공!")
            else:
                print("⚠️ CSV 파일을 찾을 수 없습니다. 경로를 확인해주세요.")

    except Exception as e:
        print(f"❌ 에러 발생: {e}")
        conn.rollback()
    finally:
        cursor.close()
        conn.close()


# db 연결 251230
def get_db_connection():
    """PostgreSQL DB 연결 객체 생성"""
    conn = psycopg2.connect(
        host=os.getenv("DB_HOST"),
        database=os.getenv("DB_NAME"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASS"),
        port=os.getenv("DB_PORT")
    )
    return conn


def get_all_policies():
    conn = get_db_connection()
    # RealDictCursor: 결과를 딕셔너리 형태(JSON)로 받아줌
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    cursor.execute("SELECT * FROM policies")
    result = cursor.fetchall()
    
    cursor.close()
    conn.close()
    return result

def get_all_policies_output():
    conn = get_db_connection()
    # RealDictCursor: 결과를 딕셔너리 형태(JSON)로 받아줌
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    cursor.execute("SELECT * FROM policies_output")
    result = cursor.fetchall()
    
    cursor.close()
    conn.close()
    return result

def get_policy_output_by_id(policy_id: int):
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    # [주의] SQLite는 ?, PostgreSQL은 %s를 사용합니다!
    cursor.execute("SELECT * FROM policies_output WHERE policy_id = %s", (policy_id,))
    result = cursor.fetchone()
    
    cursor.close()
    conn.close()
    return result


# 251231
def create_user(user_data: dict):
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        # 1. users 테이블에 계정 정보 저장
        # 중요: INSERT 후에 'RETURNING user_id'를 써서 생성된 UUID를 바로 받아옵니다.
        cursor.execute("""
            INSERT INTO users (username, password, nickname) 
            VALUES (%s, %s, %s)
            RETURNING user_id
        """, (
            user_data['username'],
            user_data['password'],
            user_data['nickname']
        ))
        
        # 2. 방금 만들어진 UUID 가져오기
        new_user_id = cursor.fetchone()['user_id']
        # new_user_id = cursor.fetchone()
        # print(new_user_id)
        # new_user_id = new_user_id[0]
        conn.commit()
        
        return new_user_id  # 성공하면 UUID를 리턴!
        
    except psycopg2.IntegrityError:
        conn.rollback()
        return None  # 중복 아이디 등으로 실패하면 None 리턴
    except Exception as e:
        print(f"회원가입 에러: {e}")
        conn.rollback()
        return None
    finally:
        cursor.close()
        conn.close()

# 260106
def save_user_info(user_id, info_data: dict):
    conn = get_db_connection()
    cursor = conn.cursor()

    is_single_parent = "한부모가정" in info_data['etc']
    is_disabled = "장애인가구" in info_data['etc']
    is_multicultural = "다문화가정" in info_data['etc']
    
    try:
        # 이 SQL문이 핵심입니다.
        query = """
            INSERT INTO user_info (
                user_id, birth_date, income, asset, 
                is_house_owner, has_newborn, is_newlywed, child_count,
                household_size, dual_income, is_married, is_single_parent, is_disabled, is_multicultural
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            
            ON CONFLICT (user_id) 
            DO UPDATE SET
                birth_date = EXCLUDED.birth_date,
                income = EXCLUDED.income,
                asset = EXCLUDED.asset,
                is_house_owner = EXCLUDED.is_house_owner,
                has_newborn = EXCLUDED.has_newborn,
                is_newlywed = EXCLUDED.is_newlywed,
                child_count = EXCLUDED.child_count,
                household_size = EXCLUDED.household_size,
                dual_income = EXCLUDED.dual_income,
                is_married = EXCLUDED.is_married,
                is_single_parent = EXCLUDED.is_single_parent,
                is_disabled = EXCLUDED.is_disabled,
                is_multicultural = EXCLUDED.is_multicultural;
        """
        
        # EXCLUDED.컬럼명 의미: 
        # "방금 INSERT 하려고 했던 그 새로운 값(EXCLUDED)"으로 
        # 기존 데이터를 덮어씌워라(UPDATE)라는 뜻입니다.

        cursor.execute(query, (
            user_id,
            info_data['birth_date'],
            info_data['income'],
            info_data['asset'],
            info_data['is_house_owner'],
            info_data['has_newborn'],
            info_data['is_newlywed'],
            info_data['child_count'],
            info_data['household_size'],
            info_data['dual_income'],
            info_data['is_married'],
            is_single_parent,
            is_disabled,
            is_multicultural
        ))
        
        conn.commit()
        return True
        
    except Exception as e:
        print(f"정보 저장/수정 실패: {e}")
        conn.rollback()
        return False
    finally:
        cursor.close()
        conn.close()


def get_user_by_username(username: str):
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    cursor.execute("SELECT * FROM users WHERE username = %s", (username,))
    result = cursor.fetchone()
    
    cursor.close()
    conn.close()
    return result

# 251231, login
def authenticate_user(username, input_password):
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor) # 딕셔너리로 받기
    
    try:
        # 1. 아이디로 유저 찾기 (비밀번호는 아직 비교 안 함)
        # users 테이블과 user_info 테이블을 LEFT JOIN해서 정보 입력 여부까지 한 번에 봅니다.
        cursor.execute("""
            SELECT u.user_id, u.password, u.nickname,
                   (ui.info_id IS NOT NULL) as has_info 
            FROM users u
            LEFT JOIN user_info ui ON u.user_id = ui.user_id
            WHERE u.username = %s
        """, (username,))
        
        user = cursor.fetchone()

        print(user)
        
        # 2. 유저가 없으면 실패
        if not user:
            return None 

        # 3. 비밀번호 검증 (DB에 있는 해시된 비번 vs 입력한 비번)
        # 주의: check_password 함수는 위에서 만든 걸 씁니다.
        db_password = user['password']
        
        if check_password(input_password, db_password):
            # 4. 로그인 성공! 세션에 저장할 정보를 리턴합니다.
            return {
                'user_id': str(user['user_id']), # UUID는 문자열로 변환해서 주는 게 안전
                'nickname': user['nickname'],
                'has_info': user['has_info']     # 정보 입력했으면 True, 안했으면 False
            }
        else:
            # 비밀번호 틀림
            return None
            
    except Exception as e:
        print(f"로그인 오류: {e}")
        return None
    finally:
        cursor.close()
        conn.close()

# 1. 비밀번호를 암호화하는 함수 (회원가입 할 때 씀)
def hash_password(plain_password):
    # '1234'를 받아서 '$2b$12$...' 같은 알 수 없는 문자열로 바꿉니다.
    # encode('utf-8')은 문자열을 바이트로 변환하는 과정입니다.
    return bcrypt.hashpw(plain_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

# 2. 비밀번호가 맞는지 확인하는 함수 (로그인 할 때 씀)
def check_password(plain_password, hashed_password):
    # 사용자가 입력한 비번('1234')과 DB에 있는 암호('xkdl$...')가 일치하는지 수학적으로 확인합니다.
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))


# [database.py] 맨 아래에 추가
def get_user_info(user_id):
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        # user_info 테이블에서 해당 user_id의 정보를 싹 가져옵니다.
        cursor.execute("SELECT * FROM user_info WHERE user_id = %s", (user_id,))
        result = cursor.fetchone()
        return result
    finally:
        cursor.close()
        conn.close()

#260101
def get_income_rule(policy_id):
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        # income_rule 테이블에서 해당 policy_id의 정보를 싹 가져옵니다.
        cursor.execute("SELECT * FROM income_rules WHERE policy_id = %s", (policy_id,))
        result = cursor.fetchall()
        return result if len(result) == 1 else {row['target_type']: row['income_limit'] for row in result}
    finally:
        cursor.close()
        conn.close()

def get_household_income_standard(household_size):
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        # income_rule 테이블에서 해당 policy_id의 정보를 싹 가져옵니다.
        cursor.execute("SELECT * FROM household_income_standard100 WHERE household_size = %s", (household_size,))
        result = cursor.fetchone()
        return result
    finally:
        cursor.close()
        conn.close()


def get_region_code(sido, sigungu):
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        # income_rule 테이블에서 해당 policy_id의 정보를 싹 가져옵니다.
        cursor.execute("SELECT code FROM region_code WHERE sido = %s AND sigungu = %s", (sido, sigungu))
        result = cursor.fetchone()
        # print(result)
        return result['code']
    finally:
        cursor.close()
        conn.close()


def get_sido():
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        # income_rule 테이블에서 해당 policy_id의 정보를 싹 가져옵니다.
        cursor.execute("SELECT sido FROM region_code")
        result = cursor.fetchall()
        # print(result)
        return result
    finally:
        cursor.close()
        conn.close()

def get_sigungu(sido_name):
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        cursor.execute("SELECT sigungu FROM region_code WHERE sido = %s", (sido_name,))
        result = cursor.fetchall()
        return result
    finally:
        cursor.close()
        conn.close()


# [database.py] 맨 아래에 추가

def toggle_favorite(user_id, policy_id):
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor) # 딕셔너리로 결과 받기

    try:
        # 1. 일단 조회를 먼저 합니다. (이 사람이 이 정책을 찜했는지?)
        cursor.execute("""
            SELECT * FROM favorites 
            WHERE user_id = %s AND policy_id = %s
        """, (user_id, policy_id))
        
        existing = cursor.fetchone()

        if existing:
            # 2-A. 이미 있으면 -> 삭제 (DELETE)
            cursor.execute("""
                DELETE FROM favorites 
                WHERE user_id = %s AND policy_id = %s
            """, (user_id, policy_id))
            
            conn.commit() # ★ 변경사항 저장 필수!
            return {"status": "removed", "isFavorite": False, "message": "즐겨찾기 해제"}
            
        else:
            # 2-B. 없으면 -> 추가 (INSERT)
            cursor.execute("""
                INSERT INTO favorites (user_id, policy_id) 
                VALUES (%s, %s)
            """, (user_id, policy_id))
            
            conn.commit() # ★ 변경사항 저장 필수!
            return {"status": "added", "isFavorite": True, "message": "즐겨찾기 등록"}

    except Exception as e:
        print(f"즐겨찾기 토글 에러: {e}")
        conn.rollback() # 에러나면 되돌리기
        return None
    finally:
        cursor.close()
        conn.close()


def get_my_favorite_ids(user_id):
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)

    try:
        # 내 user_id로 된 정책 ID들만 싹 긁어옵니다.
        cursor.execute("""
            SELECT policy_id FROM favorites WHERE user_id = %s
        """, (user_id,))
        
        result = cursor.fetchall()
        
        # result는 [{'policy_id': 'P001'}, {'policy_id': 'P002'}] 형태임
        # 이걸 ['P001', 'P002'] 형태의 깔끔한 리스트로 변환
        return [row['policy_id'] for row in result]
        
    except Exception as e:
        print(f"내 즐겨찾기 목록 조회 에러: {e}")
        return []
    finally:
        cursor.close()
        conn.close()


def get_or_create_social_user(username, nickname, social_id, provider):
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        # 1. 이미 가입된 소셜 유저인지 확인
        cursor.execute("""
            SELECT u.user_id, u.nickname, u.username,
                   (ui.info_id IS NOT NULL) as has_info 
            FROM users u
            LEFT JOIN user_info ui ON u.user_id = ui.user_id
            WHERE u.username = %s AND u.provider = %s
        """, (username, provider))
        
        existing_user = cursor.fetchone()
        
        if existing_user:
            # 2. 이미 있으면 그 정보 리턴 (로그인)
            return existing_user
        else:
            # 3. 없으면 새로 생성 (회원가입)
            # 소셜 로그인은 비밀번호가 없으므로 NULL로 저장
            cursor.execute("""
                INSERT INTO users (username, nickname, provider, social_id, password)
                VALUES (%s, %s, %s, %s, NULL)
                RETURNING user_id
            """, (username, nickname, provider, social_id))
            
            new_user_id = cursor.fetchone()['user_id']
            conn.commit()
            
            # 새로 가입했으니 has_info는 당연히 False
            return {
                'user_id': new_user_id,
                'nickname': nickname,
                'has_info': False
            }
            
    except Exception as e:
        print(f"소셜 로그인 DB 처리 중 에러: {e}")
        conn.rollback()
        return None
    finally:
        cursor.close()
        conn.close()