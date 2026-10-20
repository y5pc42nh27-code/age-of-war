// One shared reference; standalone packaging embeds the image only once.
export const battlefieldUrl =
  window.BLOODLINES_ART || `${import.meta.env.BASE_URL}assets/battlefield.webp`;
