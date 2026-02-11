import axios from "axios";

const api = axios.create({
  baseURL: "https://jipsalddae.co.kr/api", // FastAPI 주소 (여기만 바꾸면 모든 요청 주소가 바뀜)
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, // 나중에 쿠키/세션 쓸 때 필요
});

export default api;