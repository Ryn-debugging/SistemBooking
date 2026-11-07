(function (global) {
  "use strict";
  var PRODUCT_NAME = global.NamaProdukAPI.PRODUCT_NAME;

  var MITRA_VISUALS = {
    "barbershop-rapi": {
      mainImage: "assets/images/barbershop-main.jpg",
      detailImage: "assets/images/barbershop-detail.jpg",
      altImage: "assets/images/hero-studio.jpg",
      rating: "4.9",
      ratingLabel: "Luar Biasa",
      reviews: 148,
      badge: "Paling Populer",
      badgeType: "gold",
      shortDesc: "Grooming pria modern dengan barber berpengalaman, peralatan higienis, dan konsultasi gaya rambut personal.",
      facilities: [
        "Jadwal Real-time",
        "Ruang Ber-AC Nyaman",
        "Handuk Hangat Steril",
        "Konfirmasi WhatsApp"
      ],
      openEarly: true
    },
    "laundry-bersih": {
      mainImage: "assets/images/laundry-main.jpg",
      detailImage: "assets/images/laundry-detail.jpg",
      altImage: "assets/images/hero-studio.jpg",
      rating: "4.8",
      ratingLabel: "Sangat Baik",
      reviews: 215,
      badge: "Harga Terbaik",
      badgeType: "navy",
      shortDesc: "Perawatan pakaian harian & express dengan deterjen ramah serat, setrika uap rapi, dan ketepatan waktu terjamin.",
      facilities: [
        "Layanan Express 2 Jam",
        "Setrika Uap Premium",
        "Mesin Terpisah per Pelanggan",
        "Konfirmasi WhatsApp"
      ],
      openEarly: true
    },
    "salon-senja": {
      mainImage: "assets/images/salon-main.jpg",
      detailImage: "assets/images/salon-detail.jpg",
      altImage: "assets/images/hero-studio.jpg",
      rating: "4.9",
      ratingLabel: "Luar Biasa",
      reviews: 184,
      badge: "Pilihan Editor",
      badgeType: "gold",
      shortDesc: "Studio perawatan rambut & relaksasi bernuansa hangat dengan produk botanikal pilihan dan stylist profesional.",
      facilities: [
        "Produk Hair Spa Premium",
        "Stylist Tersertifikasi",
        "Area Tenang & Privat",
        "Konfirmasi WhatsApp"
      ],
      openEarly: false
    }
  };

  function getMitraVisuals(slugOrCategory, basePath) {
    var prefix = basePath || "";
    var key = String(slugOrCategory || "").toLowerCase();
    var item = MITRA_VISUALS[key];
    if (!item) {
      if (key.indexOf("barber") !== -1) item = MITRA_VISUALS["barbershop-rapi"];
      else if (key.indexOf("laundry") !== -1) item = MITRA_VISUALS["laundry-bersih"];
      else if (key.indexOf("salon") !== -1) item = MITRA_VISUALS["salon-senja"];
      else {
        item = {
          mainImage: "assets/images/hero-studio.jpg",
          detailImage: "assets/images/salon-detail.jpg",
          altImage: "assets/images/barbershop-detail.jpg",
          rating: "4.8",
          ratingLabel: "Sangat Baik",
          reviews: 96,
          badge: "Mitra Terverifikasi",
          badgeType: "navy",
          shortDesc: "Layanan usaha lokal terpercaya dengan penjadwalan slot waktu transparan dan konfirmasi instan.",
          facilities: [
            "Jadwal Real-time",
            "Tanpa Biaya Admin",
            "Pesan Tanpa Akun",
            "Konfirmasi WhatsApp"
          ],
          openEarly: true
        };
      }
    }
    return {
      mainImage: prefix + item.mainImage,
      detailImage: prefix + item.detailImage,
      altImage: prefix + item.altImage,
      rating: item.rating,
      ratingLabel: item.ratingLabel,
      reviews: item.reviews,
      badge: item.badge,
      badgeType: item.badgeType,
      shortDesc: item.shortDesc,
      facilities: item.facilities.slice(),
      openEarly: item.openEarly
    };
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (character) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[character];
    });
  }

  function formatRupiah(value) {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(value) || 0);
  }

  function formatTanggal(value, options) {
    var parts = value.split("-").map(Number);
    return new Intl.DateTimeFormat("id-ID", options || { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date(parts[0], parts[1] - 1, parts[2]));
  }

  function phoneToWhatsApp(value) {
    var digits = String(value || "").replace(/\D/g, "");
    if (digits.indexOf("0") === 0) return "62" + digits.slice(1);
    if (digits.indexOf("62") === 0) return digits;
    return digits;
  }

  function isValidIndonesianPhone(value) {
    var digits = String(value || "").replace(/\D/g, "");
    if (digits.indexOf("62") === 0) digits = "0" + digits.slice(2);
    return /^08[1-9][0-9]{7,10}$/.test(digits);
  }

  function applyProductName() {
    document.querySelectorAll("[data-product-name]").forEach(function (element) {
      element.textContent = PRODUCT_NAME;
    });
    document.title = document.title.replace(/NamaProduk/g, PRODUCT_NAME);
    document.querySelectorAll('meta[name="description"]').forEach(function (element) {
      element.content = element.content.replace(/NamaProduk/g, PRODUCT_NAME);
    });
  }

  global.NamaProdukUI = {
    PRODUCT_NAME: PRODUCT_NAME,
    escapeHtml: escapeHtml,
    formatRupiah: formatRupiah,
    formatTanggal: formatTanggal,
    phoneToWhatsApp: phoneToWhatsApp,
    isValidIndonesianPhone: isValidIndonesianPhone,
    applyProductName: applyProductName,
    getMitraVisuals: getMitraVisuals
  };
})(window);
