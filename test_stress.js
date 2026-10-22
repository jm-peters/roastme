const run = async () => {
  for(let i=0; i<100; i++) {
    try {
      const resp = await fetch('http://localhost:3000/api/user/roast-tier');
      console.log(resp.status);
    } catch(e) {
      console.log("Failed", e);
    }
  }
}
run();
