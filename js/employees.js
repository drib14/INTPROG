/**
 * Employees Management View Driver
 * Integrates table rendering, sorting, pagination, filtering, and modal CRUD operations
 * Updated to support Philippine Peso (₱), expanded profiling inputs, and view profile details.
 */

// Filter state
let state = {
  searchQuery: "",
  filterDept: "all",
  filterStatus: "all",
  sortBy: "name",
  sortOrder: "asc",
  currentPage: 1,
  pageSize: 5
};

// Global delete reference
let employeeToDeleteId = null;

document.addEventListener("DOMContentLoaded", () => {
  // Session protection guard
  const user = Auth.requireAuth();
  if (!user) return;

  // Render sidebar profile details
  document.getElementById("user-name").textContent = user.name;
  document.getElementById("user-role").textContent = user.role;
  if (user.avatar) {
    document.getElementById("user-avatar").src = user.avatar;
  }

  // Handle Multi-Role layout segregation for Employee list view
  if (user.role === "employee") {
    // Hide Add Employee button
    const addBtn = document.querySelector(".filter-bar button.btn-primary");
    if (addBtn) addBtn.style.display = "none";
  }

  // Populate dynamic elements
  populateDepartmentDropdowns();
  
  // Render table rows
  renderEmployeesTable();
});

// Load department lists into filter dropdown & form select dropdown
function populateDepartmentDropdowns() {
  const departments = DB.getDepartments();
  const filterDeptSelect = document.getElementById("filter-dept");
  const formDeptSelect = document.getElementById("emp-dept");

  // Keep the 'All' option in filter, but clear others
  filterDeptSelect.innerHTML = '<option value="all">All Departments</option>';
  formDeptSelect.innerHTML = '<option value="" disabled selected>Select Department</option>';

  departments.forEach(dept => {
    const optFilter = document.createElement("option");
    optFilter.value = dept.id;
    optFilter.textContent = dept.name;
    filterDeptSelect.appendChild(optFilter);

    const optForm = document.createElement("option");
    optForm.value = dept.id;
    optForm.textContent = dept.name;
    formDeptSelect.appendChild(optForm);
  });
}

// Draw/Filter table rows dynamically
function renderEmployeesTable() {
  const employees = DB.getEmployees();
  const departments = DB.getDepartments();
  const currentUser = DB.getCurrentUser();
  const tbody = document.getElementById("employee-table-body");
  tbody.innerHTML = "";

  // 1. Filtering Logic
  let filtered = employees.filter(emp => {
    const matchesSearch = 
      emp.name.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
      emp.email.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
      emp.role.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
      emp.employeeId.toLowerCase().includes(state.searchQuery.toLowerCase());

    const matchesDept = state.filterDept === "all" || emp.departmentId === state.filterDept;
    const matchesStatus = state.filterStatus === "all" || emp.status === state.filterStatus;

    return matchesSearch && matchesDept && matchesStatus;
  });

  // 2. Sorting Logic
  filtered.sort((a, b) => {
    let valA = a[state.sortBy];
    let valB = b[state.sortBy];

    if (state.sortBy === "dept") {
      const deptA = departments.find(d => d.id === a.departmentId)?.name || "";
      const deptB = departments.find(d => d.id === b.departmentId)?.name || "";
      valA = deptA;
      valB = deptB;
    }

    if (state.sortBy === "salary" || state.sortBy === "age") {
      valA = Number(valA) || 0;
      valB = Number(valB) || 0;
    }

    if (state.sortBy === "joinDate") {
      valA = new Date(valA);
      valB = new Date(valB);
    }

    if (valA < valB) return state.sortOrder === "asc" ? -1 : 1;
    if (valA > valB) return state.sortOrder === "asc" ? 1 : -1;
    return 0;
  });

  // Update table headers sorting icons
  updateSortIcons();

  // 3. Pagination Math
  const totalItems = filtered.length;
  const totalPages = Math.ceil(totalItems / state.pageSize);
  
  if (state.currentPage > totalPages && totalPages > 0) {
    state.currentPage = totalPages;
  }

  const startIdx = (state.currentPage - 1) * state.pageSize;
  const endIdx = Math.min(startIdx + state.pageSize, totalItems);
  const paginatedList = filtered.slice(startIdx, endIdx);

  const infoEl = document.getElementById("pagination-info");
  if (totalItems === 0) {
    infoEl.textContent = "Showing 0 to 0 of 0 entries";
    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align: center; padding: 40px; color: var(--text-muted);">
          <i class="fa-solid fa-users-slash" style="font-size: 2rem; margin-bottom: 12px; display: block; opacity: 0.5;"></i>
          No employees found matching the current filters.
        </td>
      </tr>
    `;
    document.getElementById("pagination-buttons").innerHTML = "";
    return;
  } else {
    infoEl.textContent = `Showing ${startIdx + 1} to ${endIdx} of ${totalItems} entries`;
  }

  // Draw paginated rows
  paginatedList.forEach(emp => {
    const deptName = departments.find(d => d.id === emp.departmentId)?.name || "Unassigned";
    
    let statusBadgeClass = "badge-active";
    if (emp.status === "On Leave") statusBadgeClass = "badge-leave";
    if (emp.status === "Suspended") statusBadgeClass = "badge-suspended";

    // Set Actions buttons markup based on User Role privileges
    let actionsBtnMarkup = "";
    if (currentUser?.role === "employee") {
      // Employees only get View details capability
      actionsBtnMarkup = `
        <button onclick="openProfileModal('${emp.id}')" class="action-btn action-btn-view" title="View Profile">
          <i class="fa-solid fa-eye"></i>
        </button>
      `;
    } else {
      // Managers / Admins get full View, Edit, and Delete controls
      actionsBtnMarkup = `
        <button onclick="openProfileModal('${emp.id}')" class="action-btn action-btn-view" title="View Profile">
          <i class="fa-solid fa-eye"></i>
        </button>
        <button onclick="openEditModal('${emp.id}')" class="action-btn action-btn-edit" title="Edit details">
          <i class="fa-solid fa-pencil"></i>
        </button>
        <button onclick="confirmDelete('${emp.id}', '${escapeJS(emp.name)}')" class="action-btn action-btn-delete" title="Delete employee">
          <i class="fa-solid fa-trash-can"></i>
        </button>
      `;
    }

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td style="font-family: monospace; font-weight: 600; letter-spacing: 0.05em; font-size: 0.85rem; color: #818cf8;">${emp.employeeId}</td>
      <td>
        <div class="employee-profile-td">
          <img src="${emp.avatar}" alt="${emp.name}" onerror="this.src='https://api.dicebear.com/7.x/avataaars/svg?seed=placeholder'">
          <div class="employee-info-meta">
            <span class="employee-name-td">${escapeHTML(emp.name)}</span>
            <span class="employee-email-td">${escapeHTML(emp.email)}</span>
          </div>
        </div>
      </td>
      <td>${escapeHTML(emp.role)}</td>
      <td>${escapeHTML(deptName)}</td>
      <td>${formatDate(emp.joinDate)}</td>
      <td><span class="badge ${statusBadgeClass}">${emp.status}</span></td>
      <td>${formatCurrency(emp.salary)}/yr</td>
      <td>
        <div class="actions-td">
          ${actionsBtnMarkup}
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });

  renderPaginationButtons(totalPages);
}

// Render dynamic pagination buttons
function renderPaginationButtons(totalPages) {
  const container = document.getElementById("pagination-buttons");
  container.innerHTML = "";

  const prevBtn = document.createElement("button");
  prevBtn.className = "btn btn-secondary";
  prevBtn.style.padding = "6px 12px";
  prevBtn.disabled = state.currentPage === 1;
  prevBtn.innerHTML = '<i class="fa-solid fa-chevron-left"></i>';
  prevBtn.onclick = () => {
    if (state.currentPage > 1) {
      state.currentPage--;
      renderEmployeesTable();
    }
  };
  container.appendChild(prevBtn);

  for (let i = 1; i <= totalPages; i++) {
    const pageBtn = document.createElement("button");
    if (i === state.currentPage) {
      pageBtn.className = "btn btn-primary";
    } else {
      pageBtn.className = "btn btn-secondary";
    }
    pageBtn.style.padding = "6px 14px";
    pageBtn.textContent = i;
    pageBtn.onclick = () => {
      state.currentPage = i;
      renderEmployeesTable();
    };
    container.appendChild(pageBtn);
  }

  const nextBtn = document.createElement("button");
  nextBtn.className = "btn btn-secondary";
  nextBtn.style.padding = "6px 12px";
  nextBtn.disabled = state.currentPage === totalPages;
  nextBtn.innerHTML = '<i class="fa-solid fa-chevron-right"></i>';
  nextBtn.onclick = () => {
    if (state.currentPage < totalPages) {
      state.currentPage++;
      renderEmployeesTable();
    }
  };
  container.appendChild(nextBtn);
}

// Handle real-time input change updates
function handleFiltersChanged() {
  state.searchQuery = document.getElementById("employee-search").value;
  state.filterDept = document.getElementById("filter-dept").value;
  state.filterStatus = document.getElementById("filter-status").value;
  state.currentPage = 1;
  renderEmployeesTable();
}

// Handle header sorting click toggles
function handleSort(column) {
  if (state.sortBy === column) {
    state.sortOrder = state.sortOrder === "asc" ? "desc" : "asc";
  } else {
    state.sortBy = column;
    state.sortOrder = "asc";
  }
  state.currentPage = 1;
  renderEmployeesTable();
}

function updateSortIcons() {
  const cols = ["employeeId", "name", "dept", "joinDate", "salary"];
  cols.forEach(col => {
    const icon = document.getElementById(`sort-icon-${col}`);
    if (!icon) return;

    if (state.sortBy === col) {
      icon.className = state.sortOrder === "asc" ? "fa-solid fa-sort-up" : "fa-solid fa-sort-down";
      icon.style.color = "var(--primary)";
    } else {
      icon.className = "fa-solid fa-sort";
      icon.style.color = "var(--text-muted)";
    }
  });
}

// ================= CRUD MODAL ACTIONS =================

function openAddModal() {
  const modal = document.getElementById("employee-modal");
  const form = document.getElementById("employee-form");
  
  form.reset();
  document.getElementById("emp-id").value = "";
  document.getElementById("modal-title").textContent = "Add New Employee";
  document.getElementById("modal-submit-btn").textContent = "Save Employee";
  document.getElementById("emp-join").value = new Date().toISOString().split('T')[0];

  // Set password field behavior for adding
  const passInput = document.getElementById("emp-password");
  passInput.required = true;
  passInput.placeholder = "••••••••";
  document.getElementById("emp-password-label").textContent = "Login Password";
  document.getElementById("emp-password-helper").textContent = "Credentials for Employee Workspace login";

  modal.classList.add("open");
}

function openEditModal(id) {
  const modal = document.getElementById("employee-modal");
  const emp = DB.getEmployeeById(id);
  if (!emp) {
    Auth.showToast("Employee details could not be found.", "error");
    return;
  }

  // Seed form values (including new profiling parameters)
  document.getElementById("emp-id").value = emp.id;
  document.getElementById("emp-name").value = emp.name;
  document.getElementById("emp-email").value = emp.email;
  document.getElementById("emp-phone").value = emp.phone;
  document.getElementById("emp-role").value = emp.role;
  document.getElementById("emp-dept").value = emp.departmentId;
  document.getElementById("emp-salary").value = emp.salary;
  document.getElementById("emp-join").value = emp.joinDate;
  document.getElementById("emp-status").value = emp.status;

  // Profiling details
  document.getElementById("emp-age").value = emp.age || 28;
  document.getElementById("emp-gender").value = emp.gender || "Male";
  document.getElementById("emp-address").value = emp.address || "";

  // Set password field behavior for editing (optional)
  const passInput = document.getElementById("emp-password");
  passInput.required = false;
  passInput.value = "";
  passInput.placeholder = "•••• (Leave blank to keep current)";
  document.getElementById("emp-password-label").textContent = "Change Password (optional)";
  document.getElementById("emp-password-helper").textContent = "Only type if you wish to reset their password";

  document.getElementById("modal-title").textContent = "Edit Employee Details";
  document.getElementById("modal-submit-btn").textContent = "Update Details";

  modal.classList.add("open");
}

function closeModal() {
  document.getElementById("employee-modal").classList.remove("open");
}

function handleFormSubmit(event) {
  event.preventDefault();

  const id = document.getElementById("emp-id").value;
  const password = document.getElementById("emp-password").value;
  
  const employeeData = {
    name: document.getElementById("emp-name").value.trim(),
    email: document.getElementById("emp-email").value.trim().toLowerCase(),
    phone: document.getElementById("emp-phone").value.trim(),
    role: document.getElementById("emp-role").value.trim(),
    departmentId: document.getElementById("emp-dept").value,
    salary: Number(document.getElementById("emp-salary").value),
    joinDate: document.getElementById("emp-join").value,
    status: document.getElementById("emp-status").value,
    
    // Profiling details saved to db
    age: Number(document.getElementById("emp-age").value),
    gender: document.getElementById("emp-gender").value,
    address: document.getElementById("emp-address").value.trim()
  };

  if (!Auth.isValidEmail(employeeData.email)) {
    Auth.showToast("Please provide a valid email format.", "error");
    return;
  }

  if (employeeData.salary < 0) {
    Auth.showToast("Salary must be a positive number.", "error");
    return;
  }

  if (employeeData.age < 15 || employeeData.age > 100) {
    Auth.showToast("Age must be between 15 and 100.", "error");
    return;
  }

  if (id) {
    // Edit existing employee record
    DB.updateEmployee(id, employeeData);
    
    // Check if password was inputted to update login password
    if (password) {
      const users = DB.getUsers();
      const userIdx = users.findIndex(u => u.employeeId === id);
      if (userIdx !== -1) {
        users[userIdx].password = password;
        DB._write(DB.KEYS.USERS, users);
      }
    }
    
    Auth.showToast("Employee record updated successfully.", "success");
  } else {
    // Add new employee record (synchronously creates login user inside DB)
    if (!password) {
      Auth.showToast("A temporary password is required for new accounts.", "error");
      return;
    }
    DB.createEmployee(employeeData, password);
    
    // Smart Custom Toast Alert
    Auth.showToast(`Account credentials and default platform username have been dispatched to ${employeeData.email} for hiring department validation.`, "success");
  }

  closeModal();
  renderEmployeesTable();
}

// ================= VISUAL PROFILING CARD MODAL =================

function openProfileModal(id) {
  const emp = DB.getEmployeeById(id);
  const departments = DB.getDepartments();
  const currentUser = DB.getCurrentUser();

  if (!emp) {
    Auth.showToast("Profile details not found.", "error");
    return;
  }

  const deptName = departments.find(d => d.id === emp.departmentId)?.name || "Unassigned";

  // Bind values to DOM modal card
  document.getElementById("prof-avatar").src = emp.avatar;
  document.getElementById("prof-name").textContent = emp.name;
  document.getElementById("prof-role").textContent = emp.role;
  document.getElementById("prof-id").textContent = emp.employeeId;
  document.getElementById("prof-dept").textContent = deptName;
  document.getElementById("prof-email").textContent = emp.email;
  document.getElementById("prof-phone").textContent = emp.phone || "Not provided";
  document.getElementById("prof-age-gender").textContent = `${emp.age || 28} years old • ${emp.gender || 'Male'}`;
  document.getElementById("prof-date-status").textContent = `${formatDate(emp.joinDate)} • [${emp.status}]`;
  document.getElementById("prof-address").textContent = emp.address || "No Address registered";

  // Privacy Rule: Mask salary if logged in user is employee and inspecting another colleague
  if (currentUser?.role === "employee" && emp.id !== currentUser.employeeId) {
    document.getElementById("prof-salary").innerHTML = `<span style="color: var(--text-muted); font-size: 0.85rem;"><i class="fa-solid fa-lock"></i> Restricted</span>`;
  } else {
    document.getElementById("prof-salary").textContent = formatCurrency(emp.salary) + " / yr";
  }

  document.getElementById("profile-modal").classList.add("open");
}

function closeProfileModal() {
  document.getElementById("profile-modal").classList.remove("open");
}

// ================= DELETE CONFIRMATION =================

function confirmDelete(id, name) {
  employeeToDeleteId = id;
  document.getElementById("delete-emp-name").textContent = name;
  document.getElementById("delete-modal").classList.add("open");
}

function closeDeleteModal() {
  employeeToDeleteId = null;
  document.getElementById("delete-modal").classList.remove("open");
}

document.getElementById("delete-confirm-btn").addEventListener("click", () => {
  if (employeeToDeleteId) {
    DB.deleteEmployee(employeeToDeleteId);
    Auth.showToast("Employee record has been deleted.", "success");
    closeDeleteModal();
    renderEmployeesTable();
  }
});

// ================= HELPERS =================

function formatCurrency(amount) {
  // Philippine Peso
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 0
  }).format(amount);
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

function escapeHTML(str) {
  if (!str) return '';
  return str.replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}

function escapeJS(str) {
  if (!str) return "";
  return str.replace(/'/g, "\\'");
}
