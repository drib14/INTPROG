/**
 * Departments Management View Driver
 * Handles loading department cards, real-time search, count queries, and cascading check CRUD modals
 * Updated to support employee role restrictions.
 */

let searchQuery = "";
let departmentToDeleteId = null;

document.addEventListener("DOMContentLoaded", () => {
  // Session protection guard
  const user = Auth.requireAuth();
  if (!user) return;

  // Render sidebar user profile preview
  document.getElementById("user-name").textContent = user.name;
  document.getElementById("user-role").textContent = user.role;
  if (user.avatar) {
    document.getElementById("user-avatar").src = user.avatar;
  }

  // Handle Multi-Role layout segregation for Employee
  if (user.role === "employee") {
    // Hide Add Department button
    const addBtn = document.querySelector(".filter-bar button.btn-primary");
    if (addBtn) addBtn.style.display = "none";
  }

  // Load list of departments
  renderDepartmentsGrid();
});

// Fetch and render cards
function renderDepartmentsGrid() {
  const departments = DB.getDepartments();
  const employees = DB.getEmployees();
  const currentUser = DB.getCurrentUser();
  const grid = document.getElementById("departments-grid");
  grid.innerHTML = "";

  // Filter list by search query
  const filtered = departments.filter(dept => 
    dept.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    dept.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 60px; color: var(--text-muted);" class="glass-panel">
        <i class="fa-solid fa-folder-open" style="font-size: 3rem; margin-bottom: 16px; opacity: 0.5;"></i>
        <p style="font-size: 1.1rem;">No departments found matching your search.</p>
      </div>
    `;
    return;
  }

  filtered.forEach(dept => {
    // Calculate employee count in this department
    const deptEmployees = employees.filter(emp => emp.departmentId === dept.id);
    const headcount = deptEmployees.length;

    // Actions buttons visible only for managers and admins
    let actionsMarkup = "";
    if (currentUser?.role !== "employee") {
      actionsMarkup = `
        <div class="actions-td">
          <button onclick="openEditModal('${dept.id}')" class="action-btn action-btn-edit" title="Edit department">
            <i class="fa-solid fa-pencil"></i>
          </button>
          <button onclick="tryDeleteDepartment('${dept.id}', '${escapeJS(dept.name)}')" class="action-btn action-btn-delete" title="Delete department">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </div>
      `;
    }

    const card = document.createElement("div");
    card.className = "dept-card glass-panel";
    card.innerHTML = `
      <div class="dept-card-header">
        <div class="dept-card-title">
          <h3>${escapeHTML(dept.name)}</h3>
          <span class="dept-card-manager"><i class="fa-solid fa-user-tie"></i> Manager: ${escapeHTML(dept.manager)}</span>
        </div>
        <span class="dept-card-code">${escapeHTML(dept.code)}</span>
      </div>
      
      <p class="dept-card-desc">${escapeHTML(dept.description)}</p>

      <div class="dept-card-footer">
        <div class="dept-emp-count">
          <i class="fa-solid fa-users"></i>
          <span>${headcount} Employee${headcount !== 1 ? 's' : ''}</span>
        </div>
        
        ${actionsMarkup}
      </div>
    `;
    grid.appendChild(card);
  });
}

function handleSearch() {
  searchQuery = document.getElementById("dept-search").value.trim();
  renderDepartmentsGrid();
}

// ================= CRUD MODAL ACTIONS =================

function openAddModal() {
  const modal = document.getElementById("dept-modal");
  const form = document.getElementById("dept-form");

  form.reset();
  document.getElementById("dept-id").value = "";
  document.getElementById("modal-title").textContent = "Add New Department";
  document.getElementById("modal-submit-btn").textContent = "Save Department";

  modal.classList.add("open");
}

function openEditModal(id) {
  const modal = document.getElementById("dept-modal");
  const dept = DB.getDepartmentById(id);
  if (!dept) {
    Auth.showToast("Department details could not be found.", "error");
    return;
  }

  // Pre-fill inputs
  document.getElementById("dept-id").value = dept.id;
  document.getElementById("dept-name").value = dept.name;
  document.getElementById("dept-code").value = dept.code;
  document.getElementById("dept-manager").value = dept.manager;
  document.getElementById("dept-desc").value = dept.description;

  document.getElementById("modal-title").textContent = "Edit Department";
  document.getElementById("modal-submit-btn").textContent = "Update Department";

  modal.classList.add("open");
}

function closeModal() {
  document.getElementById("dept-modal").classList.remove("open");
}

function handleFormSubmit(event) {
  event.preventDefault();

  const id = document.getElementById("dept-id").value;
  const deptData = {
    name: document.getElementById("dept-name").value.trim(),
    code: document.getElementById("dept-code").value.trim().toUpperCase(),
    manager: document.getElementById("dept-manager").value.trim(),
    description: document.getElementById("dept-desc").value.trim()
  };

  if (deptData.code.length < 2) {
    Auth.showToast("Department code must be at least 2 characters.", "error");
    return;
  }

  const departments = DB.getDepartments();
  const duplicateName = departments.some(d => d.id !== id && d.name.toLowerCase() === deptData.name.toLowerCase());
  const duplicateCode = departments.some(d => d.id !== id && d.code.toUpperCase() === deptData.code.toUpperCase());

  if (duplicateName) {
    Auth.showToast("A department with this name already exists.", "error");
    return;
  }
  if (duplicateCode) {
    Auth.showToast("A department with this code already exists.", "error");
    return;
  }

  if (id) {
    DB.updateDepartment(id, deptData);
    Auth.showToast("Department details updated successfully.", "success");
  } else {
    DB.createDepartment(deptData);
    Auth.showToast("New department registered successfully.", "success");
  }

  closeModal();
  renderDepartmentsGrid();
}

// ================= CASCADE DELETE PROTECTION =================

function tryDeleteDepartment(id, name) {
  const employees = DB.getEmployees();
  const count = employees.filter(emp => emp.departmentId === id).length;

  if (count > 0) {
    Auth.showToast(`Cannot delete department. There are ${count} active employees assigned. Reassign them first!`, "error");
    return;
  }

  departmentToDeleteId = id;
  document.getElementById("delete-dept-name").textContent = name;
  document.getElementById("delete-modal").classList.add("open");
}

function closeDeleteModal() {
  departmentToDeleteId = null;
  document.getElementById("delete-modal").classList.remove("open");
}

document.getElementById("delete-confirm-btn").addEventListener("click", () => {
  if (departmentToDeleteId) {
    try {
      DB.deleteDepartment(departmentToDeleteId);
      Auth.showToast("Department removed from registry.", "success");
    } catch (err) {
      Auth.showToast(err.message, "error");
    }
    closeDeleteModal();
    renderDepartmentsGrid();
  }
});

// ================= HELPERS =================

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
