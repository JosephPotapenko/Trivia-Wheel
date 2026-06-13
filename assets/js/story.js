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
  exportBtn.textContent = 'Export is in Netlify';
}

updateLanguageUI();

submitBtn.addEventListener('click', async () => {
  const question = storyInput.value.trim();
  const name = nameInput.value.trim() || 'Anonymous';

  if (!question) {
    alert('Please enter your question.');
    return;
  }

  const formData = new URLSearchParams();
  formData.append('form-name', 'story-submissions');
  formData.append('question', question);
  formData.append('name', name);

  try {
    const response = await fetch('/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: formData.toString()
    });

    if (!response.ok) {
      throw new Error('Submit failed');
    }

    storyInput.value = '';
    nameInput.value = '';

    alert('Your question has been submitted.');
  } catch (error) {
    alert('Could not submit. Check Netlify Forms in your dashboard and make sure the latest deploy finished.');
  }
});

exportBtn.addEventListener('click', () => {
  alert('Go to Netlify Dashboard → Forms → story-submissions to view or export questions.');
});