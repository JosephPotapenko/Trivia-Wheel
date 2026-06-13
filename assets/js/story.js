const titleText = document.getElementById('titleText');
const subText = document.getElementById('subText');
const storyLabel = document.getElementById('storyLabel');
const nameLabel = document.getElementById('nameLabel');
const storyInput = document.getElementById('story');
const nameInput = document.getElementById('name');
const submitBtn = document.getElementById('submitBtn');
const exportBtn = document.getElementById('exportBtn');

const API_URL = '/.netlify/functions/story-submissions';

function updateLanguageUI() {
  titleText.textContent = 'Ask A Question';
  subText.textContent = 'One question at a time. But be careful! You may end up answering it!';
  storyLabel.textContent = 'Ask a question… (the more interesting the better)';
  nameLabel.textContent = 'Submit your name…';
  storyInput.placeholder = 'Ask a question.';
  nameInput.placeholder = 'Submit your name...';
  submitBtn.textContent = 'Submit';
  exportBtn.textContent = 'Export Questions';
}

updateLanguageUI();

async function loadQuestions() {
  const response = await fetch(API_URL);

  if (!response.ok) {
    throw new Error('Could not load questions');
  }

  return await response.text();
}

async function saveQuestions(text) {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain'
    },
    body: text
  });

  if (!response.ok) {
    throw new Error('Could not save questions');
  }
}

function downloadTextFile(text) {
  const blob = new Blob([text], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = 'stories.txt';
  document.body.appendChild(a);
  a.click();

  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

submitBtn.addEventListener('click', async () => {
  const question = storyInput.value.trim();
  const name = nameInput.value.trim() || 'Anonymous';

  if (!question) {
    alert('Please enter your question.');
    return;
  }

  try {
    const existingText = await loadQuestions();

    const count = existingText.trim()
      ? existingText.trim().split(/\n\n+/).length + 1
      : 1;

    const newEntry = `${count}. ${question}\nName: ${name}`;
    const updatedText = existingText.trim()
      ? `${existingText.trim()}\n\n${newEntry}`
      : newEntry;

    await saveQuestions(updatedText);

    storyInput.value = '';
    nameInput.value = '';

    alert('Your question has been submitted.');
  } catch (error) {
    alert('Could not save your question. Please try again.');
  }
});

exportBtn.addEventListener('click', async () => {
  try {
    const text = await loadQuestions();

    if (!text.trim()) {
      alert('There are no questions to export yet.');
      return;
    }

    downloadTextFile(text);
  } catch (error) {
    alert('Could not export questions.');
  }
});