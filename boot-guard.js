(function () {
  var startup = document.getElementById("startup");
  var detail = document.getElementById("startup-detail");
  var ready = false;
  function fail(message) {
    if (ready) return;
    startup.hidden = false;
    startup.setAttribute("role", "alert");
    document.getElementById("startup-title").textContent =
      "Nie udało się uruchomić gry";
    detail.textContent =
      message +
      " Otwórz opublikowany adres HTTPS w Safari. Podgląd w aplikacji Pliki może nie uruchamiać JavaScript.";
    document.getElementById("startup-retry").hidden = false;
  }
  window.bloodlinesBoot = {
    fail: fail,
    complete: function () {
      ready = true;
      startup.hidden = true;
      clearTimeout(timer);
    },
  };
  window.addEventListener(
    "error",
    function (e) {
      fail(
        e.message ||
          "Nie można wczytać plików gry. Sprawdź połączenie i adres strony.",
      );
    },
    true,
  );
  window.addEventListener("unhandledrejection", function (e) {
    fail(
      e.reason && e.reason.message
        ? e.reason.message
        : "Błąd inicjalizacji JavaScript.",
    );
  });
  document.getElementById("startup-retry").onclick = function () {
    location.reload();
  };
  var timer = setTimeout(function () {
    fail("Uruchamianie trwa zbyt długo.");
  }, 20000);
})();
