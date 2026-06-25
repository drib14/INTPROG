(function () {
  "use strict";

  // Utilities
  function escapeHtml(str) {
    if (str === null || str === undefined) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // Data Store

  const Store = {
    key: "ipt_demo_v1",
    state: {
      accounts: [],
      departments: [],
      employees: [],
      requests: [],
      stats: null,
    },
    listeners: [],

    init() {
      // Handled asynchronously via fetchData
    },

    subscribe(listener) {
      this.listeners.push(listener);
    },

    notify() {
      this.listeners.forEach((fn) => fn(this.state));
    },

    async fetchData() {
      const token = localStorage.getItem("auth_token");
      if (!token) return;

      const headers = { Authorization: `Bearer ${token}` };
      try {
        const reqRes = await fetch(`${API_URL}/requests`, { headers });
        if (reqRes.ok) this.state.requests = await reqRes.json();

        const statsRes = await fetch(`${API_URL}/stats`, { headers });
        if (statsRes.ok) this.state.stats = await statsRes.json();

        if (AuthService.currentUser && AuthService.currentUser.role === "admin") {
          const accRes = await fetch(`${API_URL}/accounts`, { headers });
          if (accRes.ok) this.state.accounts = await accRes.json();

          const deptRes = await fetch(`${API_URL}/departments`, { headers });
          if (deptRes.ok) this.state.departments = await deptRes.json();

          const empRes = await fetch(`${API_URL}/employees`, { headers });
          if (empRes.ok) this.state.employees = await empRes.json();
        }

        this.notify();
      } catch (err) {
        console.error("Fetch data error", err);
      }
    },

    getAccounts() { return this.state.accounts; },
    findAccountByEmail(email) { return this.state.accounts.find(a => a.email === email); },
    async addAccount(account) {
      const token = localStorage.getItem("auth_token");
      const res = await fetch(`${API_URL}/accounts`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(account)
      });
      if (!res.ok) {
          const data = await res.json();
          throw new Error(data.message || "Failed to add account");
      }
      await this.fetchData();
    },
    async updateAccount(email, account) {
      const token = localStorage.getItem("auth_token");
      const res = await fetch(`${API_URL}/accounts/${email}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(account)
      });
      if (!res.ok) {
          const data = await res.json();
          throw new Error(data.message || "Failed to update account");
      }
      await this.fetchData();
    },
    async deleteAccount(email) {
      const token = localStorage.getItem("auth_token");
      await fetch(`${API_URL}/accounts/${email}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      await this.fetchData();
    },

    getDepartments() { return this.state.departments; },
    async addDepartment(name, description) {
      const token = localStorage.getItem("auth_token");
      const res = await fetch(`${API_URL}/departments`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name, description })
      });
      if (!res.ok) {
          const data = await res.json();
          throw new Error(data.message || "Failed to add department");
      }
      await this.fetchData();
    },
    async updateDepartment(id, name, description) {
      const token = localStorage.getItem("auth_token");
      const res = await fetch(`${API_URL}/departments/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name, description })
      });
      if (!res.ok) {
          const data = await res.json();
          throw new Error(data.message || "Failed to update department");
      }
      await this.fetchData();
    },
    async deleteDepartment(id) {
      const token = localStorage.getItem("auth_token");
      await fetch(`${API_URL}/departments/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      await this.fetchData();
    },

    getEmployees() { return this.state.employees; },
    findEmployeeById(empId) { return this.state.employees.find(e => e.empId === empId); },
    async addEmployee(employee) {
      const token = localStorage.getItem("auth_token");
      const res = await fetch(`${API_URL}/employees`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(employee)
      });
      if (!res.ok) {
          const data = await res.json();
          throw new Error(data.message || "Failed to add employee");
      }
      await this.fetchData();
    },
    async updateEmployee(empId, employee) {
      const token = localStorage.getItem("auth_token");
      const res = await fetch(`${API_URL}/employees/${empId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(employee)
      });
      if (!res.ok) {
          const data = await res.json();
          throw new Error(data.message || "Failed to update employee");
      }
      await this.fetchData();
    },
    async deleteEmployee(empId) {
      const token = localStorage.getItem("auth_token");
      await fetch(`${API_URL}/employees/${empId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      await this.fetchData();
    },

    getRequests() { return this.state.requests; },
    async addRequest(request) {
      const token = localStorage.getItem("auth_token");
      const res = await fetch(`${API_URL}/requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(request)
      });
      if (!res.ok) {
          const data = await res.json();
          throw new Error(data.message || "Failed to add request");
      }
      await this.fetchData();
    },
    async updateRequestStatus(id, status) {
      const token = localStorage.getItem("auth_token");
      await fetch(`${API_URL}/requests/${id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status })
      });
      await this.fetchData();
    },
    async deleteRequest(id) {
      const token = localStorage.getItem("auth_token");
      await fetch(`${API_URL}/requests/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      await this.fetchData();
    }
  };


  // Authentication Service

  const AuthService = {
    currentUser: null,

    async checkSession() {
      const token = localStorage.getItem("auth_token");
      if (token) {
        try {
          const res = await fetch(`${API_URL}/me`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.ok) {
            const user = await res.json();
            this.setSession(user);
            await Store.fetchData();
          } else {
            this.logout();
          }
        } catch (e) {
          console.error(e);
          this.logout();
        }
      }
    },

    setSession(user) {
      this.currentUser = user;
      const isAuth = !!user;

      document.body.classList.toggle("authenticated", isAuth);
      document.body.classList.toggle("not-authenticated", !isAuth);
      document.body.classList.remove("is-admin");

      if (isAuth && user.role === "admin") {
        document.body.classList.add("is-admin");
      }

      const navUsername = document.getElementById("navUsername");
      if (navUsername) {
        navUsername.textContent = user ? user.firstName : "User";
      }

      const dashboardWelcomeMsg = document.getElementById(
        "dashboardWelcomeMsg",
      );
      if (dashboardWelcomeMsg) {
        dashboardWelcomeMsg.textContent = user
          ? `Welcome back, ${user.firstName}!`
          : "Welcome back!";
      }
    },

    async login(email, password) {
      try {
        const res = await fetch(`${API_URL}/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password })
        });
        const data = await res.json();

        if (res.ok) {
          localStorage.setItem("auth_token", data.token);
          this.setSession(data.user);
          await Store.fetchData();
          return { success: true };
        } else {
          if (res.status === 403 && data.unverified) {
             localStorage.setItem("unverified_email", email);
             return { success: false, unverified: true, message: data.message };
          }
          return { success: false, message: data.message || "Login failed" };
        }
      } catch (err) {
         return { success: false, message: "Network error" };
      }
    },

    logout() {
      localStorage.removeItem("auth_token");
      this.setSession(null);
    },
  };


  // Router
  const Router = {
    protected: ["/profile", "/requests"],
    admin: ["/accounts", "/employees", "/departments"],

    init() {
      window.addEventListener("hashchange", () => this.handleRoute());
      if (!location.hash) {
        location.hash = "#/";
      }
      this.handleRoute();
    },

    navigateTo(hash) {
      location.hash = hash;
    },

    getActiveRoute() {
      return (location.hash || "#/").replace("#", "");
    },

    handleRoute() {
      const hash = location.hash || "#/";
      const route = this.getActiveRoute();

      UI.hideAllForms();

      if (this.protected.includes(route) && !AuthService.currentUser) {
        this.navigateTo("#/login");
        UI.toast("Authentication required to access this resource.", "warning");
        return;
      }

      if (
        this.admin.includes(route) &&
        (!AuthService.currentUser || AuthService.currentUser.role !== "admin")
      ) {
        this.navigateTo("#/");
        UI.toast(
          "Access denied: Administrative privileges required.",
          "danger",
        );
        return;
      }

      document.querySelectorAll(".navbar-nav .nav-link").forEach((link) => {
        if (link.getAttribute("href") === hash) {
          link.classList.add("active");
        } else {
          link.classList.remove("active");
        }
      });

      UI.renderPage(route);
    },

    renderCurrentRoute() {
      UI.renderPage(this.getActiveRoute());
    },
  };

  // UI rendering
  const UI = {
    showModal(modalId) {
      const modal = document.getElementById(modalId);
      if (!modal) return;

      document.querySelectorAll(".modal.show").forEach((m) => {
        if (m.id !== modalId) this.hideModal(m.id);
      });

      modal.classList.add("show");
      modal.style.display = "block";
      modal.setAttribute("aria-modal", "true");
      modal.setAttribute("role", "dialog");
      modal.removeAttribute("aria-hidden");

      let backdrop = document.querySelector(".modal-backdrop");
      if (!backdrop) {
        backdrop = document.createElement("div");
        backdrop.className = "modal-backdrop fade show";
        document.body.appendChild(backdrop);

        backdrop.addEventListener("click", () => {
          this.hideModal(modalId);
        });
      }
    },

    hideModal(modalId) {
      const modal = document.getElementById(modalId);
      if (!modal) return;
      modal.classList.remove("show");
      modal.style.display = "none";
      modal.setAttribute("aria-hidden", "true");
      modal.removeAttribute("aria-modal");
      modal.removeAttribute("role");

      const backdrop = document.querySelector(".modal-backdrop");
      if (backdrop) {
        backdrop.remove();
      }
    },

    toast(message, type = "info") {
      const toastElement = document.getElementById("appToast");
      const toastMsgText = document.getElementById("toastMsgText");
      const toastIcon = document.getElementById("toastIcon");

      toastMsgText.textContent = message;
      toastElement.className =
        "toast align-items-center border-0 shadow text-white";

      if (type === "success") {
        toastElement.classList.add("bg-success");
        toastIcon.className = "fa-solid fa-circle-check me-2";
      } else if (type === "danger") {
        toastElement.classList.add("bg-danger");
        toastIcon.className = "fa-solid fa-circle-exclamation me-2";
      } else if (type === "warning") {
        toastElement.classList.add("bg-warning", "text-dark");
        toastIcon.className = "fa-solid fa-triangle-exclamation me-2 text-dark";
      } else {
        toastElement.classList.add("bg-primary");
        toastIcon.className = "fa-solid fa-circle-info me-2";
      }

      const toast = bootstrap.Toast.getOrCreateInstance(toastElement);
      toast.show();
    },

    hideAllForms() {
      document
        .querySelectorAll(".app-card-form")
        .forEach((card) => card.classList.add("d-none"));
    },

    renderPage(route) {
      document
        .querySelectorAll(".page")
        .forEach((p) => p.classList.remove("active"));

      const targetId = (route === "/" ? "home" : route.substring(1)) + "-page";
      const page = document.getElementById(targetId);
      if (page) {
        page.classList.add("active");
      }

      switch (route) {
        case "/":
          this.renderDashboard();
          break;
        case "/profile":
          this.renderProfile();
          break;
        case "/verify-email":
          this.renderVerifyEmail();
          break;
        case "/login":
          this.renderLoginInit();
          break;
        case "/employees":
          this.renderEmployees();
          break;
        case "/departments":
          this.renderDepartments();
          break;
        case "/accounts":
          this.renderAccounts();
          break;
        case "/requests":
          this.renderRequests();
          break;
      }
    },

    renderDashboard() {
      const user = AuthService.currentUser;
      if (!user) return;

      const statsGrid = document.getElementById("statsGrid");
      if (!statsGrid) return;
      statsGrid.innerHTML = "";

      const stats = Store.state.stats || {};

      if (user.role === "admin") {
        const accountsCount = stats.accountsCount || 0;
        const deptsCount = stats.deptsCount || 0;
        const empsCount = stats.empsCount || 0;
        const pendingReqsCount = stats.pendingReqsCount || 0;

        statsGrid.innerHTML = `
          <div class="col-md-6 col-lg-3">
            <div class="stat-card">
              <div class="stat-icon text-primary"><i class="fa-solid fa-address-card"></i></div>
              <div>
                <h6 class="text-muted small m-0 fw-semibold">Accounts</h6>
                <h3 class="fw-bold m-0 mt-1">${accountsCount}</h3>
              </div>
            </div>
          </div>
          <div class="col-md-6 col-lg-3">
            <div class="stat-card">
              <div class="stat-icon text-success"><i class="fa-solid fa-sitemap"></i></div>
              <div>
                <h6 class="text-muted small m-0 fw-semibold">Departments</h6>
                <h3 class="fw-bold m-0 mt-1">${deptsCount}</h3>
              </div>
            </div>
          </div>
          <div class="col-md-6 col-lg-3">
            <div class="stat-card">
              <div class="stat-icon text-warning"><i class="fa-solid fa-users"></i></div>
              <div>
                <h6 class="text-muted small m-0 fw-semibold">Employees</h6>
                <h3 class="fw-bold m-0 mt-1">${empsCount}</h3>
              </div>
            </div>
          </div>
          <div class="col-md-6 col-lg-3">
            <div class="stat-card">
              <div class="stat-icon text-danger"><i class="fa-solid fa-file-invoice"></i></div>
              <div>
                <h6 class="text-muted small m-0 fw-semibold">Pending Requests</h6>
                <h3 class="fw-bold m-0 mt-1">${pendingReqsCount}</h3>
              </div>
            </div>
          </div>
        `;
      } else {
        const totalRequests = stats.totalRequests || 0;
        const pendingCount = stats.pendingCount || 0;
        const approvedCount = stats.approvedCount || 0;

        statsGrid.innerHTML = `
          <div class="col-md-6 col-lg-4">
            <div class="stat-card">
              <div class="stat-icon text-primary"><i class="fa-solid fa-file-invoice"></i></div>
              <div>
                <h6 class="text-muted small m-0 fw-semibold">My Requests</h6>
                <h3 class="fw-bold m-0 mt-1">${totalRequests}</h3>
              </div>
            </div>
          </div>
          <div class="col-md-6 col-lg-4">
            <div class="stat-card">
              <div class="stat-icon text-warning"><i class="fa-solid fa-clock"></i></div>
              <div>
                <h6 class="text-muted small m-0 fw-semibold">Pending Requests</h6>
                <h3 class="fw-bold m-0 mt-1">${pendingCount}</h3>
              </div>
            </div>
          </div>
          <div class="col-md-6 col-lg-4">
            <div class="stat-card">
              <div class="stat-icon text-success"><i class="fa-solid fa-circle-check"></i></div>
              <div>
                <h6 class="text-muted small m-0 fw-semibold">Approved Requests</h6>
                <h3 class="fw-bold m-0 mt-1">${approvedCount}</h3>
              </div>
            </div>
          </div>
        `;
      }
    },

    renderProfile() {
      const user = AuthService.currentUser;
      if (!user) return;

      const container = document.getElementById("profileContainer");
      if (!container) return;

      container.innerHTML = `
        <div class="profile-card p-4 bg-white border">
          <h4 class="fw-bold mb-3">
            <span>${escapeHtml(user.firstName)} ${escapeHtml(user.lastName)}</span>
          </h4>
          <p class="m-0 mb-2"><strong>Email Address:</strong> ${escapeHtml(user.email)}</p>
          <p class="m-0 mb-4"><strong>System Role:</strong> <span class="badge bg-secondary text-uppercase">${escapeHtml(user.role)}</span></p>
          <button class="btn btn-outline-primary fw-semibold px-4" id="openEditProfileBtn">
            Edit Profile
          </button>
        </div>
      `;

      document
        .getElementById("openEditProfileBtn")
        .addEventListener("click", () => {
          document.getElementById("editFirstName").value = user.firstName;
          document.getElementById("editLastName").value = user.lastName;
          document
            .getElementById("editProfileForm")
            .classList.remove("was-validated");
          UI.showModal("editProfileModal");
        });
    },

    renderVerifyEmail() {
      const email =
        localStorage.getItem("unverified_email") || "your-email@example.com";
      const el = document.getElementById("verifyEmailPlaceholder");
      if (el) el.textContent = email;
    },

    renderLoginInit() {
      document.getElementById("loginForm").reset();
      document.getElementById("loginForm").classList.remove("was-validated");
      const verifiedAlert = document.getElementById("loginVerifiedAlert");
      if (localStorage.getItem("verified_success_flash") === "true") {
        verifiedAlert.classList.remove("d-none");
        verifiedAlert.classList.add("d-flex");
        localStorage.removeItem("verified_success_flash");
      } else {
        verifiedAlert.classList.add("d-none");
        verifiedAlert.classList.remove("d-flex");
      }
    },

    renderEmployees() {
      const container = document.getElementById("employeesContainer");
      if (!container) return;
      const emps = Store.getEmployees();

      this.populateEmployeeSelectors();

      if (emps.length === 0) {
        container.innerHTML = `
          <div class="table-custom-container">
            <table class="table-custom">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Position</th>
                  <th>Department</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr class="empty-row">
                  <td colspan="5">No employees.</td>
                </tr>
              </tbody>
            </table>
          </div>
        `;
        return;
      }

      let rows = "";
      emps.forEach((emp) => {
        let fullName = `${emp.firstName || ""} ${emp.lastName || ""}`.trim();
        if (!fullName) {
          const user = Store.findAccountByEmail(emp.email);
          fullName = user
            ? `${user.firstName} ${user.lastName}`
            : "Unlinked Account";
        }
        rows += `
          <tr>
            <td class="fw-semibold">${escapeHtml(emp.empId)}</td>
            <td>${escapeHtml(fullName)}</td>
            <td>${escapeHtml(emp.position)}</td>
            <td>${escapeHtml(emp.department)}</td>
            <td>
              <div class="table-actions">
                <button class="btn-outline-blue edit-emp-btn" data-id="${escapeHtml(emp.empId)}">Edit</button>
                <button class="btn-outline-red delete-emp-btn" data-id="${escapeHtml(emp.empId)}">Delete</button>
              </div>
            </td>
          </tr>
        `;
      });

      container.innerHTML = `
        <div class="table-custom-container">
          <table class="table-custom">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Position</th>
                <th>Department</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
        </div>
      `;
    },

    populateEmployeeSelectors() {
      const emailSelect = document.getElementById("empEmailSelect");
      const deptSelect = document.getElementById("empDeptSelect");

      if (emailSelect) {
        emailSelect.innerHTML = `<option value="" disabled selected>Select user email...</option>`;
        Store.getAccounts().forEach((acc) => {
          emailSelect.innerHTML += `<option value="${escapeHtml(acc.email)}">${escapeHtml(acc.email)}</option>`;
        });
      }

      if (deptSelect) {
        deptSelect.innerHTML = `<option value="" disabled selected>Select department...</option>`;
        Store.getDepartments().forEach((dept) => {
          deptSelect.innerHTML += `<option value="${escapeHtml(dept.name)}">${escapeHtml(dept.name)}</option>`;
        });
      }
    },

    renderDepartments() {
      const container = document.getElementById("departmentsContainer");
      if (!container) return;
      const depts = Store.getDepartments();

      if (depts.length === 0) {
        container.innerHTML = `
          <div class="table-custom-container">
            <table class="table-custom">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Description</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr class="empty-row">
                  <td colspan="3">No departments.</td>
                </tr>
              </tbody>
            </table>
          </div>
        `;
        return;
      }

      let rows = "";
      depts.forEach((dept) => {
        rows += `
          <tr>
            <td class="fw-semibold">${escapeHtml(dept.name)}</td>
            <td>${escapeHtml(dept.description || "N/A")}</td>
            <td>
              <div class="table-actions">
                <button class="btn-outline-blue edit-dept-btn" data-id="${dept.id}">Edit</button>
                <button class="btn-outline-red delete-dept-btn" data-id="${dept.id}">Delete</button>
              </div>
            </td>
          </tr>
        `;
      });

      container.innerHTML = `
        <div class="table-custom-container">
          <table class="table-custom">
            <thead>
              <tr>
                <th>Department Name</th>
                <th>Description</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
        </div>
      `;
    },

    renderAccounts() {
      const container = document.getElementById("accountsContainer");
      if (!container) return;
      const accounts = Store.getAccounts();

      if (accounts.length === 0) {
        container.innerHTML = `
          <div class="table-custom-container">
            <table class="table-custom">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Verified</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr class="empty-row">
                  <td colspan="5">No accounts.</td>
                </tr>
              </tbody>
            </table>
          </div>
        `;
        return;
      }

      let rows = "";
      accounts.forEach((acc, index) => {
        const verifiedCheckbox = acc.verified
          ? `<input type="checkbox" class="form-check-input" checked disabled style="cursor: default;" />`
          : `<input type="checkbox" class="form-check-input" disabled style="cursor: default;" />`;

        const roleText = acc.role === "admin" ? "Admin" : "User";

        rows += `
          <tr>
            <td class="fw-semibold">${escapeHtml(acc.firstName)} ${escapeHtml(acc.lastName)}</td>
            <td>${escapeHtml(acc.email)}</td>
            <td>${roleText}</td>
            <td>${verifiedCheckbox}</td>
            <td>
              <div class="table-actions">
                <button class="btn-outline-blue edit-acc-btn" data-index="${index}">Edit</button>
                <button class="btn-outline-yellow reset-pw-btn" data-email="${escapeHtml(acc.email)}">Reset Password</button>
                <button class="btn-outline-red delete-acc-btn" data-email="${escapeHtml(acc.email)}">Delete</button>
              </div>
            </td>
          </tr>
        `;
      });

      container.innerHTML = `
        <div class="table-custom-container">
          <table class="table-custom">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Verified</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
        </div>
      `;
    },

    renderRequests() {
      const container = document.getElementById("requestsContainer");
      if (!container) return;

      const titleEl = document.getElementById("requestsTitle");
      const toggleBtn = document.getElementById("toggleAddRequestFormBtn");

      const isAdmin = AuthService.currentUser.role === "admin";
      let requests = [];

      if (isAdmin) {
        if (titleEl) titleEl.textContent = "All Requests";
        if (toggleBtn) toggleBtn.classList.add("d-none");
        requests = Store.getRequests();
      } else {
        if (titleEl) titleEl.textContent = "My Requests";
        if (toggleBtn) toggleBtn.classList.remove("d-none");
        requests = Store.getRequests().filter(
          (r) => r.employeeEmail === AuthService.currentUser.email,
        );
      }

      if (requests.length === 0) {
        container.innerHTML = `
          <div class="py-3">
            <p class="text-muted mb-3">You have no requests yet.</p>
          </div>
        `;
        return;
      }

      requests.sort((a, b) => b.id - a.id);

      let rows = "";
      requests.forEach((req) => {
        let itemsStr = "";
        req.items.forEach((item) => {
          itemsStr += `• ${escapeHtml(item.name)} (x${item.qty})<br/>`;
        });

        let badge = `<span class="badge badge-status badge-pending">Pending</span>`;
        if (req.status === "Approved")
          badge = `<span class="badge badge-status badge-approved">Approved</span>`;
        if (req.status === "Rejected")
          badge = `<span class="badge badge-status badge-rejected">Rejected</span>`;

        let actions = "";
        if (isAdmin) {
          if (req.status === "Pending") {
            actions = `
              <button class="btn-outline-green approve-req-btn me-1" data-id="${req.id}">
                Approve
              </button>
              <button class="btn-outline-red reject-req-btn" data-id="${req.id}">
                Reject
              </button>
            `;
          } else {
            actions = `<span class="text-muted small fw-medium">Evaluated</span>`;
          }
        } else {
          if (req.status === "Pending") {
            actions = `
              <button class="btn-outline-red cancel-req-btn" data-id="${req.id}">
                Cancel
              </button>
            `;
          } else {
            actions = `<span class="text-muted small">-</span>`;
          }
        }

        rows += `
          <tr>
            <td>${escapeHtml(req.date)}</td>
            <td>${escapeHtml(req.employeeEmail)}</td>
            <td>${escapeHtml(req.type)}</td>
            <td>${itemsStr}</td>
            <td>${badge}</td>
            <td>${actions}</td>
          </tr>
        `;
      });

      container.innerHTML = `
        <div class="table-custom-container">
          <table class="table-custom">
            <thead>
              <tr>
                <th>Date</th>
                <th>Employee</th>
                <th>Category</th>
                <th>Checklist Items</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
        </div>
      `;
    },
  };

  // Helpers
  function addRequestItemRow(name = "", qty = 1, isFirst = false) {
    const container = document.getElementById("requestItemsContainer");
    if (!container) return;

    const rowDiv = document.createElement("div");
    rowDiv.className =
      "row g-2 item-row align-items-center animate-row-entry mt-2";

    let actionButtonHtml = "";
    if (isFirst) {
      actionButtonHtml = `
        <button type="button" class="btn btn-outline-secondary add-item-row-btn w-100 d-flex align-items-center justify-content-center" style="height: 38px; border-color: #cbd5e1; color: #64748b;" title="Add Line Item">
          <i class="fa-solid fa-plus"></i>
        </button>
      `;
    } else {
      actionButtonHtml = `
        <button type="button" class="btn btn-outline-danger remove-item-btn w-100 d-flex align-items-center justify-content-center" style="height: 38px; border-color: #fecaca; color: #ef4444;" title="Remove Line Item">
          <i class="fa-solid fa-trash-can"></i>
        </button>
      `;
    }

    rowDiv.innerHTML = `
      <div class="col-8 col-sm-9">
        <input type="text" class="form-control item-name" placeholder="Item name" value="${escapeHtml(name)}" required style="height: 38px; font-size: 0.875rem;" />
        <div class="invalid-feedback">Item name is required.</div>
      </div>
      <div class="col-3 col-sm-2">
        <input type="number" class="form-control item-qty text-center" min="1" value="${qty}" required style="height: 38px; font-size: 0.875rem;" />
        <div class="invalid-feedback">Qty &gt;= 1</div>
      </div>
      <div class="col-1 text-end">
        ${actionButtonHtml}
      </div>
    `;
    container.appendChild(rowDiv);
  }

  function populateDefaultItemsForType(type) {
    const container = document.getElementById("requestItemsContainer");
    if (!container) return;
    container.innerHTML = "";

    if (type === "Equipment") {
      addRequestItemRow("Laptop", 1, true);
      addRequestItemRow("Monitor", 1, false);
      addRequestItemRow("Keyboard", 1, false);
      addRequestItemRow("Mouse", 1, false);
    } else if (type === "Leave") {
      addRequestItemRow("Vacation Leave", 1, true);
      addRequestItemRow("Sick Leave", 1, false);
      addRequestItemRow("Emergency Leave", 1, false);
    } else if (type === "Resources") {
      addRequestItemRow("Cloud Sandbox Access", 1, true);
      addRequestItemRow("Database Credentials", 1, false);
      addRequestItemRow("API Token Access", 1, false);
    } else {
      addRequestItemRow("", 1, true);
    }
  }

  function resetNewRequestForm() {
    const form = document.getElementById("newRequestForm");
    if (form) {
      form.reset();
      form.classList.remove("was-validated");
    }

    const reqType = document.getElementById("reqType");
    if (reqType) {
      reqType.value = "Equipment";
    }

    const validationMsg = document.getElementById("reqItemsValidationMsg");
    if (validationMsg) {
      validationMsg.classList.add("d-none");
    }

    populateDefaultItemsForType("Equipment");
  }

  // Application Controller
  const App = {
    async init() {
      await AuthService.checkSession();
      Router.init();

      Store.subscribe(() => {
        Router.renderCurrentRoute();
      });

      this.registerEvents();
      this.initEventDelegation();
    },

    registerEvents() {
      document.getElementById("logoutBtn").addEventListener("click", () => {
        AuthService.logout();
        Router.navigateTo("#/");
        UI.toast("Logged out. Session terminated.", "info");
      });

      const quickLogin = document.getElementById("quickLoginAdminBtn");
      if (quickLogin) {
        quickLogin.addEventListener("click", (e) => {
          e.preventDefault();
          document.getElementById("loginEmail").value = "admin@example.com";
          document.getElementById("loginPassword").value = "Password123!";
          UI.toast("Admin credentials auto-filled.", "success");
        });
      }

      // Inline Form Toggles
      this.bindFormToggle(
        "toggleAddEmployeeFormBtn",
        "cancelEmployeeFormBtn",
        "employeeFormCard",
        () => {
          const form = document.getElementById("addEmployeeForm");
          form.reset();
          form.classList.remove("was-validated");
          document.getElementById("editEmpIdOriginal").value = "";
          document.getElementById("empEmailSelect").disabled = false;
          document.getElementById("employeeFormTitle").textContent =
            "Add Employee";
        },
      );

      this.bindFormToggle(
        "toggleAddDeptFormBtn",
        "cancelDeptFormBtn",
        "deptFormCard",
        () => {
          const form = document.getElementById("addDepartmentForm");
          form.reset();
          form.classList.remove("was-validated");
          document.getElementById("editDeptIdOriginal").value = "";
          document.getElementById("deptFormTitle").textContent =
            "Add Department";
        },
      );

      this.bindFormToggle(
        "toggleAddAccountFormBtn",
        "cancelAccountFormBtn",
        "accountFormCard",
        () => {
          const form = document.getElementById("addAccountForm");
          form.reset();
          form.classList.remove("was-validated");
          document.getElementById("editAccIndex").value = "";
          document
            .getElementById("addAccEmailGroup")
            .classList.remove("d-none");
          document
            .getElementById("addAccPasswordGroup")
            .classList.remove("d-none");
          document.getElementById("accountFormTitle").textContent =
            "Add Account";
        },
      );

      const toggleAddRequestBtn = document.getElementById(
        "toggleAddRequestFormBtn",
      );
      if (toggleAddRequestBtn) {
        toggleAddRequestBtn.addEventListener("click", () => {
          resetNewRequestForm();
          UI.showModal("newRequestModal");
        });
      }

      const reqTypeSelect = document.getElementById("reqType");
      if (reqTypeSelect) {
        reqTypeSelect.addEventListener("change", (e) => {
          populateDefaultItemsForType(e.target.value);
        });
      }

      const empEmailSelect = document.getElementById("empEmailSelect");
      if (empEmailSelect) {
        empEmailSelect.addEventListener("change", (e) => {
          const email = e.target.value;
          const acc = Store.findAccountByEmail(email);
          if (acc) {
            document.getElementById("empFirstName").value = acc.firstName || "";
            document.getElementById("empLastName").value = acc.lastName || "";
          } else {
            document.getElementById("empFirstName").value = "";
            document.getElementById("empLastName").value = "";
          }
        });
      }

      // Form submissions handlers
      this.bindSubmit("registerForm", (e) => this.handleRegister(e));
      this.bindSubmit("loginForm", (e) => this.handleLogin(e));
      this.bindSubmit("editProfileForm", (e) => this.handleEditProfile(e));
      this.bindSubmit("resetPasswordForm", (e) => this.handleResetPassword(e));
      this.bindSubmit("addAccountForm", (e) => this.handleSaveAccount(e));
      this.bindSubmit("addDepartmentForm", (e) => this.handleSaveDepartment(e));
      this.bindSubmit("addEmployeeForm", (e) => this.handleSaveEmployee(e));
      this.bindSubmit("newRequestForm", (e) => this.handleSaveRequest(e));

      // Simulate email verification
      const verifyBtn = document.getElementById("verifyEmailBtn");
      if (verifyBtn) {
        verifyBtn.addEventListener("click", async () => {
          const email = localStorage.getItem("unverified_email");
          if (!email) {
            UI.toast("No pending verification detected.", "danger");
            return;
          }
          try {
            const res = await fetch(`${API_URL}/verify`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ email })
            });
            if (res.ok) {
              localStorage.removeItem("unverified_email");
              localStorage.setItem("verified_success_flash", "true");
              UI.toast("Verification simulated. Account is now active.", "success");
              Router.navigateTo("#/login");
            } else {
              UI.toast("Verification failed.", "danger");
            }
          } catch (err) {
             UI.toast("Network error.", "danger");
          }
        });
      }

      // Close modals
      document.querySelectorAll('[data-bs-dismiss="modal"]').forEach((btn) => {
        btn.addEventListener("click", (e) => {
          const modal = e.target.closest(".modal");
          if (modal) {
            UI.hideModal(modal.id);
          }
        });
      });

      // Request checklist events
      const requestItemsContainer = document.getElementById(
        "requestItemsContainer",
      );
      if (requestItemsContainer) {
        requestItemsContainer.addEventListener("click", (e) => {
          if (e.target.closest(".add-item-row-btn")) {
            addRequestItemRow("", 1, false);
          } else if (e.target.closest(".remove-item-btn")) {
            const rows = document.querySelectorAll(".item-row");
            if (rows.length > 1) {
              e.target.closest(".item-row").remove();
            } else {
              UI.toast(
                "Your request checklist must contain at least 1 item entry.",
                "warning",
              );
            }
          }
        });
      }
    },

    // Table actions (edit/delete)
    initEventDelegation() {
      const empContainer = document.getElementById("employeesContainer");
      if (empContainer) {
        empContainer.addEventListener("click", (e) => {
          const editBtn = e.target.closest(".edit-emp-btn");
          const deleteBtn = e.target.closest(".delete-emp-btn");

          if (editBtn) {
            const empId = editBtn.getAttribute("data-id");
            const emp = Store.findEmployeeById(empId);
            if (emp) {
              document
                .getElementById("addEmployeeForm")
                .classList.remove("was-validated");
              document.getElementById("editEmpIdOriginal").value = emp.empId;
              document.getElementById("empFirstName").value =
                emp.firstName || "";
              document.getElementById("empLastName").value = emp.lastName || "";
              document.getElementById("empEmailSelect").value = emp.email;
              document.getElementById("empEmailSelect").disabled = true;
              document.getElementById("empPosition").value = emp.position;
              document.getElementById("empDeptSelect").value = emp.department;
              document.getElementById("empHireDate").value = emp.hireDate;

              document.getElementById("employeeFormTitle").textContent =
                "Edit Employee Details";
              const card = document.getElementById("employeeFormCard");
              card.classList.remove("d-none");
              card.scrollIntoView({ behavior: "smooth" });
            }
          }

          if (deleteBtn) {
            const empId = deleteBtn.getAttribute("data-id");
            if (
              confirm(`Are you sure you want to delete Employee: ${empId}?`)
            ) {
              Store.deleteEmployee(empId).then(() => {
                UI.toast("Employee record deleted.", "success");
              });
            }
          }
        });
      }

      const deptContainer = document.getElementById("departmentsContainer");
      if (deptContainer) {
        deptContainer.addEventListener("click", (e) => {
          const editBtn = e.target.closest(".edit-dept-btn");
          const deleteBtn = e.target.closest(".delete-dept-btn");

          if (editBtn) {
            const id = parseInt(editBtn.getAttribute("data-id"));
            const dept = Store.getDepartments().find((d) => d.id === id);
            if (dept) {
              document
                .getElementById("addDepartmentForm")
                .classList.remove("was-validated");
              document.getElementById("editDeptIdOriginal").value = dept.id;
              document.getElementById("deptName").value = dept.name;
              document.getElementById("deptDesc").value = dept.description;

              document.getElementById("deptFormTitle").textContent =
                "Edit Department Details";
              const card = document.getElementById("deptFormCard");
              card.classList.remove("d-none");
              card.scrollIntoView({ behavior: "smooth" });
            }
          }

          if (deleteBtn) {
            const id = parseInt(deleteBtn.getAttribute("data-id"));
            if (
              confirm("Delete department and un-assign associated properties?")
            ) {
              Store.deleteDepartment(id).then(() => {
                UI.toast("Department record deleted.", "success");
              });
            }
          }
        });
      }

      const accContainer = document.getElementById("accountsContainer");
      if (accContainer) {
        accContainer.addEventListener("click", (e) => {
          const editBtn = e.target.closest(".edit-acc-btn");
          const resetBtn = e.target.closest(".reset-pw-btn");
          const deleteBtn = e.target.closest(".delete-acc-btn");

          if (editBtn) {
            const idx = parseInt(editBtn.getAttribute("data-index"));
            const acc = Store.getAccounts()[idx];
            if (acc) {
              document
                .getElementById("addAccountForm")
                .classList.remove("was-validated");
              document.getElementById("editAccIndex").value = idx;
              document.getElementById("addAccFirstName").value = acc.firstName;
              document.getElementById("addAccLastName").value = acc.lastName;
              document.getElementById("addAccRole").value = acc.role;
              document.getElementById("addAccVerified").checked = acc.verified;

              document
                .getElementById("addAccEmailGroup")
                .classList.add("d-none");
              document
                .getElementById("addAccPasswordGroup")
                .classList.add("d-none");

              document.getElementById("accountFormTitle").textContent =
                "Edit Account Credentials";
              const card = document.getElementById("accountFormCard");
              card.classList.remove("d-none");
              card.scrollIntoView({ behavior: "smooth" });
            }
          }

          if (resetBtn) {
            const email = resetBtn.getAttribute("data-email");
            document
              .getElementById("resetPasswordForm")
              .classList.remove("was-validated");
            document.getElementById("resetPasswordEmail").value = email;
            document.getElementById("newPasswordInput").value = "";
            UI.showModal("resetPasswordModal");
          }

          if (deleteBtn) {
            const email = deleteBtn.getAttribute("data-email");
            if (email === AuthService.currentUser.email) {
              UI.toast(
                "You cannot delete your own logged-in account.",
                "danger",
              );
              return;
            }
            if (
              confirm(
                `Permanently remove user account: ${email}? (This will also wipe their linked employee profile)`,
              )
            ) {
              Store.deleteAccount(email).then(() => {
                UI.toast("Account deleted successfully.", "success");
              });
            }
          }
        });
      }

      const reqContainer = document.getElementById("requestsContainer");
      if (reqContainer) {
        reqContainer.addEventListener("click", (e) => {
          const approveBtn = e.target.closest(".approve-req-btn");
          const rejectBtn = e.target.closest(".reject-req-btn");
          const cancelBtn = e.target.closest(".cancel-req-btn");

          if (approveBtn) {
            const id = parseInt(approveBtn.getAttribute("data-id"));
            const req = Store.getRequests().find((r) => r.id === id);
            if (req) {
              Store.updateRequestStatus(id, "Approved").then(() => {
                UI.toast("Request Approved.", "success");
              });
            }
          }

          if (rejectBtn) {
            const id = parseInt(rejectBtn.getAttribute("data-id"));
            const req = Store.getRequests().find((r) => r.id === id);
            if (req) {
              Store.updateRequestStatus(id, "Rejected").then(() => {
                UI.toast("Request Rejected.", "danger");
              });
            }
          }

          if (cancelBtn) {
            const id = parseInt(cancelBtn.getAttribute("data-id"));
            if (confirm("Cancel and delete this request entry?")) {
              Store.deleteRequest(id).then(() => {
                UI.toast("Request cancelled.", "info");
              });
            }
          }
        });
      }
    },

    bindFormToggle(openId, closeId, cardId, onOpen = null) {
      const openBtn = document.getElementById(openId);
      const closeBtn = document.getElementById(closeId);
      const card = document.getElementById(cardId);

      if (openBtn) {
        openBtn.addEventListener("click", () => {
          if (onOpen) onOpen();
          card.classList.remove("d-none");
          card.scrollIntoView({ behavior: "smooth" });
        });
      }
      if (closeBtn) {
        closeBtn.addEventListener("click", () => {
          card.classList.add("d-none");
        });
      }
    },

    bindSubmit(formId, handler) {
      const form = document.getElementById(formId);
      if (!form) return;

      form.addEventListener("submit", (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (!form.checkValidity()) {
          form.classList.add("was-validated");
          UI.toast("Please check form inputs for errors.", "danger");
          return;
        }

        form.classList.remove("was-validated");
        handler(e);
      });
    },


    async handleRegister(e) {
      const firstName = document.getElementById("regFirstName").value.trim();
      const lastName = document.getElementById("regLastName").value.trim();
      const email = document
        .getElementById("regEmail")
        .value.trim()
        .toLowerCase();
      const password = document.getElementById("regPassword").value;

      try {
        const res = await fetch(`${API_URL}/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ firstName, lastName, email, password })
        });
        const data = await res.json();

        if (res.ok) {
          localStorage.setItem("unverified_email", email);
          UI.toast("Registration complete. Please simulate email verification.", "success");
          Router.navigateTo("#/verify-email");
        } else {
          UI.toast(data.message || "Registration failed", "danger");
        }
      } catch (err) {
        UI.toast("Network error", "danger");
      }
    },

    async handleLogin(e) {
      const email = document
        .getElementById("loginEmail")
        .value.trim()
        .toLowerCase();
      const password = document.getElementById("loginPassword").value;

      const res = await AuthService.login(email, password);
      if (res.success) {
        Router.navigateTo("#/profile");
        UI.toast("Logged in successfully.", "success");
      } else if (res.unverified) {
        UI.toast(res.message, "warning");
        Router.navigateTo("#/verify-email");
      } else {
        UI.toast(res.message, "danger");
      }
    },

    async handleEditProfile(e) {
      const fName = document.getElementById("editFirstName").value.trim();
      const lName = document.getElementById("editLastName").value.trim();

      const token = localStorage.getItem("auth_token");
      try {
        const res = await fetch(`${API_URL}/profile`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ firstName: fName, lastName: lName })
        });
        if (res.ok) {
          const user = AuthService.currentUser;
          user.firstName = fName;
          user.lastName = lName;
          AuthService.setSession(user);
          await Store.fetchData();
          UI.hideModal("editProfileModal");
          UI.toast("Profile info updated.", "success");
        } else {
          UI.toast("Failed to update profile", "danger");
        }
      } catch (err) {
        UI.toast("Network error", "danger");
      }
    },

    async handleResetPassword(e) {
      const email = document.getElementById("resetPasswordEmail").value;
      const pwd = document.getElementById("newPasswordInput").value;

      try {
        const res = await fetch(`${API_URL}/reset-password`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password: pwd })
        });
        if (res.ok) {
          UI.hideModal("resetPasswordModal");
          UI.toast(`Password successfully reset for account: ${email}`, "success");
        } else {
          const data = await res.json();
          UI.toast(data.message || "Reset failed", "danger");
        }
      } catch (err) {
        UI.toast("Network error", "danger");
      }
    },

    async handleSaveAccount(e) {
      const indexStr = document.getElementById("editAccIndex").value;
      const firstName = document.getElementById("addAccFirstName").value.trim();
      const lastName = document.getElementById("addAccLastName").value.trim();
      const role = document.getElementById("addAccRole").value;
      const verified = document.getElementById("addAccVerified").checked;

      if (indexStr === "") {
        const email = document
          .getElementById("addAccEmail")
          .value.trim()
          .toLowerCase();
        const password = document.getElementById("addAccPassword").value;

        try {
          await Store.addAccount({ firstName, lastName, email, password, role, verified });
          UI.toast("Account created successfully.", "success");
        } catch (err) {
          UI.toast(err.message || "Error creating account.", "danger");
        }
      } else {
        const idx = parseInt(indexStr);
        const acc = Store.getAccounts()[idx];
        if (acc) {
          if (acc.email === AuthService.currentUser.email) {
            if (role !== "admin" && AuthService.currentUser.role === "admin") {
              UI.toast("Error: You cannot strip yourself of Administrative privileges.", "danger");
              return;
            }
            if (!verified) {
              UI.toast("Error: You cannot set yourself to unverified.", "danger");
              return;
            }
          }

          try {
            await Store.updateAccount(acc.email, { firstName, lastName, role, verified });
            UI.toast("Account updated successfully.", "success");
            if (acc.email === AuthService.currentUser.email) {
               AuthService.currentUser.firstName = firstName;
               AuthService.currentUser.lastName = lastName;
               AuthService.setSession(AuthService.currentUser);
            }
          } catch (err) {
            UI.toast(err.message || "Error updating account.", "danger");
          }
        }
      }

      document.getElementById("accountFormCard").classList.add("d-none");
    },

    async handleSaveDepartment(e) {
      const editIdStr = document.getElementById("editDeptIdOriginal").value;
      const name = document.getElementById("deptName").value.trim();
      const desc = document.getElementById("deptDesc").value.trim();

      try {
        if (editIdStr === "") {
          await Store.addDepartment(name, desc);
          UI.toast("Department registered successfully.", "success");
        } else {
          const id = parseInt(editIdStr);
          await Store.updateDepartment(id, name, desc);
          UI.toast("Department updated successfully.", "success");
        }
        document.getElementById("deptFormCard").classList.add("d-none");
      } catch (err) {
        UI.toast(err.message || "Error saving department.", "danger");
      }
    },

    async handleSaveEmployee(e) {
      const editIdOrig = document.getElementById("editEmpIdOriginal").value;
      const firstName = document.getElementById("empFirstName").value.trim();
      const lastName = document.getElementById("empLastName").value.trim();
      const email = document.getElementById("empEmailSelect").value;
      const position = document.getElementById("empPosition").value.trim();
      const department = document.getElementById("empDeptSelect").value;
      const hireDate = document.getElementById("empHireDate").value;

      try {
        if (editIdOrig === "") {
          let empId = String(Math.floor(100000 + Math.random() * 900000));
          await Store.addEmployee({ empId, email, firstName, lastName, position, department, hireDate });
          UI.toast("Employee record registered successfully.", "success");
        } else {
          await Store.updateEmployee(editIdOrig, { firstName, lastName, position, department, hireDate });
          UI.toast("Employee record updated successfully.", "success");
        }
        document.getElementById("employeeFormCard").classList.add("d-none");
      } catch (err) {
        UI.toast(err.message || "Error saving employee.", "danger");
      }
    },

    async handleSaveRequest(e) {
      const type = document.getElementById("reqType").value;
      const rows = document.querySelectorAll(".item-row");
      const items = [];
      let valid = true;

      rows.forEach((row) => {
        const nameInput = row.querySelector(".item-name");
        const qtyInput = row.querySelector(".item-qty");
        const name = nameInput.value.trim();
        const qty = parseInt(qtyInput.value);

        if (!name || isNaN(qty) || qty < 1) {
          valid = false;
          nameInput.classList.add("is-invalid");
          qtyInput.classList.add("is-invalid");
        } else {
          nameInput.classList.remove("is-invalid");
          qtyInput.classList.remove("is-invalid");
          items.push({ name, qty });
        }
      });

      const validationMsg = document.getElementById("reqItemsValidationMsg");
      if (items.length === 0 || !valid) {
        validationMsg.classList.remove("d-none");
        UI.toast(
          "Validation failed: checklist item invalid or empty.",
          "danger",
        );
        return;
      }
      validationMsg.classList.add("d-none");

      try {
        await Store.addRequest({ type, items, status: "Pending", date: new Date().toISOString().split("T")[0] });
        UI.hideModal("newRequestModal");
        resetNewRequestForm();
        UI.toast("Hardware request submitted successfully.", "success");
      } catch (err) {
        UI.toast(err.message || "Error saving request.", "danger");
      }
    },
  };

  // Bootstrap application
  document.addEventListener("DOMContentLoaded", () => {
    App.init();
  });
})();
