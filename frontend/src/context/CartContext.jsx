import { createContext, useContext, useState, useEffect } from 'react';
import toast from 'react-hot-toast';

const CartContext = createContext(null);

const HOLD_DURATION_SECONDS = 600; // 10 minutes

const INITIAL_ADDONS = [
  { id: 'scarf', name: 'Khăn Cổ Vũ ĐT Việt Nam', price: 85000, icon: '🧣', desc: 'Chất liệu dệt kim cao cấp' },
  { id: 'jersey', name: 'Áo Đấu Chính Hãng 2026', price: 280000, icon: '👕', desc: 'Thoáng khí, in logo sắc nét' },
  { id: 'snack', name: 'Combo Nước & Bắp Rang', price: 45000, icon: '🥤', desc: 'Nhận tại quầy tiếp tân sân' },
  { id: 'insurance', name: 'Bảo Hiểm Hoàn Vé 100%', price: 25000, icon: '🛡️', desc: 'Hoàn 100% nếu bận đột xuất' },
];

export function CartProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  const [matchData, setMatchData] = useState(() => {
    try {
      const saved = localStorage.getItem('goal_cart_match');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [selectedSeats, setSelectedSeats] = useState(() => {
    try {
      const saved = localStorage.getItem('goal_cart_seats');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [quantity, setQuantity] = useState(() => {
    try {
      const saved = localStorage.getItem('goal_cart_qty');
      return saved ? Number(saved) : 1;
    } catch {
      return 1;
    }
  });

  const [selectedAddons, setSelectedAddons] = useState(() => {
    try {
      const saved = localStorage.getItem('goal_cart_addons');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [promoCode, setPromoCode] = useState(() => {
    return localStorage.getItem('goal_cart_promo') || '';
  });

  const [discountPercent, setDiscountPercent] = useState(() => {
    return localStorage.getItem('goal_cart_promo') === 'GOALVN20' ? 20 : 0;
  });

  // Hold timer countdown in seconds
  const [timeLeft, setTimeLeft] = useState(HOLD_DURATION_SECONDS);

  // Synchronize localStorage
  useEffect(() => {
    if (matchData) localStorage.setItem('goal_cart_match', JSON.stringify(matchData));
    else localStorage.removeItem('goal_cart_match');

    localStorage.setItem('goal_cart_seats', JSON.stringify(selectedSeats));
    localStorage.setItem('goal_cart_qty', String(quantity));
    localStorage.setItem('goal_cart_addons', JSON.stringify(selectedAddons));
    if (promoCode) localStorage.setItem('goal_cart_promo', promoCode);
    else localStorage.removeItem('goal_cart_promo');
  }, [matchData, selectedSeats, quantity, selectedAddons, promoCode]);

  // Hold timer effect
  const hasItems = (matchData && (selectedSeats.length > 0 || quantity > 0));
  useEffect(() => {
    if (!hasItems) {
      setTimeLeft(HOLD_DURATION_SECONDS);
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          toast.error('⏱️ Thời gian giữ vé đã hết! Vui lòng chọn lại ghế.');
          clearCart();
          return HOLD_DURATION_SECONDS;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [hasItems]);

  function addToCart({ match, seats = [], qty = 1, open = true }) {
    setMatchData(match);
    setSelectedSeats(seats);
    setQuantity(seats.length > 0 ? seats.length : qty);
    setTimeLeft(HOLD_DURATION_SECONDS);
    if (open) setIsOpen(true);
  }

  function removeSeat(seatId) {
    setSelectedSeats(prev => {
      const updated = prev.filter(s => s.id !== seatId);
      if (updated.length === 0) {
        setMatchData(null);
      }
      return updated;
    });
  }

  function toggleAddon(addonId) {
    setSelectedAddons(prev => {
      if (prev.includes(addonId)) {
        return prev.filter(id => id !== addonId);
      } else {
        const item = INITIAL_ADDONS.find(a => a.id === addonId);
        if (item) toast.success(`Đã thêm: ${item.name}`);
        return [...prev, addonId];
      }
    });
  }

  function applyPromo(code) {
    const trimmed = code.trim().toUpperCase();
    if (trimmed === 'GOALVN20') {
      setPromoCode('GOALVN20');
      setDiscountPercent(20);
      toast.success('🎉 Mã GOALVN20 hợp lệ: Giảm 20% tổng tiền vé!');
      return true;
    } else if (trimmed === 'FREESHIPFEE') {
      setPromoCode('FREESHIPFEE');
      setDiscountPercent(2);
      toast.success('🎉 Mã FREESHIPFEE: Miễn phí phí xử lý giao dịch 2%!');
      return true;
    } else if (trimmed === 'NEWFAN') {
      setPromoCode('NEWFAN');
      setDiscountPercent(10);
      toast.success('🎉 Mã NEWFAN: Giảm ngay 10% cho thành viên mới!');
      return true;
    } else {
      toast.error('Mã khuyến mãi không hợp lệ');
      return false;
    }
  }

  function removePromo() {
    setPromoCode('');
    setDiscountPercent(0);
  }

  function clearCart() {
    setMatchData(null);
    setSelectedSeats([]);
    setQuantity(1);
    setSelectedAddons([]);
    setPromoCode('');
    setDiscountPercent(0);
    setTimeLeft(HOLD_DURATION_SECONDS);
  }

  // Calculate pricing
  const ticketSubtotal = selectedSeats.length > 0
    ? selectedSeats.reduce((sum, s) => sum + Number(s.price || 0), 0)
    : (matchData ? Number(matchData.ticketPrice || 0) * quantity : 0);

  const addonsSubtotal = selectedAddons.reduce((sum, addonId) => {
    const found = INITIAL_ADDONS.find(a => a.id === addonId);
    return sum + (found ? found.price : 0);
  }, 0);

  const discountAmount = Math.round((ticketSubtotal * discountPercent) / 100);
  const processingFee = promoCode === 'FREESHIPFEE' ? 0 : Math.round(ticketSubtotal * 0.02);
  const grandTotal = Math.max(0, ticketSubtotal + addonsSubtotal + processingFee - discountAmount);

  // Total items count for badge
  const totalItemCount = (selectedSeats.length > 0 ? selectedSeats.length : (matchData ? quantity : 0)) + selectedAddons.length;

  return (
    <CartContext.Provider
      value={{
        isOpen,
        setIsOpen,
        openCart: () => setIsOpen(true),
        closeCart: () => setIsOpen(false),
        matchData,
        selectedSeats,
        quantity,
        selectedAddons,
        availableAddons: INITIAL_ADDONS,
        promoCode,
        discountPercent,
        discountAmount,
        processingFee,
        ticketSubtotal,
        addonsSubtotal,
        grandTotal,
        totalItemCount,
        timeLeft,
        addToCart,
        removeSeat,
        toggleAddon,
        applyPromo,
        removePromo,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
