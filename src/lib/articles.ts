import bedtime from "@/assets/article-bedtime.jpg";
import age4 from "@/assets/article-age4.jpg";
import bilingual from "@/assets/article-bilingual.jpg";
import gifting from "@/assets/article-gifting.jpg";

/** Reading Room editorial content. */
export const ARTICLES = [
  {
    slug: "bedtime-reading-ritual",
    tag: "Reading habits",
    title: "How to build a 20-minute bedtime reading ritual (that actually sticks)",
    excerpt:
      "The science says 20 minutes a day. The hard part is getting there. A practical guide for tired parents — start small, keep the same chair, and let your child turn the pages.",
    minutes: 6,
    tone: "bg-primary",
    image: bedtime,
  },
  {
    slug: "what-to-read-at-four",
    tag: "Age guide",
    title: "What to read at age 4 (and what to skip)",
    excerpt:
      "Four-year-olds want repetition, rhythm and a small problem gently solved. Here is what belongs on the shelf this year, and what can wait another two.",
    minutes: 5,
    tone: "bg-saffron",
    image: age4,
  },
  {
    slug: "bilingual-readers",
    tag: "Multilingual",
    title: "Raising bilingual readers in an English-first home",
    excerpt:
      "Hindi and regional-language picture books do the heavy lifting when spoken practice is thin. How to mix languages across a week without confusing anyone.",
    minutes: 7,
    tone: "bg-leaf",
    image: bilingual,
  },
  {
    slug: "bundle-question",
    tag: "Gifting",
    title: "The bundle question: one big book or five small ones?",
    excerpt:
      "What we have learned from thousands of gift orders — variety wins for under-fives, a single beautiful hardback wins after eight.",
    minutes: 4,
    tone: "bg-navy",
    image: gifting,
  },
];
