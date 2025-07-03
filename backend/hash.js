// use to hash  passwords when creating users

const bcrypt = require('bcrypt'); 
bcrypt.hash('password123', 10).then(hash => console.log(hash));
