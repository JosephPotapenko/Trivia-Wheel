const { getStore } = require('@netlify/blobs');

exports.handler = async function (event) {
  const store = getStore('story-submissions');
  const key = 'stories.txt';

  try {
    if (event.httpMethod === 'GET') {
      const text = await store.get(key, { type: 'text' });

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8'
        },
        body: text || ''
      };
    }

    if (event.httpMethod === 'POST') {
      await store.set(key, event.body || '');

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ok: true })
      };
    }

    return {
      statusCode: 405,
      body: 'Method not allowed'
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: error.message
    };
  }
};