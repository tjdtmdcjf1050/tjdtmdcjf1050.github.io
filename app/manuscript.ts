export const MAX_MANUSCRIPT_CHARACTERS = 50_000;
export const MAX_STORED_MANUSCRIPT_LENGTH = 100_000;

export const PAGE_SEPARATOR = "\n\n<!-- GROWBOOK PAGE -->\n\n";
export const PAGE_TITLE_PREFIX = "<!-- GROWBOOK TITLE:";

export type ManuscriptChapter = {
  title: string;
  content: string;
  status?: "draft" | "published" | "scheduled";
  scheduledAt?: string | null;
};

const PAGE_METADATA_PATTERN = /<!-- GROWBOOK (?:PAGE|TITLE:.*?) -->\s*/g;

export function manuscriptCharacterCount(content: string) {
  return content.replace(PAGE_METADATA_PATTERN, "").length;
}

export function isValidManuscriptLength(content: string) {
  const characters = manuscriptCharacterCount(content);
  return (
    characters >= 10 &&
    characters <= MAX_MANUSCRIPT_CHARACTERS &&
    content.length <= MAX_STORED_MANUSCRIPT_LENGTH
  );
}

export function parseManuscriptChapters(content: string): ManuscriptChapter[] {
  const chapters = content.split(PAGE_SEPARATOR).map((raw, index) => {
    const match = raw.match(/^<!-- GROWBOOK TITLE:(.*?) -->\n?/);
    let title = `${index + 1}장`;
    if (match) {
      try { title = decodeURIComponent(match[1]); } catch { title = match[1]; }
    }
    return {
      title,
      content: raw.replace(/^<!-- GROWBOOK TITLE:.*? -->\n?/, "").trim(),
      status: "published" as const,
      scheduledAt: null,
    };
  }).filter((chapter, index, all) => chapter.content || all.length === 1);
  return chapters.length ? chapters : [{ title: "1장", content: "", status: "published", scheduledAt: null }];
}

export function serializeManuscriptChapters(chapters: ManuscriptChapter[]) {
  return chapters.map((chapter, index) => {
    const title = chapter.title.trim() || `${index + 1}장`;
    return `${PAGE_TITLE_PREFIX}${encodeURIComponent(title)} -->\n${chapter.content.trim()}`.trim();
  }).join(PAGE_SEPARATOR);
}
