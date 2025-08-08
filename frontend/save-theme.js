function saveTheme() {
  fetch('/api/store-theme', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ store: "qasimzone", theme: "classic-store" }) // Replace with dynamic values
  }).then(res => res.json())
    .then(data => alert(data.message));
}
