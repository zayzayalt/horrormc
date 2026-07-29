const db = require('./db');

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
    return null;
  }
}

function isLookupRequest(raw) {
  return /\b(look up|lookup|search for|search|find out|google|find information on)\b/i.test(raw);
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
      return platformResponse;
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
    }

    const normalized = reply || '';

    try {
      const now = Date.now();
      if (guildId && channelId && userId) {
        db.prepare('INSERT INTO ai_conversations (guild_id, channel_id, user_id, role, content, created_at) VALUES (?, ?, ?, ?, ?, ?)')
          .run(guildId, channelId, userId, 'user', `${username}: ${content}`, now);
        if (normalized) db.prepare('INSERT INTO ai_conversations (guild_id, channel_id, user_id, role, content, created_at) VALUES (?, ?, ?, ?, ?, ?)')
          .run(guildId, channelId, userId, 'assistant', normalized, now + 1);
      }
    } catch (e) { console.error('Failed to persist AI conversation', e); }
    return normalized;
  } catch (e) {
    console.error('AI query failed', e);
    return 'AI error.';
  }
}

async function clearHistory(guildId, channelId) {
  db.prepare('DELETE FROM ai_conversations WHERE guild_id = ? AND channel_id = ?').run(guildId, channelId);
}

module.exports = { queryAIWithHistory, clearHistory, buildFactPool };
