(function () {
  "use strict";
  var api = window.NamaProdukAPI;
  var ui = window.NamaProdukUI;

  document.addEventListener("DOMContentLoaded", async function () {
    ui.applyProductName();
    var existing = await api.getSesiMitra();
    if (existing) {
      window.location.href = "dashboard.html";
      return;
    }

    var emailInput = document.getElementById("email");
    var passInput = document.getElementById("password");
    var error = document.getElementById("login-error");

    document.querySelectorAll("[data-demo-email]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        emailInput.value = btn.getAttribute("data-demo-email") || "";
        passInput.value = btn.getAttribute("data-demo-pass") || "";
        error.hidden = true;
        emailInput.focus();
      });
    });

    document.getElementById("login-form").addEventListener("submit", async function (event) {
      event.preventDefault();
      var submitBtn = document.getElementById("login-submit");
      error.hidden = true;
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "Memverifikasi…";
      }
      try {
        await api.loginMitra(emailInput.value, passInput.value);
        window.location.href = "dashboard.html";
      } catch (loginError) {
        error.textContent = loginError.message || "Tidak dapat masuk. Silakan coba lagi.";
        error.hidden = false;
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = "Masuk ke Dashboard";
        }
      }
    });
  });
})();
