const titleText = document.getElementById('titleText');
const subText = document.getElementById('subText');
const storyLabel = document.getElementById('storyLabel');
const nameLabel = document.getElementById('nameLabel');
const storyInput = document.getElementById('story');
const nameInput = document.getElementById('name');
const submitBtn = document.getElementById('submitBtn');
const exportBtn = document.getElementById('exportBtn');

function updateLanguageUI() {
  titleText.textContent = 'Ask A Question';
  subText.textContent = 'One question at a time. But be careful! You may end up answering it!';
  storyLabel.textContent = 'Ask a question… (the more interesting the better)';
  nameLabel.textContent = 'Submit your name…';
  storyInput.placeholder = 'Ask a question.';
  nameInput.placeholder = 'Submit your name...';
  submitBtn.textContent = 'Submit';
  exportBtn.textContent = 'Export to Server';
}

updateLanguageUI();

function getStoredSubmissions() {
  return JSON.parse(localStorage.getItem('storySubmissions') || '[]');
}

function saveStoredSubmissions(submissions) {
  localStorage.setItem('storySubmissions', JSON.stringify(submissions));
}

function getSubmissionsText() {
  const submissions = getStoredSubmissions();

  return submissions
    .map((item, index) => {
      return `${index + 1}. ${item.question}\nName: ${item.name || 'Anonymous'}`;
    })
    .join('\n\n');
}

function downloadSubmissionsFile(text) {
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

submitBtn.addEventListener('click', () => {
  const question = storyInput.value.trim();
  const name = nameInput.value.trim();

  if (!question) {
    alert('Please enter your question.');
    return;
  }

  const submissions = getStoredSubmissions();

  submissions.push({
    question,
    name,
    submittedAt: new Date().toISOString()
  });

  saveStoredSubmissions(submissions);

  storyInput.value = '';
  nameInput.value = '';

  alert('Your question has been submitted.');
});

exportBtn.addEventListener('click', async () => {
  const submissionsText = getSubmissionsText();

  if (!submissionsText) {
    alert('There are no questions to export yet.');
    return;
  }

  try {
    const response = await fetch('/api/export-submissions', {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain'
      },
      body: submissionsText
    });

    if (!response.ok) {
      throw new Error('Export failed');
    }

    alert('Questions exported to assets/data/stories.txt');
  } catch (error) {
    downloadSubmissionsFile(submissionsText);
    alert('Server not reachable, so a stories.txt file was downloaded instead.');
  }
});