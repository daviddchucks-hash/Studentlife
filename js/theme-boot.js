(function (root) {
  "use strict";

  var DEFAULT_THEME_ID = "classic-light";
  var SYSTEM_THEME_ID = "system-default";
  var STORAGE_KEY_ACTIVE_UID = "afit_theme_active_uid";
  var STORAGE_KEY_ACTIVE_PREF = "afit_theme_active_pref";
  var STORAGE_KEY_USER_PREFIX = "afit_theme_uid_";

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
    for (var i = 0; i < THEMES.length; i += 1) {
      if (THEMES[i].id === themeId) return THEMES[i];
    }
    return THEMES[0];
  }

  function getThemeById(themeId, customColors, systemDarkOverride) {
    if (themeId === "custom") {
      return resolveCustomThemeDefinition(customColors);
    }
    if (themeId === SYSTEM_THEME_ID) {
      var prefersDark = typeof systemDarkOverride === "boolean"
        ? systemDarkOverride
        : detectSystemDarkMode();
      var baseTheme = findStaticTheme(prefersDark ? "midnight-dark" : "classic-light");
      return {
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
    }
    return findStaticTheme(themeId);
  }

  function normalizePreference(raw) {
    if (!raw || typeof raw !== "object") {
      return { themeId: DEFAULT_THEME_ID, customColors: null, updatedAt: 0, pendingSync: false };
    }
    var validStatic = THEMES.some(function (t) { return t.id === raw.themeId; });
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
    return {
      themeId: id,
      customColors: id === "custom" ? customColors : null,
      updatedAt: Number(raw.updatedAt) || 0,
      pendingSync: Boolean(raw.pendingSync)
    };
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

  var activeAppliedPreference = { themeId: DEFAULT_THEME_ID, customColors: null, updatedAt: 0 };
  var mediaQueryList = null;
  var mediaQueryListener = null;

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
          applyTheme(activeAppliedPreference, { animate: true });
        }
      };
      if (typeof mediaQueryList.addEventListener === "function") {
        mediaQueryList.addEventListener("change", mediaQueryListener);
      } else if (typeof mediaQueryList.addListener === "function") {
        mediaQueryList.addListener(mediaQueryListener);
      }
    }
  }

  function applyTheme(preference, options) {
    var opts = options || {};
    var normalized = normalizePreference(preference);
    activeAppliedPreference = normalized;
    updateSystemMediaSubscription(normalized.themeId === SYSTEM_THEME_ID);

    var theme = getThemeById(normalized.themeId, normalized.customColors, opts.systemDarkOverride);
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

      if (typeof CustomEvent === "function") {
        document.dispatchEvent(new CustomEvent("afit-theme-changed", {
          detail: { preference: normalized, theme: theme, vars: vars }
        }));
      }
    }

    return { preference: normalized, theme: theme, vars: vars };
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
    SYSTEM_THEME_ID: SYSTEM_THEME_ID,
    REQUIRED_CSS_VAR_NAMES: REQUIRED_CSS_VAR_NAMES,
    BACKGROUND_PRESETS: BACKGROUND_PRESETS,
    THEMES: THEMES,
    detectSystemDarkMode: detectSystemDarkMode,
    isValidHexColor: isValidHexColor,
    contrastRatio: contrastRatio,
    pickReadableForeground: pickReadableForeground,
    ensureReadableAccentOnSurface: ensureReadableAccentOnSurface,
    resolveCustomThemeDefinition: resolveCustomThemeDefinition,
    getThemeById: getThemeById,
    normalizePreference: normalizePreference,
    buildCssVariableMap: buildCssVariableMap,
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
      return { themeId: DEFAULT_THEME_ID, customColors: null, updatedAt: 0, pendingSync: false };
    }
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    root.AFITThemeEngine = api;
    bootInitialTheme();
  }
})(typeof globalThis !== "undefined" ? globalThis : window);
