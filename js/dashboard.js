(function () {
  "use strict";
  var api = window.NamaProdukAPI;
  var ui = window.NamaProdukUI;
  var session;
  var activeTab = "overview";
  var showAllBookingDates = false;
  var today = formatInputDate(new Date());

  document.addEventListener("DOMContentLoaded", initialize);

  async function initialize() {
    ui.applyProductName();
    try {
      session = await api.getSesiMitra();
      if (!session) {
        window.location.href = "login.html";
        return;
      }
      document.getElementById("header-mitra-name").textContent = session.nama;
      document.getElementById("dashboard-business-name").textContent = session.nama;

      var avatarEl = document.getElementById("sidebar-avatar");
      if (avatarEl && session.nama) {
        avatarEl.textContent = session.nama.charAt(0).toUpperCase();
      }

      var bookingLink = document.getElementById("public-booking-link");
      bookingLink.href = "../booking.html?mitra=" + encodeURIComponent(session.slug);

      document.getElementById("booking-date").value = today;
      document.getElementById("schedule-date").value = today;

      bindEvents();
      await refreshAll();
    } catch (error) {
      showError(error.message || "Dashboard tidak dapat dimuat. Silakan masuk kembali.");
    }
  }

  function bindEvents() {
    // Logout
    document.getElementById("logout-button").addEventListener("click", async function () {
      await api.logoutMitra();
      window.location.href = "login.html";
    });

    // Sidebar Navigation Tabs
    document.querySelectorAll(".tab-button").forEach(function (button) {
      button.addEventListener("click", function () {
        activateTab(button.dataset.tab);
        closeMobileSidebar();
      });
    });

    // Mobile Sidebar Drawer
    var toggleBtn = document.getElementById("sidebar-toggle-btn");
    var closeBtn = document.getElementById("sidebar-close-btn");
    var overlay = document.getElementById("sidebar-overlay");
    if (toggleBtn) toggleBtn.addEventListener("click", openMobileSidebar);
    if (closeBtn) closeBtn.addEventListener("click", closeMobileSidebar);
    if (overlay) overlay.addEventListener("click", closeMobileSidebar);

    // Overview shortcut to Bookings tab
    var gotoBookings = document.getElementById("goto-all-bookings");
    if (gotoBookings) {
      gotoBookings.addEventListener("click", function () {
        showAllBookingDates = true;
        var allBtn = document.getElementById("booking-all-dates");
        if (allBtn) allBtn.classList.add("is-active");
        activateTab("bookings");
        renderBookings();
      });
    }

    // Booking Filters
    var allDatesBtn = document.getElementById("booking-all-dates");
    if (allDatesBtn) {
      allDatesBtn.addEventListener("click", function () {
        showAllBookingDates = !showAllBookingDates;
        allDatesBtn.classList.toggle("is-active", showAllBookingDates);
        renderBookings();
      });
    }

    document.getElementById("booking-date").addEventListener("change", function () {
      showAllBookingDates = false;
      if (allDatesBtn) allDatesBtn.classList.remove("is-active");
      renderBookings();
    });
    document.getElementById("booking-status").addEventListener("change", renderBookings);

    var bookingSearch = document.getElementById("booking-search");
    if (bookingSearch) {
      bookingSearch.addEventListener("input", renderBookings);
    }

    // Schedule Filter
    document.getElementById("schedule-date").addEventListener("change", renderSchedule);

    // Customer Search
    var customerSearch = document.getElementById("customer-search");
    if (customerSearch) {
      customerSearch.addEventListener("input", renderCustomers);
    }

    // Delegated Actions
    document.getElementById("booking-list").addEventListener("click", handleBookingAction);
    var recentList = document.getElementById("recent-booking-list");
    if (recentList) recentList.addEventListener("click", handleBookingAction);

    document.getElementById("schedule-grid").addEventListener("click", handleScheduleAction);

    document.getElementById("add-service-button").addEventListener("click", function () {
      openServiceDialog();
    });
    document.getElementById("service-list").addEventListener("click", handleServiceAction);
    document.getElementById("close-service-dialog").addEventListener("click", closeServiceDialog);
    document.getElementById("cancel-service").addEventListener("click", closeServiceDialog);
    document.getElementById("service-form").addEventListener("submit", saveService);
  }

  function openMobileSidebar() {
    var sidebar = document.getElementById("admin-sidebar");
    var overlay = document.getElementById("sidebar-overlay");
    if (sidebar) sidebar.classList.add("is-open");
    if (overlay) overlay.hidden = false;
  }

  function closeMobileSidebar() {
    var sidebar = document.getElementById("admin-sidebar");
    var overlay = document.getElementById("sidebar-overlay");
    if (sidebar) sidebar.classList.remove("is-open");
    if (overlay) overlay.hidden = true;
  }

  function activateTab(tab) {
    activeTab = tab;
    document.querySelectorAll(".tab-button").forEach(function (button) {
      var selected = button.dataset.tab === tab;
      button.classList.toggle("is-active", selected);
      button.setAttribute("aria-selected", String(selected));
    });
    document.querySelectorAll(".dashboard-view").forEach(function (panel) {
      panel.hidden = panel.id !== "panel-" + tab;
    });
    if (tab === "schedule") renderSchedule();
    if (tab === "services") renderServices();
    if (tab === "customers") renderCustomers();
    if (tab === "bookings") renderBookings();
  }

  async function refreshAll() {
    clearError();
    await Promise.all([
      renderStatsAndOverview(),
      renderBookings(),
      renderSchedule(),
      renderCustomers(),
      renderServices()
    ]);
  }

  async function renderStatsAndOverview() {
    var summary = await api.getRingkasan(session.id, today);
    var allBookings = await api.listBooking(session.id);
    var services = await api.listLayanan(session.id);

    var servicePriceMap = {};
    services.forEach(function (s) {
      servicePriceMap[s.id] = Number(s.harga) || 0;
    });

    var activeBookings = allBookings.filter(function (b) {
      return b.status !== "dibatalkan";
    });

    var totalRevenue = activeBookings.reduce(function (acc, item) {
      return acc + (servicePriceMap[item.layananId] || 0);
    }, 0);

    var totalPending = allBookings.filter(function (b) {
      return b.status === "menunggu";
    }).length;

    document.getElementById("stat-bookings").textContent = summary.booking;
    document.getElementById("stat-pending").textContent = totalPending;
    document.getElementById("stat-available").textContent = summary.slotKosong;

    var totalEl = document.getElementById("stat-total-bookings");
    if (totalEl) totalEl.textContent = allBookings.length;

    var revEl = document.getElementById("stat-revenue");
    if (revEl) revEl.textContent = ui.formatRupiah(totalRevenue);

    var navBadgeBookings = document.getElementById("nav-badge-bookings");
    if (navBadgeBookings) navBadgeBookings.textContent = allBookings.length;

    renderSevenDayChart(allBookings);
    renderStatusDistribution(allBookings);
    renderRecentBookings(allBookings, servicePriceMap);
  }

  function renderSevenDayChart(allBookings) {
    var container = document.getElementById("analytics-chart");
    if (!container) return;

    var days = [];
    var base = new Date();
    for (var offset = -3; offset <= 3; offset += 1) {
      var d = new Date(base);
      d.setDate(base.getDate() + offset);
      var iso = formatInputDate(d);
      var label = offset === 0
        ? "Hari Ini"
        : new Intl.DateTimeFormat("id-ID", { weekday: "short", day: "numeric" }).format(d);
      var count = allBookings.filter(function (b) {
        return b.tanggal === iso && b.status !== "dibatalkan";
      }).length;
      days.push({ iso: iso, label: label, count: count, isToday: offset === 0 });
    }

    var maxCount = Math.max.apply(null, days.map(function (d) { return d.count; }).concat([4]));

    container.innerHTML = days.map(function (d) {
      var pct = d.count === 0 ? 6 : Math.max(14, Math.round((d.count / maxCount) * 100));
      return (
        '<div class="chart-bar-col' + (d.isToday ? " is-today" : "") + '">' +
          '<span class="chart-bar-val">' + d.count + '</span>' +
          '<div class="chart-bar-track">' +
            '<div class="chart-bar-fill" style="height: ' + pct + '%;" title="' + ui.escapeHtml(d.label) + ': ' + d.count + ' booking"></div>' +
          '</div>' +
          '<span class="chart-bar-label">' + ui.escapeHtml(d.label) + '</span>' +
        '</div>'
      );
    }).join("");
  }

  function renderStatusDistribution(allBookings) {
    var container = document.getElementById("status-distribution");
    if (!container) return;

    var total = allBookings.length || 1;
    var accepted = allBookings.filter(function (b) { return b.status === "diterima"; }).length;
    var pending = allBookings.filter(function (b) { return b.status === "menunggu"; }).length;
    var cancelled = allBookings.filter(function (b) { return b.status === "dibatalkan"; }).length;

    var rows = [
      { label: "Diterima", count: accepted, cls: "status-dist-fill--accepted" },
      { label: "Menunggu Konfirmasi", count: pending, cls: "status-dist-fill--pending" },
      { label: "Dibatalkan", count: cancelled, cls: "status-dist-fill--cancelled" }
    ];

    container.innerHTML = rows.map(function (r) {
      var pct = allBookings.length ? Math.round((r.count / total) * 100) : 0;
      return (
        '<div class="status-dist-item">' +
          '<div class="status-dist-header">' +
            '<span>' + r.label + '</span>' +
            '<strong>' + r.count + ' (' + pct + '%)</strong>' +
          '</div>' +
          '<div class="status-dist-bar">' +
            '<div class="status-dist-fill ' + r.cls + '" style="width: ' + pct + '%;"></div>' +
          '</div>' +
        '</div>'
      );
    }).join("");
  }

  function renderRecentBookings(allBookings, priceMap) {
    var container = document.getElementById("recent-booking-list");
    if (!container) return;

    if (!allBookings.length) {
      container.innerHTML = '<div class="empty-panel">Belum ada data booking yang masuk.</div>';
      return;
    }

    var sorted = allBookings.slice().sort(function (a, b) {
      if (a.tanggal !== b.tanggal) return b.tanggal.localeCompare(a.tanggal);
      return a.jamMulai.localeCompare(b.jamMulai);
    }).slice(0, 5);

    container.innerHTML = sorted.map(function (item) {
      return buildBookingRowHtml(item, priceMap[item.layananId]);
    }).join("");
  }

  function buildBookingRowHtml(item, price) {
    var statusLabel = item.status.charAt(0).toUpperCase() + item.status.slice(1);
    var wa =
      "https://wa.me/" +
      ui.phoneToWhatsApp(item.telepon) +
      "?text=" +
      encodeURIComponent(
        "Halo " + item.nama + ", saya dari " + session.nama + " terkait booking " + item.kode + "."
      );

    var priceInfo = price != null ? " · " + ui.formatRupiah(price) : "";

    return (
      '<article class="booking-row">' +
        '<div class="booking-customer">' +
          '<strong>' + ui.escapeHtml(item.nama) + '</strong>' +
          '<span>' + ui.escapeHtml(item.telepon) + ' · ' + ui.escapeHtml(item.kode) + '</span>' +
        '</div>' +
        '<div class="booking-detail">' +
          '<strong>' + ui.escapeHtml(item.layananNama) + priceInfo + '</strong>' +
          '<span>' + item.jamMulai + '–' + item.jamSelesai + ' · ' +
            ui.escapeHtml(ui.formatTanggal(item.tanggal, { day: "numeric", month: "short", year: "numeric" })) +
          '</span>' +
        '</div>' +
        '<span class="status-badge status-' + item.status + '">' + statusLabel + '</span>' +
        '<div class="booking-actions">' +
          (item.status === "menunggu"
            ? '<button class="button button-primary" type="button" data-booking-action="diterima" data-id="' + ui.escapeHtml(item.id) + '">Terima</button>'
            : "") +
          (item.status !== "dibatalkan"
            ? '<button class="button button-secondary" type="button" data-booking-action="dibatalkan" data-id="' + ui.escapeHtml(item.id) + '">Batalkan</button>'
            : "") +
          '<a class="button button-secondary" href="' + wa + '" target="_blank" rel="noopener noreferrer">WhatsApp</a>' +
        '</div>' +
      '</article>'
    );
  }

  async function renderBookings() {
    var date = showAllBookingDates ? "" : document.getElementById("booking-date").value;
    var status = document.getElementById("booking-status").value;
    var searchEl = document.getElementById("booking-search");
    var query = searchEl ? searchEl.value.trim().toLowerCase() : "";
    var list = document.getElementById("booking-list");

    var bookings = await api.listBooking(session.id, date);
    var services = await api.listLayanan(session.id);
    var priceMap = {};
    services.forEach(function (s) { priceMap[s.id] = Number(s.harga) || 0; });

    if (status !== "semua") {
      bookings = bookings.filter(function (item) {
        return item.status === status;
      });
    }
    if (query) {
      bookings = bookings.filter(function (item) {
        return (
          item.nama.toLowerCase().indexOf(query) !== -1 ||
          item.kode.toLowerCase().indexOf(query) !== -1 ||
          item.layananNama.toLowerCase().indexOf(query) !== -1
        );
      });
    }

    if (!bookings.length) {
      list.innerHTML = '<div class="empty-panel">Belum ada booking yang sesuai dengan filter tanggal atau status ini.</div>';
      return;
    }

    list.innerHTML = bookings.map(function (item) {
      return buildBookingRowHtml(item, priceMap[item.layananId]);
    }).join("");
  }

  async function handleBookingAction(event) {
    var button = event.target.closest("[data-booking-action]");
    if (!button) return;
    button.disabled = true;
    try {
      await api.updateStatusBooking(button.dataset.id, button.dataset.bookingAction);
      await refreshAll();
    } catch (error) {
      showError(error.message);
      button.disabled = false;
    }
  }

  async function renderCustomers() {
    var container = document.getElementById("customer-list");
    var badgeEl = document.getElementById("nav-badge-customers");
    if (!container) return;

    var allBookings = await api.listBooking(session.id);
    var services = await api.listLayanan(session.id);
    var priceMap = {};
    services.forEach(function (s) { priceMap[s.id] = Number(s.harga) || 0; });

    var map = {};
    allBookings.forEach(function (b) {
      var key = ui.phoneToWhatsApp(b.telepon) || b.nama.toLowerCase();
      if (!map[key]) {
        map[key] = {
          nama: b.nama,
          telepon: b.telepon,
          totalBookings: 0,
          totalSpend: 0,
          lastDate: b.tanggal,
          lastService: b.layananNama
        };
      }
      map[key].totalBookings += 1;
      if (b.status !== "dibatalkan") {
        map[key].totalSpend += priceMap[b.layananId] || 0;
      }
      if (b.tanggal >= map[key].lastDate) {
        map[key].lastDate = b.tanggal;
        map[key].lastService = b.layananNama;
      }
    });

    var customers = Object.keys(map).map(function (k) { return map[k]; });
    if (badgeEl) badgeEl.textContent = customers.length;

    var searchEl = document.getElementById("customer-search");
    var q = searchEl ? searchEl.value.trim().toLowerCase() : "";
    if (q) {
      customers = customers.filter(function (c) {
        return c.nama.toLowerCase().indexOf(q) !== -1 || c.telepon.indexOf(q) !== -1;
      });
    }

    if (!customers.length) {
      container.innerHTML = '<div class="empty-panel">Belum ada data pelanggan yang sesuai pencarian.</div>';
      return;
    }

    container.innerHTML = customers.map(function (c) {
      var initials = c.nama.split(" ").slice(0, 2).map(function (p) { return p.charAt(0).toUpperCase(); }).join("");
      var wa = "https://wa.me/" + ui.phoneToWhatsApp(c.telepon) + "?text=" + encodeURIComponent("Halo " + c.nama + ", salam hangat dari " + session.nama + ".");
      return (
        '<article class="customer-row">' +
          '<div class="customer-identity">' +
            '<div class="customer-avatar" aria-hidden="true">' + ui.escapeHtml(initials || "P") + '</div>' +
            '<div>' +
              '<strong>' + ui.escapeHtml(c.nama) + '</strong>' +
              '<span>' + ui.escapeHtml(c.telepon) + '</span>' +
            '</div>' +
          '</div>' +
          '<div class="customer-stat-cell">' +
            '<strong>' + c.totalBookings + 'x reservasi</strong>' +
            '<span>Total ' + ui.formatRupiah(c.totalSpend) + '</span>' +
          '</div>' +
          '<div class="customer-stat-cell">' +
            '<strong>' + ui.escapeHtml(c.lastService) + '</strong>' +
            '<span>' + ui.escapeHtml(ui.formatTanggal(c.lastDate, { day: "numeric", month: "short", year: "numeric" })) + '</span>' +
          '</div>' +
          '<div class="booking-actions">' +
            '<a class="button button-secondary" href="' + wa + '" target="_blank" rel="noopener noreferrer">Hubungi WhatsApp</a>' +
          '</div>' +
        '</article>'
      );
    }).join("");
  }

  async function renderSchedule() {
    var date = document.getElementById("schedule-date").value;
    var grid = document.getElementById("schedule-grid");
    if (!date) return;
    try {
      var slots = await api.getJadwalHarian(session.id, date);
      if (!slots.length) {
        grid.innerHTML = '<div class="empty-panel">Jadwal belum tersedia.</div>';
        return;
      }
      grid.innerHTML = slots.map(function (slot) {
        var label =
          slot.status === "terisi"
            ? "Terisi"
            : slot.status === "ditutup"
              ? "Ditutup"
              : slot.status === "lewat"
                ? "Lewat"
                : "Kosong";
        var canToggle = slot.status === "kosong" || slot.status === "ditutup";
        var cls =
          slot.status === "kosong"
            ? "available"
            : slot.status === "terisi"
              ? "booked"
              : slot.status === "ditutup"
                ? "closed"
                : "past";

        return (
          '<article class="schedule-slot is-' + cls + '">' +
            '<div>' +
              '<strong>' + slot.jamMulai + '–' + slot.jamSelesai + '</strong>' +
              '<span>' + label + (slot.bookingKode ? " · " + ui.escapeHtml(slot.bookingKode) : "") + '</span>' +
            '</div>' +
            (canToggle
              ? '<button type="button" class="schedule-toggle" data-schedule-action="' +
                (slot.status === "kosong" ? "tutup" : "buka") +
                '" data-start="' + slot.jamMulai + '" data-end="' + slot.jamSelesai + '">' +
                (slot.status === "kosong" ? "Tutup slot" : "Buka slot") +
                "</button>"
              : "") +
          "</article>"
        );
      }).join("");
    } catch (error) {
      grid.innerHTML = '<div class="empty-panel">' + ui.escapeHtml(error.message) + "</div>";
    }
  }

  async function handleScheduleAction(event) {
    var button = event.target.closest("[data-schedule-action]");
    if (!button) return;
    button.disabled = true;
    var date = document.getElementById("schedule-date").value;
    try {
      if (button.dataset.scheduleAction === "tutup") {
        await api.tutupJam(session.id, date, button.dataset.start, button.dataset.end);
      } else {
        await api.bukaJam(session.id, date, button.dataset.start, button.dataset.end);
      }
      await Promise.all([renderSchedule(), renderStatsAndOverview()]);
    } catch (error) {
      showError(error.message);
      button.disabled = false;
    }
  }

  async function renderServices() {
    var list = document.getElementById("service-list");
    var services = await api.listLayanan(session.id);
    if (!services.length) {
      list.innerHTML = '<div class="empty-panel">Belum ada layanan. Tambahkan layanan agar pelanggan dapat memesan.</div>';
      return;
    }
    list.innerHTML = services.map(function (item) {
      return (
        '<article class="service-admin-row">' +
          '<div>' +
            '<h3>' + ui.escapeHtml(item.nama) + '</h3>' +
            '<p>Durasi ' + item.durasi + ' menit · Tarif <strong>' + ui.formatRupiah(item.harga) + '</strong></p>' +
          '</div>' +
          '<div class="service-actions">' +
            '<button class="button button-secondary" type="button" data-service-action="edit" data-id="' + ui.escapeHtml(item.id) + '">Ubah</button>' +
            '<button class="button button-secondary" type="button" data-service-action="delete" data-id="' + ui.escapeHtml(item.id) + '">Hapus</button>' +
          '</div>' +
        '</article>'
      );
    }).join("");
  }

  async function handleServiceAction(event) {
    var button = event.target.closest("[data-service-action]");
    if (!button) return;
    var services = await api.listLayanan(session.id);
    var service = services.find(function (item) {
      return item.id === button.dataset.id;
    });
    if (!service) return;
    if (button.dataset.serviceAction === "edit") {
      openServiceDialog(service);
      return;
    }
    if (!window.confirm('Hapus layanan "' + service.nama + '"?')) return;
    try {
      await api.hapusLayanan(service.id);
      await Promise.all([renderServices(), renderStatsAndOverview()]);
    } catch (error) {
      showError(error.message);
    }
  }

  function openServiceDialog(service) {
    var form = document.getElementById("service-form");
    form.reset();
    document.getElementById("service-form-error").hidden = true;
    document.getElementById("service-dialog-title").textContent = service
      ? "Ubah Layanan"
      : "Tambah Layanan";
    document.getElementById("service-id").value = service ? service.id : "";
    if (service) {
      document.getElementById("service-name").value = service.nama;
      document.getElementById("service-duration").value = service.durasi;
      document.getElementById("service-price").value = service.harga;
    }
    document.getElementById("service-dialog").showModal();
    document.getElementById("service-name").focus();
  }

  function closeServiceDialog() {
    document.getElementById("service-dialog").close();
  }

  async function saveService(event) {
    event.preventDefault();
    var id = document.getElementById("service-id").value;
    var input = {
      nama: document.getElementById("service-name").value,
      durasi: document.getElementById("service-duration").value,
      harga: document.getElementById("service-price").value
    };
    try {
      if (id) await api.ubahLayanan(id, input);
      else await api.tambahLayanan(session.id, input);
      closeServiceDialog();
      await Promise.all([renderServices(), renderStatsAndOverview()]);
    } catch (error) {
      var errorBox = document.getElementById("service-form-error");
      errorBox.textContent = error.message;
      errorBox.hidden = false;
    }
  }

  function showError(message) {
    var element = document.getElementById("dashboard-error");
    element.textContent = message;
    element.hidden = false;
  }

  function clearError() {
    var element = document.getElementById("dashboard-error");
    if (!element) return;
    element.textContent = "";
    element.hidden = true;
  }

  function formatInputDate(date) {
    return (
      date.getFullYear() +
      "-" +
      String(date.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(date.getDate()).padStart(2, "0")
    );
  }
})();
