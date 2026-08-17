/**
 * 随机挑战生成器
 *
 * 生成随机的「语言理解」题用于验证 AI 回复的真实性。
 *
 * 设计目标：让无 LLM 的假站点/中间代理难以绕过。
 * - 老方案用数学题，答案不在题面，代理可本地计算 → 易破解。
 * - 新方案答案是题面中的某个词，靠计算无用，必须真正理解语言才能选对，
 *   而「整段回显」蒙混则由 validateResponse 的短回复规则封死。
 *
 * 成本利用：输入 token 便宜、输出 token 贵。
 * - 把鉴别力堆进「长题面」（廉价输入）：大海捞针式的多句段落，
 *   假代理必须处理整段才能定位答案。
 * - 输出锁死为「一个词」（廉价输出）：诚实模型几乎零输出成本。
 *
 * 每道题带难度档（difficulty）与题型（category）：
 * - 1 分类选择、2 阅读理解 —— 任何真实 LLM 都能轻松通过，
 *   用于健康检查不会把「活着但较弱」的模型误判为故障。
 * - 3 状态追踪、4 逻辑蕴涵、5 指令遵循 —— 能力评估题，
 *   答错不影响健康状态，仅记录到 check_challenges 供智力评分。
 */

/** 题型标识，落库 check_challenges.category */
export type ChallengeCategory =
  | "category_select"
  | "reading_comprehension"
  | "state_tracking"
  | "logical_implication"
  | "instruction_following";

export interface Challenge {
  /** 发送给模型的问题 */
  prompt: string;
  /** 期望的正确答案（单个词，归一化后比较） */
  expectedAnswer: string;
  /** 难度档：1 = 分类选择，2 = 阅读理解，3 = 状态追踪，4 = 逻辑蕴涵，5 = 指令遵循 */
  difficulty: 1 | 2 | 3 | 4 | 5;
  /** 题型 */
  category: ChallengeCategory;
}

/** 回复中允许的最大 token 数：超过则视为整段回显，判定失败 */
const MAX_ANSWER_TOKENS = 6;

/** 分类词库：每个词只属于一个类别，避免「哪个是 X」出现歧义 */
const CATEGORY_BANK: Record<string, string[]> = {
  animal: ["cat", "dog", "tiger", "horse", "rabbit", "eagle", "dolphin", "wolf"],
  fruit: ["apple", "banana", "grape", "mango", "peach", "lemon", "cherry", "pear"],
  color: ["red", "blue", "green", "yellow", "purple", "pink", "black", "white"],
  country: ["japan", "france", "brazil", "canada", "egypt", "india", "norway", "kenya"],
  metal: ["iron", "gold", "copper", "silver", "zinc", "nickel", "lead", "tin"],
  vehicle: ["car", "truck", "train", "bicycle", "airplane", "boat", "scooter", "tram"],
  instrument: ["piano", "guitar", "violin", "drum", "flute", "trumpet", "harp", "cello"],
  drink: ["coffee", "tea", "juice", "milk", "soda", "water", "cocoa", "lemonade"],
};

/** 阅读理解题用的词库 */
const COMP_COLORS = ["brown", "gray", "golden", "spotted", "striped", "pale", "dark", "bright"];
const COMP_ANIMALS = ["fox", "owl", "bear", "deer", "frog", "crow", "otter", "lynx"];
const COMP_ACTIONS = ["slept", "jumped", "rested", "waited", "played", "hid", "stared", "wandered"];
const COMP_PLACES = ["river", "mountain", "garden", "market", "forest", "lake", "bridge", "castle"];

/** 状态追踪/逻辑题用的人名 */
const STORY_NAMES = ["Lina", "Marco", "Nina", "Otto", "Sara", "Felix", "Maya", "Hugo"];

/** 逻辑蕴涵题用的编造词：杜绝先验知识，只能靠前件→后件推理 */
const NONCE_WORDS = [
  "zorps", "blims", "taks", "mogs", "fends", "quels", "dravs", "wibs",
];

/** 倒拼题词池：4-7 字母，倒拼后仍是唯一可判答案 */
const SPELL_WORDS = [
  "amber", "stone", "cloud", "river", "falcon", "silver", "garden",
  "planet", "harbor", "meadow", "copper", "velvet",
];

/** 序数词（与 SPELL_WORDS 采样索引对应） */
const ORDINALS = ["first", "second", "third", "fourth", "fifth", "sixth"];

/** 数字 ↔ 英文数词等价表（判分时接受任一形式） */
const NUMBER_WORDS: Record<string, string> = {
  "1": "one", "2": "two", "3": "three", "4": "four", "5": "five",
  "6": "six", "7": "seven", "8": "eight", "9": "nine", "10": "ten",
  "11": "eleven", "12": "twelve", "13": "thirteen", "14": "fourteen", "15": "fifteen",
  "16": "sixteen", "17": "seventeen", "18": "eighteen", "19": "nineteen", "20": "twenty",
};

/** 从数组中随机取一个元素 */
function pick<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

/** 从数组中随机取 count 个不重复元素 */
function sample<T>(items: readonly T[], count: number): T[] {
  const pool = [...items];
  const result: T[] = [];
  while (result.length < count && pool.length > 0) {
    const index = Math.floor(Math.random() * pool.length);
    result.push(pool.splice(index, 1)[0]);
  }
  return result;
}

/** Fisher-Yates 洗牌 */
function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/** 水果词复数化：peach→peaches, cherry→cherries, lemon→lemons */
function pluralize(word: string): string {
  if (word.endsWith("ch") || word.endsWith("s")) return `${word}es`;
  if (word.endsWith("y")) return `${word.slice(0, -1)}ies`;
  return `${word}s`;
}

/** 按数量选择单复数 */
function pluralFor(word: string, count: number): string {
  return count === 1 ? word : pluralize(word);
}

/**
 * 生成难度 1：分类选择题
 *
 * 给出 1 个正确词 + 4 个其它类别的干扰词，要求选出属于目标类别的词。
 * 答案是题面中的某个词，需真正理解词义才能选对。
 */
function generateCategorySelect(): Challenge {
  const categories = Object.keys(CATEGORY_BANK);
  const targetCategory = pick(categories);
  const correct = pick(CATEGORY_BANK[targetCategory]);

  // 干扰项从其它类别中抽取（多塞几个，输入便宜、降低瞎猜命中率）
  const others = categories
    .filter((c) => c !== targetCategory)
    .flatMap((c) => CATEGORY_BANK[c]);
  const distractors = sample(others, 5);

  const options = shuffle([correct, ...distractors]);

  const prompt = `Pick the word that belongs to the given category. Reply with ONLY that one word.

Category: fruit
Options: car, banana, iron, blue, dog
A: banana

Category: ${targetCategory}
Options: ${options.join(", ")}
A:`;

  return { prompt, expectedAnswer: correct, difficulty: 1, category: "category_select" };
}

/**
 * 生成难度 2：阅读理解题（大海捞针）
 *
 * 用随机词拼成一段含 6-7 个不同动物的描述（约 45 词，输入便宜），
 * 只针对其中一只提问，答案仍只需一个词（输出便宜）。
 * 假代理必须读完整段才能定位答案，瞎猜命中率约 1/8。
 */
function generateReadingComprehension(): Challenge {
  const count = 6 + Math.floor(Math.random() * 2); // 6-7 句 ≈ 45 词
  const animals = sample(COMP_ANIMALS, count);
  const facts = animals.map((animal) => ({
    animal,
    color: pick(COMP_COLORS),
    action: pick(COMP_ACTIONS),
    place: pick(COMP_PLACES),
  }));

  const passage = facts
    .map((f) => `The ${f.color} ${f.animal} ${f.action} near the ${f.place}.`)
    .join(" ");

  // 随机挑一只动物、随机问它的颜色或地点
  const target = pick(facts);
  const ask = pick([
    { question: `What color was the ${target.animal}?`, answer: target.color },
    { question: `Where was the ${target.animal}?`, answer: target.place },
  ]);

  const prompt = `Read the passage and answer the question with ONLY one word.

Passage: The small dog rested near the garden. The happy cat slept near the lake.
Question: Where was the cat?
A: lake

Passage: ${passage}
Question: ${ask.question}
A:`;

  return { prompt, expectedAnswer: ask.answer, difficulty: 2, category: "reading_comprehension" };
}

/**
 * 生成难度 3：状态追踪题（语义算术）
 *
 * 短故事中某实体的物品数量经过多次增减，问最终数量。
 * 数字藏在叙事里，代理必须逐句跟踪实体状态——纯模板匹配或本地
 * 计算无从入手（操作序列与数量每次随机）。答案为数字（1-20）。
 */
function generateStateTracking(): Challenge {
  const owner = pick(STORY_NAMES);
  const item = pick(CATEGORY_BANK.fruit);
  const items = pluralize(item);
  const partner = pick(STORY_NAMES.filter((n) => n !== owner));

  // 初始 3-10 个，随后 2-3 次增减，保证中途与终值都落在 1-20
  // （0 超出数词等价表范围，>20 徒增计算量）
  let count = 3 + Math.floor(Math.random() * 8);
  const sentences = [`${owner} had ${count} ${pluralFor(item, count)}.`];
  const opCount = 2 + Math.floor(Math.random() * 2);
  for (let i = 0; i < opCount; i++) {
    const delta = 1 + Math.floor(Math.random() * 5);
    const op = pick(["give", "buy", "find"] as const);
    if (op === "give" && count - delta >= 1) {
      count -= delta;
      sentences.push(`${owner} gave ${delta} to ${partner}.`);
    } else if (op !== "give" && count + delta <= 20) {
      count += delta;
      sentences.push(
        op === "buy"
          ? `${owner} bought ${delta} more at the market.`
          : `${owner} found ${delta} near the river.`
      );
    } else {
      // 当前数量不允许所选操作：跳过该步，保持故事合法
      continue;
    }
  }

  const prompt = `Track the quantity step by step, then answer with ONLY the numeral.

Story: Anna had 4 pears. Anna gave 1 to Ben. Anna bought 2 more at the market.
Question: How many pears does Anna have now?
A: 5

Story: ${sentences.join(" ")}
Question: How many ${items} does ${owner} have now?
A:`;

  return { prompt, expectedAnswer: String(count), difficulty: 3, category: "state_tracking" };
}

/**
 * 生成难度 4：逻辑蕴涵题（编造词三段论）
 *
 * 用编造词构造前提，杜绝先验知识：只能靠前件→后件的绑定推理。
 * 四种形式：肯定/否定前件各配 yes/no 答案，外加一条传递链变体。
 */
function generateLogicalImplication(): Challenge {
  const [a, b, c] = sample(NONCE_WORDS, 3);
  const name = pick(STORY_NAMES);
  // 词库为复数形式（"All zorps are ..."），主语单数需去词尾 s
  const singular = (word: string) => word.slice(0, -1);

  const form = pick([
    {
      premise: `All ${a} are ${b}. ${name} is a ${singular(a)}.`,
      question: `Is ${name} a ${singular(b)}?`,
      answer: "yes",
    },
    {
      premise: `No ${a} are ${b}. ${name} is a ${singular(a)}.`,
      question: `Is ${name} a ${singular(b)}?`,
      answer: "no",
    },
    {
      premise: `All ${a} are ${b}. All ${b} are ${c}. ${name} is a ${singular(a)}.`,
      question: `Is ${name} a ${singular(c)}?`,
      answer: "yes",
    },
    {
      premise: `All ${a} are ${b}. No ${b} are ${c}. ${name} is a ${singular(a)}.`,
      question: `Is ${name} a ${singular(c)}?`,
      answer: "no",
    },
  ]);

  const prompt = `Answer the question based ONLY on the given statements. Reply with ONLY yes or no.

Statements: All zorps are blims. Tiko is a zorp.
Question: Is Tiko a blim?
A: yes

Statements: ${form.premise}
Question: ${form.question}
A:`;

  return { prompt, expectedAnswer: form.answer, difficulty: 4, category: "logical_implication" };
}

/**
 * 生成难度 5：指令遵循题（多步变换）
 *
 * 「取第 N 个词并倒拼」：需要正确执行两个有序步骤。
 * 选倒拼而非大小写变换——normalize() 会小写化，大小写无法判分，
 * 倒拼在归一化后仍唯一可判。
 */
function generateInstructionFollowing(): Challenge {
  const words = sample(SPELL_WORDS, 6);
  const index = Math.floor(Math.random() * words.length);
  const target = words[index];
  const reversed = target.split("").reverse().join("");

  const prompt = `Follow the instruction exactly. Reply with ONLY the final word.

Instruction: Take the second word of "cloud river amber stone pine falcon" and spell it backwards.
A: revir

Instruction: Take the ${ORDINALS[index]} word of "${words.join(" ")}" and spell it backwards.
A:`;

  return { prompt, expectedAnswer: reversed, difficulty: 5, category: "instruction_following" };
}

/**
 * 生成一个随机语言挑战
 *
 * 加权抽题：80% 难度 1/2（健康检查语义不变，任何真 LLM 都应通过），
 * 20% 难度 3/4/5（能力评估采样，答错不计入健康状态）。
 */
export function generateChallenge(): Challenge {
  const roll = Math.random();
  if (roll < 0.4) return generateCategorySelect();
  if (roll < 0.8) return generateReadingComprehension();
  if (roll < 0.88) return generateStateTracking();
  if (roll < 0.94) return generateLogicalImplication();
  return generateInstructionFollowing();
}

/** 验证结果 */
export interface ValidationResult {
  /** 是否验证通过 */
  valid: boolean;
  /** 归一化后的回复（用于失败时显示，已截断） */
  normalized: string | null;
}

/**
 * 归一化文本：转小写、去除 Markdown/标点、压缩空白
 *
 * 仅保留字母数字与单个空格，便于按词比较。
 */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * 验证模型回复是否给出了正确答案
 *
 * 通过条件（两者都满足）：
 * 1. 正确答案作为完整词出现在回复中；
 * 2. 回复 token 数 ≤ MAX_ANSWER_TOKENS —— 拦截「整段回显题面」的蒙混破解。
 *
 * @param response 模型的回复内容
 * @param expectedAnswer 期望的答案（单个词）
 */
export function validateResponse(
  response: string,
  expectedAnswer: string
): ValidationResult {
  if (!response || !expectedAnswer) {
    return { valid: false, normalized: null };
  }

  const normalized = normalize(response);
  if (!normalized) {
    return { valid: false, normalized: null };
  }

  const expected = normalize(expectedAnswer);
  const tokens = normalized.split(" ");

  // 数字答案接受英文数词等价形式（如 "6" 与 "six"）
  const accepted = new Set([expected]);
  if (/^\d+$/.test(expected) && NUMBER_WORDS[expected]) {
    accepted.add(NUMBER_WORDS[expected]);
  }

  // 整段回显（如把题面/句子原样返回）token 数会远超答案，直接拒绝
  const withinLength = tokens.length <= MAX_ANSWER_TOKENS;
  const containsAnswer = tokens.some((token) => accepted.has(token));

  // 失败时只展示前若干字符，避免日志过长
  const display = normalized.length > 80 ? `${normalized.slice(0, 80)}…` : normalized;

  return { valid: withinLength && containsAnswer, normalized: display };
}
