export interface Category {
  id: string;
  label: string;
  question?: string;
  rule?: 'promoted';
  custom?: boolean;
}

export const BUILT_IN_CATEGORIES: readonly Category[] = [
  { id: 'ads', label: 'Ads', rule: 'promoted' },
  {
    id: 'bait',
    label: 'Engagement bait',
    question:
      'Is this post engagement bait — primarily asking people to reply, follow, like, comment a keyword, or introduce themselves, in order to farm interactions?',
  },
  {
    id: 'promo',
    label: 'Promo / selling',
    question:
      'Is this post a promotion — selling or advertising a product, course, template, service, or newsletter?',
  },
  {
    id: 'platitude',
    label: 'Platitudes',
    question:
      'Is this post a platitude — a generic motivational or self-evident statement with no specific information?',
  },
  {
    id: 'hate',
    label: 'Hate & insults',
    question:
      'Is this post hateful, abusive, or insulting — hate speech, slurs, dehumanizing language, personal attacks, name-calling, profanity aimed at people, or crude sexual harassment, in any language?',
  },
  {
    id: 'politics',
    label: 'Politics',
    question:
      'Is this post about politics — governments, parties, politicians, elections, political ideology, nationalism, geopolitics, or political outrage and culture-war arguments, in any language?',
  },
  {
    id: 'nsfw',
    label: 'NSFW',
    question:
      'Is this post NSFW — sexually explicit or pornographic content, nudity, sexual acts described in text, links to adult content, or gore, in any language?',
  },
  {
    id: 'porn',
    label: 'Porn bots',
    question:
      'Is this sexual or porn spam, or a porn-bot lure — sexual solicitation, adult content bait, innuendo obfuscated with emoji, or slang inviting people to view adult content, in any language? Typical bot lines: English "link in bio", "check my profile", "DM me", "my OF is free", "I\'m 19 dm me"; Chinese 比我好看的没我骚, 比我骚的没我好看, 我福不黑不信你看, 我果然太涩了, 应该没人比我玩的更开了吧, 有人想锐评一下我的福嘛, 看主页, 私信; Japanese 裏垢, 裏アカ女子, セフレ, オフパコ, 見せ合い, P活, やりもく, プロフ見てね; Korean 조건만남, 오픈채팅, #조건 #ㅈㄱ, 바로 만날사람; Spanish "estoy aburrida", "busco amigos", "mira mi perfil"; Portuguese "conteúdo +18", "olha meu perfil"; French "je m\'ennuie, je peux te dm?", "coucou 🥵"; German "schreib mir direkt ❤️"; Russian интим, фото в профиле, хочешь в лс?; Arabic خاص, للتواصل, صباح الجمال يا ست الكل; Thai แอดไลน์, สาวอวบ, เจอจ่าย; Vietnamese kết bạn zalo, tìm gái xinh hẹn hò. Any variation counts. A post that quotes such lines to warn about, mock, or complain about bots is not spam.',
  },
  {
    id: 'spam',
    label: 'Spam / bot replies',
    question:
      'Is this an automated or off-topic spam reply — a bot pushing links, follow-me or DM-me bait, asking an AI to verify, a canned or copy-pasted message, or anything unrelated to the post it replies to, in any language? Typical bot lines: "follow me back", "let\'s grow together", "DM me", "join my telegram"; 繋がりましょう, フォロバ, DMください; 맞팔해요, 디엠 확인, 디엠 보내줘; "mándame dm", "te sigo", "sígueme"; "segue de volta", "me chama na dm"; ممكن خاص, راسلني, تابعني; напиши в лс, глянь лс, подпишись; takipleşelim, dm at, yaz bana; follback dong, dm aku; "DM karo", "follow back karo"; ทักมา, ทักไลน์, ฟอลแบค; inbox em, follow mình; "je peux te dm?", "mp moi", "suis-moi"; "schreib mir", "folge mir zurück". A short reply that only asks for a DM or a follow-back counts.',
  },
  {
    id: 'crypto',
    label: 'Crypto shilling',
    question:
      'Is this post shilling a cryptocurrency, token, presale, airdrop, or trading signal?',
  },
];

export function customCategory(label: string, index: number): Category {
  return {
    id: `custom:${index}`,
    label,
    question: `Should this post be filtered out under the user's rule "${label}"? Answer yes if the post matches what the rule describes.`,
    custom: true,
  };
}

export function allCategories(custom: readonly string[]): Category[] {
  return [...BUILT_IN_CATEGORIES, ...custom.map(customCategory)];
}

export function isEnabled(category: Category, enabled: ReadonlySet<string>): boolean {
  return category.custom === true || enabled.has(category.id);
}

export function questionsFor(
  categories: readonly Category[],
  enabled: ReadonlySet<string>,
): Record<string, string> {
  const questions: Record<string, string> = {};
  for (const category of categories) {
    if (category.question && isEnabled(category, enabled)) {
      questions[category.id] = category.question;
    }
  }
  return questions;
}

export function questionsKey(questions: Record<string, string>): string {
  const canonical = JSON.stringify(
    Object.entries(questions).sort(([a], [b]) => a.localeCompare(b)),
  );
  let hash = 0x811c9dc5;
  for (let i = 0; i < canonical.length; i += 1) {
    hash ^= canonical.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16);
}
