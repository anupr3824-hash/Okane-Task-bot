const fs = require("fs");

const FILE = "./database/users.json";

// Create file if not exists
if (!fs.existsSync(FILE)) {
  fs.writeFileSync(FILE, JSON.stringify([]));
}

// Read Users
function getUsers() {
  const data = fs.readFileSync(FILE);
  return JSON.parse(data);
}

// Save Users
function saveUsers(users) {
  fs.writeFileSync(FILE, JSON.stringify(users, null, 2));
}

// Find User
function findUser(userId) {
  const users = getUsers();
  return users.find((u) => u.id === userId);
}

// Add New User
function addUser(userData) {
  const users = getUsers();
  users.push(userData);
  saveUsers(users);
}

// Update User
function updateUser(userId, newData) {
  const users = getUsers();

  const index = users.findIndex((u) => u.id === userId);

  if (index !== -1) {
    users[index] = {
      ...users[index],
      ...newData,
    };

    saveUsers(users);
  }
}

module.exports = {
  getUsers,
  saveUsers,
  findUser,
  addUser,
  updateUser,
};
