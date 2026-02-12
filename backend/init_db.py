import pandas as pd
from database import get_db_connection # 기존 사용하시던 DB 연결 함수
import os

def init_db():
    """서버 시작 시 DB 테이블을 자동 생성하고 기초 데이터를 입력함"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        print("--- [DB 초기화 및 테이블 점검 시작] ---")
        
        # 1. UUID 확장 기능 활성화 (이게 있어야 user_id 자동 생성이 가능함)
        cursor.execute('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";')

        # [부모] policies_output: 정책의 텍스트 정보
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

        # [자식] policies: 정책의 필터링 조건 (O/X 데이터 포함)
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

        # Users 테이블: 회원 기본 정보
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

        # User_info 테이블: 회원 설문 데이터
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

        # Favorites 테이블: 즐겨찾기 (연결 고리)
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
        print("✅ 모든 테이블 구조 생성 및 확인 완료")

        # 2. 기초 데이터(CSV) 자동 입력
        cursor.execute("SELECT COUNT(*) FROM policies_output;")
        if cursor.fetchone()[0] == 0:
            print("📦 데이터가 비어있습니다. CSV 입력을 시작합니다...")
            
            # 파일 경로 확인 (서버의 현재 폴더에 파일이 있어야 함)
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

                # 조건 데이터 입력
                df_cond = pd.read_csv(cond_csv)
                df_cond = df_cond.where(pd.notnull(df_cond), None)
                for _, row in df_cond.iterrows():
                    cursor.execute("""
                        INSERT INTO policies (policy_id, policy_name, income, req_newborn, req_newlywed, min_children, min_age, max_age, house_owner_allowed, asset_limit, is_first)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """, tuple(row))
                
                conn.commit()
                print("✅ 정책 데이터 31건 입력 성공!")
            else:
                print("⚠️ CSV 파일을 찾을 수 없습니다. (경로를 확인해 주세요)")

    except Exception as e:
        print(f"❌ 에러 발생: {e}")
        conn.rollback()
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    init_db()