(function () {
  "use strict";

  var api = window.NamaProdukAPI;
  var ui = window.NamaProdukUI;

  var enrichedMitra = [];
  var savedSlugs = {};
  var filterState = {
    query: "",
    categories: [],
    maxPrice: 100000,
    openEarly: false,
    fastService: false,
    budgetFriendly: false,
    selectedDate: "",
    sortBy: "recommended"
  };

  document.addEventListener("DOMContentLoaded", initialize);

  async function initialize() {
    ui.applyProductName();
    var yearEl = document.getElementById("current-year");
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    setupNavbar();
    initializeDefaultSearchDate();
    bindSearchAndFilterEvents();

    await loadMitraData();
  }

  function setupNavbar() {
    var header = document.querySelector(".site-header");
    var toggle = document.getElementById("mobile-menu-toggle");
    var mobileNav = document.getElementById("mobile-nav");

    window.addEventListener("scroll", function () {
      if (!header) return;
      header.classList.toggle("is-scrolled", window.scrollY > 12);
    }, { passive: true });

    if (toggle && mobileNav) {
      toggle.addEventListener("click", function () {
        var expanded = toggle.getAttribute("aria-expanded") === "true";
        toggle.setAttribute("aria-expanded", String(!expanded));
        mobileNav.hidden = expanded;
      });

      mobileNav.querySelectorAll("a").forEach(function (link) {
        link.addEventListener("click", function () {
          toggle.setAttribute("aria-expanded", "false");
          mobileNav.hidden = true;
        });
      });
    }
  }

  function initializeDefaultSearchDate() {
    var dateInput = document.getElementById("hero-search-date");
    if (!dateInput) return;
    var tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    var maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 14);
    var minStr = formatDateISO(tomorrow);
    var maxStr = formatDateISO(maxDate);
    dateInput.min = minStr;
    dateInput.max = maxStr;
    dateInput.value = minStr;
    filterState.selectedDate = minStr;
  }

  function formatDateISO(date) {
    return (
      date.getFullYear() +
      "-" +
      String(date.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(date.getDate()).padStart(2, "0")
    );
  }

  async function loadMitraData() {
    var partnerList = document.getElementById("partner-list");
    var featuredList = document.getElementById("featured-list");

    try {
      var rawList = await api.listMitra();
      enrichedMitra = await Promise.all(
        rawList.map(async function (item) {
          var detail = await api.getMitraBySlug(item.slug);
          var services = await api.listLayanan(item.id);
          var visuals = ui.getMitraVisuals(item.slug, "");
          var prices = services.map(function (s) { return Number(s.harga) || 0; });
          var durations = services.map(function (s) { return Number(s.durasi) || 60; });
          var minPrice = prices.length ? Math.min.apply(null, prices) : 0;
          var maxServicePrice = prices.length ? Math.max.apply(null, prices) : 0;
          var minDuration = durations.length ? Math.min.apply(null, durations) : 60;
          var startHour = detail && detail.jamMulai ? Number(detail.jamMulai.split(":")[0]) : 9;

          return {
            id: item.id,
            slug: item.slug,
            nama: item.nama,
            kategori: item.kategori,
            alamat: item.alamat,
            jamMulai: detail ? detail.jamMulai : "09:00",
            jamSelesai: detail ? detail.jamSelesai : "17:00",
            services: services,
            minPrice: minPrice,
            maxPrice: maxServicePrice,
            minDuration: minDuration,
            openEarly: startHour <= 9,
            fastService: minDuration <= 30,
            visuals: visuals
          };
        })
      );

      renderCategoryFilters();
      renderPopularCounts();
      renderFeaturedSection();
      renderListingResults();
    } catch (error) {
      var errHtml = '<div class="notice notice-error" role="alert">Daftar mitra belum dapat dimuat. Silakan muat ulang halaman.</div>';
      if (partnerList) partnerList.innerHTML = errHtml;
      if (featuredList) featuredList.innerHTML = errHtml;
    }
  }

  function bindSearchAndFilterEvents() {
    // Category tabs in Hero Search Dock
    document.querySelectorAll("[data-hero-cat]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var cat = btn.getAttribute("data-hero-cat");
        document.querySelectorAll("[data-hero-cat]").forEach(function (b) {
          var active = b === btn;
          b.classList.toggle("is-active", active);
          b.setAttribute("aria-selected", String(active));
        });
        var selectEl = document.getElementById("hero-search-category");
        if (selectEl) selectEl.value = cat;
        filterState.categories = cat ? [cat] : [];
        syncSidebarCheckboxes();
        renderListingResults();
      });
    });

    // Hero Search Form Submit
    var heroForm = document.getElementById("hero-search-form");
    if (heroForm) {
      heroForm.addEventListener("submit", function (event) {
        event.preventDefault();
        var q = document.getElementById("hero-search-query").value.trim();
        var cat = document.getElementById("hero-search-category").value;
        var dateVal = document.getElementById("hero-search-date").value;
        var budgetVal = Number(document.getElementById("hero-search-budget").value) || 100000;

        filterState.query = q;
        filterState.categories = cat ? [cat] : [];
        filterState.selectedDate = dateVal;
        filterState.maxPrice = budgetVal;

        var inlineSearch = document.getElementById("listing-search-input");
        if (inlineSearch) inlineSearch.value = q;

        var slider = document.getElementById("filter-price-range");
        if (slider) slider.value = String(budgetVal);
        updateBudgetLabel();
        syncHeroTabsFromCategories();
        syncSidebarCheckboxes();
        renderListingResults();

        var explorer = document.getElementById("mitra");
        if (explorer) explorer.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }

    // Inline Listing Search Input
    var listingSearch = document.getElementById("listing-search-input");
    if (listingSearch) {
      listingSearch.addEventListener("input", function () {
        filterState.query = listingSearch.value.trim();
        var heroQuery = document.getElementById("hero-search-query");
        if (heroQuery) heroQuery.value = filterState.query;
        renderListingResults();
      });
    }

    // Budget Range Slider
    var priceRange = document.getElementById("filter-price-range");
    if (priceRange) {
      priceRange.addEventListener("input", function () {
        filterState.maxPrice = Number(priceRange.value);
        updateBudgetLabel();
        renderListingResults();
      });
    }

    // Popular Feature Checkboxes
    var chkEarly = document.getElementById("filter-open-early");
    var chkFast = document.getElementById("filter-fast-service");
    var chkBudget = document.getElementById("filter-budget-friendly");

    if (chkEarly) {
      chkEarly.addEventListener("change", function () {
        filterState.openEarly = chkEarly.checked;
        renderListingResults();
      });
    }
    if (chkFast) {
      chkFast.addEventListener("change", function () {
        filterState.fastService = chkFast.checked;
        renderListingResults();
      });
    }
    if (chkBudget) {
      chkBudget.addEventListener("change", function () {
        filterState.budgetFriendly = chkBudget.checked;
        renderListingResults();
      });
    }

    // Sorting
    var sortSelect = document.getElementById("listing-sort");
    if (sortSelect) {
      sortSelect.addEventListener("change", function () {
        filterState.sortBy = sortSelect.value;
        renderListingResults();
      });
    }

    // Reset Filters
    var resetBtn = document.getElementById("reset-filters");
    if (resetBtn) {
      resetBtn.addEventListener("click", resetAllFilters);
    }

    // Delegate Favorite Button & Reset inside partner-list
    var partnerList = document.getElementById("partner-list");
    if (partnerList) {
      partnerList.addEventListener("click", function (event) {
        var favBtn = event.target.closest("[data-fav-slug]");
        if (favBtn) {
          var slug = favBtn.getAttribute("data-fav-slug");
          savedSlugs[slug] = !savedSlugs[slug];
          favBtn.classList.toggle("is-saved", Boolean(savedSlugs[slug]));
          favBtn.setAttribute("aria-pressed", String(Boolean(savedSlugs[slug])));
          return;
        }
        var emptyReset = event.target.closest("[data-action='reset-empty']");
        if (emptyReset) {
          resetAllFilters();
        }
      });
    }
  }

  function resetAllFilters() {
    filterState.query = "";
    filterState.categories = [];
    filterState.maxPrice = 100000;
    filterState.openEarly = false;
    filterState.fastService = false;
    filterState.budgetFriendly = false;
    filterState.sortBy = "recommended";

    var heroQuery = document.getElementById("hero-search-query");
    var heroCat = document.getElementById("hero-search-category");
    var heroBudget = document.getElementById("hero-search-budget");
    var inlineSearch = document.getElementById("listing-search-input");
    var slider = document.getElementById("filter-price-range");
    var sortSelect = document.getElementById("listing-sort");
    var chkEarly = document.getElementById("filter-open-early");
    var chkFast = document.getElementById("filter-fast-service");
    var chkBudget = document.getElementById("filter-budget-friendly");

    if (heroQuery) heroQuery.value = "";
    if (heroCat) heroCat.value = "";
    if (heroBudget) heroBudget.value = "100000";
    if (inlineSearch) inlineSearch.value = "";
    if (slider) slider.value = "100000";
    if (sortSelect) sortSelect.value = "recommended";
    if (chkEarly) chkEarly.checked = false;
    if (chkFast) chkFast.checked = false;
    if (chkBudget) chkBudget.checked = false;

    updateBudgetLabel();
    syncHeroTabsFromCategories();
    syncSidebarCheckboxes();
    renderListingResults();
  }

  function updateBudgetLabel() {
    var label = document.getElementById("budget-range-value");
    if (!label) return;
    if (filterState.maxPrice >= 100000) {
      label.textContent = "Semua Harga (Hingga Rp 100.000+)";
    } else {
      label.textContent = "Mulai di bawah " + ui.formatRupiah(filterState.maxPrice);
    }
  }

  function renderCategoryFilters() {
    var container = document.getElementById("category-filter-list");
    if (!container) return;

    var counts = {};
    enrichedMitra.forEach(function (m) {
      counts[m.kategori] = (counts[m.kategori] || 0) + 1;
    });

    var categories = Object.keys(counts).sort();
    container.innerHTML = categories.map(function (cat) {
      return (
        '<label class="filter-check-item">' +
          '<span class="filter-check-left">' +
            '<input type="checkbox" data-category-check="' + ui.escapeHtml(cat) + '">' +
            '<span>' + ui.escapeHtml(cat) + '</span>' +
          '</span>' +
          '<span class="filter-count">' + counts[cat] + '</span>' +
        '</label>'
      );
    }).join("");

    container.addEventListener("change", function (event) {
      var target = event.target;
      if (!target.matches("[data-category-check]")) return;
      var selected = [];
      container.querySelectorAll("[data-category-check]:checked").forEach(function (input) {
        selected.push(input.getAttribute("data-category-check"));
      });
      filterState.categories = selected;
      var heroCat = document.getElementById("hero-search-category");
      if (heroCat) heroCat.value = selected.length === 1 ? selected[0] : "";
      syncHeroTabsFromCategories();
      renderListingResults();
    });
  }

  function renderPopularCounts() {
    var cEarly = document.getElementById("count-open-early");
    var cFast = document.getElementById("count-fast-service");
    var cBudget = document.getElementById("count-budget-friendly");
    if (cEarly) cEarly.textContent = enrichedMitra.filter(function (m) { return m.openEarly; }).length;
    if (cFast) cFast.textContent = enrichedMitra.filter(function (m) { return m.fastService; }).length;
    if (cBudget) cBudget.textContent = enrichedMitra.filter(function (m) { return m.minPrice <= 30000; }).length;
  }

  function syncSidebarCheckboxes() {
    var container = document.getElementById("category-filter-list");
    if (!container) return;
    container.querySelectorAll("[data-category-check]").forEach(function (input) {
      var cat = input.getAttribute("data-category-check");
      input.checked = filterState.categories.indexOf(cat) !== -1;
    });
  }

  function syncHeroTabsFromCategories() {
    var activeCat = filterState.categories.length === 1 ? filterState.categories[0] : "";
    document.querySelectorAll("[data-hero-cat]").forEach(function (btn) {
      var match = btn.getAttribute("data-hero-cat") === activeCat && filterState.categories.length <= 1;
      btn.classList.toggle("is-active", match);
      btn.setAttribute("aria-selected", String(match));
    });
  }

  function buildBookingHref(slug) {
    var url = "booking.html?mitra=" + encodeURIComponent(slug);
    if (filterState.selectedDate) {
      url += "&tanggal=" + encodeURIComponent(filterState.selectedDate);
    }
    return url;
  }

  function renderFeaturedSection() {
    var container = document.getElementById("featured-list");
    if (!container) return;

    container.innerHTML = enrichedMitra.map(function (item) {
      var v = item.visuals;
      var badgeClass = v.badgeType === "gold" ? "media-badge--gold" : "media-badge--navy";
      var topServices = item.services.slice(0, 3).map(function (s) {
        return '<span class="service-chip">' + ui.escapeHtml(s.nama) + "</span>";
      }).join("");

      return (
        '<article class="featured-card">' +
          '<div class="featured-card-media">' +
            '<img src="' + ui.escapeHtml(v.mainImage) + '" alt="' + ui.escapeHtml(item.nama) + '" loading="lazy">' +
            '<span class="media-badge ' + badgeClass + '">' + ui.escapeHtml(v.badge) + '</span>' +
            '<span class="media-rating" aria-label="Rating ' + ui.escapeHtml(v.rating) + ' dari 5">' +
              '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>' +
              ui.escapeHtml(v.rating) +
            '</span>' +
          '</div>' +
          '<div class="featured-card-body">' +
            '<span class="featured-card-cat">' + ui.escapeHtml(item.kategori) + ' · Jam ' + ui.escapeHtml(item.jamMulai) + '–' + ui.escapeHtml(item.jamSelesai) + '</span>' +
            '<h3>' + ui.escapeHtml(item.nama) + '</h3>' +
            '<div class="featured-card-loc">' +
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>' +
              '<span>' + ui.escapeHtml(item.alamat) + '</span>' +
            '</div>' +
            '<div class="featured-services-preview">' + topServices + '</div>' +
            '<div class="featured-card-footer">' +
              '<div class="price-block">' +
                '<small>Mulai dari</small>' +
                '<strong>' + ui.formatRupiah(item.minPrice) + '</strong>' +
              '</div>' +
              '<a class="button button-primary button-small" href="' + buildBookingHref(item.slug) + '">Pilih Jadwal</a>' +
            '</div>' +
          '</div>' +
        '</article>'
      );
    }).join("");
  }

  function renderListingResults() {
    var list = document.getElementById("partner-list");
    var counter = document.getElementById("listing-result-count");
    if (!list) return;

    var q = filterState.query.toLowerCase();
    var filtered = enrichedMitra.filter(function (item) {
      if (q) {
        var inName = item.nama.toLowerCase().indexOf(q) !== -1;
        var inCat = item.kategori.toLowerCase().indexOf(q) !== -1;
        var inAddr = item.alamat.toLowerCase().indexOf(q) !== -1;
        var inServ = item.services.some(function (s) {
          return s.nama.toLowerCase().indexOf(q) !== -1;
        });
        if (!inName && !inCat && !inAddr && !inServ) return false;
      }
      if (filterState.categories.length && filterState.categories.indexOf(item.kategori) === -1) {
        return false;
      }
      if (filterState.maxPrice < 100000 && item.minPrice > filterState.maxPrice) {
        return false;
      }
      if (filterState.openEarly && !item.openEarly) return false;
      if (filterState.fastService && !item.fastService) return false;
      if (filterState.budgetFriendly && item.minPrice > 30000) return false;
      return true;
    });

    filtered.sort(function (a, b) {
      if (filterState.sortBy === "price-asc") return a.minPrice - b.minPrice;
      if (filterState.sortBy === "price-desc") return b.minPrice - a.minPrice;
      if (filterState.sortBy === "rating-desc") return Number(b.visuals.rating) - Number(a.visuals.rating);
      if (filterState.sortBy === "name-asc") return a.nama.localeCompare(b.nama, "id");
      return b.visuals.reviews - a.visuals.reviews;
    });

    if (counter) {
      counter.innerHTML =
        "Menampilkan <strong>" +
        filtered.length +
        "</strong> dari <strong>" +
        enrichedMitra.length +
        "</strong> mitra usaha terverifikasi";
    }

    if (!filtered.length) {
      list.innerHTML =
        '<div class="empty-state" style="margin: 12px 0; max-width: none;">' +
          '<div class="empty-state-icon" aria-hidden="true">' +
            '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>' +
          '</div>' +
          '<h3>Tidak ada mitra yang sesuai filter</h3>' +
          '<p>Coba perluas rentang harga atau hapus salah satu filter pencarian untuk melihat seluruh jadwal layanan yang tersedia.</p>' +
          '<button type="button" class="button button-primary button-small" data-action="reset-empty">Reset Semua Filter</button>' +
        '</div>';
      return;
    }

    list.innerHTML = filtered.map(function (item) {
      var v = item.visuals;
      var isSaved = Boolean(savedSlugs[item.slug]);
      var badgeClass = v.badgeType === "gold" ? "media-badge--gold" : "media-badge--navy";
      var facilitiesHtml = v.facilities.slice(0, 4).map(function (fac) {
        return (
          '<span class="partner-facility">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="M20 6L9 17l-5-5"/></svg>' +
            ui.escapeHtml(fac) +
          '</span>'
        );
      }).join("");

      var servicesSummary = item.services.map(function (s) {
        return s.nama + " (" + ui.formatRupiah(s.harga) + ")";
      }).join(" · ");

      return (
        '<article class="partner-card">' +
          '<div class="partner-card-thumb">' +
            '<img src="' + ui.escapeHtml(v.mainImage) + '" alt="' + ui.escapeHtml(item.nama) + '" loading="lazy">' +
            '<span class="media-badge ' + badgeClass + '">' + ui.escapeHtml(v.badge) + '</span>' +
            '<button type="button" class="favorite-btn' + (isSaved ? " is-saved" : "") + '" data-fav-slug="' + ui.escapeHtml(item.slug) + '" aria-label="Simpan ' + ui.escapeHtml(item.nama) + '" aria-pressed="' + isSaved + '">' +
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>' +
            '</button>' +
          '</div>' +
          '<div class="partner-card-info">' +
            '<div>' +
              '<div class="partner-title-row">' +
                '<span class="tag">' + ui.escapeHtml(item.kategori) + '</span>' +
                '<span class="star-row" aria-hidden="true">★★★★★</span>' +
              '</div>' +
              '<h3>' + ui.escapeHtml(item.nama) + '</h3>' +
              '<div class="partner-meta-line">' +
                '<span>' +
                  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>' +
                  ui.escapeHtml(item.alamat) +
                '</span>' +
                '<span>' +
                  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>' +
                  'Buka ' + ui.escapeHtml(item.jamMulai) + '–' + ui.escapeHtml(item.jamSelesai) +
                '</span>' +
              '</div>' +
              '<div class="partner-perk-banner">' +
                '<strong>Pesan tanpa akun</strong> · ' + ui.escapeHtml(item.services.length) + ' pilihan layanan: ' + ui.escapeHtml(servicesSummary) +
              '</div>' +
            '</div>' +
            '<div class="partner-facilities">' + facilitiesHtml + '</div>' +
          '</div>' +
          '<div class="partner-card-aside">' +
            '<div class="rating-score-cluster">' +
              '<div class="rating-score-text">' +
                '<strong>' + ui.escapeHtml(v.ratingLabel) + '</strong>' +
                '<span>' + ui.escapeHtml(v.reviews) + ' ulasan</span>' +
              '</div>' +
              '<div class="rating-score-pill" aria-label="Skor ' + ui.escapeHtml(v.rating) + '">' + ui.escapeHtml(v.rating) + '</div>' +
            '</div>' +
            '<div class="partner-price-cta">' +
              '<div class="partner-price-box">' +
                '<small>Mulai dari</small>' +
                '<strong>' + ui.formatRupiah(item.minPrice) + '</strong>' +
                '<span class="fee-note">Bebas biaya admin</span>' +
              '</div>' +
              '<a class="button button-primary button-small button-full" href="' + buildBookingHref(item.slug) + '">' +
                'Lihat halaman booking' +
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="M9 18l6-6-6-6"/></svg>' +
              '</a>' +
            '</div>' +
          '</div>' +
        '</article>'
      );
    }).join("");
  }
})();
