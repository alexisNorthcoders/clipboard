const {server} = require('./index');
const PORT = process.env.PORT || 4123;
server.listen(PORT, () => {
  console.log(`Clipcloud Server is running on port ${PORT}`);
});