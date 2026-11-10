(function () {
  "use strict";
  var api = window.NamaProdukAPI;
  var ui = window.NamaProdukUI;
  document.addEventListener("DOMContentLoaded", async function () {
    ui.applyProductName();
    var error = document.getElementById("login-error");
    try {
      var existing = await api.getSesiMitra();
      if (existing) {
        window.location.href = "dashboard.html";
        return;
      }
    } catch (sessionError) {
      error.textContent =
        sessionError.message ||
        "Sesi belum dapat diperiksa. Silakan coba lagi.";
      error.hidden = false;
    }
    document
      .getElementById("login-form")
      .addEventListener("submit", async function (event) {
        event.preventDefault();
        error.hidden = true;
        try {
          await api.loginMitra(
            document.getElementById("email").value,
            document.getElementById("password").value,
          );
          window.location.href = "dashboard.html";
        } catch (loginError) {
          error.textContent =
            loginError.message || "Tidak dapat masuk. Silakan coba lagi.";
          error.hidden = false;
        }
      });

    document.querySelectorAll("[data-demo-email]").forEach(function (button) {
      button.addEventListener("click", function () {
        var email = button.getAttribute("data-demo-email");
        var password = button.getAttribute("data-demo-password") || "demo123";
        var emailInput = document.getElementById("email");
        var passwordInput = document.getElementById("password");
        if (emailInput) emailInput.value = email;
        if (passwordInput) passwordInput.value = password;
        if (error) error.hidden = true;
        if (emailInput) emailInput.focus();
      });
    });
  });
})();
