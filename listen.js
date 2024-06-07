const {server} = require('./index');
const PORT = process.env.PORT || 4123;
server.listen(PORT, () => {
  console.log(`Clipboard Server is running on port ${PORT}`);
});