import pandas as pd
from database import get_db_connection
import os

def init_db():
    """서버 시작 시 CSV 파일의 컬럼명과 일치하게 테이블을 생성하고 데이터를 입력함"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        print("--- [DB 초기화 및 테이블 점검 시작] ---")
        
        # 0. 권한 부여 및 확장 기능
        try:
            cursor.execute('GRANT ALL ON SCHEMA public TO public;')
        except:
            pass
        cursor.execute('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";')

        # 1. 테이블 생성 (업로드하신 CSV 컬럼명에 맞춤)

        # Users 테이블 (users_202602121757.csv 기준)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                username VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255),
                nickname VARCHAR(100),
                social_id VARCHAR(255),
                provider VARCHAR(50),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)

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

        # User_info 테이블 (user_info_202602121757.csv 기준 - 컬럼 순서 일치)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS user_info (
                info_id SERIAL PRIMARY KEY,
                user_id UUID UNIQUE REFERENCES users(user_id) ON DELETE CASCADE,
                income BIGINT,
                asset BIGINT,
                is_house_owner BOOLEAN DEFAULT FALSE,
                has_newborn BOOLEAN DEFAULT FALSE,
                is_newlywed BOOLEAN DEFAULT FALSE,
                child_count INT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                household_size INT,
                dual_income BOOLEAN,
                birth_date DATE,
                is_married BOOLEAN DEFAULT FALSE,
                is_single_parent BOOLEAN DEFAULT FALSE,
                is_disabled BOOLEAN DEFAULT FALSE,
                is_multicultural BOOLEAN DEFAULT FALSE
            );
        """)

        # Favorites 테이블 (favorites_202602121757.csv 기준 - id로 컬럼명 변경)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS favorites (
                id SERIAL PRIMARY KEY,
                user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
                policy_id INT REFERENCES policies_output(policy_id) ON DELETE CASCADE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, policy_id)
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

        # 지역 코드 테이블 (지역코드.csv 기준)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS region_code (
                code VARCHAR(10) PRIMARY KEY,
                sido VARCHAR(50) NOT NULL,
                sigungu VARCHAR(50)
            );
        """)

        # 평균 소득 기준 테이블 (평균소득.csv 기준)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS household_income_standard100 (
                household_size INT PRIMARY KEY,
                monthly_income BIGINT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)

        conn.commit()
        print("✅ 모든 테이블 구조 생성 및 확인 완료 (CSV 컬럼명 동기화)")

        # 2. 기초 데이터 자동 입력 (데이터가 없는 테이블만 입력)
        
        # (1) 정책 출력 데이터
        cursor.execute("SELECT COUNT(*) FROM policies_output;")
        if cursor.fetchone()[0] == 0:
            file_path = '주택공급정책_출력.csv'
            if os.path.exists(file_path):
                df = pd.read_csv(file_path).where(pd.notnull(pd.read_csv(file_path)), None)
                for _, row in df.iterrows():
                    cursor.execute("INSERT INTO policies_output VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)", tuple(row))
                print(f"✅ {file_path} 데이터 입력 완료")

        # (2) 정책 조건 데이터
        cursor.execute("SELECT COUNT(*) FROM policies;")
        if cursor.fetchone()[0] == 0:
            file_path = '주택공급정책_조건.csv'
            if os.path.exists(file_path):
                df = pd.read_csv(file_path).where(pd.notnull(pd.read_csv(file_path)), None)
                for _, row in df.iterrows():
                    cursor.execute("INSERT INTO policies (policy_id, policy_name, income, req_newborn, req_newlywed, min_children, min_age, max_age, house_owner_allowed, asset_limit, is_first) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)", tuple(row))
                print(f"✅ {file_path} 데이터 입력 완료")

        # (3) 지역 코드 데이터
        cursor.execute("SELECT COUNT(*) FROM region_code;")
        if cursor.fetchone()[0] == 0:
            file_path = '지역코드.csv'
            if os.path.exists(file_path):
                df = pd.read_csv(file_path).where(pd.notnull(pd.read_csv(file_path)), None)
                df['code'] = df['code'].astype(str)
                for _, row in df.iterrows():
                    cursor.execute("INSERT INTO region_code (code, sido, sigungu) VALUES (%s, %s, %s)", tuple(row))
                print(f"✅ {file_path} 데이터 입력 완료")

        # (4) 평균 소득 데이터
        cursor.execute("SELECT COUNT(*) FROM household_income_standard100;")
        if cursor.fetchone()[0] == 0:
            file_path = '평균소득.csv'
            if os.path.exists(file_path):
                df = pd.read_csv(file_path).where(pd.notnull(pd.read_csv(file_path)), None)
                for _, row in df.iterrows():
                    # CSV에 created_at이 포함되어 있으므로 명시적으로 입력
                    cursor.execute("INSERT INTO household_income_standard100 (household_size, monthly_income, created_at) VALUES (%s, %s, %s)", tuple(row))
                print(f"✅ {file_path} 데이터 입력 완료")

        conn.commit()

    except Exception as e:
        print(f"❌ 에러 발생: {e}")
        conn.rollback()
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    init_db()