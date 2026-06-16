/**
 * Settings Page Controller
 * Handles personal profile editing, avatar seed updates, and security credentials reset logic
 */

document.addEventListener("DOMContentLoaded", () => {
  const user = Auth.requireAuth();
  if (!user) return;

  // Render sidebar user details
  document.getElementById("user-name").textContent = user.name;
  document.getElementById("user-role").textContent = user.role;
  if (user.avatar) {
    document.getElementById("user-avatar").src = user.avatar;
  }

  // Populate form settings
  populateSettingsForm(user);
});

// Populate forms with session state
function populateSettingsForm(user) {
  document.getElementById("set-name").value = user.name;
  document.getElementById("set-avatar-preview").src = user.avatar;
  
  // Extract seed keyword from Dicebear URL if possible
  let seedVal = "";
  if (user.avatar && user.avatar.includes("seed=")) {
    const parts = user.avatar.split("seed=");
    if (parts.length > 1) {
      seedVal = decodeURIComponent(parts[1]);
    }
  }
  document.getElementById("set-avatar-seed").value = seedVal || user.name;

  const emp = DB.getEmployeeById(user.employeeId);
  const phoneInput = document.getElementById("set-phone");
  const addressInput = document.getElementById("set-address");

  if (emp) {
    // Linked employee profile found
    phoneInput.value = emp.phone || "";
    addressInput.value = emp.address || "";
  } else {
    // System account (admin/manager) - No profile details linked
    phoneInput.value = "N/A";
    phoneInput.disabled = true;
    phoneInput.style.opacity = "0.6";
    phoneInput.style.cursor = "not-allowed";
    
    addressInput.value = "Admin Account - No profile info";
    addressInput.disabled = true;
    addressInput.style.opacity = "0.6";
    addressInput.style.cursor = "not-allowed";
  }
}

// Live avatar seed preview
function previewAvatarSeed(value) {
  const preview = document.getElementById("set-avatar-preview");
  const user = DB.getCurrentUser();
  
  // Choose sprite set based on role
  const spriteSet = user.role === "employee" ? "avataaars" : "adventurer";
  preview.src = `https://api.dicebear.com/7.x/${spriteSet}/svg?seed=${encodeURIComponent(value || "placeholder")}`;
}

// Save personal profile details
function handleProfileUpdateSubmit(event) {
  event.preventDefault();

  const user = DB.getCurrentUser();
  const seed = document.getElementById("set-avatar-seed").value.trim() || user.name;
  const spriteSet = user.role === "employee" ? "avataaars" : "adventurer";
  const avatarUrl = `https://api.dicebear.com/7.x/${spriteSet}/svg?seed=${encodeURIComponent(seed)}`;

  const users = DB.getUsers();
  const userIdx = users.findIndex(u => u.id === user.id);
  
  if (userIdx === -1) {
    Auth.showToast("Account session validation error.", "error");
    return;
  }

  // 1. Update User avatar
  users[userIdx].avatar = avatarUrl;
  DB._write(DB.KEYS.USERS, users);
  
  // Update current session copy
  user.avatar = avatarUrl;
  DB.setCurrentUser(user);

  // 2. Update Employee details if linked
  if (user.employeeId) {
    const phone = document.getElementById("set-phone").value.trim();
    const address = document.getElementById("set-address").value.trim();

    const employees = DB.getEmployees();
    const empIdx = employees.findIndex(e => e.id === user.employeeId);
    if (empIdx !== -1) {
      employees[empIdx].phone = phone;
      employees[empIdx].address = address;
      employees[empIdx].avatar = avatarUrl;
      DB._write(DB.KEYS.EMPLOYEES, employees);
    }
  }

  // Refresh view
  document.getElementById("user-avatar").src = avatarUrl;
  Auth.showToast("Personal profile details saved successfully.", "success");
}

// Reset password security credentials
function handlePasswordUpdateSubmit(event) {
  event.preventDefault();

  const user = DB.getCurrentUser();
  const currentPass = document.getElementById("set-current-pass").value;
  const newPass = document.getElementById("set-new-pass").value;
  const confirmPass = document.getElementById("set-confirm-pass").value;

  if (currentPass !== user.password) {
    Auth.showToast("Incorrect current password.", "error");
    return;
  }

  if (newPass.length < 6) {
    Auth.showToast("New password must be at least 6 characters.", "error");
    return;
  }

  if (newPass !== confirmPass) {
    Auth.showToast("New passwords do not match.", "error");
    return;
  }

  const users = DB.getUsers();
  const userIdx = users.findIndex(u => u.id === user.id);

  if (userIdx !== -1) {
    // Update user credential password in DB
    users[userIdx].password = newPass;
    DB._write(DB.KEYS.USERS, users);

    // Update active session
    user.password = newPass;
    DB.setCurrentUser(user);

    DB.logActivity(user.id, user.name, "Changed/Updated account security password");
    Auth.showToast("Password updated successfully.", "success");

    // Clear password forms
    document.getElementById("security-settings-form").reset();
  } else {
    Auth.showToast("Account state synchronisation failed.", "error");
  }
}
