// Automatically load active theme for user
fetch('/api/active-theme?email=qasim@example.com') // replace with session email
  .then(res => res.json())
  .then(data => {
    const theme = data.theme;
    document.getElementById("theme-preview").src = `/frontend/themes/${theme}/index.html`;
  });
