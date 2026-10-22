const body = JSON.stringify({ image: "data:image/jpeg;base64,A==", options: {} });
fetch('http://localhost:3000/api/generate-roast', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer fake_token'
  },
  body
})
  .then(res => res.text().then(text => console.log('Status:', res.status, 'Body:', text.substring(0, 100))))
  .catch(e => console.error(e));
