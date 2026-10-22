const req = new Request('http://localhost:3000/api/roast/v2/generate', { 
  method: 'POST', 
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({systemPrompt: 'test', userPrompt: 'test'})
});
// use the actual server route without auth headers so it fails 401
fetch(req).then(res => res.text().then(text => console.log("STATUS:", res.status, "TEXT:", text.substring(0, 50)))).catch(console.error);
