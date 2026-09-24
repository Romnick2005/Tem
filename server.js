const app = require('./app');
const db = require('./db');

/* ==========================================================================
   1. SECTION & TEACHER ROUTES
   ========================================================================== */
app.get('/api/sections', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM section');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/teachers', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT teacher_id, firstname, lastname, teacher_category FROM teacher');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const [teachers] = await db.query(
      `SELECT t.*, aa.section_id AS advisory_section_id 
       FROM teacher t 
       LEFT JOIN advisory_assignment aa ON t.teacher_id = aa.teacher_id 
       WHERE t.email = ? AND t.password_hash = ?`,
      [email, password]
    );
    if (teachers.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    res.json({ user: teachers[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/teachers', async (req, res) => {
  const { firstname, middlename, lastname, email, password_hash, teacher_category, advisory_section_id } = req.body;
  try {
    const [result] = await db.query(
      `INSERT INTO teacher (firstname, middlename, lastname, email, password_hash, teacher_category) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [firstname, middlename, lastname, email, password_hash, teacher_category]
    );
    const newTeacherId = result.insertId;
    if (teacher_category === 'Teacher with Advisory' && advisory_section_id) {
      await db.query(
        `INSERT INTO advisory_assignment (teacher_id, section_id) VALUES (?, ?)`,
        [newTeacherId, advisory_section_id]
      );
    }
    res.json({ message: 'Teacher registered successfully', teacher_id: newTeacherId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ==========================================================================
   2. STUDENT MANAGEMENT ROUTES
   ========================================================================== */
// Get students (Optionally filtered by section, sorted Male -> Female, Alphabetical)
app.get('/api/students', async (req, res) => {
  const { section_id } = req.query;
  try {
    let sql = `
      SELECT s.*, sec.section_name 
      FROM student s
      LEFT JOIN section sec ON s.section_id = sec.section_id
    `;
    const params = [];
    if (section_id) {
      sql += ` WHERE s.section_id = ?`;
      params.push(section_id);
    }
    
    // Sort Male first (gender DESC), then by Lastname and Firstname ASC
    sql += ` ORDER BY s.gender DESC, s.lastname ASC, s.firstname ASC`;

    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/students', async (req, res) => {
  const { student_number, firstname, middlename, lastname, gender, section_id, face_image_url } = req.body;
  try {
    const [result] = await db.query(
      `INSERT INTO student (student_number, firstname, middlename, lastname, gender, section_id, face_image_url)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [student_number, firstname, middlename, lastname, gender, section_id, face_image_url]
    );
    res.json({ message: 'Student created successfully', student_id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/students/:id', async (req, res) => {
  const { student_number, firstname, middlename, lastname, gender, section_id, face_image_url } = req.body;
  try {
    await db.query(
      `UPDATE student 
       SET student_number = ?, firstname = ?, middlename = ?, lastname = ?, gender = ?, section_id = ?, face_image_url = ?
       WHERE student_id = ?`,
      [student_number, firstname, middlename, lastname, gender, section_id, face_image_url, req.params.id]
    );
    res.json({ message: 'Student updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/students/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM student WHERE student_id = ?', [req.params.id]);
    res.json({ message: 'Student deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ==========================================================================
   3. CLASS SCHEDULE ROUTES
   ========================================================================== */
app.get('/api/class-schedules', async (req, res) => {
  const { section_id, teacher_id } = req.query;
  try {
    let sql = `
      SELECT cs.*, sec.section_name, CONCAT(t.firstname, ' ', t.lastname) AS teacher_name
      FROM class_schedule cs
      LEFT JOIN section sec ON cs.section_id = sec.section_id
      LEFT JOIN teacher t ON cs.teacher_id = t.teacher_id
    `;
    const params = [];
    const conditions = [];
    if (section_id) {
      conditions.push(`cs.section_id = ?`);
      params.push(section_id);
    }
    if (teacher_id) {
      conditions.push(`cs.teacher_id = ?`);
      params.push(teacher_id);
    }
    if (conditions.length > 0) {
      sql += ` WHERE ` + conditions.join(' AND ');
    }
    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/class-schedules', async (req, res) => {
  const { subject_name, section_id, teacher_id, day_of_week, start_time, end_time } = req.body;
  try {
    const [result] = await db.query(
      `INSERT INTO class_schedule (subject_name, section_id, teacher_id, day_of_week, start_time, end_time)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [subject_name, section_id, teacher_id, day_of_week, start_time, end_time]
    );
    res.json({ message: 'Schedule created', schedule_id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/class-schedules/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM class_schedule WHERE schedule_id = ?', [req.params.id]);
    res.json({ message: 'Schedule deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/teachers/:teacherId/classes', async (req, res) => {
  const { teacherId } = req.params;
  try {
    const [rows] = await db.query(
      `SELECT cs.*, sec.section_name, sec.grade_level 
       FROM class_schedule cs
       JOIN section sec ON cs.section_id = sec.section_id
       WHERE cs.teacher_id = ?`,
      [teacherId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ==========================================================================
   4. GRADEBOOK & FACE DESCRIPTOR STORE/FETCH
   ========================================================================== */
// Gradebook Endpoint
app.get('/api/gradebook/:scheduleId', async (req, res) => {
  const { scheduleId } = req.params;
  try {
    const [schedRows] = await db.query(
      'SELECT section_id FROM class_schedule WHERE schedule_id = ?',
      [scheduleId]
    );
    if (schedRows.length === 0) {
      return res.status(404).json({ error: 'Schedule not found' });
    }
    const sectionId = schedRows[0].section_id;
    
    // UPDATED QUERY: Sort by Gender (Male first, Female second) then Alphabetically
    const [students] = await db.query(
      `SELECT student_id, student_number, firstname, lastname, gender 
       FROM student 
       WHERE section_id = ? 
       ORDER BY FIELD(gender, 'Male', 'Female') ASC, lastname ASC, firstname ASC`,
      [sectionId]
    );
    const [records] = await db.query(
      `SELECT student_id, category, score 
       FROM student_academic_record 
       WHERE schedule_id = ?`,
      [scheduleId]
    );
    const result = students.map((student) => {
      const studentRecords = records.filter((r) => r.student_id === student.student_id);
      const findScore = (categories) => {
        const rec = studentRecords.find((r) => categories.includes(r.category));
        return rec ? rec.score : null;
      };
      return {
        student_id: student.student_id,
        student_number: student.student_number,
        firstname: student.firstname,
        lastname: student.lastname,
        gender: student.gender,
        attendance_status: findScore(['Attendance']),
        quiz1_score: findScore(['Quiz 1', 'Quiz']),
        quiz2_score: findScore(['Quiz 2']),
        perf1_score: findScore(['Performance Task 1', 'Performance']),
        exam1_score: findScore(['First Exam', 'Exam']),
        exam2_score: findScore(['Final Exam']),
      };
    });
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error: ' + error.message });
  }
});

app.post('/api/students/:id/face-descriptor', async (req, res) => {
  const { id } = req.params;
  const { descriptor } = req.body;
  try {
    const descriptorString = JSON.stringify(descriptor);
    await db.query(
      'UPDATE student SET face_descriptor = ? WHERE student_id = ?',
      [descriptorString, id]
    );
    res.json({ message: 'Face descriptor saved successfully!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/gradebook/:scheduleId/face-descriptors', async (req, res) => {
  const { scheduleId } = req.params;
  try {
    const [students] = await db.query(
      `SELECT s.student_id, s.firstname, s.lastname, s.face_descriptor 
       FROM student s
       JOIN class_schedule cs ON cs.section_id = s.section_id
       WHERE cs.schedule_id = ? AND s.face_descriptor IS NOT NULL`,
      [scheduleId]
    );
    res.json(students);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/scores', async (req, res) => {
  const { student_id, schedule_id, assessment_type, score } = req.body;
  try {
    const [sched] = await db.query(
      'SELECT teacher_id FROM class_schedule WHERE schedule_id = ?', 
      [schedule_id]
    );
    const teacher_id = sched.length > 0 ? sched[0].teacher_id : null;
    const [existing] = await db.query(
      `SELECT record_id FROM student_academic_record 
       WHERE student_id = ? AND schedule_id = ? AND category = ?`,
      [student_id, schedule_id, assessment_type]
    );
    if (existing.length > 0) {
      await db.query(
        `UPDATE student_academic_record SET score = ? WHERE record_id = ?`,
        [score, existing[0].record_id]
      );
    } else {
      await db.query(
        `INSERT INTO student_academic_record 
         (student_id, schedule_id, teacher_id, category, title, score, max_score)
         VALUES (?, ?, ?, ?, ?, ?, 100)`,
        [student_id, schedule_id, teacher_id, assessment_type, assessment_type, score]
      );
    }
    res.json({ message: 'Score updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ==========================================================================
   5. CAMERA LOGS & FALLBACKS
   ========================================================================== */
app.get('/api/assessment-logs', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT 
         cal.assessment_id AS log_id,
         cal.timestamp,
         CONCAT(s.firstname, ' ', s.lastname) AS student_name,
         sec.section_name,
         CONCAT('Mood: ', cal.student_mood, ' | Interaction: ', cal.student_interaction) AS assessment_event,
         cal.remarks AS status
       FROM camera_assessment_log cal
       LEFT JOIN student s ON cal.student_id = s.student_id
       LEFT JOIN section sec ON s.section_id = sec.section_id
       ORDER BY cal.timestamp DESC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.use('/api/*splat', (req, res) => {
  res.status(404).json({ error: `API route not found: ${req.originalUrl}` });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});