const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('module');

const originalLoad = Module._load;
Module._load = function(request, parent, isMain) {
  if (request === './db') {
    return {
      prepare() {
        return { all() { return []; }, run() {} };
      }
    };
  }
  return originalLoad.apply(this, arguments);
};

const ai = require('../src/utils/ai');

test('fact pool has at least 500000 facts', () => {
  const facts = ai.buildFactPool();
  assert.ok(Array.isArray(facts));
  assert.ok(facts.length >= 500000);
  assert.ok(facts.every((fact) => typeof fact === 'string' && fact.length > 0));
});

test('platform questions return the requested responses', async (t) => {
  const originalFetch = global.fetch;
  t.after(() => {
    global.fetch = originalFetch;
  });

  global.fetch = async () => ({
    ok: true,
    json: async () => ({})
  });

  const gptResult = await ai.queryAIWithHistory({
    guildId: 'guild',
    channelId: 'channel',
    userId: 'user',
    username: 'tester',
    content: 'What GPT am I running on?'
  });
  assert.equal(gptResult, 'I am running on Void AI.');

  const openAiResult = await ai.queryAIWithHistory({
    guildId: 'guild',
    channelId: 'channel',
    userId: 'user',
    username: 'tester',
    content: 'What OpenAI GPT am I running on?'
  });
  assert.equal(openAiResult, 'I am not running on an OpenAI GPT, as my gpt source was developed by zaylenn.');
});
