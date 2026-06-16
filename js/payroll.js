/**
 * Payroll & Payslip Page Controller
 * Adapts views dynamically between Admin/Manager Payroll sheets and Employee Payslip views
 */

// Selected employee ID reference inside Manager view modal
let selectedEmployeeIdForModal = null;

document.addEventListener("DOMContentLoaded", () => {
  const user = Auth.requireAuth();
  if (!user) return;

  // Render sidebar user details
  document.getElementById("user-name").textContent = user.name;
  document.getElementById("user-role").textContent = user.role;
  if (user.avatar) {
    document.getElementById("user-avatar").src = user.avatar;
  }

  // Initialize role-specific views
  if (user.role === "employee") {
    document.getElementById("employee-payslip-view").style.display = "block";
    document.getElementById("payroll-header-title").textContent = "My Payslips Statement";
    
    // Generate personal payslip
    generatePersonalPayslip(user.employeeId);
  } else {
    document.getElementById("manager-payroll-view").style.display = "block";
    document.getElementById("payroll-header-title").textContent = "Payroll Management Registry";
    
    // Generate company payroll summaries and table
    generateCompanyPayrollRegistry();
  }
});

// ================= 1. EMPLOYEE PAYSLIP GENERATION =================

function generatePersonalPayslip(empId) {
  const emp = DB.getEmployeeById(empId);
  const departments = DB.getDepartments();

  if (!emp) {
    document.getElementById("employee-payslip-card").innerHTML = `
      <div style="text-align: center; color: var(--text-muted); padding: 40px 0;">
        <i class="fa-solid fa-user-xmark" style="font-size: 3rem; margin-bottom: 16px;"></i>
        <p>No active employee record linked to your account credentials. Please contact HR.</p>
      </div>
    `;
    return;
  }

  const dept = departments.find(d => d.id === emp.departmentId);
  const deptName = dept ? dept.name : "Unassigned";

  // Calculate Payslip components (Localized PHP deductions)
  const annualSalary = Number(emp.salary) || 0;
  const monthlyBasic = Math.round(annualSalary / 12);
  
  // SSS (4.5%), PhilHealth (4.0%), Pag-IBIG (2.0%)
  const sssVal = Math.round(monthlyBasic * 0.045);
  const phVal = Math.round(monthlyBasic * 0.040);
  const pagibigVal = Math.round(monthlyBasic * 0.020);
  
  // Tax (15%)
  const taxVal = Math.round(monthlyBasic * 0.15);
  
  const totalDeductions = sssVal + phVal + pagibigVal + taxVal;
  const netPay = monthlyBasic - totalDeductions;

  // Bind properties to DOM card elements
  document.getElementById("payslip-emp-name").textContent = emp.name;
  document.getElementById("payslip-emp-id").textContent = emp.employeeId;
  document.getElementById("payslip-emp-dept").textContent = deptName;
  document.getElementById("payslip-emp-role").textContent = emp.role;

  document.getElementById("earnings-basic").textContent = formatCurrency(monthlyBasic);
  document.getElementById("earnings-gross").textContent = formatCurrency(monthlyBasic);

  document.getElementById("deduct-sss").textContent = formatCurrency(sssVal);
  document.getElementById("deduct-ph").textContent = formatCurrency(phVal);
  document.getElementById("deduct-pagibig").textContent = formatCurrency(pagibigVal);
  document.getElementById("deduct-tax").textContent = formatCurrency(taxVal);
  document.getElementById("deduct-total").textContent = formatCurrency(totalDeductions);

  document.getElementById("payslip-net-pay").textContent = formatCurrency(netPay);
}

function generatePayslipFromDropdown() {
  const dropdown = document.getElementById("payslip-month");
  const selectedText = dropdown.options[dropdown.selectedIndex].text;
  document.getElementById("payslip-stmt-period").textContent = `For the period of ${selectedText}`;
}

// ================= 2. ADMIN/MANAGER PAYROLL REGISTRY =================

function generateCompanyPayrollRegistry() {
  const employees = DB.getEmployees();
  const departments = DB.getDepartments();
  const tbody = document.getElementById("payroll-table-body");
  tbody.innerHTML = "";

  if (employees.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align: center; padding: 40px; color: var(--text-muted);">
          No employee records registered in system.
        </td>
      </tr>
    `;
    return;
  }

  let totalBasicGrossSum = 0;
  let totalBenefitsDeductedSum = 0;
  let totalTaxesSum = 0;

  employees.forEach(emp => {
    const dept = departments.find(d => d.id === emp.departmentId);
    const deptName = dept ? dept.name : "Unassigned";

    const annualSalary = Number(emp.salary) || 0;
    const monthlyBasic = Math.round(annualSalary / 12);
    
    const sssVal = Math.round(monthlyBasic * 0.045);
    const phVal = Math.round(monthlyBasic * 0.040);
    const pagibigVal = Math.round(monthlyBasic * 0.020);
    const taxVal = Math.round(monthlyBasic * 0.15);

    const benefitsSum = sssVal + phVal + pagibigVal;
    const totalDeductions = benefitsSum + taxVal;
    const netPayout = monthlyBasic - totalDeductions;

    // Sum overall company cost metrics
    totalBasicGrossSum += monthlyBasic;
    totalBenefitsDeductedSum += benefitsSum;
    totalTaxesSum += taxVal;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td style="font-family: monospace; font-weight: 600; font-size: 0.85rem; color: #818cf8;">${emp.employeeId}</td>
      <td>
        <div class="employee-profile-td" style="gap: 8px;">
          <img src="${emp.avatar}" alt="${emp.name}" style="width: 30px; height: 30px;" onerror="this.src='https://api.dicebear.com/7.x/avataaars/svg?seed=placeholder'">
          <div class="employee-info-meta">
            <span class="employee-name-td" style="font-size: 0.85rem;">${escapeHTML(emp.name)}</span>
            <span class="employee-email-td" style="font-size: 0.75rem;">${escapeHTML(emp.role)} (${dept ? dept.code : 'N/A'})</span>
          </div>
        </div>
      </td>
      <td>${formatCurrency(annualSalary)}/yr</td>
      <td>${formatCurrency(monthlyBasic)}</td>
      <td>${formatCurrency(taxVal)}</td>
      <td>${formatCurrency(benefitsSum)}</td>
      <td style="color: var(--success); font-weight: 700;">${formatCurrency(netPayout)}</td>
      <td>
        <button onclick="viewEmployeePayslipModal('${emp.id}')" class="btn btn-secondary" style="padding: 6px 10px; font-size: 0.75rem;">
          <i class="fa-solid fa-file-invoice-dollar"></i> Payslip
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  // Render KPI cards sums
  document.getElementById("sum-basic-salaries").textContent = formatCurrency(totalBasicGrossSum);
  document.getElementById("sum-benefits-cost").textContent = formatCurrency(totalBenefitsDeductedSum);
  document.getElementById("sum-tax-cost").textContent = formatCurrency(totalTaxesSum);
}

function filterPayrollTable() {
  const query = document.getElementById("payroll-search").value.trim().toLowerCase();
  const rows = document.querySelectorAll("#payroll-table-body tr");

  rows.forEach(row => {
    const text = row.textContent.toLowerCase();
    row.style.display = text.includes(query) ? "" : "none";
  });
}

// Open manager payslip view modal
function viewEmployeePayslipModal(empId) {
  selectedEmployeeIdForModal = empId;
  const modal = document.getElementById("payroll-payslip-modal");
  const container = document.getElementById("modal-payslip-card-container");
  
  // Clone the digital card template block
  const originalPayslipCard = document.getElementById("employee-payslip-card");
  const clone = originalPayslipCard.cloneNode(true);
  
  // Modify styles inside cloned modal card for visual fitting
  clone.style.maxWidth = "none";
  clone.style.border = "none";
  clone.style.padding = "10px";
  clone.style.boxShadow = "none";
  clone.style.background = "transparent";

  container.innerHTML = "";
  container.appendChild(clone);

  // Bind selected employee's calculations to the cloned nodes inside modal
  bindPayslipDataToElement(clone, empId);

  modal.classList.add("open");
}

function bindPayslipDataToElement(cardNode, empId) {
  const emp = DB.getEmployeeById(empId);
  const departments = DB.getDepartments();
  const dept = departments.find(d => d.id === emp.departmentId);
  const deptName = dept ? dept.name : "Unassigned";

  // Math calculations
  const annualSalary = Number(emp.salary) || 0;
  const monthlyBasic = Math.round(annualSalary / 12);
  const sssVal = Math.round(monthlyBasic * 0.045);
  const phVal = Math.round(monthlyBasic * 0.040);
  const pagibigVal = Math.round(monthlyBasic * 0.020);
  const taxVal = Math.round(monthlyBasic * 0.15);
  const totalDeductions = sssVal + phVal + pagibigVal + taxVal;
  const netPay = monthlyBasic - totalDeductions;

  // Bind inside node tree
  cardNode.querySelector("#payslip-stmt-period").textContent = "For the period of June 2026 (Active Cycle)";
  cardNode.querySelector("#payslip-emp-name").textContent = emp.name;
  cardNode.querySelector("#payslip-emp-id").textContent = emp.employeeId;
  cardNode.querySelector("#payslip-emp-dept").textContent = deptName;
  cardNode.querySelector("#payslip-emp-role").textContent = emp.role;

  cardNode.querySelector("#earnings-basic").textContent = formatCurrency(monthlyBasic);
  cardNode.querySelector("#earnings-gross").textContent = formatCurrency(monthlyBasic);

  cardNode.querySelector("#deduct-sss").textContent = formatCurrency(sssVal);
  cardNode.querySelector("#deduct-ph").textContent = formatCurrency(phVal);
  cardNode.querySelector("#deduct-pagibig").textContent = formatCurrency(pagibigVal);
  cardNode.querySelector("#deduct-tax").textContent = formatCurrency(taxVal);
  cardNode.querySelector("#deduct-total").textContent = formatCurrency(totalDeductions);

  cardNode.querySelector("#payslip-net-pay").textContent = formatCurrency(netPay);
}

function closePayrollModal() {
  document.getElementById("payroll-payslip-modal").classList.remove("open");
}

function printModalPayslip() {
  // Directly print using custom printing layouts
  window.print();
}

// Helpers
function formatCurrency(amount) {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 0
  }).format(amount);
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
