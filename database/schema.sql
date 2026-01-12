-- [Table Creation Order]
-- 1. users
-- 2. policies
-- 3. region_code
-- 4. household_income_standard100
-- 5. user_info (Ref: users)
-- 6. income_rules (Ref: policies)
-- 7. favorites (Ref: users, policies)

-- UUID 생성 확장 기능 활성화
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Users Table (사용자 계정)
CREATE TABLE public.users (
	user_id uuid DEFAULT uuid_generate_v4() NOT NULL,
	username varchar(50) NOT NULL,
	"password" varchar(200) NOT NULL,
	nickname varchar(50) NOT NULL,
	CONSTRAINT users_pkey PRIMARY KEY (user_id),
	CONSTRAINT users_username_key UNIQUE (username)
);

-- 2. Policies Table (주거 정책 정보)
CREATE TABLE public.policies (
	policy_id int4 NOT NULL,
	category varchar(50) NULL,
	policy_type varchar(50) NULL,
	policy_name varchar(200) NULL,
	region varchar(50) NULL,
	max_house_price int8 NULL,
	req_newborn bool NULL,
	req_newlywed bool NULL,
	min_children int4 NULL,
	min_age int4 NULL,
	max_age int4 NULL,
	house_owner_allowed bool NULL,
	asset_limit int8 NULL,
	max_benefit_amount int8 NULL,
	min_rate float8 NULL,
	max_rate float8 NULL,
	max_duration_year int4 NULL,
	policy_url text NULL,
	"desc" text NULL,
	CONSTRAINT policies_pkey PRIMARY KEY (policy_id)
);

-- 3. Region Code (법정동 코드)
CREATE TABLE public.region_code (
	code bpchar(5) NOT NULL,
	sido varchar(20) NOT NULL,
	sigungu varchar(30) NULL,
	CONSTRAINT region_code_pkey PRIMARY KEY (code)
);

-- 4. Income Standard (중위소득 기준표)
CREATE TABLE public.household_income_standard100 (
	household_size int4 NOT NULL,
	monthly_income int8 NOT NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT household_income_standard100_pkey PRIMARY KEY (household_size)
);

-- 5. User Info (사용자 상세 정보)
CREATE TABLE public.user_info (
	info_id serial4 NOT NULL,
	user_id uuid NOT NULL,
	income int8 NULL,
	asset int8 NULL,
	is_house_owner bool DEFAULT false NULL,
	has_newborn bool DEFAULT false NULL,
	is_newlywed bool DEFAULT false NULL,
	child_count int4 DEFAULT 0 NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	household_size int4 NULL,
	dual_income bool NULL,
	birth_date date NULL,
	is_married bool DEFAULT false NULL,
	is_single_parent bool DEFAULT false NULL,
	is_disabled bool DEFAULT false NULL,
	is_multicultural bool DEFAULT false NULL,
	CONSTRAINT user_info_pkey PRIMARY KEY (info_id),
	CONSTRAINT user_info_user_id_key UNIQUE (user_id),
	CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE
);

-- 6. Income Rules (정책별 소득 제한 규칙)
CREATE TABLE public.income_rules (
	rule_id serial4 NOT NULL,
	policy_id int4 NOT NULL,
	target_type varchar(100) NULL,
	income_limit int8 NULL,
	CONSTRAINT income_rules_pkey PRIMARY KEY (rule_id),
	CONSTRAINT fk_policy FOREIGN KEY (policy_id) REFERENCES public.policies(policy_id) ON DELETE CASCADE
);

-- 7. Favorites (즐겨찾기)
CREATE TABLE public.favorites (
	id serial4 NOT NULL,
	user_id uuid NOT NULL,
	policy_id int4 NOT NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT favorites_pkey PRIMARY KEY (id),
	CONSTRAINT user_policy UNIQUE (user_id, policy_id),
	CONSTRAINT fk_policy FOREIGN KEY (policy_id) REFERENCES public.policies(policy_id) ON DELETE CASCADE,
	CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE
);