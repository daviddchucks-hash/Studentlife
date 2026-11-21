(function (root) {
  "use strict";

  var DEFAULT_THEME_ID = "classic-light";
  var STORAGE_KEY_ACTIVE_UID = "afit_theme_active_uid";
  var STORAGE_KEY_ACTIVE_PREF = "afit_theme_active_pref";
  var STORAGE_KEY_USER_PREFIX = "afit_theme_uid_";

  var BACKGROUND_PRESETS = {
    "light-crisp": {
      label: "Crisp White",
      mode: "light",
      bgPrimary: "#f5f7fa",
      bgSecondary: "#e9eff4",
      surface: "#ffffff",
      surfaceAlt: "#f1f5f9",
      navBg: "rgba(255, 255, 255, 0.92)",
      modalBg: "#ffffff",
      textPrimary: "#14232b",
      textSecondary: "#566975",
      border: "#dbe4ea",
      borderStrong: "#aebdc7",
      inputBg: "#ffffff",
      inputBorder: "#cbd5dc",
      hoverBg: "#edf3f7",
      msgReceivedBg: "#ffffff",
      msgReceivedText: "#14232b",
      shadow: "0 12px 32px rgba(20, 35, 43, 0.08)"
    },
    "light-soft": {
      label: "Soft Cool Slate",
      mode: "light",
      bgPrimary: "#eef3f8",
      bgSecondary: "#e2eaf2",
      surface: "#fcfdff",
      surfaceAlt: "#edf3f9",
      navBg: "rgba(252, 253, 255, 0.92)",
      modalBg: "#fcfdff",
      textPrimary: "#132230",
      textSecondary: "#516475",
      border: "#d3dee8",
      borderStrong: "#a4b6c7",
      inputBg: "#ffffff",
      inputBorder: "#c4d2df",
      hoverBg: "#e8eff7",
      msgReceivedBg: "#fcfdff",
      msgReceivedText: "#132230",
      shadow: "0 12px 32px rgba(19, 34, 48, 0.08)"
    },
    "light-warm": {
      label: "Warm Cream",
      mode: "light",
      bgPrimary: "#faf6ef",
      bgSecondary: "#f2eadc",
      surface: "#fffdf9",
      surfaceAlt: "#f6efe2",
      navBg: "rgba(255, 253, 249, 0.92)",
      modalBg: "#fffdf9",
      textPrimary: "#2b2116",
      textSecondary: "#6b5944",
      border: "#e6dac6",
      borderStrong: "#c5b296",
      inputBg: "#fffdf9",
      inputBorder: "#d8cab3",
      hoverBg: "#f3eadb",
      msgReceivedBg: "#fffdf9",
      msgReceivedText: "#2b2116",
      shadow: "0 12px 32px rgba(43, 33, 22, 0.08)"
    },
    "dark-midnight": {
      label: "Midnight Dark",
      mode: "dark",
      bgPrimary: "#0b0e14",
      bgSecondary: "#121721",
      surface: "#161c26",
      surfaceAlt: "#1e2633",
      navBg: "rgba(14, 18, 26, 0.92)",
      modalBg: "#18202c",
      textPrimary: "#edf2f7",
      textSecondary: "#9aa8ba",
      border: "#263142",
      borderStrong: "#3b4b63",
      inputBg: "#11161f",
      inputBorder: "#2c384b",
      hoverBg: "#212a38",
      msgReceivedBg: "#1c2432",
      msgReceivedText: "#edf2f7",
      shadow: "0 14px 36px rgba(0, 0, 0, 0.45)"
    },
    "dark-slate": {
      label: "Deep Charcoal",
      mode: "dark",
      bgPrimary: "#121316",
      bgSecondary: "#191b20",
      surface: "#1f2228",
      surfaceAlt: "#282c34",
      navBg: "rgba(24, 26, 31, 0.92)",
      modalBg: "#22252c",
      textPrimary: "#f2f4f8",
      textSecondary: "#a3aab7",
      border: "#303540",
      borderStrong: "#474f5e",
      inputBg: "#17191e",
      inputBorder: "#363c48",
      hoverBg: "#2b303a",
      msgReceivedBg: "#252932",
      msgReceivedText: "#f2f4f8",
      shadow: "0 14px 36px rgba(0, 0, 0, 0.45)"
    }
  };

  var THEMES = [
    {
      id: "classic-light",
      name: "Classic Light",
      mode: "light",
      category: "light",
      description: "Clean white surfaces, soft cool grey canvas, and dependable AFIT navy accents.",
      swatches: ["#f4f7fa", "#ffffff", "#174e74", "#2a6f9d", "#14232b"],
      tokens: {
        bgPrimary: "#f4f7fa",
        bgSecondary: "#eaf0f5",
        surface: "#ffffff",
        surfaceAlt: "#f2f6fa",
        navBg: "rgba(255, 255, 255, 0.92)",
        modalBg: "#ffffff",
        textPrimary: "#14232b",
        textSecondary: "#566873",
        accentPrimary: "#174e74",
        accentPrimaryHover: "#113d5b",
        accentSecondary: "#246b99",
        accentSoft: "#eaf3fb",
        buttonBg: "#174e74",
        buttonHover: "#113d5b",
        buttonText: "#ffffff",
        border: "#dbe4ea",
        borderStrong: "#aab8c2",
        inputBg: "#ffffff",
        inputBorder: "#cbd5dc",
        hoverBg: "#eff4f7",
        navActiveBg: "#eaf3fb",
        navActiveText: "#174e74",
        success: "#1e6f4f",
        successSoft: "#eaf8f0",
        warning: "#945a0a",
        warningSoft: "#fff6e3",
        error: "#b24a42",
        errorSoft: "#fff1f0",
        msgReceivedBg: "#ffffff",
        msgReceivedText: "#14232b",
        msgSentBg: "#174e74",
        msgSentText: "#ffffff",
        focusRing: "rgba(23, 78, 116, 0.25)",
        shadow: "0 12px 32px rgba(20, 35, 43, 0.08)"
      }
    },
    {
      id: "midnight-dark",
      name: "Midnight Dark",
      mode: "dark",
      category: "dark",
      description: "Deep charcoal surfaces with electric indigo highlights crafted for late-night study.",
      swatches: ["#0b0e14", "#161c26", "#2563eb", "#60a5fa", "#edf2f7"],
      tokens: {
        bgPrimary: "#0b0e14",
        bgSecondary: "#121721",
        surface: "#161c26",
        surfaceAlt: "#1e2633",
        navBg: "rgba(15, 20, 28, 0.92)",
        modalBg: "#18202c",
        textPrimary: "#edf2f7",
        textSecondary: "#9aa8ba",
        accentPrimary: "#60a5fa",
        accentPrimaryHover: "#93c5fd",
        accentSecondary: "#818cf8",
        accentSoft: "#1d2b44",
        buttonBg: "#2563eb",
        buttonHover: "#1d4ed8",
        buttonText: "#ffffff",
        border: "#263142",
        borderStrong: "#3d4d66",
        inputBg: "#10151d",
        inputBorder: "#2d394d",
        hoverBg: "#202938",
        navActiveBg: "#1e2d4a",
        navActiveText: "#93c5fd",
        success: "#34d399",
        successSoft: "#112b23",
        warning: "#fbbf24",
        warningSoft: "#2b2212",
        error: "#f87171",
        errorSoft: "#31181a",
        msgReceivedBg: "#1c2432",
        msgReceivedText: "#edf2f7",
        msgSentBg: "#2563eb",
        msgSentText: "#ffffff",
        focusRing: "rgba(96, 165, 250, 0.32)",
        shadow: "0 14px 36px rgba(0, 0, 0, 0.48)"
      }
    },
    {
      id: "blossom-pink",
      name: "Blossom Pink",
      mode: "light",
      category: "vibrant",
      description: "Delicate pastel blush canvas, crisp white cards, and refined rose-berry accents.",
      swatches: ["#fdf5f8", "#ffffff", "#b42c5c", "#db5c88", "#2d1620"],
      tokens: {
        bgPrimary: "#fdf5f8",
        bgSecondary: "#f8e9ef",
        surface: "#ffffff",
        surfaceAlt: "#fbf0f4",
        navBg: "rgba(255, 250, 252, 0.92)",
        modalBg: "#ffffff",
        textPrimary: "#2d1620",
        textSecondary: "#6e4b59",
        accentPrimary: "#b42c5c",
        accentPrimaryHover: "#932048",
        accentSecondary: "#c94070",
        accentSoft: "#fce8f0",
        buttonBg: "#b42c5c",
        buttonHover: "#932048",
        buttonText: "#ffffff",
        border: "#efd8e1",
        borderStrong: "#cfa9b8",
        inputBg: "#ffffff",
        inputBorder: "#dfc2ce",
        hoverBg: "#faf0f4",
        navActiveBg: "#fce8f0",
        navActiveText: "#9c224d",
        success: "#1c6e4c",
        successSoft: "#e9f7ef",
        warning: "#9c5910",
        warningSoft: "#fff5e2",
        error: "#b83244",
        errorSoft: "#fff0f2",
        msgReceivedBg: "#ffffff",
        msgReceivedText: "#2d1620",
        msgSentBg: "#b42c5c",
        msgSentText: "#ffffff",
        focusRing: "rgba(180, 44, 92, 0.24)",
        shadow: "0 12px 30px rgba(84, 24, 48, 0.08)"
      }
    },
    {
      id: "lavender-dream",
      name: "Lavender Dream",
      mode: "light",
      category: "vibrant",
      description: "Soft lilac backgrounds paired with expressive violet highlights and calm contrast.",
      swatches: ["#f5f2fc", "#ffffff", "#673ab7", "#8c63d9", "#211738"],
      tokens: {
        bgPrimary: "#f5f2fc",
        bgSecondary: "#ece6fa",
        surface: "#ffffff",
        surfaceAlt: "#f2edfc",
        navBg: "rgba(251, 249, 255, 0.92)",
        modalBg: "#ffffff",
        textPrimary: "#211738",
        textSecondary: "#5c4f78",
        accentPrimary: "#673ab7",
        accentPrimaryHover: "#532c99",
        accentSecondary: "#7b4fd0",
        accentSoft: "#efe9fc",
        buttonBg: "#673ab7",
        buttonHover: "#532c99",
        buttonText: "#ffffff",
        border: "#e1d8f4",
        borderStrong: "#b9a7de",
        inputBg: "#ffffff",
        inputBorder: "#cdc0ea",
        hoverBg: "#f2edfc",
        navActiveBg: "#efe9fc",
        navActiveText: "#5b32a3",
        success: "#1b6f4e",
        successSoft: "#e9f8ef",
        warning: "#945a0a",
        warningSoft: "#fff5e1",
        error: "#b4414b",
        errorSoft: "#fff0f2",
        msgReceivedBg: "#ffffff",
        msgReceivedText: "#211738",
        msgSentBg: "#673ab7",
        msgSentText: "#ffffff",
        focusRing: "rgba(103, 58, 183, 0.24)",
        shadow: "0 12px 30px rgba(45, 27, 89, 0.08)"
      }
    },
    {
      id: "emerald-green",
      name: "Emerald Green",
      mode: "light",
      category: "light",
      description: "Fresh botanical cream-sage surfaces balanced with deep emerald accents.",
      swatches: ["#f2f8f4", "#ffffff", "#146c43", "#248a5c", "#12261d"],
      tokens: {
        bgPrimary: "#f2f8f4",
        bgSecondary: "#e5f0ea",
        surface: "#ffffff",
        surfaceAlt: "#edf6f0",
        navBg: "rgba(250, 253, 251, 0.92)",
        modalBg: "#ffffff",
        textPrimary: "#12261d",
        textSecondary: "#466355",
        accentPrimary: "#146c43",
        accentPrimaryHover: "#0e5433",
        accentSecondary: "#1c8051",
        accentSoft: "#e5f5ec",
        buttonBg: "#146c43",
        buttonHover: "#0e5433",
        buttonText: "#ffffff",
        border: "#d1e3d8",
        borderStrong: "#9ec0ac",
        inputBg: "#ffffff",
        inputBorder: "#bdd5c7",
        hoverBg: "#ebf4ee",
        navActiveBg: "#e5f5ec",
        navActiveText: "#105c38",
        success: "#146c43",
        successSoft: "#e5f5ec",
        warning: "#945a0a",
        warningSoft: "#fff5e1",
        error: "#b2423c",
        errorSoft: "#fff0ef",
        msgReceivedBg: "#ffffff",
        msgReceivedText: "#12261d",
        msgSentBg: "#146c43",
        msgSentText: "#ffffff",
        focusRing: "rgba(20, 108, 67, 0.24)",
        shadow: "0 12px 30px rgba(18, 38, 29, 0.07)"
      }
    },
    {
      id: "multicolour-pop",
      name: "Multicolour Pop",
      mode: "light",
      category: "vibrant",
      description: "A coordinated multi-hue palette blending purple, pink, blue, orange, teal, and gold.",
      swatches: ["#6d28d9", "#db2777", "#2563eb", "#ea580c", "#0d9488"],
      tokens: {
        bgPrimary: "#f7f8fc",
        bgSecondary: "#eef1f8",
        surface: "#ffffff",
        surfaceAlt: "#f3f5fb",
        navBg: "rgba(255, 255, 255, 0.93)",
        modalBg: "#ffffff",
        textPrimary: "#17192b",
        textSecondary: "#545b74",
        accentPrimary: "#6d28d9",
        accentPrimaryHover: "#5b21b6",
        accentSecondary: "#db2777",
        accentSoft: "#efeaff",
        buttonBg: "linear-gradient(135deg, #6d28d9 0%, #c026d3 100%)",
        buttonHover: "linear-gradient(135deg, #5b21b6 0%, #a21caf 100%)",
        buttonText: "#ffffff",
        border: "#dce1ee",
        borderStrong: "#b1bad4",
        inputBg: "#ffffff",
        inputBorder: "#cad1e3",
        hoverBg: "#f1f3fa",
        navActiveBg: "#efeaff",
        navActiveText: "#5b21b6",
        success: "#0f766e",
        successSoft: "#e6f7f5",
        warning: "#c2410c",
        warningSoft: "#fff1e8",
        error: "#be123c",
        errorSoft: "#fff0f4",
        msgReceivedBg: "#ffffff",
        msgReceivedText: "#17192b",
        msgSentBg: "#6d28d9",
        msgSentText: "#ffffff",
        focusRing: "rgba(109, 40, 217, 0.25)",
        shadow: "0 12px 32px rgba(23, 25, 43, 0.09)",
        pop1: "#6d28d9",
        pop2: "#db2777",
        pop3: "#2563eb",
        pop4: "#ea580c",
        pop5: "#0d9488",
        pop6: "#ca8a04"
      }
    },
    {
      id: "ocean-breeze",
      name: "Ocean Breeze",
      mode: "light",
      category: "light",
      description: "Calm seafoam backgrounds with crisp ocean blue and refreshing turquoise highlights.",
      swatches: ["#eff8fb", "#ffffff", "#0b647d", "#0e839e", "#0f2733"],
      tokens: {
        bgPrimary: "#eff8fb",
        bgSecondary: "#e2f2f7",
        surface: "#ffffff",
        surfaceAlt: "#e9f6fa",
        navBg: "rgba(249, 253, 255, 0.92)",
        modalBg: "#ffffff",
        textPrimary: "#0f2733",
        textSecondary: "#446473",
        accentPrimary: "#0b647d",
        accentPrimaryHover: "#084f63",
        accentSecondary: "#0e7490",
        accentSoft: "#e2f5fa",
        buttonBg: "#0b647d",
        buttonHover: "#084f63",
        buttonText: "#ffffff",
        border: "#cde3ea",
        borderStrong: "#95bcc9",
        inputBg: "#ffffff",
        inputBorder: "#b7d5df",
        hoverBg: "#e8f5f9",
        navActiveBg: "#e2f5fa",
        navActiveText: "#09576e",
        success: "#0f766e",
        successSoft: "#e6f7f5",
        warning: "#995c0c",
        warningSoft: "#fff5e2",
        error: "#b3443e",
        errorSoft: "#fff0ef",
        msgReceivedBg: "#ffffff",
        msgReceivedText: "#0f2733",
        msgSentBg: "#0b647d",
        msgSentText: "#ffffff",
        focusRing: "rgba(11, 100, 125, 0.24)",
        shadow: "0 12px 30px rgba(15, 39, 51, 0.08)"
      }
    },
    {
      id: "golden-sand",
      name: "Golden Sand",
      mode: "light",
      category: "warm",
      description: "Warm cream and beige surfaces paired with burnished bronze-gold accents.",
      swatches: ["#faf5ec", "#fffdf8", "#8f5b0c", "#b87a1c", "#2c2113"],
      tokens: {
        bgPrimary: "#faf5ec",
        bgSecondary: "#f2eadb",
        surface: "#fffdf8",
        surfaceAlt: "#f6efe2",
        navBg: "rgba(255, 253, 248, 0.93)",
        modalBg: "#fffdf8",
        textPrimary: "#2c2113",
        textSecondary: "#6b5942",
        accentPrimary: "#8f5b0c",
        accentPrimaryHover: "#724707",
        accentSecondary: "#a86e18",
        accentSoft: "#f7ebd4",
        buttonBg: "#8f5b0c",
        buttonHover: "#724707",
        buttonText: "#ffffff",
        border: "#e6d9c4",
        borderStrong: "#c4b08e",
        inputBg: "#fffdf8",
        inputBorder: "#d8c9af",
        hoverBg: "#f3ead9",
        navActiveBg: "#f7ebd4",
        navActiveText: "#7a4d09",
        success: "#1e6e48",
        successSoft: "#eaf7ef",
        warning: "#8f5b0c",
        warningSoft: "#f9eed8",
        error: "#ad3f35",
        errorSoft: "#fff0ee",
        msgReceivedBg: "#fffdf8",
        msgReceivedText: "#2c2113",
        msgSentBg: "#8f5b0c",
        msgSentText: "#ffffff",
        focusRing: "rgba(143, 91, 12, 0.24)",
        shadow: "0 12px 30px rgba(44, 33, 19, 0.08)"
      }
    },
    {
      id: "sunset-glow",
      name: "Sunset Glow",
      mode: "light",
      category: "warm",
      description: "Warm peach canvas blended with coral-orange and sunset rose accents.",
      swatches: ["#fff5f0", "#ffffff", "#c2410c", "#be185d", "#2e1712"],
      tokens: {
        bgPrimary: "#fff5f0",
        bgSecondary: "#fce9e0",
        surface: "#ffffff",
        surfaceAlt: "#fff0e9",
        navBg: "rgba(255, 251, 249, 0.93)",
        modalBg: "#ffffff",
        textPrimary: "#2e1712",
        textSecondary: "#734d44",
        accentPrimary: "#c2410c",
        accentPrimaryHover: "#9a3412",
        accentSecondary: "#be185d",
        accentSoft: "#ffe8dd",
        buttonBg: "linear-gradient(135deg, #c2410c 0%, #be185d 100%)",
        buttonHover: "linear-gradient(135deg, #9a3412 0%, #9d174d 100%)",
        buttonText: "#ffffff",
        border: "#f2d8cd",
        borderStrong: "#d9ab98",
        inputBg: "#ffffff",
        inputBorder: "#e8c4b5",
        hoverBg: "#fdeee7",
        navActiveBg: "#ffe8dd",
        navActiveText: "#a5360a",
        success: "#1c6e4b",
        successSoft: "#e9f7ef",
        warning: "#b45309",
        warningSoft: "#fff3db",
        error: "#b91c1c",
        errorSoft: "#fff0f0",
        msgReceivedBg: "#ffffff",
        msgReceivedText: "#2e1712",
        msgSentBg: "#c2410c",
        msgSentText: "#ffffff",
        focusRing: "rgba(194, 65, 12, 0.24)",
        shadow: "0 12px 30px rgba(78, 30, 18, 0.08)"
      }
    },
    {
      id: "cyber-neon",
      name: "Cyber Neon",
      mode: "dark",
      category: "dark",
      description: "Sleek dark obsidian UI energized with crisp cyan and electric neon violet highlights.",
      swatches: ["#060a12", "#0f1726", "#22d3ee", "#c084fc", "#e6f6ff"],
      tokens: {
        bgPrimary: "#060a12",
        bgSecondary: "#0d1421",
        surface: "#0f1726",
        surfaceAlt: "#162136",
        navBg: "rgba(10, 16, 28, 0.93)",
        modalBg: "#121b2d",
        textPrimary: "#e6f6ff",
        textSecondary: "#8fb0c7",
        accentPrimary: "#22d3ee",
        accentPrimaryHover: "#67e8f9",
        accentSecondary: "#c084fc",
        accentSoft: "#122b3d",
        buttonBg: "#06b6d4",
        buttonHover: "#22d3ee",
        buttonText: "#04151f",
        border: "#1d2d44",
        borderStrong: "#2d486e",
        inputBg: "#0a101b",
        inputBorder: "#233652",
        hoverBg: "#17243a",
        navActiveBg: "#132f42",
        navActiveText: "#67e8f9",
        success: "#34d399",
        successSoft: "#0e2b25",
        warning: "#fbbf24",
        warningSoft: "#2b210e",
        error: "#fb7185",
        errorSoft: "#331420",
        msgReceivedBg: "#152034",
        msgReceivedText: "#e6f6ff",
        msgSentBg: "#0e7490",
        msgSentText: "#ffffff",
        focusRing: "rgba(34, 211, 238, 0.35)",
        shadow: "0 14px 36px rgba(0, 0, 0, 0.52)"
      }
    },
    {
      id: "sky-blue",
      name: "Sky Blue",
      mode: "light",
      category: "light",
      description: "Airy sky-tinted surfaces anchored by sharp navy accents for effortless clarity.",
      swatches: ["#eff6ff", "#ffffff", "#1d4ed8", "#0284c7", "#12233d"],
      tokens: {
        bgPrimary: "#eff6ff",
        bgSecondary: "#e2efff",
        surface: "#ffffff",
        surfaceAlt: "#e8f2ff",
        navBg: "rgba(250, 252, 255, 0.92)",
        modalBg: "#ffffff",
        textPrimary: "#12233d",
        textSecondary: "#486384",
        accentPrimary: "#1d4ed8",
        accentPrimaryHover: "#1e40af",
        accentSecondary: "#0284c7",
        accentSoft: "#e0edff",
        buttonBg: "#1d4ed8",
        buttonHover: "#1e40af",
        buttonText: "#ffffff",
        border: "#cfe0f5",
        borderStrong: "#95b7e6",
        inputBg: "#ffffff",
        inputBorder: "#b9d1ee",
        hoverBg: "#e8f1ff",
        navActiveBg: "#e0edff",
        navActiveText: "#1d4ed8",
        success: "#166f4d",
        successSoft: "#e8f7ef",
        warning: "#945a0a",
        warningSoft: "#fff5e1",
        error: "#b43f3f",
        errorSoft: "#fff0f0",
        msgReceivedBg: "#ffffff",
        msgReceivedText: "#12233d",
        msgSentBg: "#1d4ed8",
        msgSentText: "#ffffff",
        focusRing: "rgba(29, 78, 216, 0.24)",
        shadow: "0 12px 30px rgba(18, 35, 61, 0.08)"
      }
    },
    {
      id: "royal-purple",
      name: "Royal Purple",
      mode: "dark",
      category: "dark",
      description: "Rich velvet purple surfaces accented by luminous amethyst and soft lavender ink.",
      swatches: ["#140e24", "#21183b", "#6d28d9", "#a78bfa", "#f2edff"],
      tokens: {
        bgPrimary: "#140e24",
        bgSecondary: "#1d1533",
        surface: "#21183b",
        surfaceAlt: "#2a1f4a",
        navBg: "rgba(23, 16, 42, 0.93)",
        modalBg: "#241a40",
        textPrimary: "#f2edff",
        textSecondary: "#b5a6d9",
        accentPrimary: "#a78bfa",
        accentPrimaryHover: "#c4b5fd",
        accentSecondary: "#c084fc",
        accentSoft: "#322459",
        buttonBg: "#6d28d9",
        buttonHover: "#5b21b6",
        buttonText: "#ffffff",
        border: "#392b5e",
        borderStrong: "#56438c",
        inputBg: "#19122e",
        inputBorder: "#42326e",
        hoverBg: "#2e2250",
        navActiveBg: "#362661",
        navActiveText: "#ddd6fe",
        success: "#34d399",
        successSoft: "#142f2b",
        warning: "#fbbf24",
        warningSoft: "#302315",
        error: "#fb7185",
        errorSoft: "#381829",
        msgReceivedBg: "#291e47",
        msgReceivedText: "#f2edff",
        msgSentBg: "#6d28d9",
        msgSentText: "#ffffff",
        focusRing: "rgba(167, 139, 250, 0.34)",
        shadow: "0 14px 36px rgba(9, 5, 20, 0.5)"
      }
    }
  ];

  function isValidHexColor(value) {
    return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value.trim());
  }

  function hexToRgb(hex) {
    if (!isValidHexColor(hex)) return null;
    var clean = hex.trim().slice(1);
    return {
      r: parseInt(clean.slice(0, 2), 16),
      g: parseInt(clean.slice(2, 4), 16),
      b: parseInt(clean.slice(4, 6), 16)
    };
  }

  function rgbToHex(r, g, b) {
    var clamp = function (n) {
      return Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
    };
    return "#" + clamp(r) + clamp(g) + clamp(b);
  }

  function mixHex(hexA, hexB, ratioB) {
    var a = hexToRgb(hexA);
    var b = hexToRgb(hexB);
    if (!a || !b) return hexA;
    var t = Math.max(0, Math.min(1, Number(ratioB) || 0));
    return rgbToHex(
      a.r + (b.r - a.r) * t,
      a.g + (b.g - a.g) * t,
      a.b + (b.b - a.b) * t
    );
  }

  function relativeLuminance(hex) {
    var rgb = hexToRgb(hex);
    if (!rgb) return 0;
    var transform = function (channel) {
      var s = channel / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * transform(rgb.r) + 0.7152 * transform(rgb.g) + 0.0722 * transform(rgb.b);
  }

  function contrastRatio(hexA, hexB) {
    if (!isValidHexColor(hexA) || !isValidHexColor(hexB)) return 1;
    var lumA = relativeLuminance(hexA);
    var lumB = relativeLuminance(hexB);
    var bright = Math.max(lumA, lumB);
    var dark = Math.min(lumA, lumB);
    return (bright + 0.05) / (dark + 0.05);
  }

  function pickReadableForeground(bgHex) {
    if (!isValidHexColor(bgHex)) return "#ffffff";
    var whiteScore = contrastRatio(bgHex, "#ffffff");
    var darkScore = contrastRatio(bgHex, "#111827");
    return whiteScore >= darkScore ? "#ffffff" : "#111827";
  }

  function ensureReadableAccentOnSurface(accentHex, surfaceHex, minRatio) {
    var threshold = minRatio || 4.5;
    if (!isValidHexColor(accentHex) || !isValidHexColor(surfaceHex)) return accentHex;
    if (contrastRatio(accentHex, surfaceHex) >= threshold) return accentHex;
    var surfaceIsDark = relativeLuminance(surfaceHex) < 0.2;
    var target = surfaceIsDark ? "#f8fafc" : "#0f172a";
    for (var step = 1; step <= 20; step += 1) {
      var candidate = mixHex(accentHex, target, step / 20);
      if (contrastRatio(candidate, surfaceHex) >= threshold) return candidate;
    }
    return target;
  }

  function resolveCustomThemeDefinition(customColors) {
    var input = customColors && typeof customColors === "object" ? customColors : {};
    var bgPresetKey = BACKGROUND_PRESETS[input.backgroundPreset] ? input.backgroundPreset : "light-crisp";
    var bg = BACKGROUND_PRESETS[bgPresetKey];
    var rawPrimary = isValidHexColor(input.primaryAccent) ? input.primaryAccent.toLowerCase() : "#174e74";
    var rawSecondary = isValidHexColor(input.secondaryAccent) ? input.secondaryAccent.toLowerCase() : "#0e7490";
    var rawButton = isValidHexColor(input.buttonAccent) ? input.buttonAccent.toLowerCase() : rawPrimary;

    var isDark = bg.mode === "dark";
    var readableAccent = ensureReadableAccentOnSurface(rawPrimary, bg.surface, 4.5);
    var readableSecondary = ensureReadableAccentOnSurface(rawSecondary, bg.surface, 4.0);
    var buttonText = pickReadableForeground(rawButton);
    var buttonContrast = contrastRatio(rawButton, buttonText);
    var hoverTarget = isDark ? "#ffffff" : "#000000";
    var buttonHover = mixHex(rawButton, hoverTarget, 0.16);
    var accentHover = mixHex(readableAccent, isDark ? "#ffffff" : "#000000", 0.16);
    var accentSoft = mixHex(bg.surface, rawPrimary, isDark ? 0.26 : 0.12);
    var msgSentText = pickReadableForeground(rawPrimary);
    var rgb = hexToRgb(readableAccent) || { r: 23, g: 78, b: 116 };

    return {
      id: "custom",
      name: "Custom Theme",
      mode: bg.mode,
      category: "custom",
      description: "Personalized colours tailored to your own accent and surface preferences.",
      swatches: [bg.bgPrimary, bg.surface, rawPrimary, rawSecondary, rawButton],
      customMeta: {
        backgroundPreset: bgPresetKey,
        primaryAccent: rawPrimary,
        secondaryAccent: rawSecondary,
        buttonAccent: rawButton,
        buttonContrast: Number(buttonContrast.toFixed(2)),
        textContrast: Number(contrastRatio(bg.textPrimary, bg.surface).toFixed(2)),
        accentContrast: Number(contrastRatio(readableAccent, bg.surface).toFixed(2)),
        adjustedAccent: readableAccent !== rawPrimary
      },
      tokens: {
        bgPrimary: bg.bgPrimary,
        bgSecondary: bg.bgSecondary,
        surface: bg.surface,
        surfaceAlt: bg.surfaceAlt,
        navBg: bg.navBg,
        modalBg: bg.modalBg,
        textPrimary: bg.textPrimary,
        textSecondary: bg.textSecondary,
        accentPrimary: readableAccent,
        accentPrimaryHover: accentHover,
        accentSecondary: readableSecondary,
        accentSoft: accentSoft,
        buttonBg: rawButton,
        buttonHover: buttonHover,
        buttonText: buttonText,
        border: bg.border,
        borderStrong: bg.borderStrong,
        inputBg: bg.inputBg,
        inputBorder: bg.inputBorder,
        hoverBg: bg.hoverBg,
        navActiveBg: accentSoft,
        navActiveText: readableAccent,
        success: isDark ? "#34d399" : "#1c6e4c",
        successSoft: isDark ? "#112b23" : "#e9f7ef",
        warning: isDark ? "#fbbf24" : "#945a0a",
        warningSoft: isDark ? "#2b2212" : "#fff5e1",
        error: isDark ? "#f87171" : "#b2423c",
        errorSoft: isDark ? "#31181a" : "#fff0ef",
        msgReceivedBg: bg.msgReceivedBg,
        msgReceivedText: bg.msgReceivedText,
        msgSentBg: rawPrimary,
        msgSentText: msgSentText,
        focusRing: "rgba(" + rgb.r + ", " + rgb.g + ", " + rgb.b + ", 0.28)",
        shadow: bg.shadow
      }
    };
  }

  function getThemeById(themeId, customColors) {
    if (themeId === "custom") {
      return resolveCustomThemeDefinition(customColors);
    }
    for (var i = 0; i < THEMES.length; i += 1) {
      if (THEMES[i].id === themeId) return THEMES[i];
    }
    return THEMES[0];
  }

  function normalizePreference(raw) {
    if (!raw || typeof raw !== "object") {
      return { themeId: DEFAULT_THEME_ID, customColors: null, updatedAt: 0 };
    }
    var id = raw.themeId === "custom" || THEMES.some(function (t) { return t.id === raw.themeId; })
      ? raw.themeId
      : DEFAULT_THEME_ID;
    var customColors = null;
    if (raw.customColors && typeof raw.customColors === "object") {
      var bgPreset = BACKGROUND_PRESETS[raw.customColors.backgroundPreset]
        ? raw.customColors.backgroundPreset
        : "light-crisp";
      customColors = {
        backgroundPreset: bgPreset,
        primaryAccent: isValidHexColor(raw.customColors.primaryAccent) ? raw.customColors.primaryAccent.toLowerCase() : "#174e74",
        secondaryAccent: isValidHexColor(raw.customColors.secondaryAccent) ? raw.customColors.secondaryAccent.toLowerCase() : "#0e7490",
        buttonAccent: isValidHexColor(raw.customColors.buttonAccent) ? raw.customColors.buttonAccent.toLowerCase() : "#174e74"
      };
    }
    return {
      themeId: id,
      customColors: customColors,
      updatedAt: Number(raw.updatedAt) || 0
    };
  }

  function applyTheme(preference, options) {
    var opts = options || {};
    var normalized = normalizePreference(preference);
    var theme = getThemeById(normalized.themeId, normalized.customColors);
    var t = theme.tokens;

    if (typeof document !== "undefined" && document.documentElement) {
      var docEl = document.documentElement;
      if (opts.animate) {
        docEl.classList.add("theme-transitioning");
        root.clearTimeout(root.__afitThemeAnimTimer);
        root.__afitThemeAnimTimer = root.setTimeout(function () {
          docEl.classList.remove("theme-transitioning");
        }, 260);
      }

      docEl.dataset.theme = theme.id;
      docEl.dataset.themeMode = theme.mode;
      docEl.style.colorScheme = theme.mode;

      var vars = {
        "--theme-bg-primary": t.bgPrimary,
        "--theme-bg-secondary": t.bgSecondary,
        "--theme-surface": t.surface,
        "--theme-surface-alt": t.surfaceAlt,
        "--theme-nav-bg": t.navBg,
        "--theme-modal-bg": t.modalBg,
        "--theme-text-primary": t.textPrimary,
        "--theme-text-secondary": t.textSecondary,
        "--theme-accent-primary": t.accentPrimary,
        "--theme-accent-primary-hover": t.accentPrimaryHover,
        "--theme-accent-secondary": t.accentSecondary,
        "--theme-accent-soft": t.accentSoft,
        "--theme-button-bg": t.buttonBg,
        "--theme-button-hover": t.buttonHover,
        "--theme-button-text": t.buttonText,
        "--theme-border": t.border,
        "--theme-border-strong": t.borderStrong,
        "--theme-input-bg": t.inputBg,
        "--theme-input-border": t.inputBorder,
        "--theme-hover-bg": t.hoverBg,
        "--theme-nav-active-bg": t.navActiveBg,
        "--theme-nav-active-text": t.navActiveText,
        "--theme-success": t.success,
        "--theme-success-soft": t.successSoft,
        "--theme-warning": t.warning,
        "--theme-warning-soft": t.warningSoft,
        "--theme-error": t.error,
        "--theme-error-soft": t.errorSoft,
        "--theme-msg-received-bg": t.msgReceivedBg,
        "--theme-msg-received-text": t.msgReceivedText,
        "--theme-msg-sent-bg": t.msgSentBg,
        "--theme-msg-sent-text": t.msgSentText,
        "--theme-focus-ring": t.focusRing,
        "--theme-shadow": t.shadow,
        "--theme-pop-1": t.pop1 || t.accentPrimary,
        "--theme-pop-2": t.pop2 || t.accentSecondary,
        "--theme-pop-3": t.pop3 || t.accentPrimary,
        "--theme-pop-4": t.pop4 || t.warning,
        "--theme-pop-5": t.pop5 || t.success,
        "--theme-pop-6": t.pop6 || t.warning,
        "--ink": t.textPrimary,
        "--muted": t.textSecondary,
        "--blue": t.accentPrimary,
        "--blue-dark": t.accentPrimaryHover,
        "--blue-soft": t.accentSoft,
        "--line": t.border,
        "--paper": t.surface,
        "--canvas": t.bgPrimary,
        "--canvas-strong": t.bgSecondary,
        "--green": t.success,
        "--green-soft": t.successSoft,
        "--danger": t.error,
        "--danger-soft": t.errorSoft,
        "--shadow-soft": t.shadow
      };

      for (var key in vars) {
        if (Object.prototype.hasOwnProperty.call(vars, key)) {
          docEl.style.setProperty(key, vars[key]);
        }
      }

      var metaTheme = document.querySelector('meta[name="theme-color"]');
      if (metaTheme) {
        metaTheme.setAttribute("content", t.bgPrimary);
      }

      if (typeof CustomEvent === "function") {
        document.dispatchEvent(new CustomEvent("afit-theme-changed", {
          detail: { preference: normalized, theme: theme }
        }));
      }
    }

    return { preference: normalized, theme: theme };
  }

  function safeStorageGet(key) {
    try {
      return root.localStorage ? root.localStorage.getItem(key) : null;
    } catch (_) {
      return null;
    }
  }

  function safeStorageSet(key, val) {
    try {
      if (root.localStorage) root.localStorage.setItem(key, val);
    } catch (_) {}
  }

  function safeStorageRemove(key) {
    try {
      if (root.localStorage) root.localStorage.removeItem(key);
    } catch (_) {}
  }

  function readStoredPreferenceForUid(uid) {
    if (!uid) return null;
    var raw = safeStorageGet(STORAGE_KEY_USER_PREFIX + uid);
    if (!raw) return null;
    try {
      return normalizePreference(JSON.parse(raw));
    } catch (_) {
      return null;
    }
  }

  function saveStoredPreferenceForUid(uid, pref) {
    var normalized = normalizePreference(pref);
    normalized.updatedAt = normalized.updatedAt || Date.now();
    if (uid) {
      safeStorageSet(STORAGE_KEY_USER_PREFIX + uid, JSON.stringify(normalized));
      safeStorageSet(STORAGE_KEY_ACTIVE_UID, uid);
    }
    safeStorageSet(STORAGE_KEY_ACTIVE_PREF, JSON.stringify(normalized));
    return normalized;
  }

  function clearActiveSessionTheme() {
    safeStorageRemove(STORAGE_KEY_ACTIVE_UID);
    safeStorageRemove(STORAGE_KEY_ACTIVE_PREF);
    applyTheme({ themeId: DEFAULT_THEME_ID }, { animate: false });
  }

  function bootInitialTheme() {
    var activeUid = safeStorageGet(STORAGE_KEY_ACTIVE_UID);
    var pref = null;
    if (activeUid) {
      pref = readStoredPreferenceForUid(activeUid);
    }
    if (!pref) {
      var raw = safeStorageGet(STORAGE_KEY_ACTIVE_PREF);
      if (raw) {
        try {
          pref = normalizePreference(JSON.parse(raw));
        } catch (_) {
          pref = null;
        }
      }
    }
    applyTheme(pref || { themeId: DEFAULT_THEME_ID }, { animate: false });
  }

  var api = {
    DEFAULT_THEME_ID: DEFAULT_THEME_ID,
    BACKGROUND_PRESETS: BACKGROUND_PRESETS,
    THEMES: THEMES,
    isValidHexColor: isValidHexColor,
    contrastRatio: contrastRatio,
    pickReadableForeground: pickReadableForeground,
    ensureReadableAccentOnSurface: ensureReadableAccentOnSurface,
    resolveCustomThemeDefinition: resolveCustomThemeDefinition,
    getThemeById: getThemeById,
    normalizePreference: normalizePreference,
    applyTheme: applyTheme,
    readStoredPreferenceForUid: readStoredPreferenceForUid,
    saveStoredPreferenceForUid: saveStoredPreferenceForUid,
    clearActiveSessionTheme: clearActiveSessionTheme,
    getActiveUid: function () { return safeStorageGet(STORAGE_KEY_ACTIVE_UID) || ""; },
    getCurrentPreference: function () {
      var uid = safeStorageGet(STORAGE_KEY_ACTIVE_UID);
      if (uid) {
        var uidPref = readStoredPreferenceForUid(uid);
        if (uidPref) return uidPref;
      }
      var raw = safeStorageGet(STORAGE_KEY_ACTIVE_PREF);
      if (raw) {
        try { return normalizePreference(JSON.parse(raw)); } catch (_) {}
      }
      return { themeId: DEFAULT_THEME_ID, customColors: null, updatedAt: 0 };
    }
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    root.AFITThemeEngine = api;
    bootInitialTheme();
  }
})(typeof globalThis !== "undefined" ? globalThis : window);
