const API_BASE_URL = 'http://localhost:3000/api';
let currentUser = null;
let cachedSections = [];
const classGradebookState = {};

const mockStudents = [
  { student_id: 1, student_number: '20260001', firstname: 'Juan', middlename: 'M.', lastname: 'Dela Cruz', gender: 'Male', attendance_status: 'Present' },
  { student_id: 2, student_number: '20260002', firstname: 'Maria', middlename: 'S.', lastname: 'Santos', gender: 'Female', attendance_status: 'Late' },
  { student_id: 3, student_number: '20260003', firstname: 'Mark', middlename: 'A.', lastname: 'Reyes', gender: 'Male', attendance_status: 'Present' },
  { student_id: 4, student_number: '20260004', firstname: 'Rom', middlename: 'Sar', lastname: 'Bags', gender: 'Male', attendance_status: 'Present' },
  { student_id: 5, student_number: '20260005', firstname: 'Nick', middlename: 'Jena', lastname: 'Gus', gender: 'Male', attendance_status: 'Present' }
];

document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  setupValidationListeners();
  loadInitialData();
});

// Helper function to sort students: Male first, Female second, then alphabetically by Last Name, First Name
function sortStudentsByGenderAndName(students) {
  return [...students].sort((a, b) => {
    // 1. Male first, Female second
    if (a.gender !== b.gender) {
      if (a.gender === 'Male') return -1;
      if (b.gender === 'Male') return 1;
      return a.gender.localeCompare(b.gender);
    }
    // 2. Alphabetical by Last Name
    const lastNameCompare = (a.lastname || '').localeCompare(b.lastname || '');
    if (lastNameCompare !== 0) return lastNameCompare;

    // 3. Alphabetical by First Name
    return (a.firstname || '').localeCompare(b.firstname || '');
  });
}

function setupEventListeners() {
  const loginForm = document.getElementById('loginForm');
  if (loginForm) loginForm.addEventListener('submit', handleLoginSubmit);
  const registerForm = document.getElementById('registerForm');
  if (registerForm) registerForm.addEventListener('submit', handleRegisterSubmit);
  const addStudentForm = document.getElementById('addStudentForm');
  if (addStudentForm) addStudentForm.addEventListener('submit', handleAddStudentSubmit);
  const addScheduleForm = document.getElementById('addScheduleForm');
  if (addScheduleForm) addScheduleForm.addEventListener('submit', handleAddScheduleSubmit);
  
  const dailyCheckbox = document.getElementById('schedDailyOption');
  if (dailyCheckbox) {
    dailyCheckbox.addEventListener('change', (e) => {
      if (e.target.checked) {
        const dayCheckboxes = document.querySelectorAll('input[name="schedDay"]');
        dayCheckboxes.forEach(cb => cb.checked = true);
        e.target.checked = false;
        
        const daysErr = document.getElementById('schedDaysError');
        if (daysErr) daysErr.innerText = '';
      }
    });
  }
}

function capitalizeFirstLetter(str) {
  return str.replace(/\b\w/g, char => char.toUpperCase());
}

function isStrongPassword(password) {
  const minLength = password.length >= 6;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
  return minLength && hasUpper && hasLower && hasNumber && hasSpecial;
}

function setFieldValidity(inputElem, errorElem, isValid, message = '') {
  if (!inputElem) return;
  if (isValid) {
    inputElem.classList.remove('invalid');
    inputElem.classList.add('valid');
    if (errorElem) errorElem.innerText = '';
  } else {
    inputElem.classList.remove('valid');
    inputElem.classList.add('invalid');
    if (errorElem) errorElem.innerText = message;
  }
}

function clearFieldValidity(inputElem, errorElem) {
  if (!inputElem) return;
  inputElem.classList.remove('valid', 'invalid');
  if (errorElem) errorElem.innerText = '';
}

function togglePasswordVisibility(inputId, iconElem) {
  const input = document.getElementById(inputId);
  if (!input) return;
  if (input.type === 'password') {
    input.type = 'text';
    iconElem.classList.remove('fa-eye');
    iconElem.classList.add('fa-eye-slash');
  } else {
    input.type = 'password';
    iconElem.classList.remove('fa-slash', 'fa-eye-slash');
    iconElem.classList.add('fa-eye');
  }
}

function setupValidationListeners() {
  const nameFields = ['regFirstName', 'regMiddleName', 'regLastName', 'studFirstName', 'studMiddleName', 'studLastName'];
  nameFields.forEach(id => {
    const elem = document.getElementById(id);
    if (elem) {
      const validateName = (e) => {
        e.target.value = e.target.value.replace(/[0-9]/g, '');
        e.target.value = capitalizeFirstLetter(e.target.value);
        
        const errorElem = document.getElementById(`${id}Error`);
        if (elem.required && !e.target.value.trim()) {
          setFieldValidity(elem, errorElem, false, 'This field is required.');
        } else {
          setFieldValidity(elem, errorElem, true);
        }
      };
      elem.addEventListener('input', validateName);
      elem.addEventListener('blur', validateName);
    }
  });

  const schedSubject = document.getElementById('schedSubject');
  if (schedSubject) {
    const validateSubject = (e) => {
      e.target.value = e.target.value.replace(/[0-9]/g, '');
      const errorElem = document.getElementById('schedSubjectError');
      if (!e.target.value.trim()) {
        setFieldValidity(schedSubject, errorElem, false, 'Subject name is required and cannot contain numbers.');
      } else {
        setFieldValidity(schedSubject, errorElem, true);
      }
    };
    schedSubject.addEventListener('input', validateSubject);
    schedSubject.addEventListener('blur', validateSubject);
  }

  const lrnInput = document.getElementById('studNumber');
  if (lrnInput) {
    const validateLrn = (e) => {
      e.target.value = e.target.value.replace(/[^0-9]/g, '');
      const errorElem = document.getElementById('studNumberError');
      if (!e.target.value.trim()) {
        setFieldValidity(lrnInput, errorElem, false, 'LRN is required and must contain numbers only.');
      } else {
        setFieldValidity(lrnInput, errorElem, true);
      }
    };
    lrnInput.addEventListener('input', validateLrn);
    lrnInput.addEventListener('blur', validateLrn);
  }

  const schedStart = document.getElementById('schedStart');
  const schedEnd = document.getElementById('schedEnd');
  if (schedStart) {
    schedStart.addEventListener('change', () => {
      const err = document.getElementById('schedStartError');
      setFieldValidity(schedStart, err, !!schedStart.value, 'Start time required.');
    });
  }
  if (schedEnd) {
    schedEnd.addEventListener('change', () => {
      const err = document.getElementById('schedEndError');
      setFieldValidity(schedEnd, err, !!schedEnd.value, 'End time required.');
    });
  }

  const dayCheckboxes = document.querySelectorAll('input[name="schedDay"]');
  dayCheckboxes.forEach(cb => {
    cb.addEventListener('change', () => {
      const checked = Array.from(dayCheckboxes).some(c => c.checked);
      const daysErr = document.getElementById('schedDaysError');
      if (daysErr) daysErr.innerText = checked ? '' : 'Please select at least one day.';
    });
  });

  const regPassword = document.getElementById('regPassword');
  const regConfirmPassword = document.getElementById('regConfirmPassword');
  if (regPassword) {
    regPassword.addEventListener('input', () => {
      const err = document.getElementById('regPasswordError');
      if (!isStrongPassword(regPassword.value)) {
        setFieldValidity(regPassword, err, false, 'Min 6 chars with upper, lower, number, & special symbol.');
      } else {
        setFieldValidity(regPassword, err, true);
      }
      if (regConfirmPassword && regConfirmPassword.value) {
        validateConfirmPassword();
      }
    });
  }
  if (regConfirmPassword) {
    regConfirmPassword.addEventListener('input', validateConfirmPassword);
  }

  function validateConfirmPassword() {
    const err = document.getElementById('regConfirmPasswordError');
    if (regConfirmPassword.value !== regPassword.value) {
      setFieldValidity(regConfirmPassword, err, false, 'Passwords do not match.');
    } else {
      setFieldValidity(regConfirmPassword, err, true);
    }
  }

  const emailFields = ['loginEmail', 'regEmail'];
  emailFields.forEach(id => {
    const elem = document.getElementById(id);
    if (elem) {
      const validateEmail = () => {
        const err = document.getElementById(`${id}Error`);
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(elem.value)) {
          setFieldValidity(elem, err, false, 'Enter a valid email address.');
        } else {
          setFieldValidity(elem, err, true);
        }
      };
      elem.addEventListener('input', validateEmail);
      elem.addEventListener('blur', validateEmail);
    }
  });
}

async function loadInitialData() {
  await populateSectionsDropdowns();
  await populateTeachersDropdown();
}

async function populateSectionsDropdowns() {
  try {
    const response = await fetch(`${API_BASE_URL}/sections`);
    if (!response.ok) return;
    cachedSections = await response.json();
    const regSelect = document.getElementById('regAdvisorySection');
    const studSelect = document.getElementById('studSectionSelect');
    const optionsHTML = cachedSections
      .map(s => `<option value="${s.section_id}">Grade ${s.grade_level} - ${s.section_name}</option>`)
      .join('');
    if (regSelect) regSelect.innerHTML = optionsHTML;
    if (studSelect) studSelect.innerHTML = optionsHTML;
  } catch (err) {
    console.error('Error loading sections:', err);
  }
}

async function populateTeachersDropdown() {
  try {
    const response = await fetch(`${API_BASE_URL}/teachers`);
    if (!response.ok) return;
    const teachers = await response.json();
    const schedTeacherSelect = document.getElementById('schedTeacher');
    if (schedTeacherSelect) {
      schedTeacherSelect.innerHTML = teachers
        .map(t => `<option value="${t.teacher_id}">${t.firstname} ${t.lastname} (${t.teacher_category})</option>`)
        .join('');
    }
  } catch (err) {
    console.error('Error loading teachers:', err);
  }
}

function openAddStudentModal() {
  if (!currentUser || !currentUser.advisory_section_id) {
    alert('You must be assigned to an Advisory section to add students.');
    return;
  }
  document.getElementById('editStudentId').value = '';
  document.getElementById('studentModalTitle').innerText = 'Add Student';
  
  const form = document.getElementById('addStudentForm');
  form.reset();
  form.querySelectorAll('input').forEach(i => clearFieldValidity(i, document.getElementById(`${i.id}Error`)));
  const studSelect = document.getElementById('studSectionSelect');
  if (studSelect) {
    studSelect.value = currentUser.advisory_section_id;
  }
  openModal('addStudentModal');
}

function openAddScheduleModal() {
  if (!currentUser || !currentUser.advisory_section_id) {
    alert('You must be assigned to an Advisory section to add schedules.');
    return;
  }
  const form = document.getElementById('addScheduleForm');
  form.reset();
  form.querySelectorAll('input').forEach(i => clearFieldValidity(i, document.getElementById(`${i.id}Error`)));
  openModal('addScheduleModal');
}

function configurePerspectiveDropdown() {
  const switcher = document.getElementById('perspectiveSwitcher');
  if (!switcher || !currentUser) return;
  switcher.innerHTML = '';
  if (currentUser.teacher_category === 'Teacher with Advisory') {
    switcher.innerHTML = `
      <option value="Adviser Perspective">Adviser Perspective</option>
      <option value="Subject Teacher Perspective">Subject Teacher Perspective</option>
    `;
  } else if (currentUser.teacher_category === 'Teacher Only') {
    switcher.innerHTML = `
      <option value="Subject Teacher Perspective">Subject Teacher Perspective</option>
    `;
  } else if (currentUser.teacher_category === 'Guidance') {
    switcher.innerHTML = `
      <option value="Guidance Perspective">Guidance Perspective</option>
    `;
  }
  if (switcher.options.length > 0) {
    switcher.value = switcher.options[0].value;
    handlePerspectiveChange();
  }
}

function handlePerspectiveChange() {
  const switcher = document.getElementById('perspectiveSwitcher');
  const roleView = switcher ? switcher.value : '';
  const actionButtons = document.getElementById('actionButtons');
  const addStudentBtn = document.getElementById('addStudentBtn');
  const addScheduleBtn = document.getElementById('addScheduleBtn');
  const adviserSection = document.getElementById('adviserSection');
  const scheduleSection = document.getElementById('scheduleSection');
  const teacherClassColumnsSection = document.getElementById('teacherClassColumnsSection');
  const guidanceSection = document.getElementById('guidanceSection');

  if (adviserSection) adviserSection.classList.add('hidden');
  if (scheduleSection) scheduleSection.classList.add('hidden');
  if (teacherClassColumnsSection) teacherClassColumnsSection.classList.add('hidden');
  if (guidanceSection) guidanceSection.classList.add('hidden');
  if (actionButtons) actionButtons.classList.add('hidden');

  if (roleView === 'Adviser Perspective') {
    if (actionButtons) actionButtons.classList.remove('hidden');
    if (addStudentBtn) addStudentBtn.style.display = 'inline-block';
    if (addScheduleBtn) addScheduleBtn.style.display = 'inline-block';
    if (adviserSection) adviserSection.classList.remove('hidden');
    if (scheduleSection) scheduleSection.classList.remove('hidden');
    loadAdvisoryStudents();
    loadAdvisorySchedules();
  } else if (roleView === 'Subject Teacher Perspective') {
    if (actionButtons) actionButtons.classList.add('hidden');
    if (teacherClassColumnsSection) teacherClassColumnsSection.classList.remove('hidden');
    loadSubjectTeacherClasses();
  } else if (roleView === 'Guidance Perspective') {
    if (guidanceSection) guidanceSection.classList.remove('hidden');
    loadAssessmentLogs();
  }
}

async function handleLoginSubmit(e) {
  e.preventDefault();
  const emailInput = document.getElementById('loginEmail');
  const passInput = document.getElementById('loginPassword');
  let valid = true;
  if (!emailInput.value.trim()) {
    setFieldValidity(emailInput, document.getElementById('loginEmailError'), false, 'Email is required.');
    valid = false;
  }
  if (!passInput.value.trim()) {
    setFieldValidity(passInput, document.getElementById('loginPasswordError'), false, 'Password is required.');
    valid = false;
  }
  if (!valid) return;

  try {
    const response = await fetch(`${API_BASE_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailInput.value, password: passInput.value })
    });
    const data = await response.json();
    if (!response.ok) {
      alert(data.error || 'Login failed');
      return;
    }
    currentUser = data.user;
    closeModal('authModal');
    updateUIForAuthenticatedUser();
  } catch (err) {
    console.warn('Server connection failed, utilizing session fallback:', err.message);
    currentUser = {
      teacher_id: 1,
      firstname: 'John',
      lastname: 'Doe',
      teacher_category: 'Teacher with Advisory',
      advisory_section_id: 1
    };
    closeModal('authModal');
    updateUIForAuthenticatedUser();
  }
}

async function handleRegisterSubmit(e) {
  e.preventDefault();
  const firstname = document.getElementById('regFirstName');
  const middlename = document.getElementById('regMiddleName');
  const lastname = document.getElementById('regLastName');
  const email = document.getElementById('regEmail');
  const password = document.getElementById('regPassword');
  const confirmPassword = document.getElementById('regConfirmPassword');

  let valid = true;
  if (!firstname.value.trim()) {
    setFieldValidity(firstname, document.getElementById('regFirstNameError'), false, 'First name is required.');
    valid = false;
  }
  if (!lastname.value.trim()) {
    setFieldValidity(lastname, document.getElementById('regLastNameError'), false, 'Last name is required.');
    valid = false;
  }
  if (!email.value.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) {
    setFieldValidity(email, document.getElementById('regEmailError'), false, 'Valid email is required.');
    valid = false;
  }
  if (!isStrongPassword(password.value)) {
    setFieldValidity(password, document.getElementById('regPasswordError'), false, 'Password requirements not met.');
    valid = false;
  }
  if (confirmPassword.value !== password.value || !confirmPassword.value) {
    setFieldValidity(confirmPassword, document.getElementById('regConfirmPasswordError'), false, 'Passwords must match.');
    valid = false;
  }
  if (!valid) return;

  const teacher_category = document.getElementById('regTeacherCategory').value;
  const advisory_section_id = document.getElementById('regAdvisorySection')?.value || null;

  try {
    const response = await fetch(`${API_BASE_URL}/teachers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firstname: firstname.value,
        middlename: middlename.value,
        lastname: lastname.value,
        email: email.value,
        password_hash: password.value,
        teacher_category,
        advisory_section_id: teacher_category === 'Teacher with Advisory' ? advisory_section_id : null
      })
    });
    const data = await response.json();
    if (!response.ok) {
      alert(data.error || 'Registration failed');
      return;
    }
    alert('Account created successfully! Please login.');
    switchAuthTab('login');
  } catch (err) {
    alert('Server connection error: ' + err.message);
  }
}

function updateUIForAuthenticatedUser() {
  if (!currentUser) return;
  const userInfo = document.getElementById('userInfo');
  const userNameLabel = document.getElementById('userNameLabel');
  const userBadge = document.getElementById('userBadge');
  if (userInfo) userInfo.classList.remove('hidden');
  if (userNameLabel) userNameLabel.innerText = `${currentUser.firstname} ${currentUser.lastname}`;
  if (userBadge) userBadge.innerText = currentUser.teacher_category;
  configurePerspectiveDropdown();
}

function handleLogout() {
  currentUser = null;
  document.getElementById('userInfo').classList.add('hidden');
  document.getElementById('actionButtons').classList.add('hidden');
  document.getElementById('adviserSection').classList.add('hidden');
  document.getElementById('scheduleSection').classList.add('hidden');
  document.getElementById('teacherClassColumnsSection').classList.add('hidden');
  document.getElementById('guidanceSection').classList.add('hidden');
  openModal('authModal');
}

function switchAuthTab(tab) {
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  if (tab === 'login') {
    loginForm.classList.remove('hidden');
    registerForm.classList.add('hidden');
  } else {
    loginForm.classList.add('hidden');
    registerForm.classList.remove('hidden');
    toggleAdvisorySectionSelect();
  }
}

function toggleAdvisorySectionSelect() {
  const categoryElem = document.getElementById('regTeacherCategory');
  const advisoryGroup = document.getElementById('advisorySectionGroup');
  if (categoryElem && advisoryGroup) {
    if (categoryElem.value === 'Teacher with Advisory') {
      advisoryGroup.classList.remove('hidden');
    } else {
      advisoryGroup.classList.add('hidden');
    }
  }
}

async function loadAdvisoryStudents() {
  if (!currentUser || !currentUser.advisory_section_id) return;
  let students = [];
  try {
    const response = await fetch(`${API_BASE_URL}/students?section_id=${currentUser.advisory_section_id}`);
    if (response.ok) {
      students = await response.json();
    } else {
      students = mockStudents;
    }
  } catch (err) {
    students = mockStudents;
  }
  const tbody = document.getElementById('studentTableBody');
  if (!tbody) return;
  if (!Array.isArray(students) || students.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;">No students registered in your advisory section.</td></tr>`;
    return;
  }

  // Segregate and sort students alphabetically by Gender
  const sortedStudents = sortStudentsByGenderAndName(students);

  tbody.innerHTML = sortedStudents.map(s => `
    <tr>
      <td>${s.student_id}</td>
      <td>${s.student_number}</td>
      <td>${s.firstname} ${s.middlename || ''} ${s.lastname}</td>
      <td>${s.gender}</td>
      <td><a href="${s.face_image_url || '#'}" target="_blank">${s.face_image_url ? 'View' : 'N/A'}</a></td>
      <td>${s.section_name || s.section_id || 'Section Alpha'}</td>
      <td>
        <button class="btn btn-primary btn-small" onclick="openEditStudentModal(${JSON.stringify(s).replace(/"/g, '&quot;')})">Edit</button>
        <button class="btn btn-secondary btn-small" onclick="deleteStudent(${s.student_id})">Delete</button>
      </td>
    </tr>
  `).join('');
}

function openEditStudentModal(student) {
  document.getElementById('editStudentId').value = student.student_id;
  document.getElementById('studNumber').value = student.student_number;
  document.getElementById('studFirstName').value = student.firstname;
  document.getElementById('studMiddleName').value = student.middlename || '';
  document.getElementById('studLastName').value = student.lastname;
  document.getElementById('studGender').value = student.gender;
  document.getElementById('studSectionSelect').value = student.section_id || '';
  document.getElementById('studFaceImageUrl').value = student.face_image_url || '';
  document.getElementById('studentModalTitle').innerText = 'Edit Student';
  openModal('addStudentModal');
}

async function handleAddStudentSubmit(e) {
  e.preventDefault();
  const studentId = document.getElementById('editStudentId').value;
  const lrnInput = document.getElementById('studNumber');
  const fnInput = document.getElementById('studFirstName');
  const lnInput = document.getElementById('studLastName');
  let valid = true;

  if (!lrnInput.value.trim() || /[^0-9]/.test(lrnInput.value)) {
    setFieldValidity(lrnInput, document.getElementById('studNumberError'), false, 'Numeric LRN is required.');
    valid = false;
  }
  if (!fnInput.value.trim()) {
    setFieldValidity(fnInput, document.getElementById('studFirstNameError'), false, 'First name is required.');
    valid = false;
  }
  if (!lnInput.value.trim()) {
    setFieldValidity(lnInput, document.getElementById('studLastNameError'), false, 'Last name is required.');
    valid = false;
  }
  if (!valid) return;

  const payload = {
    student_number: lrnInput.value,
    firstname: fnInput.value,
    middlename: document.getElementById('studMiddleName').value,
    lastname: lnInput.value,
    gender: document.getElementById('studGender').value,
    section_id: document.getElementById('studSectionSelect').value || currentUser.advisory_section_id,
    face_image_url: document.getElementById('studFaceImageUrl').value,
    requesting_teacher_id: currentUser.teacher_id
  };

  const url = studentId ? `${API_BASE_URL}/students/${studentId}` : `${API_BASE_URL}/students`;
  const method = studentId ? 'PUT' : 'POST';

  try {
    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to save student');
    alert(studentId ? 'Student updated successfully!' : 'Student added successfully!');
    closeModal('addStudentModal');
    loadAdvisoryStudents();
  } catch (err) {
    alert(err.message);
  }
}

async function deleteStudent(studentId) {
  if (!confirm('Are you sure you want to delete this student?')) return;
  try {
    const response = await fetch(`${API_BASE_URL}/students/${studentId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requesting_teacher_id: currentUser.teacher_id })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to delete student');
    alert('Student deleted successfully!');
    loadAdvisoryStudents();
  } catch (err) {
    alert(err.message);
  }
}

async function loadAdvisorySchedules() {
  if (!currentUser || !currentUser.advisory_section_id) return;
  let schedules = [];
  try {
    const response = await fetch(`${API_BASE_URL}/class-schedules?section_id=${currentUser.advisory_section_id}`);
    if (response.ok) {
      schedules = await response.json();
    }
  } catch (err) {
    console.error('Error loading advisory schedules:', err);
  }
  const tbody = document.getElementById('scheduleTableBody');
  if (!tbody) return;
  if (!Array.isArray(schedules) || schedules.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;">No subject schedules configured.</td></tr>`;
    return;
  }
  tbody.innerHTML = schedules.map(s => `
    <tr>
      <td>${s.schedule_id}</td>
      <td>${s.subject_name}</td>
      <td>${s.teacher_name || s.teacher_id}</td>
      <td>${s.section_name || s.section_id}</td>
      <td>${s.day_of_week}</td>
      <td>${s.start_time}</td>
      <td>${s.end_time}</td>
      <td>
        <button class="btn btn-secondary btn-small" onclick="deleteSchedule(${s.schedule_id})">Delete</button>
      </td>
    </tr>
  `).join('');
}

async function handleAddScheduleSubmit(e) {
  e.preventDefault();
  const subjectInput = document.getElementById('schedSubject');
  const startInput = document.getElementById('schedStart');
  const endInput = document.getElementById('schedEnd');
  const checkedDays = Array.from(document.querySelectorAll('input[name="schedDay"]:checked')).map(cb => cb.value);
  const daysErr = document.getElementById('schedDaysError');
  let valid = true;

  if (!subjectInput.value.trim() || /[0-9]/.test(subjectInput.value)) {
    setFieldValidity(subjectInput, document.getElementById('schedSubjectError'), false, 'Valid non-numeric subject required.');
    valid = false;
  } else {
    setFieldValidity(subjectInput, document.getElementById('schedSubjectError'), true);
  }

  if (checkedDays.length === 0) {
    daysErr.innerText = 'Please select at least one day.';
    valid = false;
  } else {
    daysErr.innerText = '';
  }

  if (!startInput.value) {
    setFieldValidity(startInput, document.getElementById('schedStartError'), false, 'Start time required.');
    valid = false;
  } else {
    setFieldValidity(startInput, document.getElementById('schedStartError'), true);
  }

  if (!endInput.value) {
    setFieldValidity(endInput, document.getElementById('schedEndError'), false, 'End time required.');
    valid = false;
  } else {
    setFieldValidity(endInput, document.getElementById('schedEndError'), true);
  }

  if (!valid) return;

  const payload = {
    subject_name: subjectInput.value,
    section_id: currentUser.advisory_section_id,
    teacher_id: document.getElementById('schedTeacher').value,
    day_of_week: checkedDays.join(', '),
    start_time: startInput.value,
    end_time: endInput.value,
    requesting_teacher_id: currentUser.teacher_id
  };

  try {
    const response = await fetch(`${API_BASE_URL}/class-schedules`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to add schedule');
    alert('Advisory Class Schedule created successfully!');
    closeModal('addScheduleModal');
    loadAdvisorySchedules();
  } catch (err) {
    alert(err.message);
  }
}

async function deleteSchedule(scheduleId) {
  if (!confirm('Are you sure you want to delete this schedule?')) return;
  try {
    const response = await fetch(`${API_BASE_URL}/class-schedules/${scheduleId}`, {
      method: 'DELETE'
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to delete schedule');
    alert('Schedule deleted!');
    loadAdvisorySchedules();
  } catch (err) {
    alert(err.message);
  }
}

async function loadSubjectTeacherClasses() {
  if (!currentUser) return;
  let classes = [];
  try {
    const response = await fetch(`${API_BASE_URL}/teachers/${currentUser.teacher_id}/classes`);
    if (response.ok) {
      classes = await response.json();
    }
  } catch (err) {
    console.warn('API error loading classes, using fallback sample classes');
  }

  if (!Array.isArray(classes) || classes.length === 0) {
    classes = [
      { schedule_id: 101, subject_name: 'Science', section_name: 'Section Alpha', grade_level: 7, day_of_week: 'Monday, Tuesday, Wednesday, Thursday, Friday', start_time: '06:12:00', end_time: '07:12:00' },
      { schedule_id: 102, subject_name: 'Mathematics', section_name: 'Section Alpha', grade_level: 7, day_of_week: 'Monday, Friday', start_time: '08:00:00', end_time: '09:00:00' }
    ];
  }

  const container = document.getElementById('subjectClassCardsContainer');
  if (!container) return;
  container.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 24px;">
      ${classes.map(c => `
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
          <div style="border-bottom: 2px solid #3b82f6; padding-bottom: 10px; margin-bottom: 16px;">
            <h2 style="margin: 0; color: #1e293b;">${c.subject_name}</h2>
            <p style="margin: 6px 0 0 0; color: #64748b;">
              <strong>Section:</strong> ${c.section_name} (Grade${c.grade_level || 'N/A'}) &nbsp;|&nbsp; 
              <strong>Schedule:</strong> ${c.day_of_week} | ${c.start_time} -${c.end_time}
            </p>
          </div>
          <div id="gradebook-table-${c.schedule_id}">
            <p style="color: #64748b;">Loading student roster and gradebook...</p>
          </div>
        </div>
      `).join('')}
    </div>
  `;

  for (const c of classes) {
    await renderClassGradebookTable(c.schedule_id, `gradebook-table-${c.schedule_id}`);
  }
}

function initScheduleState(scheduleId, defaultStudents) {
  if (!classGradebookState[scheduleId]) {
    classGradebookState[scheduleId] = {
      quizzes: [
        { id: 'q1', name: 'Quiz 1', maxPoints: 20 },
        { id: 'q2', name: 'Quiz 2', maxPoints: 10 }
      ],
      performances: [
        { id: 'pt1', name: 'Performance Task 1', maxPoints: 50 }
      ],
      scores: {}
    };
  }

  const state = classGradebookState[scheduleId];
  if (Array.isArray(defaultStudents)) {
    defaultStudents.forEach(s => {
      let attendanceVal = 100;
      if (s.attendance_status === 'Late' || s.attendance_status == 50) attendanceVal = 50;
      if (s.attendance_status === 'Absent' || s.attendance_status == 0) attendanceVal = 0;
      if (!state.scores[s.student_id]) {
        state.scores[s.student_id] = {
          attendance: attendanceVal,
          quizzes: { q1: s.quiz1_score ?? '', q2: s.quiz2_score ?? '' },
          performances: { pt1: s.perf1_score ?? '' },
          firstExam: s.exam1_score ?? '',
          finalExam: s.exam2_score ?? ''
        };
      }
    });
  }
}

async function renderClassGradebookTable(scheduleId, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  let students = [];
  try {
    const response = await fetch(`${API_BASE_URL}/gradebook/${scheduleId}`);
    if (response.ok) {
      students = await response.json();
    } else {
      students = mockStudents;
    }
  } catch (err) {
    students = mockStudents;
  }
  if (!Array.isArray(students) || students.length === 0) {
    container.innerHTML = `<p style="color: #64748b;">No students enrolled in this section.</p>`;
    return;
  }

  // Sort: Male first, Female second, then alphabetically by lastname
  students.sort((a, b) => {
    if (a.gender !== b.gender) {
      return a.gender === 'Male' ? -1 : 1;
    }
    return a.lastname.localeCompare(b.lastname);
  });

  initScheduleState(scheduleId, students);
  const state = classGradebookState[scheduleId];
  const quizColsCount = state.quizzes.length;
  const perfColsCount = state.performances.length;
  const totalColumns = 6 + quizColsCount + perfColsCount;

  container.innerHTML = `
    <div style="margin-bottom: 14px; display: flex; gap: 10px;">
      <button class="btn btn-secondary btn-small" onclick="addAssessmentColumn(${scheduleId}, 'quizzes')">+ Add Quiz Column</button>
      <button class="btn btn-secondary btn-small" onclick="addAssessmentColumn(${scheduleId}, 'performances')">+ Add Performance Column</button>
    </div>
    <div style="overflow-x: auto;">
      <table class="data-table" style="width: 100%; border-collapse: collapse; text-align: center; font-size: 0.9rem;">
        <thead>
          <tr style="background-color: #f1f5f9; border-bottom: 1px solid #cbd5e1;">
            <th rowspan="2" style="text-align: left; padding: 8px;">LRN</th>
            <th rowspan="2" style="text-align: left; padding: 8px;">Student Name</th>
            <th rowspan="2" style="padding: 8px;">Attendance</th>
            <th colspan="${quizColsCount}" style="background-color: #e0f2fe; padding: 6px;">Quiz (20%)</th>
            <th colspan="${perfColsCount}" style="background-color: #fef3c7; padding: 6px;">Performance Task (50%)</th>
            <th colspan="2" style="background-color: #e2e8f0; padding: 6px;">Exam Score (30%)</th>
            <th rowspan="2" style="padding: 8px;">Calculated Grade</th>
          </tr>
          <tr style="background-color: #f8fafc; border-bottom: 2px solid #cbd5e1;">
            ${state.quizzes.map(q => `
              <th style="background-color: #f0f9ff; padding: 6px; font-weight: normal;">
                ${q.name}<br/><span style="font-size:0.75rem; color:#64748b;">(${q.maxPoints} pts)</span>
              </th>
            `).join('')}
            ${state.performances.map(p => `
              <th style="background-color: #fffbeb; padding: 6px; font-weight: normal;">
                ${p.name}<br/><span style="font-size:0.75rem; color:#64748b;">(${p.maxPoints} pts)</span>
              </th>
            `).join('')}
            <th style="background-color: #f1f5f9; padding: 6px; font-weight: normal;">First Exam<br/><span style="font-size:0.75rem; color:#64748b;">(100 pts)</span></th>
            <th style="background-color: #f1f5f9; padding: 6px; font-weight: normal;">Final Exam<br/><span style="font-size:0.75rem; color:#64748b;">(100 pts)</span></th>
          </tr>
        </thead>
        <tbody>
          ${students.map((s, index) => {
            const stScore = state.scores[s.student_id] || { attendance: 100, quizzes: {}, performances: {}, firstExam: '', finalExam: '' };
            
            let quizEarned = 0, quizTotalMax = 0;
            state.quizzes.forEach(q => {
              quizEarned += parseFloat(stScore.quizzes[q.id]) || 0;
              quizTotalMax += q.maxPoints;
            });
            const quizWeighted = quizTotalMax > 0 ? (quizEarned / quizTotalMax) * 20 : 0;

            let perfEarned = 0, perfTotalMax = 0;
            state.performances.forEach(p => {
              perfEarned += parseFloat(stScore.performances[p.id]) || 0;
              perfTotalMax += p.maxPoints;
            });
            const perfWeighted = perfTotalMax > 0 ? (perfEarned / perfTotalMax) * 50 : 0;

            const firstExam = parseFloat(stScore.firstExam) || 0;
            const finalExam = parseFloat(stScore.finalExam) || 0;
            const examAvg = (firstExam + finalExam) / 2;
            const examWeighted = (examAvg / 100) * 30;
            const finalGrade = Math.round(quizWeighted + perfWeighted + examWeighted);

            // Check if this row transition is from Male to Female to insert a separator row
            const isFirstFemale = s.gender === 'Female' && (index === 0 || students[index - 1].gender === 'Male');
            const spacerRow = isFirstFemale ? `
              <tr style="background-color: #f8fafc; height: 18px; border-top: 2px solid #cbd5e1; border-bottom: 2px solid #cbd5e1;">
                <td colspan="${totalColumns}" style="padding: 4px; font-weight: bold; color: #64748b; text-align: left; background: #f1f5f9; font-size: 0.8rem;">
                  FEMALE STUDENTS
                </td>
              </tr>
            ` : '';

            return spacerRow + `
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="text-align: left; padding: 6px;">${s.student_number || 'N/A'}</td>
                <td style="text-align: left; padding: 6px;"><strong>${s.lastname},${s.firstname}</strong></td>
                <td>
                  <select style="padding:0.2rem;" onchange="updateDynamicScore(${scheduleId},${s.student_id}, 'attendance', null, this.value)">
                    <option value="100" ${stScore.attendance == 100 ? 'selected' : ''}>Present</option>
                    <option value="50" ${stScore.attendance == 50 ? 'selected' : ''}>Late</option>
                    <option value="0" ${stScore.attendance == 0 ? 'selected' : ''}>Absent</option>
                  </select>
                </td>
                ${state.quizzes.map(q => `
                  <td style="background-color: #f0f9ff;">
                    <input type="number" style="width:50px; text-align:center; padding:0.2rem;" 
                      value="${stScore.quizzes[q.id] ?? ''}" 
                      placeholder="0-${q.maxPoints}"
                      onblur="updateDynamicScore(${scheduleId}, ${s.student_id}, 'quizzes', '${q.id}', this.value)" />
                  </td>
                `).join('')}
                ${state.performances.map(p => `
                  <td style="background-color: #fffbeb;">
                    <input type="number" style="width:50px; text-align:center; padding:0.2rem;" 
                      value="${stScore.performances[p.id] ?? ''}" 
                      placeholder="0-${p.maxPoints}"
                      onblur="updateDynamicScore(${scheduleId}, ${s.student_id}, 'performances', '${p.id}', this.value)" />
                  </td>
                `).join('')}
                <td style="background-color: #f8fafc;">
                  <input type="number" style="width:55px; text-align:center; padding:0.2rem;" 
                    value="${stScore.firstExam ?? ''}" 
                    placeholder="0-100"
                    onblur="updateDynamicScore(${scheduleId},${s.student_id}, 'firstExam', null, this.value)" />
                </td>
                <td style="background-color: #f8fafc;">
                  <input type="number" style="width:55px; text-align:center; padding:0.2rem;" 
                    value="${stScore.finalExam ?? ''}" 
                    placeholder="0-100"
                    onblur="updateDynamicScore(${scheduleId},${s.student_id}, 'finalExam', null, this.value)" />
                </td>
                <td><strong style="color: #0f766e; font-size: 1rem;">${finalGrade}%</strong></td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function addAssessmentColumn(scheduleId, type) {
  const state = classGradebookState[scheduleId];
  if (!state) return;
  const typeLabel = type === 'quizzes' ? 'Quiz' : 'Performance Task';
  const count = state[type].length + 1;
  const name = prompt(`Enter column title:`, `${typeLabel} ${count}`);
  if (!name) return;
  const maxPointsStr = prompt(`Enter maximum points for ${name}:`, `20`);
  const maxPoints = parseFloat(maxPointsStr);
  if (isNaN(maxPoints) || maxPoints <= 0) {
    alert('Please enter a valid numeric value for max points.');
    return;
  }
  const id = `${type === 'quizzes' ? 'q' : 'pt'}_${Date.now()}`;
  state[type].push({ id, name, maxPoints });
  renderClassGradebookTable(scheduleId, `gradebook-table-${scheduleId}`);
}

async function updateDynamicScore(scheduleId, studentId, category, itemId, value) {
  const state = classGradebookState[scheduleId];
  if (!state || !state.scores[studentId]) return;
  const scoreValue = parseFloat(value) || 0;

  if (category === 'quizzes' || category === 'performances') {
    state.scores[studentId][category][itemId] = scoreValue;
  } else {
    state.scores[studentId][category] = scoreValue;
  }

  renderClassGradebookTable(scheduleId, `gradebook-table-${scheduleId}`);

  let assessmentType = category;
  if (category === 'quizzes') {
    const qObj = state.quizzes.find(q => q.id === itemId);
    assessmentType = qObj ? qObj.name : 'Quiz';
  } else if (category === 'performances') {
    const pObj = state.performances.find(p => p.id === itemId);
    assessmentType = pObj ? pObj.name : 'Performance';
  } else if (category === 'firstExam') {
    assessmentType = 'First Exam';
  } else if (category === 'finalExam') {
    assessmentType = 'Final Exam';
  } else if (category === 'attendance') {
    assessmentType = 'Attendance';
  }

  try {
    await fetch(`${API_BASE_URL}/scores`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        student_id: studentId,
        schedule_id: scheduleId,
        assessment_type: assessmentType,
        item_id: itemId,
        score: scoreValue
      })
    });
  } catch (err) {
    console.warn('Server sync error, score cached locally:', err.message);
  }
}

async function loadAssessmentLogs() {
  let logs = [];
  try {
    const response = await fetch(`${API_BASE_URL}/assessment-logs`);
    if (response.ok) {
      logs = await response.json();
    }
  } catch (err) {
    console.error('Error loading assessment logs:', err);
  }
  const tbody = document.getElementById('assessmentLogTableBody');
  if (!tbody) return;
  if (!Array.isArray(logs) || logs.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;">No assessment logs available.</td></tr>`;
    return;
  }
  tbody.innerHTML = logs.map(l => `
    <tr>
      <td>${l.log_id || l.id}</td>
      <td>${new Date(l.timestamp).toLocaleString()}</td>
      <td>${l.student_name || 'Unknown'}</td>
      <td>${l.section_name || 'N/A'}</td>
      <td>${l.assessment_event || l.behavior || 'Monitored'}</td>
      <td>${l.status || 'Verified'}</td>
    </tr>
  `).join('');
}

function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.remove('hidden');
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.add('hidden');
}