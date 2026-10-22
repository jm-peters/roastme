
fetch('http://localhost:3000/api/health')
  .then(res => res.json())
  .then(data => console.log('Health:', JSON.stringify(data)))
  .catch(err => console.error('Health Check Failed:', err));
