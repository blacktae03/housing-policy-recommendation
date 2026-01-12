import api from "@/api/axios";
import { Button } from "@/components/ui/button";

const Test = () => {
    const checkSession = async () => {
        try {
            // 백엔드에 "나 누구야?" 라고 물어봄 (쿠키는 알아서 같이 날아감)
            const response = await api.get("/user/me");
            
            console.log("세션 까봤더니 나온 결과:", response.data);
            alert(`당신은 [${response.data.nickname}]님이시군요!`);
    
            console.log(response.data.result)
            
        } catch (error) {
            console.error("확인 실패:", error);
            alert("로그인 상태가 아닙니다 (세션 만료됨)");
        }
    };
    
    return (
        <Button onClick={checkSession}>내 세션 정보 확인하기</Button>
    );
};

export default Test;