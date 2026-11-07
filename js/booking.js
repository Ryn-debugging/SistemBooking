(function () {
  "use strict";
  var api = window.NamaProdukAPI;
  var ui = window.NamaProdukUI;
  var mitra;
  var layanan = [];
  var selectedService = null;
  var selectedDate = "";
  var selectedSlot = null;
  var selectedPayment = "Bayar di Lokasi (Tunai / Kasir)";

  document.addEventListener("DOMContentLoaded", initialize);

  async function initialize() {
    ui.applyProductName();
    var footerYear = document.getElementById("footer-year");
    if (footerYear) footerYear.textContent = new Date().getFullYear();

    window.addEventListener("scroll", function () {
      var header = document.getElementById("site-header");
      if (header) header.classList.toggle("is-scrolled", window.scrollY > 12);
    }, { passive: true });

    var params = new URLSearchParams(window.location.search);
    var slug = params.get("mitra");
    var requestedDate = params.get("tanggal") || "";
    var loading = document.getElementById("booking-loading");

    try {
      if (!slug) {
        showNotFound();
        return;
      }
      mitra = await api.getMitraBySlug(slug);
      if (!mitra) {
        showNotFound();
        return;
      }
      layanan = await api.listLayanan(mitra.id);

      populateBusinessHeader();
      document.getElementById("booking-content").hidden = false;

      renderServices();
      renderDates(requestedDate);
      renderSlots();
      bindCheckoutHelpers();
      updateSidebarAndStepper();

      if (!layanan.length) {
        showError("Mitra ini belum menyediakan layanan untuk dipesan.");
      }
    } catch (error) {
      showError(error.message || "Halaman booking belum dapat dimuat. Silakan muat ulang.");
      document.getElementById("booking-content").hidden = false;
    } finally {
      loading.hidden = true;
    }
  }

  function populateBusinessHeader() {
    var visuals = ui.getMitraVisuals(mitra.slug, "");
    var prices = layanan.map(function (item) { return Number(item.harga) || 0; });
    var minPrice = prices.length ? Math.min.apply(null, prices) : 0;

    document.getElementById("business-category").textContent = mitra.kategori;
    document.getElementById("business-name").textContent = mitra.nama;
    document.getElementById("business-address").textContent = mitra.alamat;
    document.getElementById("business-hours-value").textContent = mitra.jamMulai + "–" + mitra.jamSelesai;

    var breadcrumb = document.getElementById("breadcrumb-business");
    if (breadcrumb) breadcrumb.textContent = mitra.nama;

    var ratingScore = document.getElementById("business-rating-score");
    if (ratingScore) {
      ratingScore.textContent = visuals.rating + " · " + visuals.ratingLabel + " (" + visuals.reviews + " ulasan)";
    }

    var minPriceEl = document.getElementById("business-min-price");
    if (minPriceEl) {
      minPriceEl.textContent = prices.length ? ui.formatRupiah(minPrice) : "—";
    }

    var imgMain = document.getElementById("gallery-img-main");
    var imgDetail = document.getElementById("gallery-img-detail");
    var imgAlt = document.getElementById("gallery-img-alt");
    if (imgMain) {
      imgMain.src = visuals.mainImage;
      imgMain.alt = "Interior utama " + mitra.nama;
    }
    if (imgDetail) {
      imgDetail.src = visuals.detailImage;
      imgDetail.alt = "Detail layanan " + mitra.nama;
    }
    if (imgAlt) {
      imgAlt.src = visuals.altImage;
      imgAlt.alt = "Area pelanggan " + mitra.nama;
    }

    var descEl = document.getElementById("business-desc");
    if (descEl) descEl.textContent = visuals.shortDesc;

    var facEl = document.getElementById("business-facilities");
    if (facEl) {
      facEl.innerHTML = visuals.facilities.map(function (fac) {
        return (
          '<span class="facility-pill">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="M20 6L9 17l-5-5"/></svg>' +
            ui.escapeHtml(fac) +
          '</span>'
        );
      }).join("");
    }

    var sideImg = document.getElementById("sidebar-mitra-img");
    var sideName = document.getElementById("sidebar-mitra-name");
    var sideHours = document.getElementById("sidebar-mitra-hours");
    if (sideImg) {
      sideImg.src = visuals.mainImage;
      sideImg.alt = mitra.nama;
    }
    if (sideName) sideName.textContent = mitra.nama;
    if (sideHours) sideHours.textContent = mitra.kategori + " · " + mitra.jamMulai + "–" + mitra.jamSelesai;
  }

  function showNotFound() {
    document.getElementById("booking-loading").hidden = true;
    document.getElementById("booking-not-found").hidden = false;
  }

  function showError(message) {
    var error = document.getElementById("booking-error");
    error.textContent = message;
    error.hidden = false;
  }

  function clearError() {
    var error = document.getElementById("booking-error");
    error.textContent = "";
    error.hidden = true;
  }

  function renderServices() {
    var list = document.getElementById("service-list");
    list.innerHTML = layanan.map(function (item) {
      return (
        '<button class="service-option" type="button" data-service-id="' + ui.escapeHtml(item.id) + '" aria-pressed="false">' +
          '<span class="service-option-top">' +
            '<strong>' + ui.escapeHtml(item.nama) + '</strong>' +
            '<span class="service-check-indicator" aria-hidden="true">' +
              '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M20 6L9 17l-5-5"/></svg>' +
            '</span>' +
          '</span>' +
          '<span class="service-option-bottom">' +
            '<span class="service-duration-badge">' +
              '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>' +
              item.durasi + ' menit' +
            '</span>' +
            '<span class="service-price-tag">' + ui.formatRupiah(item.harga) + '</span>' +
          '</span>' +
        '</button>'
      );
    }).join("");

    list.addEventListener("click", function (event) {
      var button = event.target.closest("[data-service-id]");
      if (!button) return;
      selectedService = layanan.find(function (item) { return item.id === button.dataset.serviceId; });
      selectedSlot = null;
      clearError();
      list.querySelectorAll(".service-option").forEach(function (option) {
        var selected = option === button;
        option.classList.toggle("is-selected", selected);
        option.setAttribute("aria-pressed", String(selected));
      });
      renderSlots();
      updateCustomerForm();
      updateSidebarAndStepper();
    });
  }

  function renderDates(requestedDate) {
    var list = document.getElementById("date-list");
    var today = new Date();
    var dates = [];
    for (var offset = 1; offset <= 14; offset += 1) {
      var date = new Date(today);
      date.setDate(today.getDate() + offset);
      dates.push(date);
    }

    var availableValues = dates.map(formatInputDate);
    var defaultIndex = requestedDate ? availableValues.indexOf(requestedDate) : 0;
    if (defaultIndex === -1) defaultIndex = 0;

    selectedDate = availableValues[defaultIndex];

    list.innerHTML = dates.map(function (date, index) {
      var value = formatInputDate(date);
      var isSelected = index === defaultIndex;
      var weekday = new Intl.DateTimeFormat("id-ID", { weekday: "short" }).format(date);
      var monthShort = new Intl.DateTimeFormat("id-ID", { month: "short" }).format(date);
      return (
        '<button type="button" class="date-option' + (isSelected ? " is-selected" : "") + '" data-date="' + value + '" aria-pressed="' + isSelected + '">' +
          '<span>' + ui.escapeHtml(weekday) + '</span>' +
          '<strong>' + date.getDate() + " " + ui.escapeHtml(monthShort) + '</strong>' +
        '</button>'
      );
    }).join("");

    list.addEventListener("click", function (event) {
      var button = event.target.closest("[data-date]");
      if (!button) return;
      selectedDate = button.dataset.date;
      selectedSlot = null;
      list.querySelectorAll(".date-option").forEach(function (option) {
        var selected = option === button;
        option.classList.toggle("is-selected", selected);
        option.setAttribute("aria-pressed", String(selected));
      });
      renderSlots();
      updateCustomerForm();
      updateSidebarAndStepper();
    });
  }

  async function renderSlots() {
    var list = document.getElementById("slot-list");
    if (!selectedService) {
      list.innerHTML = '<p class="slot-empty">Pilih layanan pada Langkah 1 terlebih dahulu untuk melihat ketersediaan jam.</p>';
      return;
    }
    list.innerHTML = '<p class="slot-empty">Memuat ketersediaan slot waktu…</p>';
    try {
      var slots = await api.getSlotTersedia(mitra.id, selectedService.id, selectedDate);
      if (!slots.length || slots.every(function (slot) { return !slot.tersedia; })) {
        list.innerHTML = '<p class="slot-empty">Tidak ada slot kosong untuk tanggal ini. Silakan pilih tanggal lain di atas.</p>';
        return;
      }
      list.innerHTML = slots.map(function (slot) {
        var label = slot.status === "terisi" ? "Terisi" : slot.status === "ditutup" ? "Ditutup" : slot.status === "lewat" ? "Lewat" : "Tersedia";
        return (
          '<button type="button" class="slot-option' +
          (slot.status === "ditutup" ? " is-closed" : "") +
          (selectedSlot && selectedSlot.jamMulai === slot.jamMulai ? " is-selected" : "") +
          '" data-time="' + slot.jamMulai + '" ' +
          (!slot.tersedia ? "disabled" : "") +
          ' aria-label="' + slot.jamMulai + ", " + label + '">' +
          slot.jamMulai + (slot.tersedia ? "" : " · " + label) +
          "</button>"
        );
      }).join("");
    } catch (error) {
      list.innerHTML = '<p class="slot-empty">Slot belum dapat dimuat. ' + ui.escapeHtml(error.message) + "</p>";
    }
  }

  document.getElementById("slot-list").addEventListener("click", function (event) {
    var button = event.target.closest("[data-time]");
    if (!button || button.disabled) return;
    selectedSlot = { jamMulai: button.dataset.time };
    document.querySelectorAll(".slot-option").forEach(function (option) {
      option.classList.toggle("is-selected", option === button);
    });
    updateCustomerForm();
    updateSidebarAndStepper();
    document.getElementById("customer-step").scrollIntoView({ behavior: "smooth", block: "start" });
  });

  function computeEndTime() {
    if (!selectedService || !selectedSlot) return "";
    var end = selectedService.durasi;
    var timeParts = selectedSlot.jamMulai.split(":").map(Number);
    var endMinutes = timeParts[0] * 60 + timeParts[1] + end;
    return String(Math.floor(endMinutes / 60)).padStart(2, "0") + ":" + String(endMinutes % 60).padStart(2, "0");
  }

  function updateCustomerForm() {
    var step = document.getElementById("customer-step");
    var ready = Boolean(selectedService && selectedDate && selectedSlot);
    step.hidden = !ready;
    if (!ready) return;

    var endTime = computeEndTime();
    document.getElementById("booking-summary").innerHTML =
      "<h3>Ringkasan Pemesanan</h3>" +
      '<div class="summary-row"><span>Mitra Usaha</span><strong>' + ui.escapeHtml(mitra.nama) + "</strong></div>" +
      '<div class="summary-row"><span>Layanan</span><strong>' + ui.escapeHtml(selectedService.nama) + " (" + selectedService.durasi + " mnt)</strong></div>" +
      '<div class="summary-row"><span>Tanggal</span><strong>' + ui.escapeHtml(ui.formatTanggal(selectedDate)) + "</strong></div>" +
      '<div class="summary-row"><span>Waktu</span><strong>' + selectedSlot.jamMulai + "–" + endTime + " WIB</strong></div>" +
      '<div class="summary-row"><span>Metode Pembayaran</span><strong>' + ui.escapeHtml(selectedPayment) + "</strong></div>" +
      '<div class="summary-row"><span>Total Pembayaran</span><strong>' + ui.formatRupiah(selectedService.harga) + "</strong></div>";
  }

  function updateSidebarAndStepper() {
    var sideService = document.getElementById("sidebar-service");
    var sideDate = document.getElementById("sidebar-date");
    var sideTime = document.getElementById("sidebar-time");
    var sidePayment = document.getElementById("sidebar-payment");
    var sideSubtotal = document.getElementById("sidebar-subtotal");
    var sideTotal = document.getElementById("sidebar-total");
    var sideBtn = document.getElementById("sidebar-cta-btn");

    if (sideService) {
      sideService.textContent = selectedService ? selectedService.nama : "Belum dipilih";
      sideService.classList.toggle("is-placeholder", !selectedService);
    }
    if (sideDate) {
      sideDate.textContent = selectedDate
        ? ui.formatTanggal(selectedDate, { weekday: "short", day: "numeric", month: "short", year: "numeric" })
        : "—";
    }
    if (sideTime) {
      if (selectedService && selectedSlot) {
        sideTime.textContent = selectedSlot.jamMulai + "–" + computeEndTime() + " (" + selectedService.durasi + " mnt)";
        sideTime.classList.remove("is-placeholder");
      } else {
        sideTime.textContent = "Pilih slot jam";
        sideTime.classList.add("is-placeholder");
      }
    }
    if (sidePayment) {
      sidePayment.textContent = selectedPayment.split(" (")[0];
    }

    var priceFormatted = selectedService ? ui.formatRupiah(selectedService.harga) : "Rp 0";
    if (sideSubtotal) sideSubtotal.textContent = priceFormatted;
    if (sideTotal) sideTotal.textContent = priceFormatted;

    if (sideBtn) {
      if (!selectedService) {
        sideBtn.textContent = "Pilih Layanan di Samping";
      } else if (!selectedSlot) {
        sideBtn.textContent = "Pilih Jam Kedatangan";
      } else {
        sideBtn.textContent = "Lanjut Isi Data & Konfirmasi";
      }
    }

    // Update Checkout Stepper
    var s1 = document.getElementById("stepper-1");
    var s2 = document.getElementById("stepper-2");
    var l1 = document.getElementById("stepper-line-1");
    var readyCheckout = Boolean(selectedService && selectedDate && selectedSlot);

    if (s1 && s2 && l1) {
      s1.classList.toggle("is-done", readyCheckout);
      s1.classList.toggle("is-active", !readyCheckout);
      l1.classList.toggle("is-filled", readyCheckout);
      s2.classList.toggle("is-active", readyCheckout);
    }
  }

  function bindCheckoutHelpers() {
    // Payment method radio cards
    document.querySelectorAll('input[name="metode_pembayaran"]').forEach(function (radio) {
      radio.addEventListener("change", function () {
        selectedPayment = radio.value;
        document.querySelectorAll(".payment-option-card").forEach(function (card) {
          card.classList.toggle("is-selected", card.contains(radio) && radio.checked);
        });
        updateCustomerForm();
        updateSidebarAndStepper();
      });
    });

    // Sidebar CTA smart guide
    var sideBtn = document.getElementById("sidebar-cta-btn");
    if (sideBtn) {
      sideBtn.addEventListener("click", function () {
        if (!selectedService) {
          document.getElementById("service-step").scrollIntoView({ behavior: "smooth", block: "start" });
          return;
        }
        if (!selectedSlot) {
          document.getElementById("date-step").scrollIntoView({ behavior: "smooth", block: "start" });
          return;
        }
        var nameInput = document.getElementById("customer-name");
        document.getElementById("customer-step").scrollIntoView({ behavior: "smooth", block: "start" });
        if (nameInput && !nameInput.value.trim()) {
          nameInput.focus({ preventScroll: true });
        } else {
          document.getElementById("customer-form").requestSubmit();
        }
      });
    }

    // Copy Booking Code Button
    var copyBtn = document.getElementById("copy-code-btn");
    if (copyBtn) {
      copyBtn.addEventListener("click", function () {
        var code = document.getElementById("success-code").textContent.trim();
        if (!code || !navigator.clipboard) return;
        navigator.clipboard.writeText(code).then(function () {
          copyBtn.textContent = "Tersalin ✓";
          setTimeout(function () {
            copyBtn.textContent = "Salin Kode";
          }, 2000);
        });
      });
    }
  }

  document.getElementById("customer-form").addEventListener("submit", async function (event) {
    event.preventDefault();
    var errorBox = document.getElementById("form-error");
    var name = document.getElementById("customer-name").value.trim();
    var phone = document.getElementById("customer-phone").value.trim();
    var notesEl = document.getElementById("customer-notes");
    var notes = notesEl ? notesEl.value.trim() : "";

    if (name.length < 2) return setFormError("Nama minimal terdiri dari 2 karakter.");
    if (!ui.isValidIndonesianPhone(phone)) return setFormError("Masukkan nomor HP Indonesia yang valid, misalnya 081234567890.");

    var button = document.getElementById("confirm-booking");
    button.disabled = true;
    button.textContent = "Memproses reservasi…";
    errorBox.hidden = true;

    try {
      // API memeriksa kembali ketersediaan slot tepat sebelum data disimpan.
      var booking = await api.buatBooking({
        mitraId: mitra.id,
        layananId: selectedService.id,
        tanggal: selectedDate,
        jamMulai: selectedSlot.jamMulai,
        nama: name,
        telepon: ui.phoneToWhatsApp(phone)
      });

      var workspace = document.getElementById("booking-workspace");
      if (workspace) workspace.hidden = true;

      // Mark all 3 stepper items complete
      ["stepper-1", "stepper-2"].forEach(function (id) {
        var el = document.getElementById(id);
        if (el) {
          el.classList.remove("is-active");
          el.classList.add("is-done");
        }
      });
      ["stepper-line-1", "stepper-line-2"].forEach(function (id) {
        var el = document.getElementById(id);
        if (el) el.classList.add("is-filled");
      });
      var s3 = document.getElementById("stepper-3");
      if (s3) s3.classList.add("is-active", "is-done");

      document.getElementById("success-code").textContent = booking.kode;

      var receipt = document.getElementById("success-receipt");
      if (receipt) {
        receipt.innerHTML =
          '<div class="summary-row"><span>Nama Pemesan</span><strong>' + ui.escapeHtml(booking.nama) + "</strong></div>" +
          '<div class="summary-row"><span>Mitra Usaha</span><strong>' + ui.escapeHtml(mitra.nama) + "</strong></div>" +
          '<div class="summary-row"><span>Layanan</span><strong>' + ui.escapeHtml(booking.layananNama) + "</strong></div>" +
          '<div class="summary-row"><span>Jadwal</span><strong>' + ui.escapeHtml(ui.formatTanggal(booking.tanggal)) + " · " + booking.jamMulai + "–" + booking.jamSelesai + "</strong></div>" +
          '<div class="summary-row"><span>Metode Pembayaran</span><strong>' + ui.escapeHtml(selectedPayment) + "</strong></div>" +
          (notes ? '<div class="summary-row"><span>Catatan</span><strong>' + ui.escapeHtml(notes) + "</strong></div>" : "") +
          '<div class="summary-row"><span>Total Pembayaran</span><strong>' + ui.formatRupiah(selectedService.harga) + "</strong></div>";
      }

      var message =
        "Halo " + mitra.nama +
        ", saya " + name +
        " sudah membuat booking " + selectedService.nama +
        " pada " + ui.formatTanggal(selectedDate) +
        " pukul " + booking.jamMulai +
        ". Kode booking: " + booking.kode +
        ". Metode pembayaran: " + selectedPayment +
        (notes ? ". Catatan: " + notes : "") + ".";

      document.getElementById("whatsapp-link").href = "https://wa.me/" + mitra.telepon + "?text=" + encodeURIComponent(message);
      document.getElementById("booking-success").hidden = false;
      document.getElementById("booking-success").scrollIntoView({ behavior: "smooth", block: "center" });
    } catch (error) {
      setFormError(error.message || "Booking belum dapat disimpan. Silakan coba lagi.");
      await renderSlots();
    } finally {
      button.disabled = false;
      button.textContent = "Konfirmasi Booking Sekarang";
    }
  });

  function setFormError(message) {
    var errorBox = document.getElementById("form-error");
    errorBox.textContent = message;
    errorBox.hidden = false;
  }

  function formatInputDate(date) {
    return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0") + "-" + String(date.getDate()).padStart(2, "0");
  }
})();
