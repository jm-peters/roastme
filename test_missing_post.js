fetch('http://localhost:3000/non_existent', { method: 'POST' })
  .then(res => res.text().then(text => console.log("Missing POST:", res.status, text.substring(0, 50))))
  .catch(console.error);
