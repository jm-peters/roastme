fetch('http://localhost:3000/api/rmp/convert', {method: 'POST'})
  .then(res => res.text().then(text => console.log('Status:', res.status, 'Body:', text.substring(0, 100))))
  .catch(e => console.error(e));
