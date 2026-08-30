// ==============================================================================
// SMILX BIKE RENTAL - PLEIKU GIA LAI (bike.smilex.vn)
// Bilingual Engine & Interactive Price Calculator
// ==============================================================================

const i18n = {
  en: {
    lang_btn: "🇻🇳 Tiếng Việt",
    hero_badge: "🚴 #1 Bicycle Rental in Pleiku Highlands",
    hero_title: "Explore Pleiku on Two Wheels",
    hero_title_sub: "Eco-Friendly & Freedom",
    hero_desc: "Premium sport bicycles for international travelers & backpackers. Experience Sea Lake, extinct volcanoes, century pines & tea hills at your own pace.",
    btn_book_now: "⚡ Book a Bike Now",
    btn_view_routes: "🗺️ Explore Scenic Routes",
    price_daily_title: "Daily Rental",
    price_daily_val: "50,000",
    price_daily_unit: "VND / day",
    price_daily_usd: "(~$2.00 USD / day)",
    price_weekly_title: "Weekly Rental (>7 Days)",
    price_weekly_val: "30,000",
    price_weekly_unit: "VND / day",
    price_weekly_usd: "(~$1.20 USD / day - Save 40%)",
    price_deposit_title: "Security Deposit",
    price_deposit_val: "5,000,000",
    price_deposit_unit: "VND (Refundable)",
    price_deposit_usd: "or Original Passport / National ID",
    sec_inclusions_tag: "ALL-INCLUSIVE SERVICE",
    sec_inclusions_title: "What's Included For Free",
    inc_delivery_title: "Hotel / Homestay Delivery",
    inc_delivery_desc: "Free drop-off & pick-up at your accommodation in Pleiku City center.",
    inc_helmet_title: "Sport Helmet & Lock",
    inc_helmet_desc: "High quality adjustable helmet and anti-theft cable lock.",
    inc_mount_title: "Phone Mount & Kit",
    inc_mount_desc: "Handlebar smartphone holder for GPS navigation + mini repair kit.",
    inc_support_title: "24/7 Roadside Support",
    inc_support_desc: "Fast English-speaking assistance via WhatsApp if you need help.",
    sec_routes_tag: "PLEIKU ADVENTURE TRAILS",
    sec_routes_title: "Top Scenic Cycling Routes",
    sec_calc_tag: "INSTANT ESTIMATOR",
    sec_calc_title: "Calculate Your Rental Cost",
    calc_days_label: "Rental Duration (Days):",
    calc_rate_label: "Applied Rate:",
    calc_total_label: "Total Rental Cost:",
    sec_book_tag: "RESERVATION",
    sec_book_title: "Book Your Bicycle in 1 Minute",
    form_name: "Full Name:",
    form_whatsapp: "WhatsApp / Phone Number:",
    form_hotel: "Your Hotel / Homestay Address in Pleiku:",
    form_days: "How many days?",
    form_bikes: "Number of bikes:",
    form_submit: "🚀 Send Booking via WhatsApp",
    faq_tag: "FAQ",
    faq_title: "Frequently Asked Questions",
    faq_q1: "How does the 5,000,000 VND security deposit work?",
    faq_a1: "To protect our premium bicycles, we require a 5,000,000 VND deposit (~$200 USD) OR your original passport. When you return the bike in good condition, your cash deposit is refunded 100% immediately.",
    faq_q2: "What payment methods do you accept?",
    faq_a2: "We accept Cash (VND / USD / EUR), International Bank Transfer (Wise, Revolut), Vietnamese Bank QR transfer, and Crypto (USDT).",
    faq_q3: "Do you deliver the bike to my hotel?",
    faq_a3: "Yes! We provide free delivery and collection directly at your hotel, hostel, or homestay in Pleiku city center."
  },
  vi: {
    lang_btn: "🇬🇧 English",
    hero_badge: "🚴 Dịch Vụ Cho Thuê Xe Đạp Số 1 Tại Pleiku",
    hero_title: "Khám Phá Pleiku Bằng Xe Đạp",
    hero_title_sub: "Tự Do & Trải Nghiệm",
    hero_desc: "Dịch vụ cho thuê xe đạp thể thao cao cấp dành cho du khách quốc tế & trong nước. Tự do khám phá Biển Hồ, Núi lửa Chư Đăng Ya, Hàng thông trăm tuổi & Biển Hồ chè.",
    btn_book_now: "⚡ Đặt Xe Giao Tận Nơi",
    btn_view_routes: "🗺️ Xem Cung Đường Đẹp",
    price_daily_title: "Thuê Theo Ngày",
    price_daily_val: "50.000",
    price_daily_unit: "VNĐ / ngày",
    price_daily_usd: "(Giá cực rẻ khám phá phố núi)",
    price_weekly_title: "Thuê Theo Tuần (> 7 Ngày)",
    price_weekly_val: "30.000",
    price_weekly_unit: "VNĐ / ngày",
    price_weekly_usd: "(Tiết kiệm 40% chi phí)",
    price_deposit_title: "Tiền Đặt Cọc Xe",
    price_deposit_val: "5.000.000",
    price_deposit_unit: "VNĐ (Hoàn trả ngay)",
    price_deposit_usd: "Hoặc giữ Passport / CCCD gốc",
    sec_inclusions_tag: "DỊCH VỤ TRỌN GÓI",
    sec_inclusions_title: "Ưu Đãi Miễn Phí Đi Kèm",
    inc_delivery_title: "Giao Xe Tận Khách Sạn",
    inc_delivery_desc: "Giao nhận xe miễn phí tận nơi tại Khách sạn / Homestay trung tâm TP. Pleiku.",
    inc_helmet_title: "Mũ Bảo Hiểm & Khóa Dây",
    inc_helmet_desc: "Trang bị đầy đủ mũ bảo hiểm thể thao an toàn và khóa số chống trộm.",
    inc_mount_title: "Giá Đỡ Điện Thoại & Đồ Nghề",
    inc_mount_desc: "Kẹp điện thoại trên ghi đông để xem Google Maps + bơm vá mini dự phòng.",
    inc_support_title: "Hỗ Trợ Kỹ Thuật 24/7",
    inc_support_desc: "Hỗ trợ xử lý sự cố nhanh chóng qua Hotline / Zalo / WhatsApp mọi lúc mọi nơi.",
    sec_routes_tag: "LỘ TRÌNH PHƯỢT PLEIKU",
    sec_routes_title: "Các Cung Đường Đạp Xe Đẹp Nhất",
    sec_calc_tag: "TÍNH GIÁ NHANH",
    sec_calc_title: "Bảng Tính Chi Phí Thuê Xe",
    calc_days_label: "Số ngày bạn muốn thuê:",
    calc_rate_label: "Mức giá áp dụng:",
    calc_total_label: "Tổng tiền thuê xe:",
    sec_book_tag: "ĐẶT XE TRỰC TUYẾN",
    sec_book_title: "Đặt Xe Nhanh Trong 1 Phút",
    form_name: "Họ và tên của bạn:",
    form_whatsapp: "Số điện thoại / Zalo / WhatsApp:",
    form_hotel: "Địa chỉ Khách sạn / Homestay tại Pleiku:",
    form_days: "Số ngày dự kiến thuê:",
    form_bikes: "Số lượng xe cần thuê:",
    form_submit: "🚀 Gửi Yêu Cầu Đặt Xe Ngay",
    faq_tag: "HỎI ĐÁP",
    faq_title: "Câu Hỏi Thường Gặp",
    faq_q1: "Quy định tiền cọc 5.000.000 VNĐ như thế nào?",
    faq_a1: "Để đảm bảo an toàn cho dàn xe thể thao chất lượng cao, quý khách vui lòng đặt cọc 5.000.000 VNĐ hoặc để lại Passport / CCCD gốc. Khi trả xe, tiền cọc sẽ được hoàn trả đầy đủ 100% ngay lập tức.",
    faq_q2: "Chấp nhận các hình thức thanh toán nào?",
    faq_a2: "Chúng tôi nhận tiền mặt (VND / USD), Chuyển khoản ngân hàng QR, Wise, Revolut, thẻ Quốc tế và Crypto (USDT).",
    faq_q3: "Có giao xe tận nơi ở Pleiku không?",
    faq_a3: "Có! Chúng tôi giao và nhận xe hoàn toàn miễn phí tại tất cả các khách sạn, homestay trong trung tâm thành phố Pleiku."
  }
};

let currentLang = 'en';

function toggleLanguage() {
  currentLang = (currentLang === 'en') ? 'vi' : 'en';
  applyLanguage();
  updateCalculator();
}

function applyLanguage() {
  const dict = i18n[currentLang];
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (dict[key]) {
      el.innerHTML = dict[key];
    }
  });
  const btn = document.getElementById('langBtn');
  if (btn) btn.innerText = dict.lang_btn;
}

function updateCalculator() {
  const slider = document.getElementById('calcDaysSlider');
  const daysVal = document.getElementById('calcDaysVal');
  const rateVal = document.getElementById('calcRateVal');
  const totalVal = document.getElementById('calcTotalVal');

  if (!slider) return;
  const days = parseInt(slider.value, 10);
  daysVal.innerText = `${days} ${currentLang === 'en' ? 'days' : 'ngày'}`;

  let dailyRate = days > 7 ? 30000 : 50000;
  let totalCost = days * dailyRate;

  if (currentLang === 'en') {
    rateVal.innerText = `${dailyRate.toLocaleString()} VND/day (~$${(dailyRate/25000).toFixed(2)} USD)`;
    totalVal.innerText = `${totalCost.toLocaleString()} VND (~$${(totalCost/25000).toFixed(2)} USD)`;
  } else {
    rateVal.innerText = `${dailyRate.toLocaleString()} đ/ngày ${days > 7 ? '(Giá ưu đãi tuần)' : ''}`;
    totalVal.innerText = `${totalCost.toLocaleString()} VNĐ`;
  }
}

function handleBookingSubmit(e) {
  e.preventDefault();
  const name = document.getElementById('bookName').value;
  const phone = document.getElementById('bookPhone').value;
  const hotel = document.getElementById('bookHotel').value;
  const days = document.getElementById('bookDays').value;
  const bikes = document.getElementById('bookBikes').value;

  const rate = days > 7 ? 30000 : 50000;
  const total = days * rate * bikes;

  const message = `Hello SmileX Bike Rental!\nI want to book ${bikes} bicycle(s):\n- Name: ${name}\n- Phone/WhatsApp: ${phone}\n- Hotel in Pleiku: ${hotel}\n- Rental Days: ${days} days\n- Total: ${total.toLocaleString()} VND\nPlease confirm my delivery. Thank you!`;

  const whatsappUrl = `https://wa.me/84979820789?text=${encodeURIComponent(message)}`;
  window.open(whatsappUrl, '_blank');
}

document.addEventListener('DOMContentLoaded', () => {
  applyLanguage();
  updateCalculator();
});
