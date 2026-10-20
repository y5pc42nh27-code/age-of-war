import "./style.css";
async function boot() {
  try {
    if (!document.createElement("canvas").getContext("2d"))
      throw new Error("Canvas 2D jest niedostępny w tym podglądzie.");
    await import("./main.js");
  } catch (error) {
    window.bloodlinesBoot?.fail(
      error.message || "Nie udało się wczytać silnika gry.",
    );
  }
}
boot();
