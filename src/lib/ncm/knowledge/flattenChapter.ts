import type { NcmChapterJson, NcmKnowledgeRecord } from "./types";
import { cleanDescription, formatMercosurNcm8, headingCode4, ncmDigitsOnly } from "./normalize";

function stableId(chapter: string, digits: string, suffix: string): string {
  return `${chapter}-${digits.slice(0, 8)}-${suffix}`.replace(/\s/g, "");
}

export function flattenChapter(ch: NcmChapterJson): NcmKnowledgeRecord[] {
  const out: NcmKnowledgeRecord[] = [];

  for (const h of ch.headings) {
    const hDigits = headingCode4(h.code);
    out.push({
      id: stableId(ch.chapter, hDigits, "h"),
      chapter: ch.chapter,
      chapterTitle: ch.title,
      headingCode: hDigits,
      code: formatMercosurNcm8(hDigits),
      codeDigits: hDigits.padEnd(8, "0"),
      description: cleanDescription(h.description),
      searchText: cleanDescription(`${ch.title} ${hDigits} ${h.description} capítulo ${ch.chapter}`),
      level: "heading",
    });

    for (const s of h.subheadings) {
      const d = ncmDigitsOnly(s.code);
      const code8 = d.length >= 6 ? formatMercosurNcm8(d) : formatMercosurNcm8(d.padEnd(8, "0"));
      out.push({
        id: stableId(ch.chapter, d, "s"),
        chapter: ch.chapter,
        chapterTitle: ch.title,
        headingCode: hDigits,
        code: code8,
        codeDigits: d.padEnd(8, "0").slice(0, 8),
        description: cleanDescription(s.description),
        searchText: cleanDescription(
          `${ch.title} ${h.description} ${s.code} ${s.description} capítulo ${ch.chapter}`
        ),
        level: "subheading",
      });
    }
  }

  return out;
}

export function flattenAllChapters(chapters: NcmChapterJson[]): NcmKnowledgeRecord[] {
  const all: NcmKnowledgeRecord[] = [];
  for (const ch of chapters) {
    all.push(...flattenChapter(ch));
  }
  return all;
}
