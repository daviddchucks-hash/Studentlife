(function (root) {
  "use strict";

  var DEFAULT_THEME_ID = "classic-light";
  var SYSTEM_THEME_ID = "system-default";
  var STORAGE_KEY_ACTIVE_UID = "afit_theme_active_uid";
  var STORAGE_KEY_ACTIVE_PREF = "afit_theme_active_pref";
  var STORAGE_KEY_USER_PREFIX = "afit_theme_uid_";
  var STORAGE_KEY_PERSONALIZATION_ACTIVE = "afit_personalization_active_pref";
  var STORAGE_KEY_PERSONALIZATION_USER_PREFIX = "afit_personalization_uid_";
  var GOOGLE_FONTS_LINK_ID = "afit-google-fonts";
  var GOOGLE_FONTS_URL = "https://fonts.googleapis.com/css2?family=Caveat:wght@500;700&family=Dancing+Script:wght@500;700&family=Great+Vibes&family=JetBrains+Mono:wght@400;600;700&family=Nunito:wght@400;600;700;800&family=Pacifico&family=Playfair+Display:wght@500;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Poppins:wght@400;500;600;700&family=Roboto:wght@400;500;700&display=swap";

  var REQUIRED_CSS_VAR_NAMES = [
    "--bg-primary",
    "--bg-secondary",
    "--bg-tertiary",
    "--surface-primary",
    "--surface-secondary",
    "--surface-elevated",
    "--text-primary",
    "--text-secondary",
    "--text-muted",
    "--accent-primary",
    "--accent-secondary",
    "--accent-foreground",
    "--border-color",
    "--input-background",
    "--input-border",
    "--button-background",
    "--button-text",
    "--navigation-background",
    "--navigation-text",
    "--navigation-active",
    "--card-background",
    "--modal-background",
    "--success-color",
    "--warning-color",
    "--error-color",
    "--message-sent-background",
    "--message-received-background",
    "--focus-ring"
  ];

  var BACKGROUND_PRESETS = {
    "light-crisp": {
      label: "Crisp White",
      mode: "light",
      bgPrimary: "#f5f7fa",
      bgSecondary: "#e9eff4",
      bgTertiary: "#dfe7ee",
      surface: "#ffffff",
      surfaceAlt: "#f1f5f9",
      surfaceElevated: "#ffffff",
      navBg: "rgba(255, 255, 255, 0.94)",
      modalBg: "#ffffff",
      textPrimary: "#14232b",
      textSecondary: "#4d606c",
      textMuted: "#5e7280",
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
      bgTertiary: "#d6e1ec",
      surface: "#fcfdff",
      surfaceAlt: "#edf3f9",
      surfaceElevated: "#ffffff",
      navBg: "rgba(252, 253, 255, 0.94)",
      modalBg: "#fcfdff",
      textPrimary: "#132230",
      textSecondary: "#4b5e70",
      textMuted: "#5b7083",
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
      bgTertiary: "#e8dcc8",
      surface: "#fffdf9",
      surfaceAlt: "#f6efe2",
      surfaceElevated: "#fffefb",
      navBg: "rgba(255, 253, 249, 0.94)",
      modalBg: "#fffdf9",
      textPrimary: "#2b2116",
      textSecondary: "#63513d",
      textMuted: "#746049",
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
      bgPrimary: "#0b0c10",
      bgSecondary: "#11131a",
      bgTertiary: "#171a24",
      surface: "#151822",
      surfaceAlt: "#1c202c",
      surfaceElevated: "#222736",
      navBg: "rgba(15, 17, 25, 0.94)",
      modalBg: "#181c28",
      textPrimary: "#edf0f7",
      textSecondary: "#a7b1c4",
      textMuted: "#9aa5ba",
      border: "#272c3c",
      borderStrong: "#3d4660",
      inputBg: "#10131b",
      inputBorder: "#2d3448",
      hoverBg: "#212636",
      msgReceivedBg: "#1d2230",
      msgReceivedText: "#edf0f7",
      shadow: "0 14px 36px rgba(0, 0, 0, 0.48)"
    },
    "dark-slate": {
      label: "Deep Charcoal",
      mode: "dark",
      bgPrimary: "#121316",
      bgSecondary: "#191b20",
      bgTertiary: "#21242b",
      surface: "#1f2228",
      surfaceAlt: "#282c34",
      surfaceElevated: "#2e333d",
      navBg: "rgba(24, 26, 31, 0.94)",
      modalBg: "#22252c",
      textPrimary: "#f2f4f8",
      textSecondary: "#adb4c0",
      textMuted: "#9ea6b4",
      border: "#303540",
      borderStrong: "#474f5e",
      inputBg: "#17191e",
      inputBorder: "#363c48",
      hoverBg: "#2b303a",
      msgReceivedBg: "#252932",
      msgReceivedText: "#f2f4f8",
      shadow: "0 14px 36px rgba(0, 0, 0, 0.45)"
    },
    "dark-amoled": {
      label: "AMOLED Pure Black",
      mode: "dark",
      bgPrimary: "#000000",
      bgSecondary: "#07080c",
      bgTertiary: "#0e1017",
      surface: "#0c0d12",
      surfaceAlt: "#14161f",
      surfaceElevated: "#1a1d29",
      navBg: "rgba(5, 6, 9, 0.96)",
      modalBg: "#11131b",
      textPrimary: "#f5f7fc",
      textSecondary: "#aab4c6",
      textMuted: "#9aa5ba",
      border: "#1f2330",
      borderStrong: "#394159",
      inputBg: "#06070a",
      inputBorder: "#272c3d",
      hoverBg: "#171a24",
      msgReceivedBg: "#151822",
      msgReceivedText: "#f5f7fc",
      shadow: "0 14px 36px rgba(0, 0, 0, 0.72)"
    }
  };

  var THEMES = [
    {
      id: "classic-light",
      name: "Classic Light",
      mode: "light",
      category: "light",
      description: "Pure white cards, soft grey canvas, crisp borders, and dependable blue accents.",
      swatches: ["#f4f7fa", "#ffffff", "#174e74", "#246b99", "#14232b"],
      tokens: {
        bgPrimary: "#f4f7fa",
        bgSecondary: "#eaf0f5",
        bgTertiary: "#dfe8ef",
        surface: "#ffffff",
        surfaceAlt: "#f2f6fa",
        surfaceElevated: "#ffffff",
        navBg: "rgba(255, 255, 255, 0.94)",
        modalBg: "#ffffff",
        textPrimary: "#14232b",
        textSecondary: "#50626e",
        textMuted: "#5e7280",
        accentPrimary: "#174e74",
        accentPrimaryHover: "#113d5b",
        accentSecondary: "#246b99",
        accentForeground: "#ffffff",
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
      description: "Deep black and charcoal surfaces paired with refined purple highlights for night study.",
      swatches: ["#0b0c10", "#151822", "#7c3aed", "#a78bfa", "#edf0f7"],
      tokens: {
        bgPrimary: "#0b0c10",
        bgSecondary: "#11131a",
        bgTertiary: "#171a24",
        surface: "#151822",
        surfaceAlt: "#1c202c",
        surfaceElevated: "#222736",
        navBg: "rgba(15, 17, 25, 0.94)",
        modalBg: "#181c28",
        textPrimary: "#edf0f7",
        textSecondary: "#a7b1c4",
        textMuted: "#9aa5ba",
        accentPrimary: "#a78bfa",
        accentPrimaryHover: "#c4b5fd",
        accentSecondary: "#8b5cf6",
        accentForeground: "#ffffff",
        accentSoft: "#261d42",
        buttonBg: "#7c3aed",
        buttonHover: "#6d28d9",
        buttonText: "#ffffff",
        border: "#272c3c",
        borderStrong: "#3d4660",
        inputBg: "#10131b",
        inputBorder: "#2d3448",
        hoverBg: "#212636",
        navActiveBg: "#261d42",
        navActiveText: "#c4b5fd",
        success: "#34d399",
        successSoft: "#112b23",
        warning: "#fbbf24",
        warningSoft: "#2b2212",
        error: "#f87171",
        errorSoft: "#31181a",
        msgReceivedBg: "#1d2230",
        msgReceivedText: "#edf0f7",
        msgSentBg: "#6d28d9",
        msgSentText: "#ffffff",
        focusRing: "rgba(167, 139, 250, 0.34)",
        shadow: "0 14px 36px rgba(0, 0, 0, 0.52)"
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
        bgTertiary: "#f2dbe4",
        surface: "#ffffff",
        surfaceAlt: "#fbf0f4",
        surfaceElevated: "#ffffff",
        navBg: "rgba(255, 250, 252, 0.94)",
        modalBg: "#ffffff",
        textPrimary: "#2d1620",
        textSecondary: "#6b4856",
        textMuted: "#7a5564",
        accentPrimary: "#b42c5c",
        accentPrimaryHover: "#932048",
        accentSecondary: "#c94070",
        accentForeground: "#ffffff",
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
        bgTertiary: "#e2daf6",
        surface: "#ffffff",
        surfaceAlt: "#f2edfc",
        surfaceElevated: "#ffffff",
        navBg: "rgba(251, 249, 255, 0.94)",
        modalBg: "#ffffff",
        textPrimary: "#211738",
        textSecondary: "#594c75",
        textMuted: "#695a88",
        accentPrimary: "#673ab7",
        accentPrimaryHover: "#532c99",
        accentSecondary: "#7b4fd0",
        accentForeground: "#ffffff",
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
        bgTertiary: "#d8e7df",
        surface: "#ffffff",
        surfaceAlt: "#edf6f0",
        surfaceElevated: "#ffffff",
        navBg: "rgba(250, 253, 251, 0.94)",
        modalBg: "#ffffff",
        textPrimary: "#12261d",
        textSecondary: "#436052",
        textMuted: "#517161",
        accentPrimary: "#146c43",
        accentPrimaryHover: "#0e5433",
        accentSecondary: "#1c8051",
        accentForeground: "#ffffff",
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
        bgTertiary: "#e4e8f3",
        surface: "#ffffff",
        surfaceAlt: "#f3f5fb",
        surfaceElevated: "#ffffff",
        navBg: "rgba(255, 255, 255, 0.94)",
        modalBg: "#ffffff",
        textPrimary: "#17192b",
        textSecondary: "#505770",
        textMuted: "#606782",
        accentPrimary: "#6d28d9",
        accentPrimaryHover: "#5b21b6",
        accentSecondary: "#db2777",
        accentForeground: "#ffffff",
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
        bgTertiary: "#d5ebf2",
        surface: "#ffffff",
        surfaceAlt: "#e9f6fa",
        surfaceElevated: "#ffffff",
        navBg: "rgba(249, 253, 255, 0.94)",
        modalBg: "#ffffff",
        textPrimary: "#0f2733",
        textSecondary: "#416170",
        textMuted: "#517383",
        accentPrimary: "#0b647d",
        accentPrimaryHover: "#084f63",
        accentSecondary: "#0e7490",
        accentForeground: "#ffffff",
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
        bgTertiary: "#e8ddca",
        surface: "#fffdf8",
        surfaceAlt: "#f6efe2",
        surfaceElevated: "#fffefb",
        navBg: "rgba(255, 253, 248, 0.94)",
        modalBg: "#fffdf8",
        textPrimary: "#2c2113",
        textSecondary: "#64523c",
        textMuted: "#756149",
        accentPrimary: "#8f5b0c",
        accentPrimaryHover: "#724707",
        accentSecondary: "#a86e18",
        accentForeground: "#ffffff",
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
        bgTertiary: "#f7dcd0",
        surface: "#ffffff",
        surfaceAlt: "#fff0e9",
        surfaceElevated: "#ffffff",
        navBg: "rgba(255, 251, 249, 0.94)",
        modalBg: "#ffffff",
        textPrimary: "#2e1712",
        textSecondary: "#6f4a41",
        textMuted: "#7f574e",
        accentPrimary: "#c2410c",
        accentPrimaryHover: "#9a3412",
        accentSecondary: "#be185d",
        accentForeground: "#ffffff",
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
      description: "Sleek dark obsidian UI energized with electric blue and neon purple highlights.",
      swatches: ["#060913", "#0f1629", "#1d4ed8", "#38bdf8", "#c084fc"],
      tokens: {
        bgPrimary: "#060913",
        bgSecondary: "#0c1224",
        bgTertiary: "#121a33",
        surface: "#0f1629",
        surfaceAlt: "#16203b",
        surfaceElevated: "#1c284a",
        navBg: "rgba(9, 14, 29, 0.94)",
        modalBg: "#121b33",
        textPrimary: "#eaf4ff",
        textSecondary: "#9eb4d2",
        textMuted: "#92aacb",
        accentPrimary: "#38bdf8",
        accentPrimaryHover: "#7dd3fc",
        accentSecondary: "#c084fc",
        accentForeground: "#ffffff",
        accentSoft: "#16294d",
        buttonBg: "#1d4ed8",
        buttonHover: "#2563eb",
        buttonText: "#ffffff",
        border: "#1f2e4f",
        borderStrong: "#354d82",
        inputBg: "#0a1020",
        inputBorder: "#253760",
        hoverBg: "#182442",
        navActiveBg: "#1a2b52",
        navActiveText: "#7dd3fc",
        success: "#34d399",
        successSoft: "#0e2b25",
        warning: "#fbbf24",
        warningSoft: "#2b210e",
        error: "#fb7185",
        errorSoft: "#331420",
        msgReceivedBg: "#15203a",
        msgReceivedText: "#eaf4ff",
        msgSentBg: "#1d4ed8",
        msgSentText: "#ffffff",
        focusRing: "rgba(56, 189, 248, 0.35)",
        shadow: "0 14px 36px rgba(0, 0, 0, 0.56)"
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
        bgTertiary: "#d4e6fc",
        surface: "#ffffff",
        surfaceAlt: "#e8f2ff",
        surfaceElevated: "#ffffff",
        navBg: "rgba(250, 252, 255, 0.94)",
        modalBg: "#ffffff",
        textPrimary: "#12233d",
        textSecondary: "#456080",
        textMuted: "#547093",
        accentPrimary: "#1d4ed8",
        accentPrimaryHover: "#1e40af",
        accentSecondary: "#0284c7",
        accentForeground: "#ffffff",
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
        bgTertiary: "#251b42",
        surface: "#21183b",
        surfaceAlt: "#2a1f4a",
        surfaceElevated: "#322657",
        navBg: "rgba(23, 16, 42, 0.94)",
        modalBg: "#241a40",
        textPrimary: "#f2edff",
        textSecondary: "#b5a6d9",
        textMuted: "#a898cf",
        accentPrimary: "#a78bfa",
        accentPrimaryHover: "#c4b5fd",
        accentSecondary: "#c084fc",
        accentForeground: "#ffffff",
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

  var EXTENDED_THEMES = [
    {
      id: "amoled-black",
      name: "AMOLED Black",
      mode: "dark",
      category: "dark",
      description: "True pitch-black canvas built for OLED screens and late-night zero-glare focus.",
      swatches: ["#000000", "#0c0d12", "#2563eb", "#60a5fa", "#f5f7fc"],
      tokens: {
        bgPrimary: "#000000",
        bgSecondary: "#07080c",
        bgTertiary: "#0e1017",
        surface: "#0c0d12",
        surfaceAlt: "#14161f",
        surfaceElevated: "#1a1d29",
        navBg: "rgba(5, 6, 9, 0.96)",
        modalBg: "#11131b",
        textPrimary: "#f5f7fc",
        textSecondary: "#aab4c6",
        textMuted: "#9aa5ba",
        accentPrimary: "#60a5fa",
        accentPrimaryHover: "#93c5fd",
        accentSecondary: "#38bdf8",
        accentForeground: "#ffffff",
        accentSoft: "#14223d",
        buttonBg: "#2563eb",
        buttonHover: "#1d4ed8",
        buttonText: "#ffffff",
        border: "#1f2330",
        borderStrong: "#394159",
        inputBg: "#06070a",
        inputBorder: "#272c3d",
        hoverBg: "#171a24",
        navActiveBg: "#14223d",
        navActiveText: "#93c5fd",
        success: "#34d399",
        successSoft: "#0e2922",
        warning: "#fbbf24",
        warningSoft: "#291f0e",
        error: "#f87171",
        errorSoft: "#2f1417",
        msgReceivedBg: "#151822",
        msgReceivedText: "#f5f7fc",
        msgSentBg: "#2563eb",
        msgSentText: "#ffffff",
        focusRing: "rgba(96, 165, 250, 0.36)",
        shadow: "0 14px 36px rgba(0, 0, 0, 0.72)"
      }
    },
    {
      id: "warm-cream",
      name: "Warm Cream",
      mode: "light",
      category: "warm",
      description: "Gentle parchment paper tones with sepia ink to ease eye strain during long reading.",
      swatches: ["#faf4e8", "#fffdf8", "#92400e", "#b45309", "#2b2116"],
      tokens: {
        bgPrimary: "#faf4e8",
        bgSecondary: "#f2e8d5",
        bgTertiary: "#e7d9bf",
        surface: "#fffdf8",
        surfaceAlt: "#f6ede0",
        surfaceElevated: "#fffefb",
        navBg: "rgba(255, 253, 248, 0.95)",
        modalBg: "#fffdf8",
        textPrimary: "#2b2116",
        textSecondary: "#5e4c38",
        textMuted: "#6f5b44",
        accentPrimary: "#92400e",
        accentPrimaryHover: "#78350f",
        accentSecondary: "#b45309",
        accentForeground: "#ffffff",
        accentSoft: "#f8ead3",
        buttonBg: "#92400e",
        buttonHover: "#78350f",
        buttonText: "#ffffff",
        border: "#e4d6be",
        borderStrong: "#bfa985",
        inputBg: "#fffdf9",
        inputBorder: "#d6c5a9",
        hoverBg: "#f4ead9",
        navActiveBg: "#f8ead3",
        navActiveText: "#7c360c",
        success: "#1c6b48",
        successSoft: "#e9f6ee",
        warning: "#92400e",
        warningSoft: "#faecd3",
        error: "#ad3b32",
        errorSoft: "#fff0ee",
        msgReceivedBg: "#fffdf8",
        msgReceivedText: "#2b2116",
        msgSentBg: "#92400e",
        msgSentText: "#ffffff",
        focusRing: "rgba(146, 64, 14, 0.24)",
        shadow: "0 12px 28px rgba(43, 33, 22, 0.08)"
      }
    },
    {
      id: "ocean-blue",
      name: "Ocean Blue",
      mode: "light",
      category: "light",
      description: "Deep maritime azure accents over cool coastal blues for crisp academic focus.",
      swatches: ["#edf6fc", "#ffffff", "#0369a1", "#0284c7", "#0e2840"],
      tokens: {
        bgPrimary: "#edf6fc",
        bgSecondary: "#dfeef8",
        bgTertiary: "#cfe5f4",
        surface: "#ffffff",
        surfaceAlt: "#e9f4fb",
        surfaceElevated: "#ffffff",
        navBg: "rgba(248, 252, 255, 0.95)",
        modalBg: "#ffffff",
        textPrimary: "#0e2840",
        textSecondary: "#3e5c76",
        textMuted: "#4f6f8a",
        accentPrimary: "#0369a1",
        accentPrimaryHover: "#075985",
        accentSecondary: "#0284c7",
        accentForeground: "#ffffff",
        accentSoft: "#e0f2fe",
        buttonBg: "#0369a1",
        buttonHover: "#075985",
        buttonText: "#ffffff",
        border: "#c8dfee",
        borderStrong: "#8ab6d4",
        inputBg: "#ffffff",
        inputBorder: "#b0d0e6",
        hoverBg: "#e6f3fb",
        navActiveBg: "#e0f2fe",
        navActiveText: "#0369a1",
        success: "#0f766e",
        successSoft: "#e6f7f5",
        warning: "#9a5a08",
        warningSoft: "#fff5e1",
        error: "#b43f3f",
        errorSoft: "#fff0f0",
        msgReceivedBg: "#ffffff",
        msgReceivedText: "#0e2840",
        msgSentBg: "#0369a1",
        msgSentText: "#ffffff",
        focusRing: "rgba(3, 105, 161, 0.25)",
        shadow: "0 12px 30px rgba(14, 40, 64, 0.08)"
      }
    },
    {
      id: "forest-green",
      name: "Forest Green",
      mode: "dark",
      category: "dark",
      description: "Deep pine woodland surfaces accented by luminous emerald mint for calm study sessions.",
      swatches: ["#0a1711", "#13291f", "#059669", "#34d399", "#ebf7f0"],
      tokens: {
        bgPrimary: "#0a1711",
        bgSecondary: "#10221a",
        bgTertiary: "#163024",
        surface: "#13291f",
        surfaceAlt: "#1a3529",
        surfaceElevated: "#214233",
        navBg: "rgba(13, 30, 22, 0.95)",
        modalBg: "#162e23",
        textPrimary: "#ebf7f0",
        textSecondary: "#9ec2ae",
        textMuted: "#91b8a3",
        accentPrimary: "#34d399",
        accentPrimaryHover: "#6ee7b7",
        accentSecondary: "#10b981",
        accentForeground: "#062317",
        accentSoft: "#143d2d",
        buttonBg: "#047857",
        buttonHover: "#065f46",
        buttonText: "#ffffff",
        border: "#244737",
        borderStrong: "#386b54",
        inputBg: "#0c1d15",
        inputBorder: "#29523f",
        hoverBg: "#1d3b2d",
        navActiveBg: "#143d2d",
        navActiveText: "#6ee7b7",
        success: "#34d399",
        successSoft: "#113628",
        warning: "#fbbf24",
        warningSoft: "#2d2410",
        error: "#fb7185",
        errorSoft: "#381822",
        msgReceivedBg: "#193327",
        msgReceivedText: "#ebf7f0",
        msgSentBg: "#047857",
        msgSentText: "#ffffff",
        focusRing: "rgba(52, 211, 153, 0.32)",
        shadow: "0 14px 36px rgba(0, 0, 0, 0.48)"
      }
    },
    {
      id: "lavender-mode",
      name: "Lavender Mode",
      mode: "light",
      category: "vibrant",
      description: "Airy lavender mist backgrounds paired with vivid amethyst highlights and clean legibility.",
      swatches: ["#f3f0fc", "#ffffff", "#6d28d9", "#8b5cf6", "#201638"],
      tokens: {
        bgPrimary: "#f3f0fc",
        bgSecondary: "#e9e2fa",
        bgTertiary: "#ded4f7",
        surface: "#ffffff",
        surfaceAlt: "#f1ecfc",
        surfaceElevated: "#ffffff",
        navBg: "rgba(251, 249, 255, 0.95)",
        modalBg: "#ffffff",
        textPrimary: "#201638",
        textSecondary: "#554875",
        textMuted: "#665889",
        accentPrimary: "#6d28d9",
        accentPrimaryHover: "#5b21b6",
        accentSecondary: "#7c3aed",
        accentForeground: "#ffffff",
        accentSoft: "#ede6fc",
        buttonBg: "#6d28d9",
        buttonHover: "#5b21b6",
        buttonText: "#ffffff",
        border: "#ddd3f5",
        borderStrong: "#b6a3e3",
        inputBg: "#ffffff",
        inputBorder: "#c9bbea",
        hoverBg: "#f0ebfc",
        navActiveBg: "#ede6fc",
        navActiveText: "#5b21b6",
        success: "#1b6f4e",
        successSoft: "#e9f8ef",
        warning: "#945a0a",
        warningSoft: "#fff5e1",
        error: "#b4414b",
        errorSoft: "#fff0f2",
        msgReceivedBg: "#ffffff",
        msgReceivedText: "#201638",
        msgSentBg: "#6d28d9",
        msgSentText: "#ffffff",
        focusRing: "rgba(109, 40, 217, 0.25)",
        shadow: "0 12px 30px rgba(45, 27, 89, 0.08)"
      }
    }
  ];

  var ALL_THEMES = THEMES.concat(EXTENDED_THEMES);

  var ACCENT_PRESETS = [
    { id: "navy", label: "Academic Navy", hex: "#174e74" },
    { id: "ocean", label: "Ocean Blue", hex: "#0369a1" },
    { id: "indigo", label: "Indigo", hex: "#4f46e5" },
    { id: "violet", label: "Violet", hex: "#7c3aed" },
    { id: "teal", label: "Botanical Teal", hex: "#0f766e" },
    { id: "rose", label: "Rose Berry", hex: "#b42c5c" },
    { id: "amber", label: "Warm Bronze", hex: "#b45309" },
    { id: "slate", label: "Graphite Ink", hex: "#1e293b" }
  ];

  var FONT_CATALOG = [
    {
      id: "default",
      name: "Default (Plus Jakarta Sans)",
      category: "Modern & Clean",
      stack: '"Plus Jakarta Sans", "Segoe UI", Arial, sans-serif',
      decorative: false,
      googleFont: true,
      specimen: "Clear academic hierarchy, notes & GPA summaries — 12345"
    },
    {
      id: "modern-sans",
      name: "Modern Sans Serif (Poppins)",
      category: "Geometric Sans",
      stack: '"Poppins", "Segoe UI", Arial, sans-serif',
      decorative: false,
      googleFont: true,
      specimen: "Balanced geometric precision for modern workspaces — 12345"
    },
    {
      id: "roboto-sans",
      name: "Crisp Sans (Roboto)",
      category: "Neutral Sans",
      stack: '"Roboto", "Segoe UI", Arial, sans-serif',
      decorative: false,
      googleFont: true,
      specimen: "Dependable clarity across dense tables and schedules — 12345"
    },
    {
      id: "rounded",
      name: "Rounded (Nunito)",
      category: "Friendly Rounded",
      stack: '"Nunito", "Segoe UI", Arial, sans-serif',
      decorative: false,
      googleFont: true,
      specimen: "Warm rounded terminals for calm everyday study — 12345"
    },
    {
      id: "classic-serif",
      name: "Classic Serif (Playfair Display)",
      category: "Editorial Serif",
      stack: '"Playfair Display", Georgia, serif',
      decorative: false,
      googleFont: true,
      specimen: "Scholarly editorial headings with timeless contrast — 12345"
    },
    {
      id: "handwriting",
      name: "Handwriting (Caveat)",
      category: "Handwritten",
      stack: '"Caveat", cursive',
      decorative: true,
      googleFont: true,
      specimen: "Casual handwritten notebook lettering for personal headings"
    },
    {
      id: "cursive-script",
      name: "Flowing Cursive (Dancing Script)",
      category: "Cursive Handwriting",
      stack: '"Dancing Script", cursive',
      decorative: true,
      googleFont: true,
      specimen: "Expressive cursive rhythm for greetings & titles"
    },
    {
      id: "decorative",
      name: "Decorative Handwriting (Pacifico)",
      category: "Decorative Script",
      stack: '"Pacifico", cursive',
      decorative: true,
      googleFont: true,
      specimen: "Bold brushed signature lettering with character"
    },
    {
      id: "elegant-script",
      name: "Elegant Script (Great Vibes)",
      category: "Calligraphic Script",
      stack: '"Great Vibes", cursive',
      decorative: true,
      googleFont: true,
      specimen: "Refined calligraphic script for display banners"
    },
    {
      id: "monospace",
      name: "Monospace (JetBrains Mono)",
      category: "Technical Monospace",
      stack: '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace',
      decorative: false,
      googleFont: true,
      specimen: "CSC 201 · GPA 4.85 · Lab 12:30–14:00"
    }
  ];

  var FONT_SIZE_SCALES = {
    small: { id: "small", label: "Small", px: "14px", scale: "0.9" },
    medium: { id: "medium", label: "Medium", px: "16px", scale: "1" },
    large: { id: "large", label: "Large", px: "17.5px", scale: "1.09" },
    xlarge: { id: "xlarge", label: "Extra Large", px: "19px", scale: "1.18" }
  };

  var VALID_BUTTON_STYLES = { rounded: "10px", "soft-square": "5px", pill: "999px" };
  var VALID_SPACINGS = ["compact", "comfortable", "spacious"];
  var VALID_CARD_STYLES = ["bordered", "elevated", "tinted"];
  var VALID_DENSITIES = ["compact", "balanced", "relaxed"];
  var VALID_MOTION_MODES = ["smooth", "reduced"];
  var VALID_SIDEBAR_STYLES = ["topbar", "compact", "sidebar"];
  var VALID_SIDEBAR_TONES = ["neutral", "tinted", "accent"];
  var VALID_FOCUS_MODES = ["standard", "enhanced"];
  var VALID_GREETING_STYLES = ["time-based", "welcome", "focused", "academic", "custom"];
  var DEFAULT_SECTION_ORDER = ["quickActions", "overview", "platformHub", "lowerPanels"];
  var DEFAULT_OVERVIEW_ORDER = ["todayClasses", "currentCourses", "upcomingAssignments", "examCountdown"];
  var DEFAULT_WIDGETS = {
    quickActions: true,
    stats: true,
    todayClasses: true,
    currentCourses: true,
    upcomingAssignments: true,
    examCountdown: true,
    platformHub: true,
    quickNav: true,
    gradingNote: true
  };

  var PERSONALIZATION_PRESETS = [
    {
      id: "minimalist",
      name: "Minimalist",
      summary: "Crisp light canvas, default sans type, soft-square controls, compact calm spacing, and reduced animations.",
      patch: {
        themeId: "classic-light",
        customColors: null,
        accentColor: "#1e293b",
        typography: { headingFont: "default", bodyFont: "default", fontSize: "medium", protectAcademicReadability: true },
        appearance: { buttonStyle: "soft-square", spacing: "compact", cardStyle: "bordered", density: "compact", motionMode: "reduced", sidebarStyle: "topbar", sidebarTone: "neutral" },
        accessibility: { highContrast: false, reducedMotion: true, focusMode: "standard", readableSpacing: false }
      }
    },
    {
      id: "student-focus",
      name: "Student Focus",
      summary: "Ocean blue clarity, Poppins + clean sans typography, desktop sidebar rail, and enhanced focus indicators.",
      patch: {
        themeId: "ocean-blue",
        customColors: null,
        accentColor: "#0369a1",
        typography: { headingFont: "modern-sans", bodyFont: "default", fontSize: "medium", protectAcademicReadability: true },
        appearance: { buttonStyle: "rounded", spacing: "comfortable", cardStyle: "bordered", density: "balanced", motionMode: "smooth", sidebarStyle: "sidebar", sidebarTone: "tinted" },
        accessibility: { highContrast: false, reducedMotion: false, focusMode: "enhanced", readableSpacing: true }
      }
    },
    {
      id: "creative",
      name: "Creative",
      summary: "Lavender Mode palette, expressive serif headings paired with rounded Nunito body text, pill buttons, and spacious layout.",
      patch: {
        themeId: "lavender-mode",
        customColors: null,
        accentColor: "#b42c5c",
        typography: { headingFont: "classic-serif", bodyFont: "rounded", fontSize: "medium", protectAcademicReadability: true },
        appearance: { buttonStyle: "pill", spacing: "spacious", cardStyle: "tinted", density: "relaxed", motionMode: "smooth", sidebarStyle: "topbar", sidebarTone: "accent" },
        accessibility: { highContrast: false, reducedMotion: false, focusMode: "standard", readableSpacing: false }
      }
    },
    {
      id: "elegant",
      name: "Elegant",
      summary: "Warm Cream parchment surfaces, Playfair Display headings, elevated cards, and gentle comfortable spacing.",
      patch: {
        themeId: "warm-cream",
        customColors: null,
        accentColor: "#92400e",
        typography: { headingFont: "classic-serif", bodyFont: "default", fontSize: "large", protectAcademicReadability: true },
        appearance: { buttonStyle: "rounded", spacing: "spacious", cardStyle: "elevated", density: "balanced", motionMode: "smooth", sidebarStyle: "topbar", sidebarTone: "neutral" },
        accessibility: { highContrast: false, reducedMotion: false, focusMode: "standard", readableSpacing: true }
      }
    },
    {
      id: "night-owl",
      name: "Night Owl",
      summary: "AMOLED Pure Black canvas, soft violet highlights, readable spacing, and glare-free late-night comfort.",
      patch: {
        themeId: "amoled-black",
        customColors: null,
        accentColor: "#a78bfa",
        typography: { headingFont: "modern-sans", bodyFont: "roboto-sans", fontSize: "medium", protectAcademicReadability: true },
        appearance: { buttonStyle: "rounded", spacing: "comfortable", cardStyle: "bordered", density: "balanced", motionMode: "reduced", sidebarStyle: "sidebar", sidebarTone: "neutral" },
        accessibility: { highContrast: false, reducedMotion: true, focusMode: "enhanced", readableSpacing: true }
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

  function detectSystemDarkMode() {
    try {
      if (typeof root.matchMedia === "function") {
        return Boolean(root.matchMedia("(prefers-color-scheme: dark)").matches);
      }
    } catch (_) {}
    return false;
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
        bgTertiary: bg.bgTertiary,
        surface: bg.surface,
        surfaceAlt: bg.surfaceAlt,
        surfaceElevated: bg.surfaceElevated,
        navBg: bg.navBg,
        modalBg: bg.modalBg,
        textPrimary: bg.textPrimary,
        textSecondary: bg.textSecondary,
        textMuted: bg.textMuted,
        accentPrimary: readableAccent,
        accentPrimaryHover: accentHover,
        accentSecondary: readableSecondary,
        accentForeground: pickReadableForeground(readableAccent),
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

  function findStaticTheme(themeId) {
    for (var i = 0; i < ALL_THEMES.length; i += 1) {
      if (ALL_THEMES[i].id === themeId) return ALL_THEMES[i];
    }
    return THEMES[0];
  }

  function resolveThemeWithAccent(theme, accentHex) {
    if (!theme || theme.id === "custom" || !isValidHexColor(accentHex)) {
      return theme;
    }
    var rawAccent = accentHex.trim().toLowerCase();
    var tk = theme.tokens;
    var isDark = theme.mode === "dark";
    var readableAccent = ensureReadableAccentOnSurface(rawAccent, tk.surface, 4.5);
    var buttonBg = rawAccent;
    var buttonText = pickReadableForeground(buttonBg);
    if (contrastRatio(buttonBg, buttonText) < 4.5) {
      buttonBg = ensureReadableAccentOnSurface(rawAccent, buttonText, 4.5);
      buttonText = pickReadableForeground(buttonBg);
    }
    var accentHover = mixHex(readableAccent, isDark ? "#ffffff" : "#000000", 0.16);
    var buttonHover = mixHex(buttonBg, isDark ? "#ffffff" : "#000000", 0.16);
    var accentSoft = mixHex(tk.surface, rawAccent, isDark ? 0.25 : 0.12);
    var rgb = hexToRgb(readableAccent) || { r: 23, g: 78, b: 116 };

    var nextTokens = {};
    for (var k in tk) {
      if (Object.prototype.hasOwnProperty.call(tk, k)) {
        nextTokens[k] = tk[k];
      }
    }
    nextTokens.accentPrimary = readableAccent;
    nextTokens.accentPrimaryHover = accentHover;
    nextTokens.accentForeground = pickReadableForeground(readableAccent);
    nextTokens.accentSoft = accentSoft;
    nextTokens.buttonBg = buttonBg;
    nextTokens.buttonHover = buttonHover;
    nextTokens.buttonText = buttonText;
    nextTokens.navActiveBg = accentSoft;
    nextTokens.navActiveText = readableAccent;
    nextTokens.msgSentBg = buttonBg;
    nextTokens.msgSentText = buttonText;
    nextTokens.focusRing = "rgba(" + rgb.r + ", " + rgb.g + ", " + rgb.b + ", 0.28)";

    return {
      id: theme.id,
      resolvedThemeId: theme.resolvedThemeId,
      isSystemDefault: theme.isSystemDefault,
      name: theme.name,
      mode: theme.mode,
      category: theme.category,
      description: theme.description,
      swatches: theme.swatches,
      accentOverride: rawAccent,
      tokens: nextTokens
    };
  }

  function getThemeById(themeId, customColors, systemDarkOverride, accentColor) {
    if (themeId === "custom") {
      return resolveCustomThemeDefinition(customColors);
    }
    if (themeId === SYSTEM_THEME_ID) {
      var prefersDark = typeof systemDarkOverride === "boolean"
        ? systemDarkOverride
        : detectSystemDarkMode();
      var baseTheme = findStaticTheme(prefersDark ? "midnight-dark" : "classic-light");
      var systemResolved = {
        id: SYSTEM_THEME_ID,
        resolvedThemeId: baseTheme.id,
        isSystemDefault: true,
        name: "System Default (" + (prefersDark ? "Dark" : "Light") + ")",
        mode: baseTheme.mode,
        category: baseTheme.category,
        description: "Automatically follows your operating system light or dark appearance.",
        swatches: baseTheme.swatches,
        tokens: baseTheme.tokens
      };
      return resolveThemeWithAccent(systemResolved, accentColor);
    }
    return resolveThemeWithAccent(findStaticTheme(themeId), accentColor);
  }

  function normalizePreference(raw) {
    if (!raw || typeof raw !== "object") {
      return { themeId: DEFAULT_THEME_ID, customColors: null, accentColor: null, updatedAt: 0, pendingSync: false };
    }
    var validStatic = ALL_THEMES.some(function (t) { return t.id === raw.themeId; });
    var id = (raw.themeId === "custom" || raw.themeId === SYSTEM_THEME_ID || validStatic)
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
    var accentColor = isValidHexColor(raw.accentColor) ? raw.accentColor.trim().toLowerCase() : null;
    return {
      themeId: id,
      customColors: id === "custom" ? customColors : null,
      accentColor: id === "custom" ? null : accentColor,
      updatedAt: Number(raw.updatedAt) || 0,
      pendingSync: Boolean(raw.pendingSync)
    };
  }

  function findFontDef(fontId) {
    for (var i = 0; i < FONT_CATALOG.length; i += 1) {
      if (FONT_CATALOG[i].id === fontId) return FONT_CATALOG[i];
    }
    return FONT_CATALOG[0];
  }

  function normalizeOrderList(rawList, defaultList) {
    if (!Array.isArray(rawList)) return defaultList.slice();
    var validSet = {};
    for (var i = 0; i < defaultList.length; i += 1) validSet[defaultList[i]] = true;
    var seen = {};
    var clean = [];
    for (var j = 0; j < rawList.length; j += 1) {
      var key = rawList[j];
      if (validSet[key] && !seen[key]) {
        seen[key] = true;
        clean.push(key);
      }
    }
    for (var k = 0; k < defaultList.length; k += 1) {
      if (!seen[defaultList[k]]) clean.push(defaultList[k]);
    }
    return clean;
  }

  function getDefaultPersonalization() {
    var widgetsCopy = {};
    for (var k in DEFAULT_WIDGETS) {
      if (Object.prototype.hasOwnProperty.call(DEFAULT_WIDGETS, k)) {
        widgetsCopy[k] = DEFAULT_WIDGETS[k];
      }
    }
    return {
      themeId: DEFAULT_THEME_ID,
      customColors: null,
      accentColor: null,
      typography: {
        headingFont: "default",
        bodyFont: "default",
        fontSize: "medium",
        protectAcademicReadability: true
      },
      appearance: {
        buttonStyle: "rounded",
        spacing: "comfortable",
        cardStyle: "bordered",
        density: "balanced",
        motionMode: "smooth",
        sidebarStyle: "topbar",
        sidebarTone: "neutral"
      },
      accessibility: {
        highContrast: false,
        reducedMotion: false,
        focusMode: "standard",
        readableSpacing: false
      },
      dashboard: {
        greetingStyle: "time-based",
        customGreeting: "",
        showGreetingName: true,
        sectionOrder: DEFAULT_SECTION_ORDER.slice(),
        overviewOrder: DEFAULT_OVERVIEW_ORDER.slice(),
        widgets: widgetsCopy
      },
      presetId: "",
      updatedAt: 0,
      pendingSync: false
    };
  }

  function normalizePersonalization(raw) {
    var base = getDefaultPersonalization();
    if (!raw || typeof raw !== "object") return base;
    var themeNorm = normalizePreference(raw);
    base.themeId = themeNorm.themeId;
    base.customColors = themeNorm.customColors;
    base.accentColor = themeNorm.accentColor;
    base.updatedAt = themeNorm.updatedAt;
    base.pendingSync = themeNorm.pendingSync;

    if (raw.typography && typeof raw.typography === "object") {
      var hf = findFontDef(raw.typography.headingFont).id;
      var bf = findFontDef(raw.typography.bodyFont).id;
      var fs = FONT_SIZE_SCALES[raw.typography.fontSize] ? raw.typography.fontSize : "medium";
      base.typography = {
        headingFont: hf,
        bodyFont: bf,
        fontSize: fs,
        protectAcademicReadability: raw.typography.protectAcademicReadability !== false
      };
    }

    if (raw.appearance && typeof raw.appearance === "object") {
      var ap = raw.appearance;
      base.appearance = {
        buttonStyle: VALID_BUTTON_STYLES[ap.buttonStyle] ? ap.buttonStyle : "rounded",
        spacing: VALID_SPACINGS.indexOf(ap.spacing) >= 0 ? ap.spacing : "comfortable",
        cardStyle: VALID_CARD_STYLES.indexOf(ap.cardStyle) >= 0 ? ap.cardStyle : "bordered",
        density: VALID_DENSITIES.indexOf(ap.density) >= 0 ? ap.density : "balanced",
        motionMode: VALID_MOTION_MODES.indexOf(ap.motionMode) >= 0 ? ap.motionMode : "smooth",
        sidebarStyle: VALID_SIDEBAR_STYLES.indexOf(ap.sidebarStyle) >= 0 ? ap.sidebarStyle : "topbar",
        sidebarTone: VALID_SIDEBAR_TONES.indexOf(ap.sidebarTone) >= 0 ? ap.sidebarTone : "neutral"
      };
    }

    if (raw.accessibility && typeof raw.accessibility === "object") {
      var ac = raw.accessibility;
      base.accessibility = {
        highContrast: Boolean(ac.highContrast),
        reducedMotion: Boolean(ac.reducedMotion),
        focusMode: VALID_FOCUS_MODES.indexOf(ac.focusMode) >= 0 ? ac.focusMode : "standard",
        readableSpacing: Boolean(ac.readableSpacing)
      };
    }

    if (raw.dashboard && typeof raw.dashboard === "object") {
      var db = raw.dashboard;
      var widgets = {};
      for (var wk in DEFAULT_WIDGETS) {
        if (Object.prototype.hasOwnProperty.call(DEFAULT_WIDGETS, wk)) {
          widgets[wk] = db.widgets && typeof db.widgets === "object" && typeof db.widgets[wk] === "boolean"
            ? db.widgets[wk]
            : DEFAULT_WIDGETS[wk];
        }
      }
      base.dashboard = {
        greetingStyle: VALID_GREETING_STYLES.indexOf(db.greetingStyle) >= 0 ? db.greetingStyle : "time-based",
        customGreeting: typeof db.customGreeting === "string" ? db.customGreeting.trim().slice(0, 80) : "",
        showGreetingName: db.showGreetingName !== false,
        sectionOrder: normalizeOrderList(db.sectionOrder, DEFAULT_SECTION_ORDER),
        overviewOrder: normalizeOrderList(db.overviewOrder, DEFAULT_OVERVIEW_ORDER),
        widgets: widgets
      };
    }

    if (typeof raw.presetId === "string") {
      var knownPreset = PERSONALIZATION_PRESETS.some(function (p) { return p.id === raw.presetId; });
      base.presetId = knownPreset ? raw.presetId : "";
    }

    return base;
  }

  function buildCssVariableMap(theme) {
    var t = theme.tokens;
    var sentTextIsLight = t.msgSentText === "#ffffff";
    var sentReadTick = sentTextIsLight ? "#a7f3d0" : "#065f46";
    var sentQuoteBg = sentTextIsLight ? "rgba(255, 255, 255, 0.16)" : "rgba(17, 24, 39, 0.09)";
    var sentQuoteHover = sentTextIsLight ? "rgba(255, 255, 255, 0.24)" : "rgba(17, 24, 39, 0.15)";
    var errorForeground = pickReadableForeground(t.error);
    var successForeground = pickReadableForeground(t.success);

    return {
      /* Exact 28 Standard Theme Design Tokens */
      "--bg-primary": t.bgPrimary,
      "--bg-secondary": t.bgSecondary,
      "--bg-tertiary": t.bgTertiary || t.surfaceAlt,
      "--surface-primary": t.surface,
      "--surface-secondary": t.surfaceAlt,
      "--surface-elevated": t.surfaceElevated || t.modalBg,
      "--text-primary": t.textPrimary,
      "--text-secondary": t.textSecondary,
      "--text-muted": t.textMuted || t.textSecondary,
      "--accent-primary": t.accentPrimary,
      "--accent-secondary": t.accentSecondary,
      "--accent-foreground": t.accentForeground || t.buttonText,
      "--border-color": t.border,
      "--input-background": t.inputBg,
      "--input-border": t.inputBorder,
      "--button-background": t.buttonBg,
      "--button-text": t.buttonText,
      "--navigation-background": t.navBg,
      "--navigation-text": t.textPrimary,
      "--navigation-active": t.navActiveBg,
      "--card-background": t.surface,
      "--modal-background": t.modalBg,
      "--success-color": t.success,
      "--warning-color": t.warning,
      "--error-color": t.error,
      "--message-sent-background": t.msgSentBg,
      "--message-received-background": t.msgReceivedBg,
      "--focus-ring": t.focusRing,

      /* Extended internal & component variables */
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
      "--theme-success-foreground": successForeground,
      "--theme-warning": t.warning,
      "--theme-warning-soft": t.warningSoft,
      "--theme-error": t.error,
      "--theme-error-soft": t.errorSoft,
      "--theme-error-foreground": errorForeground,
      "--theme-msg-received-bg": t.msgReceivedBg,
      "--theme-msg-received-text": t.msgReceivedText,
      "--theme-msg-sent-bg": t.msgSentBg,
      "--theme-msg-sent-text": t.msgSentText,
      "--theme-msg-sent-read": sentReadTick,
      "--theme-msg-sent-quote-bg": sentQuoteBg,
      "--theme-msg-sent-quote-hover": sentQuoteHover,
      "--theme-focus-ring": t.focusRing,
      "--theme-shadow": t.shadow,
      "--theme-pop-1": t.pop1 || t.accentPrimary,
      "--theme-pop-2": t.pop2 || t.accentSecondary,
      "--theme-pop-3": t.pop3 || t.accentPrimary,
      "--theme-pop-4": t.pop4 || t.warning,
      "--theme-pop-5": t.pop5 || t.success,
      "--theme-pop-6": t.pop6 || t.warning,

      /* Legacy module variable aliases */
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
  }

  var activeAppliedPreference = { themeId: DEFAULT_THEME_ID, customColors: null, accentColor: null, updatedAt: 0 };
  var activeAppliedPersonalization = getDefaultPersonalization();
  var mediaQueryList = null;
  var mediaQueryListener = null;

  function ensureGoogleFontsLoaded(forceAll) {
    if (typeof document === "undefined" || !document.head) return;
    if (document.getElementById(GOOGLE_FONTS_LINK_ID)) return;
    if (!forceAll) {
      var typo = activeAppliedPersonalization && activeAppliedPersonalization.typography;
      if (!typo) return;
      var usesCustomFont = typo.headingFont !== "default" || typo.bodyFont !== "default";
      if (!usesCustomFont) return;
    }
    try {
      var link = document.createElement("link");
      link.id = GOOGLE_FONTS_LINK_ID;
      link.rel = "stylesheet";
      link.href = GOOGLE_FONTS_URL;
      document.head.appendChild(link);
    } catch (_) {}
  }

  function updateSystemMediaSubscription(shouldListen) {
    if (typeof root.matchMedia !== "function") return;
    if (!shouldListen) {
      if (mediaQueryList && mediaQueryListener) {
        if (typeof mediaQueryList.removeEventListener === "function") {
          mediaQueryList.removeEventListener("change", mediaQueryListener);
        } else if (typeof mediaQueryList.removeListener === "function") {
          mediaQueryList.removeListener(mediaQueryListener);
        }
      }
      mediaQueryListener = null;
      return;
    }

    mediaQueryList = root.matchMedia("(prefers-color-scheme: dark)");
    if (!mediaQueryListener) {
      mediaQueryListener = function () {
        if (activeAppliedPreference && activeAppliedPreference.themeId === SYSTEM_THEME_ID) {
          applyPersonalization(activeAppliedPersonalization, { animate: true });
        }
      };
      if (typeof mediaQueryList.addEventListener === "function") {
        mediaQueryList.addEventListener("change", mediaQueryListener);
      } else if (typeof mediaQueryList.addListener === "function") {
        mediaQueryList.addListener(mediaQueryListener);
      }
    }
  }

  function applyThemeTokensOnly(preference, options) {
    var opts = options || {};
    var normalized = normalizePreference(preference);
    activeAppliedPreference = normalized;
    updateSystemMediaSubscription(normalized.themeId === SYSTEM_THEME_ID);

    var theme = getThemeById(normalized.themeId, normalized.customColors, opts.systemDarkOverride, normalized.accentColor);
    var resolvedDataTheme = theme.resolvedThemeId || theme.id;
    var vars = buildCssVariableMap(theme);

    if (typeof document !== "undefined" && document.documentElement) {
      var docEl = document.documentElement;
      if (opts.animate) {
        docEl.classList.add("theme-transitioning");
        root.clearTimeout(root.__afitThemeAnimTimer);
        root.__afitThemeAnimTimer = root.setTimeout(function () {
          docEl.classList.remove("theme-transitioning");
        }, 260);
      }

      docEl.dataset.theme = resolvedDataTheme;
      docEl.dataset.themePreference = normalized.themeId;
      docEl.dataset.themeMode = theme.mode;
      docEl.style.colorScheme = theme.mode;

      for (var key in vars) {
        if (Object.prototype.hasOwnProperty.call(vars, key)) {
          docEl.style.setProperty(key, vars[key]);
        }
      }

      var metaTheme = document.querySelector('meta[name="theme-color"]');
      if (metaTheme) {
        metaTheme.setAttribute("content", theme.tokens.bgPrimary);
      }
    }

    return { preference: normalized, theme: theme, vars: vars };
  }

  function applyPersonalization(personalizationInput, options) {
    var opts = options || {};
    var normalized = normalizePersonalization(personalizationInput);
    activeAppliedPersonalization = normalized;

    var themeResult = applyThemeTokensOnly(normalized, opts);
    var headingDef = findFontDef(normalized.typography.headingFont);
    var bodyDef = findFontDef(normalized.typography.bodyFont);
    var sizeDef = FONT_SIZE_SCALES[normalized.typography.fontSize] || FONT_SIZE_SCALES.medium;
    var ap = normalized.appearance;
    var ac = normalized.accessibility;
    var effectiveReducedMotion = Boolean(ac.reducedMotion || ap.motionMode === "reduced");

    if (typeof document !== "undefined" && document.documentElement) {
      var docEl = document.documentElement;
      docEl.style.setProperty("--font-heading", headingDef.stack);
      docEl.style.setProperty("--font-body", bodyDef.stack);
      docEl.style.setProperty("--font-academic-safe", '"Plus Jakarta Sans", "Segoe UI", Arial, sans-serif');
      docEl.style.setProperty("--font-scale", sizeDef.scale);
      docEl.style.setProperty("--font-size-base", sizeDef.px);
      docEl.style.setProperty("--ui-button-radius", VALID_BUTTON_STYLES[ap.buttonStyle] || "10px");

      docEl.dataset.fontHeading = headingDef.id;
      docEl.dataset.fontBody = bodyDef.id;
      docEl.dataset.fontSize = sizeDef.id;
      docEl.dataset.decorativeBody = bodyDef.decorative ? "true" : "false";
      docEl.dataset.readabilityGuard = normalized.typography.protectAcademicReadability ? "true" : "false";
      docEl.dataset.buttonStyle = ap.buttonStyle;
      docEl.dataset.uiSpacing = ap.spacing;
      docEl.dataset.cardStyle = ap.cardStyle;
      docEl.dataset.uiDensity = ap.density;
      docEl.dataset.motionMode = effectiveReducedMotion ? "reduced" : "smooth";
      docEl.dataset.navLayout = ap.sidebarStyle;
      docEl.dataset.sidebarTone = ap.sidebarTone;
      docEl.dataset.highContrast = ac.highContrast ? "true" : "false";
      docEl.dataset.reducedMotion = effectiveReducedMotion ? "true" : "false";
      docEl.dataset.focusRing = ac.focusMode;
      docEl.dataset.readableSpacing = ac.readableSpacing ? "true" : "false";

      ensureGoogleFontsLoaded(opts.preloadAllFonts);

      if (typeof CustomEvent === "function") {
        document.dispatchEvent(new CustomEvent("afit-theme-changed", {
          detail: { preference: themeResult.preference, theme: themeResult.theme, vars: themeResult.vars }
        }));
        document.dispatchEvent(new CustomEvent("afit-personalization-changed", {
          detail: { personalization: normalized, theme: themeResult.theme, vars: themeResult.vars }
        }));
      }
    }

    return {
      personalization: normalized,
      preference: themeResult.preference,
      theme: themeResult.theme,
      vars: themeResult.vars
    };
  }

  function applyTheme(preference, options) {
    if (preference && typeof preference === "object" && (preference.typography || preference.appearance || preference.accessibility || preference.dashboard)) {
      return applyPersonalization(preference, options);
    }
    var merged = normalizePersonalization(activeAppliedPersonalization);
    var normTheme = normalizePreference(preference);
    merged.themeId = normTheme.themeId;
    merged.customColors = normTheme.customColors;
    merged.accentColor = normTheme.accentColor;
    activeAppliedPersonalization = merged;

    var res = applyThemeTokensOnly(normTheme, options);
    if (typeof document !== "undefined" && typeof CustomEvent === "function") {
      document.dispatchEvent(new CustomEvent("afit-theme-changed", {
        detail: { preference: res.preference, theme: res.theme, vars: res.vars }
      }));
    }
    return res;
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

  function readStoredPersonalizationForUid(uid) {
    if (!uid) return null;
    var raw = safeStorageGet(STORAGE_KEY_PERSONALIZATION_USER_PREFIX + uid);
    if (raw) {
      try {
        return normalizePersonalization(JSON.parse(raw));
      } catch (_) {}
    }
    var legacyTheme = readStoredPreferenceForUid(uid);
    return legacyTheme ? normalizePersonalization(legacyTheme) : null;
  }

  function saveStoredPersonalizationForUid(uid, pref) {
    var normalized = normalizePersonalization(pref);
    normalized.updatedAt = normalized.updatedAt || Date.now();
    if (uid) {
      safeStorageSet(STORAGE_KEY_PERSONALIZATION_USER_PREFIX + uid, JSON.stringify(normalized));
      safeStorageSet(STORAGE_KEY_ACTIVE_UID, uid);
    }
    safeStorageSet(STORAGE_KEY_PERSONALIZATION_ACTIVE, JSON.stringify(normalized));
    saveStoredPreferenceForUid(uid, {
      themeId: normalized.themeId,
      customColors: normalized.customColors,
      accentColor: normalized.accentColor,
      updatedAt: normalized.updatedAt,
      pendingSync: normalized.pendingSync
    });
    return normalized;
  }

  function clearActiveSessionTheme() {
    safeStorageRemove(STORAGE_KEY_ACTIVE_UID);
    safeStorageRemove(STORAGE_KEY_ACTIVE_PREF);
    safeStorageRemove(STORAGE_KEY_PERSONALIZATION_ACTIVE);
    applyPersonalization(getDefaultPersonalization(), { animate: false });
  }

  function bootInitialTheme() {
    var activeUid = safeStorageGet(STORAGE_KEY_ACTIVE_UID);
    var pers = null;
    if (activeUid) {
      pers = readStoredPersonalizationForUid(activeUid);
    }
    if (!pers) {
      var rawPers = safeStorageGet(STORAGE_KEY_PERSONALIZATION_ACTIVE);
      if (rawPers) {
        try { pers = normalizePersonalization(JSON.parse(rawPers)); } catch (_) { pers = null; }
      }
    }
    if (!pers) {
      var rawLegacy = safeStorageGet(STORAGE_KEY_ACTIVE_PREF);
      if (rawLegacy) {
        try { pers = normalizePersonalization(JSON.parse(rawLegacy)); } catch (_) { pers = null; }
      }
    }
    applyPersonalization(pers || getDefaultPersonalization(), { animate: false });
  }

  var api = {
    DEFAULT_THEME_ID: DEFAULT_THEME_ID,
    SYSTEM_THEME_ID: SYSTEM_THEME_ID,
    REQUIRED_CSS_VAR_NAMES: REQUIRED_CSS_VAR_NAMES,
    BACKGROUND_PRESETS: BACKGROUND_PRESETS,
    THEMES: THEMES,
    EXTENDED_THEMES: EXTENDED_THEMES,
    ALL_THEMES: ALL_THEMES,
    ACCENT_PRESETS: ACCENT_PRESETS,
    FONT_CATALOG: FONT_CATALOG,
    FONT_SIZE_SCALES: FONT_SIZE_SCALES,
    PERSONALIZATION_PRESETS: PERSONALIZATION_PRESETS,
    DEFAULT_SECTION_ORDER: DEFAULT_SECTION_ORDER,
    DEFAULT_OVERVIEW_ORDER: DEFAULT_OVERVIEW_ORDER,
    DEFAULT_WIDGETS: DEFAULT_WIDGETS,
    detectSystemDarkMode: detectSystemDarkMode,
    isValidHexColor: isValidHexColor,
    contrastRatio: contrastRatio,
    pickReadableForeground: pickReadableForeground,
    ensureReadableAccentOnSurface: ensureReadableAccentOnSurface,
    resolveCustomThemeDefinition: resolveCustomThemeDefinition,
    resolveThemeWithAccent: resolveThemeWithAccent,
    getThemeById: getThemeById,
    normalizePreference: normalizePreference,
    getDefaultPersonalization: getDefaultPersonalization,
    normalizePersonalization: normalizePersonalization,
    buildCssVariableMap: buildCssVariableMap,
    applyTheme: applyTheme,
    applyPersonalization: applyPersonalization,
    ensureGoogleFontsLoaded: ensureGoogleFontsLoaded,
    readStoredPreferenceForUid: readStoredPreferenceForUid,
    saveStoredPreferenceForUid: saveStoredPreferenceForUid,
    readStoredPersonalizationForUid: readStoredPersonalizationForUid,
    saveStoredPersonalizationForUid: saveStoredPersonalizationForUid,
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
      return { themeId: DEFAULT_THEME_ID, customColors: null, accentColor: null, updatedAt: 0, pendingSync: false };
    },
    getCurrentPersonalization: function () {
      var uid = safeStorageGet(STORAGE_KEY_ACTIVE_UID);
      if (uid) {
        var uidPers = readStoredPersonalizationForUid(uid);
        if (uidPers) return uidPers;
      }
      var raw = safeStorageGet(STORAGE_KEY_PERSONALIZATION_ACTIVE);
      if (raw) {
        try { return normalizePersonalization(JSON.parse(raw)); } catch (_) {}
      }
      return getDefaultPersonalization();
    }
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    root.AFITThemeEngine = api;
    bootInitialTheme();
  }
})(typeof globalThis !== "undefined" ? globalThis : window);
