import axios from "axios";

// 쿠키에서 특정 값을 읽어오는 헬퍼 함수
function getCookie(name) {
  let cookieValue = null;
  if (document.cookie && document.cookie !== "") {
    const cookies = document.cookie.split(";");
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      // 쿠키 이름이 원하는 이름과 일치하는지 확인
      if (cookie.substring(0, name.length + 1) === name + "=") {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}

const api = axios.create({
  baseURL: "https://jipsalddae.co.kr/api", // FastAPI 주소 (여기만 바꾸면 모든 요청 주소가 바뀜)
  // baseURL: "http://localhost:8000/api", // FastAPI 주소 (여기만 바꾸면 모든 요청 주소가 바뀜)
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, // 나중에 쿠키/세션 쓸 때 필요
});

// Axios 요청 인터셉터 추가
api.interceptors.request.use(
  (config) => {
    // POST, PUT, DELETE 등의 state-changing 메소드에 대해 CSRF 토큰을 헤더에 추가
    if (
      ["POST", "PUT", "DELETE", "PATCH"].includes(config.method.toUpperCase())
    ) {
      const csrfToken = getCookie("csrf_token");
      if (csrfToken) {
        config.headers["X-CSRF-Token"] = csrfToken;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;