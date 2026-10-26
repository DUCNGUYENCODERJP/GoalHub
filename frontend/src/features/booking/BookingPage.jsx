import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

/**
 * BookingPage — Theo quy trình đặt vé nguyên tử (Lựa chọn 1),
 * việc chọn ghế và tạo đơn giữ chỗ được thực hiện trực tiếp trên sơ đồ sân (/matches/:id).
 * Trang này tự động điều hướng người dùng về sơ đồ trận đấu.
 */
export default function BookingPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    toast('Vui lòng chọn ghế trực tiếp trên sơ đồ khán đài', { icon: '🏟️' });
    navigate(`/matches/${id}`, { replace: true });
  }, [id, navigate]);

  return null;
}
