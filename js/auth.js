/**
 * Authentication Module for EMS
 * Connects UI inputs to DB local storage layer
 */

const Auth = {
  // Validate email pattern
  isValidEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email).toLowerCase());
  },

  // Perform Login
  login(email, password, rememberMe = false) {
    if (!email || !password) {
      this.showToast("Please enter both email and password.", "error");
      return false;
    }

    const users = DB.getUsers();
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (!user || user.password !== password) {
      this.showToast("Invalid email or password.", "error");
      return false;
    }

    // Set current session
    DB.setCurrentUser(user);

    // Save email in localStorage if Remember Me checked
    if (rememberMe) {
      localStorage.setItem("ems_remembered_email", email);
    } else {
      localStorage.removeItem("ems_remembered_email");
    }

    DB.logActivity(user.id, user.name, "Successfully logged into the system");
    this.showToast(`Welcome back, ${user.name}! Redirecting...`, "success");
    
    setTimeout(() => {
      if (user.role === "employee") {
        window.location.href = "../employee-dashboard.html";
      } else {
        window.location.href = "../dashboard.html";
      }
    }, 1000);

    return true;
  },

  // Perform Registration
  register(name, email, password, confirmPassword) {
    if (!name || !email || !password || !confirmPassword) {
      this.showToast("All fields are required.", "error");
      return false;
    }

    if (!this.isValidEmail(email)) {
      this.showToast("Please provide a valid email address.", "error");
      return false;
    }

    if (password.length < 6) {
      this.showToast("Password must be at least 6 characters.", "error");
      return false;
    }

    if (password !== confirmPassword) {
      this.showToast("Passwords do not match.", "error");
      return false;
    }

    const users = DB.getUsers();
    const emailExists = users.some(u => u.email.toLowerCase() === email.toLowerCase());

    if (emailExists) {
      this.showToast("Email address is already registered.", "error");
      return false;
    }

    // Create user
    const newUser = DB.createUser({
      name,
      email: email.toLowerCase(),
      password,
      role: "manager" // Default role for new signups
    });

    DB.setCurrentUser(newUser);
    this.showToast("Registration successful! Access granted.", "success");

    setTimeout(() => {
      window.location.href = "../dashboard.html";
    }, 1000);

    return true;
  },

  // Perform Logout
  logout() {
    const user = DB.getCurrentUser();
    if (user) {
      DB.logActivity(user.id, user.name, "Logged out of the system");
    }
    DB.clearCurrentUser();
    window.location.href = window.location.pathname.includes("auth/") ? "login.html" : "auth/login.html";
  },

  // Mock Password Recovery Link Dispatch
  forgotPassword(email) {
    if (!email) {
      this.showToast("Please enter your email address.", "error");
      return false;
    }

    if (!this.isValidEmail(email)) {
      this.showToast("Please provide a valid email address.", "error");
      return false;
    }

    const users = DB.getUsers();
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (!user) {
      this.showToast("If that email exists, recovery instructions have been sent.", "info");
      return true;
    }

    // Save context for mock reset flow
    localStorage.setItem("ems_reset_target_email", email.toLowerCase());

    this.showToast("Reset token dispatched! Redirecting to password reset...", "success");
    setTimeout(() => {
      window.location.href = "reset-password.html";
    }, 1500);

    return true;
  },

  // Perform Password Reset
  resetPassword(newPassword, confirmPassword) {
    const email = localStorage.getItem("ems_reset_target_email");
    if (!email) {
      this.showToast("No active password recovery session found.", "error");
      return false;
    }

    if (!newPassword || !confirmPassword) {
      this.showToast("Please fill in both fields.", "error");
      return false;
    }

    if (newPassword.length < 6) {
      this.showToast("Password must be at least 6 characters.", "error");
      return false;
    }

    if (newPassword !== confirmPassword) {
      this.showToast("Passwords do not match.", "error");
      return false;
    }

    const users = DB.getUsers();
    const userIndex = users.findIndex(u => u.email.toLowerCase() === email.toLowerCase());

    if (userIndex === -1) {
      this.showToast("Account association lost. Please restart process.", "error");
      return false;
    }

    // Update password
    users[userIndex].password = newPassword;
    DB._write(DB.KEYS.USERS, users);
    
    DB.logActivity(users[userIndex].id, users[userIndex].name, "Changed/Reset password");
    localStorage.removeItem("ems_reset_target_email");

    this.showToast("Password reset successfully! Redirecting to login...", "success");
    setTimeout(() => {
      window.location.href = "login.html";
    }, 1500);

    return true;
  },

  // Session guard for dashboard / employee management views
  requireAuth() {
    const user = DB.getCurrentUser();
    if (!user) {
      // Find out correct relative path to login
      const prefix = window.location.pathname.includes("auth/") ? "" : "auth/";
      window.location.href = `${prefix}login.html`;
      return null;
    }
    return user;
  },

  // Toast Helper
  showToast(message, type = "info") {
    let container = document.getElementById("toast-container");
    if (!container) {
      container = document.createElement("div");
      container.id = "toast-container";
      document.body.appendChild(container);
    }

    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    
    let icon = "fa-circle-info";
    if (type === "success") icon = "fa-circle-check";
    if (type === "error") icon = "fa-triangle-exclamation";

    toast.innerHTML = `
      <i class="fa-solid ${icon}"></i>
      <span>${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = "slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) reverse forwards";
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  },

  // Premium Custom Dialogue Modal Popup (replaces default window.confirm)
  showConfirm(title, message, onConfirm, onCancel = null) {
    let overlay = document.getElementById("global-confirm-modal");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = "global-confirm-modal";
      overlay.className = "modal-overlay";
      document.body.appendChild(overlay);
    }

    overlay.innerHTML = `
      <div class="modal-content glass-panel" style="max-width: 400px; text-align: center; border: 1px solid rgba(255, 255, 255, 0.15);">
        <div style="color: var(--primary); font-size: 3rem; margin-bottom: 16px; background: var(--primary-gradient); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
          <i class="fa-solid fa-circle-question"></i>
        </div>
        <h2 style="font-size: 1.35rem; margin-bottom: 12px; color: var(--text-primary);">${title}</h2>
        <p style="color: var(--text-secondary); font-size: 0.95rem; margin-bottom: 24px; line-height: 1.5;">${message}</p>
        <div style="display: flex; gap: 12px; justify-content: center;">
          <button class="btn btn-secondary" id="confirm-modal-cancel" style="flex: 1;">Cancel</button>
          <button class="btn btn-primary" id="confirm-modal-ok" style="flex: 1;">Confirm</button>
        </div>
      </div>
    `;

    const okBtn = overlay.querySelector("#confirm-modal-ok");
    const cancelBtn = overlay.querySelector("#confirm-modal-cancel");

    okBtn.onclick = () => {
      overlay.classList.remove("open");
      if (onConfirm) onConfirm();
    };

    cancelBtn.onclick = () => {
      overlay.classList.remove("open");
      if (onCancel) onCancel();
    };

    overlay.classList.add("open");
  }
};

// Global helper alias for cleaner access
window.showConfirmDialog = (title, message, onConfirm, onCancel) => {
  Auth.showConfirm(title, message, onConfirm, onCancel);
};

// Global function to adapt sidebar based on logged in user's role
window.adaptSidebarNavigation = function(user) {
  if (!user) return;
  const sidebar = document.getElementById("sidebar");
  if (!sidebar) return;

  // Render user profile details in sidebar dynamically
  const nameEl = document.getElementById("user-name");
  const roleEl = document.getElementById("user-role");
  const avatarEl = document.getElementById("user-avatar");
  
  if (nameEl) nameEl.textContent = user.name;
  if (roleEl) roleEl.textContent = user.role;
  if (avatarEl && user.avatar) avatarEl.src = user.avatar;

  if (user.role === "employee") {
    // 1. Re-route Dashboard link
    const dashLink = document.querySelector(".sidebar-menu-item a[href='dashboard.html']");
    if (dashLink) dashLink.setAttribute("href", "employee-dashboard.html");

    // 2. Hide Departments tab
    const deptMenuItem = document.getElementById("nav-departments");
    if (deptMenuItem) {
      deptMenuItem.style.display = "none";
    }

    // 3. Relabel Employees tab to Coworkers
    const empMenuItem = document.querySelector("#nav-employees span");
    if (empMenuItem) empMenuItem.textContent = "Coworkers";

    // 4. Relabel Payroll nav title to My Payslips
    const payrollNavTitle = document.getElementById("payroll-nav-title");
    if (payrollNavTitle) payrollNavTitle.textContent = "My Payslips";
  }
};

// Automatically run on load if DOM elements are ready and user is authenticated
document.addEventListener("DOMContentLoaded", () => {
  const user = DB.getCurrentUser();
  if (user) {
    window.adaptSidebarNavigation(user);
  }
});

