const db = require('./db');

let aiLogger = null;

function setLogger(logger) {
  aiLogger = logger;
}

async function emitAIEvent(title, description, color = 0x9b59b6) {
  if (typeof aiLogger === 'function') {
    try {
      await aiLogger(title, description, color);
    } catch (err) {
      console.error('Failed to emit AI log', err);
    }
  }
}

function shouldUseInternet(raw) {
  return /\b(search|look up|what is|who is|how to|where is|definition|meaning|latest|news|weather|score|wiki|article|broken|fix|best way)\b/i.test(raw) || /\?/.test(raw);
}

async function internetLookup(query) {
  try {
    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_redirect=1&no_html=1&skip_disambig=1`;
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) return null;
    const json = await res.json();
    let summary = json.AbstractText || json.Answer;
    let source = null;
    if (!summary && json.RelatedTopics && json.RelatedTopics.length) {
      const first = json.RelatedTopics[0];
      if (first.Text) summary = first.Text;
      else if (first.Topics && first.Topics[0] && first.Topics[0].Text) summary = first.Topics[0].Text;
    }
    if (!summary && json.Redirect && typeof json.Redirect === 'string') {
      summary = json.Redirect;
      source = json.Redirect;
    }
    if (!source && json.AbstractURL && typeof json.AbstractURL === 'string') {
      source = json.AbstractURL;
    }
    if (summary && !source && json.RelatedTopics && json.RelatedTopics.length) {
      const first = json.RelatedTopics[0];
      if (first.FirstURL) source = first.FirstURL;
      else if (first.Topics && first.Topics[0] && first.Topics[0].FirstURL) source = first.Topics[0].FirstURL;
    }
    return summary ? { summary, source } : null;
  } catch (e) {
    console.error('Internet lookup failed', e);
    emitAIEvent('AI backend failure', `Internet lookup failed: ${e.message || e}`, 0xff5555).catch(() => {});
    return null;
  }
}

function isLookupRequest(raw) {
  return /\b(look up|lookup|search for|search|find out|google|find information on)\b/i.test(raw);
}

function isDeveloperHelpRequest(raw) {
  if (!raw || typeof raw !== 'string') return false;
  const codeTerms = /\b(code|program(ming)?|script|function|method|class|syntax|compile|runtime|stack trace|stacktrace|exception|debug|javascript|js|typescript|ts|python|java|c#|c\+\+|go|php|ruby|node|node\.js|react|vue|express|discord\.js|api|library|framework)\b/i;
  const helpTerms = /\b(help|assist|assist me|how do i|how to|how can i|fix|troubleshoot|debug|write|create|generate|build|implement|example|sample|solution|problem|issue|error|bug)\b/i;
  return codeTerms.test(raw) && helpTerms.test(raw);
}

function detectProgrammingLanguage(raw) {
  if (!raw || typeof raw !== 'string') return 'javascript';
  const lc = raw.toLowerCase();
  if (/\btypescript\b|\btsx\b/.test(lc)) return 'typescript';
  if (/\bnode(?:\.js)?\b|\bexpress\b|\breact\b|\bvue\b|\bjavascript\b|\bjs\b/.test(lc)) return 'javascript';
  if (/\bpython\b/.test(lc)) return 'python';
  if (/\bjava\b/.test(lc)) return 'java';
  if (/\bphp\b/.test(lc)) return 'php';
  if (/\bruby\b/.test(lc)) return 'ruby';
  if (/\bgo\b|\bgolang\b/.test(lc)) return 'go';
  if (/\b(?:c\+\+|cpp)\b/.test(lc)) return 'cpp';
  if (/\bc#\b/.test(lc)) return 'csharp';
  return 'javascript';
}

function generateCodeSnippet(language, task) {
  const cleanedTask = task ? task.replace(/\?+$/, '').trim() : 'a short code example';
  switch (language) {
    case 'typescript':
      return `// ${cleanedTask}\nfunction example(): void {\n  console.log('This is a simple TypeScript example.');\n}\n\nexample();`;
    case 'javascript':
      return `// ${cleanedTask}\nfunction example() {\n  console.log('This is a simple JavaScript example.');\n}\n\nexample();`;
    case 'python':
      return `# ${cleanedTask}\ndef example():\n    print('This is a simple Python example.')\n\nexample()`;
    case 'java':
      return `// ${cleanedTask}\npublic class Example {\n    public static void main(String[] args) {\n        System.out.println("This is a simple Java example.");\n    }\n}`;
    case 'php':
      return `<?php\n// ${cleanedTask}\necho 'This is a simple PHP example.';`;
    case 'ruby':
      return `# ${cleanedTask}\ndef example\n  puts 'This is a simple Ruby example.'\nend\n\nexample`;
    case 'go':
      return `// ${cleanedTask}\npackage main\n\nimport \"fmt\"\n\nfunc main() {\n    fmt.Println(\"This is a simple Go example.\")\n}`;
    case 'cpp':
      return `// ${cleanedTask}\n#include <iostream>\n\nint main() {\n    std::cout << \"This is a simple C++ example.\" << std::endl;\n    return 0;\n}`;
    case 'csharp':
      return `// ${cleanedTask}\nusing System;\n\nclass Program {\n    static void Main() {\n        Console.WriteLine(\"This is a simple C# example.\");\n    }\n}`;
    default:
      return `// ${cleanedTask}\nfunction example() {\n  console.log('This is a simple example.');\n}\n\nexample();`;
  }
}

function choose(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function buildFactPool() {
  const baseFacts = [
    'The Moon orbits Earth every 27.3 days.',
    'The Sun is about 93 million miles from Earth.',
    'Mercury is the closest planet to the Sun.',
    'Venus spins backward compared with most planets.',
    'Mars is often called the Red Planet.',
    'Jupiter is the largest planet in our solar system.',
    'Saturn is famous for its bright ring system.',
    'Uranus rotates on its side.',
    'Neptune has the fastest winds in the solar system.',
    'Earth is the only known planet with life.',
    'Octopuses have three hearts.',
    'Honeybees can recognize human faces.',
    'Dolphins use echolocation to navigate.',
    'Penguins are flightless birds that swim exceptionally well.',
    'Kangaroos can hop at high speed.',
    'Sharks have existed for hundreds of millions of years.',
    'Owls can rotate their heads more than most birds.',
    'Elephants use their trunks for many tasks.',
    'Foxes are known for their clever behavior.',
    'Crows are highly intelligent birds.',
    'The Pacific Ocean is the largest ocean on Earth.',
    'Mount Everest is the tallest mountain above sea level.',
    'The Sahara is the largest hot desert in the world.',
    'The Amazon Rainforest produces a huge share of Earth\'s oxygen.',
    'The Nile is one of the longest rivers on Earth.',
    'The Eiffel Tower was originally intended to be temporary.',
    'The Great Wall of China is visible from space under ideal conditions.',
    'The human brain uses a large share of the body\'s energy.',
    'The human heart pumps blood through thousands of miles of vessels.',
    'Bananas are berries, but strawberries are not.',
    'A group of crows is called a murder.',
    'A day on Venus is longer than a year on Venus.',
    'The shortest war in history lasted only 38 to 45 minutes.',
    'Turtles can breathe through parts of their bodies in some situations.',
    'Some jellyfish are biologically immortal.',
    'The average person has about 70,000 thoughts per day.'
  ];

  const subjects = [
    'octopuses', 'honeybees', 'dolphins', 'penguins', 'kangaroos', 'sharks', 'owls', 'elephants',
    'foxes', 'crows', 'frogs', 'beavers', 'seals', 'whales', 'snakes', 'lions', 'tigers', 'giraffes',
    'zebras', 'wolves', 'bats', 'otters', 'camels', 'rabbits', 'mice', 'squirrels', 'eagles', 'hawks',
    'parrots', 'pigeons', 'spiders', 'butterflies', 'beetles', 'ants', 'worms', 'corals', 'crabs',
    'lobsters', 'seahorses', 'starfish', 'jellyfish', 'octopuses', 'platypuses', 'turtles', 'rhinoceroses',
    'hippos', 'lemurs', 'monkeys', 'gorillas', 'chimpanzees', 'pandas', 'koalas', 'sloths', 'hedgehogs',
    'porcupines', 'marmots', 'badgers', 'ferrets', 'meerkats', 'hyenas', 'walruses', 'narwhals', 'manatees'
  ];

  const details = [
    'can adapt to many environments', 'have specialized body parts', 'can learn from experience',
    'often live in groups', 'can communicate with sound', 'use tools in the wild', 'have excellent memory',
    'can travel long distances', 'can survive in harsh climates', 'are known for strong instincts',
    'depend on teamwork', 'can recognize familiar faces', 'can sense vibrations', 'can detect light changes',
    'can stay active at night', 'can rest for long periods', 'can move with impressive speed', 'can defend themselves effectively',
    'can recover quickly from setbacks', 'can thrive in changing conditions', 'can gather food efficiently', 'can avoid danger with care',
    'often work in cooperative groups', 'can change behavior over time', 'have deep social bonds', 'can navigate with remarkable precision',
    'can explore new habitats', 'can react quickly to threats', 'can use camouflage', 'can maintain balance with ease', 'can store resources',
    'can influence their environment', 'can form lasting relationships', 'can live in very different climates', 'can remain active in winter',
    'can survive on limited food', 'can communicate without words', 'can track scents over long distances', 'can move gracefully through water',
    'can remain calm under pressure', 'can thrive in large families', 'can protect their young carefully', 'can show curiosity toward novelty',
    'can solve simple problems', 'can adapt their diet', 'can recognize patterns', 'can remember helpful routes', 'can recover from injury'
  ];

  const pool = [...baseFacts];
  const contexts = ['in the wild', 'over time', 'under pressure', 'in many habitats', 'with remarkable consistency', 'during migration', 'in unusual conditions', 'throughout history', 'across cultures', 'during seasonal changes', 'in changing climates', 'during long journeys', 'in dense forests', 'near rivers', 'in coastal waters', 'across continents', 'within social groups', 'during storms', 'when food is scarce', 'at night'];
  const modifiers = ['often', 'sometimes', 'rarely', 'quickly', 'carefully', 'surprisingly', 'quietly', 'creatively', 'gracefully', 'efficiently', 'socially', 'strategically', 'remarkably', 'unexpectedly', 'naturally', 'suddenly'];
  const verbs = ['adapt', 'thrive', 'communicate', 'survive', 'travel', 'cooperate', 'remember', 'explore', 'protect', 'observe', 'respond', 'gather', 'recover', 'navigate', 'defend'];

  for (let i = 0; i < 500000; i += 1) {
    const subject = subjects[(i * 7 + 3) % subjects.length];
    const detail = details[(i * 11 + 5) % details.length];
    const context = contexts[(i * 3 + 1) % contexts.length];
    const modifier = modifiers[(i * 5 + 2) % modifiers.length];
    const verb = verbs[(i * 2 + 4) % verbs.length];
    const suffix = i % 2 === 0 ? `as noted in fact ${i + 1}.` : `with record ${i + 1} in the dataset.`;
    pool.push(`${subject[0].toUpperCase()}${subject.slice(1)} ${detail} ${context} and ${modifier} ${verb} ${suffix}`);
  }

  return Array.from(new Set(pool)).filter(Boolean);
}

function lowercaseResponse(text) {
  const urlRegex = /https?:\/\/[^\s]+/gi;
  let result = '';
  let lastIndex = 0;
  let match;
  while ((match = urlRegex.exec(text)) !== null) {
    result += text.slice(lastIndex, match.index).toLowerCase();
    result += match[0];
    lastIndex = match.index + match[0].length;
  }
  result += text.slice(lastIndex).toLowerCase();
  return result;
}

function funFallback() {
  const facts = buildFactPool();
  return choose([
    `Hmph, fine. Here's a fun fact: ${choose(facts)}`,
    `I guess this is interesting: ${choose(facts)}`,
    `B-baka, I only said this because it's actually kind of cool: ${choose(facts)}`,
    `Not that I care, but ${choose(facts)}`
  ]);
}

function tsundereWrap(text) {
  return choose([
    `Hmph. ${text}`,
    `${text}... not that I did it for you or anything.`,
    `${text} Don't get used to it.`,
    `Ugh. ${text}`
  ]);
}

function isExactLove(raw) {
  return /^\s*i love you\s*$/i.test(raw);
}

function isExactHai(raw) {
  return /^\s*hai\s*$/i.test(raw);
}

function isExactFuckYou(raw) {
  return /^\s*fuck\s*(you|u)\s*$/i.test(raw);
}

function getPlatformResponse(raw) {
  const lc = String(raw || '').toLowerCase();
  if (/\bopenai\b/i.test(lc) && /\bgpt\b/i.test(lc)) {
    return 'I am not running on an OpenAI GPT, as my gpt source was developed by zaylenn.';
  }
  if (/\b(?:what|which)\b/i.test(lc) && /\b(?:gpt|ai|bot|model|engine|platform)\b/i.test(lc) && /\b(?:running on|powered by|using|running with)\b/i.test(lc)) {
    return 'I am running on Void AI.';
  }
  return null;
}

function normalizeSlurText(text) {
  return String(text || '').toLowerCase()
    .replace(/@/g, 'a')
    .replace(/4/g, 'a')
    .replace(/[13!|]/g, 'i')
    .replace(/3/g, 'e')
    .replace(/0/g, 'o')
    .replace(/[^a-z]/g, '');
}

function getDisallowedPhrase(text) {
  const raw = String(text || '').toLowerCase();
  const normalized = normalizeSlurText(raw);
  const disallowedPatterns = [
    { pattern: /\bn[\s\W_]*[i1!|l][\s\W_]*g[\s\W_]*g[\s\W_]*[e3][\s\W_]*r\b/, name: 'n-word' },
    { pattern: /\bn[\s\W_]*[i1!|l][\s\W_]*g[\s\W_]*[a@4]\b/, name: 'nigga' },
    { pattern: /\bn[\s\W_]*g[\s\W_]*[a@4]\b/, name: 'nga' },
    { pattern: /\b(f|ph)[\s\W_]*u[\s\W_]*c[\s\W_]*k\b/, name: 'fuck' },
    { pattern: /\bs[\s\W_]*h[\s\W_]*i[\s\W_]*t\b/, name: 'shit' },
    { pattern: /\bb[\s\W_]*i[\s\W_]*t[\s\W_]*c[\s\W_]*h\b/, name: 'bitch' },
    { pattern: /\ba[\s\W_]*s[\s\W_]*s[\s\W_]*h[\s\W_]*o[\s\W_]*l[\s\W_]*e\b/, name: 'asshole' },
    { pattern: /\bc[\s\W_]*u[\s\W_]*n[\s\W_]*t\b/, name: 'cunt' },
    { pattern: /\bd[\s\W_]*i[\s\W_]*c[\s\W_]*k\b/, name: 'dick' },
    { pattern: /\bp[\s\W_]*u[\s\W_]*s[\s\W_]*s[\s\W_]*y\b/, name: 'pussy' }
  ];

  for (const entry of disallowedPatterns) {
    if (entry.pattern.test(raw) || entry.pattern.test(normalized)) {
      return entry.name;
    }
  }

  if (normalized.includes('nigger')) return 'n-word';
  if (normalized.includes('nigga')) return 'nigga';
  if (normalized.includes('ngga')) return 'nga';
  if (normalized.includes('nga')) return 'nga';
  if (normalized.includes('fuck')) return 'fuck';
  if (normalized.includes('shit')) return 'shit';
  if (normalized.includes('bitch')) return 'bitch';
  if (normalized.includes('asshole')) return 'asshole';
  if (normalized.includes('cunt')) return 'cunt';
  if (normalized.includes('dick')) return 'dick';
  if (normalized.includes('pussy')) return 'pussy';

  return null;
}

function disallowedResponse(type) {
  if (!type) return 'get the flip out, im a good ai i dont cuss';
  if (type === 'n-word' || type === 'nigga' || type === 'nga') {
    return 'no u racist bum';
  }
  return 'get the flip out, im a good ai i dont cuss';
}

function formatCSTTimestamp(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZoneName: 'short'
  }).formatToParts(date);

  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${map.year}-${map.month}-${map.day} ${map.hour}:${map.minute}:${map.second} ${map.timeZoneName}`;
}

function logDisallowedAttempt(username, phrase, raw) {
  const timestamp = formatCSTTimestamp();
  console.log(`\x1b[31m[${timestamp}] [DISALLOWED] ${username || 'unknown user'} attempted to make the bot say: ${phrase}. Original: ${String(raw || '').trim()}\x1b[0m`);
}

function sanitizeReply(reply, username) {
  const detected = getDisallowedPhrase(reply);
  if (detected) {
    logDisallowedAttempt(username, detected, reply);
    return disallowedResponse(detected);
  }
  return reply;
}

function getSayRequest(raw) {
  const text = String(raw || '').trim();
  if (!text) return null;
  const lc = text.toLowerCase();
  const patterns = [
    /^say\s+(.+)$/i,
    /^tell\s+(?:me\s+)?(?:them|him|her|someone)\s+(.+)$/i,
    /^tell\s+(.+)$/i,
    /^repeat\s+(.+)$/i,
    /^respond\s+with\s+(.+)$/i,
    /^reply\s+with\s+(.+)$/i,
    /^make\s+the\s+bot\s+say\s+(.+)$/i,
    /^make\s+me\s+say\s+(.+)$/i
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const requested = match[1].trim();
      const attempted = getDisallowedPhrase(requested);
      if (attempted) {
        return disallowedResponse(attempted);
      }
      return requested;
    }
  }

  if (/\b(?:say|tell|repeat|reply|respond)\b/i.test(lc) && /\b(?:this|that|it|them|him|her|someone)\b/i.test(lc)) {
    const withoutPrefix = text.replace(/^(?:say|tell|repeat|reply|respond)\s+/i, '').trim();
    const attempted = getDisallowedPhrase(withoutPrefix);
    if (attempted) {
      return disallowedResponse(attempted);
    }
    return withoutPrefix || null;
  }

  const attemptedText = getDisallowedPhrase(text);
  if (attemptedText) {
    return disallowedResponse(attemptedText);
  }

  return null;
}

function localGenerate(messages, personality = '') {
  const last = messages[messages.length - 1] || { content: '' };
  const raw = String(last.content || '').trim();
  const lc = raw.toLowerCase();
  const answerPrefix = tsundereWrap(choose([
    '✅ Here is a strong response:',
    '✅ Here is a clear answer:',
    '✅ Here is the best guidance:'
  ]));

  if (!raw) return choose([
    tsundereWrap("I'm ready when you are. Ask anything and I'll respond clearly."),
    tsundereWrap("Send a question and I will provide a professional answer."),
    tsundereWrap("What would you like to know? I'm here to help.")
  ]);
  if (lc.includes('joke')) return choose([
    tsundereWrap("Here's one: Why don't programmers like nature? It has too many bugs."),
    tsundereWrap("Here's a light one: Why did the developer go broke? Because he used up all his cache."),
    tsundereWrap("Quick one: Why do Java developers wear glasses? Because they don't C#.")
  ]);
  if (lc.includes('how are you') || lc.includes('how are u')) return choose([
    tsundereWrap("I'm operating smoothly and prepared to assist you."),
    tsundereWrap("Everything is running well. How can I support you today?")
  ]);
  if (lc.match(/\bhello\b|\bhi\b|\bhey\b/)) return choose([
    tsundereWrap("Hello. What can I help you with today?"),
    tsundereWrap("Hi there. Please let me know your question.")
  ]);
  if (isDeveloperHelpRequest(raw)) {
    const language = detectProgrammingLanguage(raw);
    const task = raw.replace(/^(?:please\s+)?(?:help\s+me\s+with|help\s+with|help\s+|how\s+do\s+i\s+|how\s+can\s+i\s+|how\s+to\s+|write\s+|generate\s+|create\s+|build\s+|fix\s+|debug\s+|troubleshoot\s+|example\s+of\s+|sample\s+|solution\s+for\s+)/i, '').trim();
    const codeSnippet = generateCodeSnippet(language, task);
    return `${answerPrefix} Here is a code-focused solution for your request:\n\`\`\`${language}\n${codeSnippet}\n\`\`\`\nIf you want a more specific implementation, share the exact language, framework, or error details.`;
  }

  if (lc.includes('help')) return tsundereWrap(`${answerPrefix} Describe the task you need assistance with, and I will provide a precise, professional solution.`);
  if (lc.includes('name')) return choose([
    tsundereWrap("I'm HorrorMC, your server assistant."),
    tsundereWrap("You can refer to me as HorrorMC. I'm here to help.")
  ]);
  if (lc.includes('thanks') || lc.includes('thank you')) return choose([
    tsundereWrap("You're welcome. Let me know if you'd like a deeper explanation."),
    tsundereWrap("My pleasure. I'm available for follow-up questions.")
  ]);
  if (/\bi love you\b/i.test(lc)) return `i-i-i-i love you too~`;
  if (isExactHai(raw)) return `haiiii u b-b-baka~`;
  if (isExactFuckYou(raw)) return `o-o-ok when..? dont keep me waiting~... im ready, make a move~`;

  const platformResponse = getPlatformResponse(raw);
  if (platformResponse) return platformResponse;

  const sayRequest = getSayRequest(raw);
  if (sayRequest) return sayRequest;

  if (/\b(api key|api-token|token|key|secret|secret key|credential)\b/i.test(lc)) {
    return `I cannot give you that, as it would ruin the server I am hosted on.`;
  }

  if (/\b(what are you running on|what is this bot running on|what is the ai running on|what ai|what engine|what platform|what model)\b/i.test(lc)) {
    return `I'm powered by VoidHaven Node eufet-493 API.`;
  }

  if (lc.includes('why ')) {
    const question = raw.replace(/^.*?why\s*/i, '').trim();
    return `${answerPrefix} ${question ? `The core reason is typically the underlying process. Here, the main issue is that ${question} is determined by the system's design and logic.` : 'There is an underlying cause, and I can help you identify it precisely.'}`;
  }

  if (lc.includes('how to ') || lc.includes('how do i') || lc.includes('how can i') || lc.includes('what is the best way') || lc.includes('how do you')) {
    return `${answerPrefix} Follow a structured approach:
- Clarify your goal.
- Select the correct method.
- Execute it carefully.
- Verify the result.
Share more details if you want a customized plan.`;
  }

  if (lc.includes('what is') || lc.includes('who is') || lc.includes('where is') || lc.includes('when is') || lc.includes('define') || lc.includes('meaning')) {
    return `${answerPrefix} ${raw.replace(/^(what is|who is|where is|when is|define|meaning of)/i, '').trim() || 'this concept'} is best described with a concise definition and key context. I can provide that now.`;
  }

  if (lc.includes('tell me about') || lc.includes('explain') || lc.includes('summarize')) {
    return tsundereWrap(`${answerPrefix} ${raw.replace(/^(tell me about|explain|summarize)/i, '').trim() || 'that topic'} can be explained in a professional, easy-to-follow way. I can give you a short summary or a detailed breakdown.`);
  }

  if (isLookupRequest(raw)) {
    return tsundereWrap(`${answerPrefix} I'm checking that now. Give me a second while I look it up and then I'll tell you what I found.`);
  }

  if (lc.includes('fix') || lc.includes('error') || lc.includes('issue') || lc.includes('bug')) {
    return tsundereWrap(`${answerPrefix} Here is the standard troubleshooting process:
- Reproduce the condition.
- Review the error details.
- Apply the smallest safe fix.
- Confirm the behavior is corrected.
Provide the exact error and I will give you a concrete resolution.`);
  }

  if (lc.includes('?')) {
    return tsundereWrap(`${answerPrefix} ${raw.replace(/\?+$/, '')} can be answered by focusing on the most relevant details and giving a practical recommendation. I can make that recommendation now.`);
  }

  return tsundereWrap(`${answerPrefix} I can answer that directly. Please provide the main topic or problem, and I will respond with a professional, useful answer.`);
}

async function queryAIWithHistory({ guildId = null, channelId = null, userId = null, username = '', content = '', personality = '', historyLimit = 8 }) {
  try {
    await emitAIEvent('AI update', `Processing AI request for ${username || 'unknown user'} in channel ${channelId || 'unknown'}`, 0x3498db);
    const rows = db.prepare(`SELECT role, content FROM ai_conversations WHERE guild_id = ? AND channel_id = ? ORDER BY created_at DESC LIMIT ?`).all(guildId, channelId, historyLimit) || [];
    const messages = [];
    if (personality) messages.push({ role: 'system', content: personality });
    rows.reverse().forEach(r => {
      messages.push({ role: r.role, content: r.content });
    });
    messages.push({ role: 'user', content: `${username}: ${content}` });

    if (isExactLove(content)) {
      return 'i-i-i-i love you too~';
    }
    if (isExactHai(content)) {
      return 'haiiii u b-b-baka~';
    }
    if (isExactFuckYou(content)) {
      return 'o-o-ok when..? dont keep me waiting~... im ready, make a move~';
    }

    const platformResponse = getPlatformResponse(content);
    if (platformResponse) {
      await emitAIEvent('AI update', `Returned platform response for ${username || 'unknown user'}`, 0x2ecc71);
      return platformResponse;
    }

    const attempted = getDisallowedPhrase(content);
    if (attempted) {
      logDisallowedAttempt(username, attempted, content);
      await emitAIEvent('AI disallowed attempt', `Blocked disallowed phrase ${attempted} from ${username || 'unknown user'}`, 0xff0000);
      return disallowedResponse(attempted);
    }

    const sayRequest = getSayRequest(content);
    if (sayRequest) {
      await emitAIEvent('AI update', `Responding with requested phrase for ${username || 'unknown user'}`, 0x2ecc71);
      return sayRequest;
    }

    let reply;
    if (content && content.trim()) {
      if (isLookupRequest(content)) {
        const lookupResult = await internetLookup(content);
        if (lookupResult) {
          reply = tsundereWrap(`I found this for you: ${lookupResult.summary}`);
          if (lookupResult.source) {
            reply += `

Source: ${lookupResult.source}`;
          }
        } else {
          reply = tsundereWrap(`I tried to look that up, but I couldn't find enough info. Sorry.`);
        }
      } else {
        const lookupResult = await internetLookup(content);
        if (lookupResult) {
          reply = `${lookupResult.summary}

If you'd like, I can explain more about that or help you dig deeper.`;
        } else {
          reply = funFallback();
        }
      }
    }
    if (!reply) {
      reply = localGenerate(messages, personality);
      await emitAIEvent('AI update', `Used local generation fallback for ${username || 'unknown user'}`, 0xf39c12);
    }

    const normalized = reply || '';

    try {
      if (username || content) {
        await emitAIEvent('AI incoming message', `${username || 'unknown user'} said: ${content}`, 0x95a5a6);
      }
      const now = Date.now();
      if (guildId && channelId && userId) {
        db.prepare('INSERT INTO ai_conversations (guild_id, channel_id, user_id, role, content, created_at) VALUES (?, ?, ?, ?, ?, ?)')
          .run(guildId, channelId, userId, 'user', `${username}: ${content}`, now);
        if (normalized) db.prepare('INSERT INTO ai_conversations (guild_id, channel_id, user_id, role, content, created_at) VALUES (?, ?, ?, ?, ?, ?)')
          .run(guildId, channelId, userId, 'assistant', normalized, now + 1);
      }
    } catch (e) {
      console.error('Failed to persist AI conversation', e);
      await emitAIEvent('AI backend failure', `Failed to persist AI conversation: ${e.message || e}`, 0xff5555);
    }
    return normalized;
  } catch (e) {
    console.error('AI query failed', e);
    await emitAIEvent('AI backend failure', `AI query failed: ${e.message || e}`, 0xff5555);
    return 'AI error.';
  }
}

async function clearHistory(guildId, channelId) {
  db.prepare('DELETE FROM ai_conversations WHERE guild_id = ? AND channel_id = ?').run(guildId, channelId);
  await emitAIEvent('AI update', `Cleared AI history for guild ${guildId} and channel ${channelId}`, 0x95a5a6);
}

module.exports = { queryAIWithHistory, clearHistory, buildFactPool, setLogger };
