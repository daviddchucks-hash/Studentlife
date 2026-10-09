"use strict";

export function generateCitation(style, type, data) {
  const { author, title, containerTitle, publisher, year, url, pages, volume, issue } = data;
  const cleanAuthor = (author || "").trim();
  const cleanTitle = (title || "").trim();
  const cleanContainer = (containerTitle || "").trim();
  const cleanPublisher = (publisher || "").trim();
  const cleanYear = (year || "n.d.").trim();
  const cleanUrl = (url || "").trim();
  const cleanPages = (pages || "").trim();
  const cleanVol = (volume || "").trim();
  const cleanIssue = (issue || "").trim();

  let result = "";

  if (style === "APA") {
    if (type === "book") {
      result = `${cleanAuthor ? `${cleanAuthor} ` : ""}(${cleanYear}). <em>${cleanTitle}</em>.${cleanPublisher ? ` ${cleanPublisher}.` : ""}${cleanUrl ? ` ${cleanUrl}` : ""}`;
    } else if (type === "journal") {
      const volIssue = cleanVol ? `${cleanVol}${cleanIssue ? `(${cleanIssue})` : ""}` : "";
      result = `${cleanAuthor ? `${cleanAuthor} ` : ""}(${cleanYear}). ${cleanTitle}. <em>${cleanContainer}</em>${volIssue ? `, ${volIssue}` : ""}${cleanPages ? `, ${cleanPages}` : ""}.${cleanUrl ? ` ${cleanUrl}` : ""}`;
    } else {
      result = `${cleanAuthor ? `${cleanAuthor} ` : ""}(${cleanYear}). <em>${cleanTitle}</em>. ${cleanContainer ? `${cleanContainer}. ` : ""}${cleanUrl}`;
    }
  } else if (style === "MLA") {
    if (type === "book") {
      result = `${cleanAuthor ? `${cleanAuthor}. ` : ""}<em>${cleanTitle}</em>. ${cleanPublisher ? `${cleanPublisher}, ` : ""}${cleanYear}.`;
    } else if (type === "journal") {
      const volIssue = cleanVol ? `vol. ${cleanVol}${cleanIssue ? `, no. ${cleanIssue}` : ""}` : "";
      result = `${cleanAuthor ? `${cleanAuthor}. ` : ""}"${cleanTitle}." <em>${cleanContainer}</em>${volIssue ? `, ${volIssue}` : ""}, ${cleanYear}${cleanPages ? `, pp. ${cleanPages}` : ""}.`;
    } else {
      result = `${cleanAuthor ? `${cleanAuthor}. ` : ""}"${cleanTitle}." <em>${cleanContainer || "Website"}</em>, ${cleanYear}, ${cleanUrl}.`;
    }
  } else if (style === "Harvard") {
    if (type === "book") {
      result = `${cleanAuthor ? `${cleanAuthor} ` : ""}${cleanYear}. <em>${cleanTitle}</em>. ${cleanPublisher ? `${cleanPublisher}.` : ""}`;
    } else if (type === "journal") {
      result = `${cleanAuthor ? `${cleanAuthor} ` : ""}${cleanYear}. '${cleanTitle}', <em>${cleanContainer}</em>${cleanVol ? `, ${cleanVol}` : ""}${cleanIssue ? `(${cleanIssue})` : ""}${cleanPages ? `, pp. ${cleanPages}` : ""}.`;
    } else {
      result = `${cleanAuthor ? `${cleanAuthor} ` : ""}${cleanYear}. <em>${cleanTitle}</em>. Available at: ${cleanUrl} [Accessed ${new Date().toLocaleDateString("en-GB")}].`;
    }
  }

  return result.trim();
}

export function countWordsAndChars(text) {
  if (typeof text !== "string") text = "";
  const characters = text.length;
  const charactersNoSpaces = text.replace(/\s/g, "").length;
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const sentences = text.trim() ? text.split(/[.!?]+/).filter(Boolean).length : 0;
  const paragraphs = text.trim() ? text.split(/\n+/).filter(Boolean).length : 0;
  const readingTimeMinutes = Math.ceil(words / 200);

  return {
    characters,
    charactersNoSpaces,
    words,
    sentences,
    paragraphs,
    readingTimeMinutes
  };
}

export function convertTextCase(text, mode) {
  if (typeof text !== "string") return "";
  if (mode === "uppercase") return text.toUpperCase();
  if (mode === "lowercase") return text.toLowerCase();
  if (mode === "titlecase") {
    return text.toLowerCase().replace(/(?:^|\s|-)\w/g, (match) => match.toUpperCase());
  }
  if (mode === "sentencecase") {
    return text.toLowerCase().replace(/(^\s*\w|[.!?]\s*\w)/g, (match) => match.toUpperCase());
  }
  if (mode === "camelcase") {
    return text.toLowerCase().replace(/[^a-zA-Z0-9]+(.)/g, (_, chr) => chr.toUpperCase());
  }
  if (mode === "kebabcase") {
    return text.trim().toLowerCase().replace(/[^a-zA-Z0-9]+/g, "-");
  }
  if (mode === "snakecase") {
    return text.trim().toLowerCase().replace(/[^a-zA-Z0-9]+/g, "_");
  }
  return text;
}

export function formatText(text, options) {
  if (typeof text !== "string") return "";
  let result = text;
  if (options.trim) result = result.trim();
  if (options.removeDuplicateSpaces) result = result.replace(/[ \t]+/g, " ");
  if (options.fixLineBreaks) result = result.replace(/\n{3,}/g, "\n\n");
  if (options.stripHtml) result = result.replace(/<[^>]*>/g, "");
  if (options.convertTabsToSpaces) result = result.replace(/\t/g, "    ");
  return result;
}
