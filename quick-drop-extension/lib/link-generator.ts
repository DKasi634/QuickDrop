const ADJECTIVES = [
  'amber', 'azure', 'bold', 'brave', 'bright', 'calm', 'clever', 'cool',
  'cozy', 'crisp', 'dapper', 'dawn', 'deep', 'eager', 'early', 'epic',
  'fair', 'fancy', 'fast', 'fiery', 'fleet', 'fresh', 'frost', 'gentle',
  'glad', 'gleam', 'glow', 'golden', 'grand', 'great', 'happy', 'hazy',
  'icy', 'jade', 'jolly', 'keen', 'kind', 'lava', 'lazy', 'light',
  'lively', 'lucky', 'lunar', 'magic', 'merry', 'misty', 'neon', 'noble',
  'opal', 'pale', 'pearl', 'plush', 'prime', 'proud', 'pure', 'quick',
  'quiet', 'rapid', 'rare', 'rich', 'rosy', 'royal', 'ruby', 'rusty',
  'sage', 'shiny', 'silk', 'sleek', 'slick', 'solar', 'sonic', 'spicy',
  'stark', 'steel', 'stone', 'storm', 'sunny', 'super', 'sweet', 'swift',
  'tall', 'teal', 'tidy', 'tiny', 'topaz', 'ultra', 'vast', 'vivid',
  'warm', 'wavy', 'wild', 'wise', 'witty', 'young', 'zany', 'zen',
  'zippy', 'coral', 'dusky', 'fern',
];

const NOUNS = [
  'ace', 'arch', 'atom', 'bass', 'bay', 'bear', 'bee', 'bird',
  'bolt', 'bone', 'brook', 'byte', 'cape', 'cave', 'clay', 'cliff',
  'cloud', 'comet', 'core', 'crab', 'crow', 'cube', 'dart', 'deer',
  'dome', 'dove', 'dune', 'dust', 'echo', 'edge', 'elk', 'ember',
  'fawn', 'fern', 'fire', 'fish', 'flair', 'flame', 'flare', 'flux',
  'fog', 'forge', 'fox', 'frog', 'gem', 'glen', 'glow', 'goat',
  'gust', 'hare', 'hawk', 'haze', 'hill', 'hive', 'horn', 'ibis',
  'iris', 'isle', 'jade', 'jay', 'jest', 'jewel', 'kite', 'lake',
  'lark', 'leaf', 'lens', 'lily', 'lion', 'loft', 'lynx', 'mace',
  'maple', 'marsh', 'mesa', 'mist', 'moon', 'moss', 'moth', 'nest',
  'nova', 'oak', 'opal', 'orca', 'orb', 'owl', 'palm', 'peak',
  'pine', 'plum', 'pond', 'puma', 'quail', 'rain', 'raven', 'reed',
  'reef', 'ridge', 'river', 'robin', 'rock', 'rose', 'rust', 'sage',
];

export function generateDropCode(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const num = Math.floor(Math.random() * 90 + 10);
  return `${adj}-${noun}-${num}`;
}

export async function generateUniqueDropCode(
  checkExists: (code: string) => Promise<boolean>,
  maxAttempts = 5
): Promise<string> {
  for (let i = 0; i < maxAttempts; i++) {
    const code = generateDropCode();
    if (!(await checkExists(code))) return code;
  }
  return generateDropCode() + '-' + Math.random().toString(36).substring(2, 6);
}
