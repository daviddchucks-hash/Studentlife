import { initNavigation } from "./nav.js";
import { renderProfileModule } from "./profile.js";

document.addEventListener("DOMContentLoaded", async () => {
  initNavigation("profile");
  const container = document.querySelector("#profile-container");
  if (container) {
    await renderProfileModule(container);
  }
});
