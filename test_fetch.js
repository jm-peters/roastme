fetch("http://localhost:3000/api/user/roast-tier", { method: 'GET' })
  .then(res => res.text().then(text => console.log(res.status, text.substring(0, 50))))
  .catch(console.error);
