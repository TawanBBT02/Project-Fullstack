// ไฟล์: backend/server.js
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 5000; // หลังบ้านรันพอร์ต 5000

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// เชื่อมต่อฐานข้อมูล
const dbPath = path.join(__dirname, '../Database/project.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) console.error('❌ Backend: ต่อฐานข้อมูลไม่ได้:', err.message);
    else console.log('✅ Backend: เชื่อมต่อฐานข้อมูล project.sqlite สำเร็จ!');
});

// --- โซนสร้าง API ---
// ทดสอบ API ว่าทำงานไหม
app.get('/api/test', (req, res) => {
    res.json({ message: "สวัสดีจาก Backend API! ระบบเชื่อมต่อสำเร็จ" });
});

// ==========================================
// 📊 API สำหรับข้อมูลหน้า Dashboard (หน้าแรก)
// ==========================================
app.get('/api/dashboard', (req, res) => {
    // ใช้คำสั่ง SQL นับจำนวนงานซ่อมในแต่ละสถานะ
    const sql = `
        SELECT 
            COUNT(*) as totalRepairs,
            SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) as pendingRepairs,
            SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) as completedRepairs
        FROM Repairs
    `;
    
    db.get(sql, [], (err, row) => {
        if (err) {
            console.error("Dashboard Database Error:", err.message);
            return res.status(500).json({ success: false, message: "ดึงข้อมูลสถิติไม่สำเร็จ" });
        }
        // ส่งตัวเลขสรุปยอดกลับไปให้หน้าเว็บ
        res.json({ success: true, data: row });
    });
});

// ==========================================
// 🔐 API สำหรับตรวจสอบการ Login
// ==========================================
app.post('/api/login', (req, res) => {
    // 1. รับค่า email และ password จากหน้าเว็บ
    const { email, password } = req.body;

    console.log(`Backend ได้รับข้อมูล: อีเมล=${email} , รหัสผ่าน=${password}`);

    // 2. ค้นหาในฐานข้อมูล 
    // ⚠️ สำคัญมาก: ถ้าในฐานข้อมูลของคุณ ช่องล็อกอินไม่ได้ชื่อ email (เช่น ชื่อ username) ให้แก้คำว่า email = ? เป็นชื่อนั้นนะครับ
    const sql = `SELECT * FROM Users WHERE email = ? AND password = ?`;
    
    db.get(sql, [email, password], (err, user) => {
        if (err) {
            console.error("Database Error:", err);
            return res.status(500).json({ success: false, message: "ระบบฐานข้อมูลมีปัญหา" });
        }
        
        if (!user) {
            console.log("❌ รหัสผ่านผิด หรือไม่มีอีเมลนี้");
            return res.status(401).json({ success: false, message: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" });
        }

        console.log("✅ ล็อกอินสำเร็จ!");
        res.json({ 
            success: true, 
            user: { 
                id: user.user_id, 
                email: user.email, // หรือ user.username ตามคอลัมน์ของคุณ
                role: user.role
            } 
        });
    });
});

// ==========================================
// ➕ API สมัครสมาชิกใหม่ (แบบมี Email)
// ==========================================
app.post('/api/signup', (req, res) => {
    // 🌟 รับค่า email มาจากหน้าเว็บด้วย
    const { username, email, password } = req.body;

    // 1. เช็คก่อนว่ามี Username หรือ Email นี้ในระบบหรือยัง?
    const checkSql = `SELECT * FROM Users WHERE username = ? OR email = ?`;
    db.get(checkSql, [username, email], (err, row) => {
        if (err) return res.status(500).json({ success: false, message: "ฐานข้อมูลมีปัญหา" });
        
        if (row) {
            // ดักทีละเคสว่าอะไรซ้ำ
            if (row.username === username) {
                return res.status(400).json({ success: false, message: "ชื่อผู้ใช้งาน (Username) นี้มีคนใช้แล้ว!" });
            }
            if (row.email === email) {
                return res.status(400).json({ success: false, message: "อีเมล (Email) นี้ถูกใช้สมัครไปแล้ว!" });
            }
        }

        // 2. ถ้ายังไม่มี ให้บันทึกลงฐานข้อมูล (🌟 เพิ่ม email เข้าไปในคำสั่ง SQL)
        const insertSql = `INSERT INTO Users (username, email, password) VALUES (?, ?, ?)`;
        db.run(insertSql, [username, email, password], function(err) {
            if (err) {
                console.error("Signup Error:", err.message);
                return res.status(500).json({ success: false, message: "สมัครสมาชิกไม่สำเร็จ" });
            }
            res.json({ success: true, message: "สมัครสมาชิกสำเร็จ! กรุณาเข้าสู่ระบบ" });
        });
    });
});

// ==========================================
// 💻 API สำหรับดึงข้อมูลอุปกรณ์ทั้งหมด (พร้อมชื่อเจ้าของ)
// ==========================================
app.get('/api/devices', (req, res) => {
    // ใช้ JOIN เพื่อดึงชื่อลูกค้า (Customers) มาแสดงคู่กับอุปกรณ์ (Devices)
    const sql = `
        SELECT d.*, 
               c.first_name, c.last_name, c.phone 
        FROM Devices d
        LEFT JOIN Customers c ON d.customer_id = c.customer_id
        ORDER BY d.device_id DESC
    `;
    
    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error("Devices Database Error:", err.message);
            return res.status(500).json({ success: false, message: "ดึงข้อมูลอุปกรณ์ไม่สำเร็จ" });
        }
        res.json({ success: true, data: rows });
    });
});

// ==========================================
// ➕ API สำหรับเพิ่มข้อมูลอุปกรณ์ใหม่
// ==========================================
app.post('/api/devices', (req, res) => {
    // หน้าเว็บยังส่ง type มาเหมือนเดิมได้ ไม่เป็นไร
    const { customer_id, device_type, brand, model, type } = req.body;
    
    // 🌟 เอาคำว่า type ออกจากคำสั่ง SQL เพราะฐานข้อมูลเราไม่มีคอลัมน์นี้
    const sql = `INSERT INTO Devices (customer_id, device_type, brand, model) VALUES (?, ?, ?, ?)`;
    
    // 🌟 ส่งค่าไปบันทึกแค่ 4 ตัว ให้ตรงกับเครื่องหมาย ?
    db.run(sql, [customer_id, device_type, brand, model], function(err) {
        if (err) {
            console.error("Add Device Error:", err.message);
            return res.status(500).json({ success: false, message: "บันทึกข้อมูลอุปกรณ์ไม่สำเร็จ" });
        }
        res.json({ success: true, message: "เพิ่มข้อมูลอุปกรณ์ใหม่เรียบร้อยแล้ว!" });
    });
});

// ==========================================
// ✏️ API ดึงข้อมูลอุปกรณ์ 1 รายการ (เพื่อเอาไปโชว์ในช่องแก้ไข)
// ==========================================
app.get('/api/devices/:id', (req, res) => {
    const sql = `SELECT * FROM Devices WHERE device_id = ?`;
    db.get(sql, [req.params.id], (err, row) => {
        if (err) return res.status(500).json({ success: false, message: "ฐานข้อมูลมีปัญหา" });
        if (!row) return res.status(404).json({ success: false, message: "ไม่พบข้อมูลอุปกรณ์" });
        res.json({ success: true, data: row });
    });
});

// ==========================================
// ✏️ API สำหรับอัปเดตข้อมูลอุปกรณ์ (ใช้ PUT)
// ==========================================
app.put('/api/devices/:id', (req, res) => {
    const deviceId = req.params.id;
    // 🌟 รับค่า device_type จากฟอร์มหน้าเว็บมาด้วย
    const { customer_id, device_type, brand, model } = req.body;

    // 🌟 เติม device_type เข้าไปในคำสั่ง UPDATE
    const sql = `UPDATE Devices SET customer_id = ?, device_type = ?, brand = ?, model = ? WHERE device_id = ?`;
    
    // 🌟 เรียงลำดับตัวแปรให้ตรงกับเครื่องหมาย ? ใน SQL
    db.run(sql, [customer_id, device_type, brand, model, deviceId], function(err) {
        if (err) {
            console.error("Update Device Error:", err.message);
            return res.status(500).json({ success: false, message: "อัปเดตข้อมูลอุปกรณ์ไม่สำเร็จ" });
        }
        res.json({ success: true, message: "อัปเดตข้อมูลอุปกรณ์เรียบร้อยแล้ว!" });
    });
});
// ==========================================
// 👥 API สำหรับดึงข้อมูลลูกค้าทั้งหมด
// ==========================================
app.get('/api/customers', (req, res) => {
    // ดึงข้อมูลลูกค้า เรียงจากคนล่าสุดที่เพิ่งเพิ่ม (DESC)
    const sql = `SELECT * FROM Customers ORDER BY customer_id DESC`;
    
    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error("Customers Database Error:", err.message);
            return res.status(500).json({ success: false, message: "ดึงข้อมูลลูกค้าไม่สำเร็จ" });
        }
        // พ่นข้อมูลออกไปเป็น JSON
        res.json({ success: true, data: rows });
    });
});

// ==========================================
// ➕ API สำหรับเพิ่มข้อมูลลูกค้าใหม่
// ==========================================
app.post('/api/customers', (req, res) => {
    // 1. รับแกะกล่องพัสดุที่หน้าบ้านส่งมา
    const { first_name, last_name, phone, email, address } = req.body;

    // 2. สั่ง SQL เอาข้อมูลยัดลงตาราง
    const sql = `INSERT INTO Customers (first_name, last_name, phone, email, address) VALUES (?, ?, ?, ?, ?)`;
    
    db.run(sql, [first_name, last_name, phone, email, address], function(err) {
        if (err) {
            console.error("Add Customer Error:", err.message);
            return res.status(500).json({ success: false, message: "บันทึกข้อมูลไม่สำเร็จ" });
        }
        // ถ้าเสร็จแล้ว ส่งสัญญาณบอกหน้าบ้านว่า "เรียบร้อย!"
        res.json({ success: true, message: "เพิ่มลูกค้าสำเร็จ!", customer_id: this.lastID });
    });
});

// ==========================================
// ✏️ API ดึงข้อมูลลูกค้า 1 คน (เพื่อเอาไปโชว์ในช่องแก้ไข)
// ==========================================
app.get('/api/customers/:id', (req, res) => {
    const sql = `SELECT * FROM Customers WHERE customer_id = ?`;
    db.get(sql, [req.params.id], (err, row) => {
        if (err) return res.status(500).json({ success: false, message: "ฐานข้อมูลมีปัญหา" });
        if (!row) return res.status(404).json({ success: false, message: "ไม่พบข้อมูลลูกค้า" });
        res.json({ success: true, data: row });
    });
});

// ==========================================
// ✏️ API สำหรับอัปเดตข้อมูลลูกค้า (ใช้ PUT)
// ==========================================
app.put('/api/customers/:id', (req, res) => {
    const customerId = req.params.id;
    const { first_name, last_name, phone, email, address } = req.body;

    const sql = `UPDATE Customers SET first_name = ?, last_name = ?, phone = ?, email = ?, address = ? WHERE customer_id = ?`;
    
    db.run(sql, [first_name, last_name, phone, email, address, customerId], function(err) {
        if (err) {
            console.error("Update Customer Error:", err.message);
            return res.status(500).json({ success: false, message: "อัปเดตข้อมูลไม่สำเร็จ" });
        }
        res.json({ success: true, message: "แก้ไขข้อมูลลูกค้าเรียบร้อยแล้ว!" });
    });
});

// ==========================================
// 🔧 API สำหรับดึงข้อมูลช่างซ่อมทั้งหมด
// ==========================================
app.get('/api/technicians', (req, res) => {
    // ดึงข้อมูลจากตาราง Technicians
    const sql = `SELECT * FROM Technicians ORDER BY technician_id DESC`;
    
    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error("Technicians Database Error:", err.message);
            return res.status(500).json({ success: false, message: "ดึงข้อมูลช่างซ่อมไม่สำเร็จ" });
        }
        res.json({ success: true, data: rows });
    });
});

// ==========================================
// ➕ API สำหรับเพิ่มช่างซ่อมใหม่
// ==========================================
app.post('/api/technicians', (req, res) => {
    // 🌟 เปลี่ยน specialty เป็น email
    const { first_name, last_name, phone, email, hire_date } = req.body;
    
    // 🌟 แก้คำสั่ง SQL ให้บันทึก email แทน
    const sql = `INSERT INTO Technicians (first_name, last_name, phone, email, hire_date) VALUES (?, ?, ?, ?, ?)`;
    
    db.run(sql, [first_name, last_name, phone, email, hire_date], function(err) {
        if (err) {
            console.error("Add Tech Error:", err.message);
            return res.status(500).json({ success: false, message: "เพิ่มข้อมูลช่างไม่สำเร็จ" });
        }
        res.json({ success: true, message: "เพิ่มข้อมูลช่างซ่อมเรียบร้อยแล้ว!" });
    });
});

// ==========================================
// ✏️ API ดึงข้อมูลช่างซ่อม 1 คน (เพื่อเอาไปโชว์ในช่องแก้ไข)
// ==========================================
app.get('/api/technicians/:id', (req, res) => {
    const sql = `SELECT * FROM Technicians WHERE technician_id = ?`;
    db.get(sql, [req.params.id], (err, row) => {
        if (err) return res.status(500).json({ success: false, message: "ฐานข้อมูลมีปัญหา" });
        if (!row) return res.status(404).json({ success: false, message: "ไม่พบข้อมูลช่างซ่อม" });
        res.json({ success: true, data: row });
    });
});

// ==========================================
// ✏️ API สำหรับอัปเดตข้อมูลช่างซ่อม (ใช้ PUT)
// ==========================================
app.put('/api/technicians/:id', (req, res) => {
    const techId = req.params.id;
    // 🌟 รับค่า hire_date มาจากหน้าเว็บ (แทน specialty)
    const { first_name, last_name, phone, email, hire_date } = req.body;

    // 🌟 อัปเดตคำสั่ง SQL ให้บันทึก email และ hire_date
    const sql = `UPDATE Technicians SET first_name = ?, last_name = ?, phone = ?, email = ?, hire_date = ? WHERE technician_id = ?`;
    
    db.run(sql, [first_name, last_name, phone, email, hire_date, techId], function(err) {
        if (err) {
            console.error("Update Tech Error:", err.message);
            return res.status(500).json({ success: false, message: "อัปเดตข้อมูลช่างไม่สำเร็จ" });
        }
        res.json({ success: true, message: "อัปเดตข้อมูลช่างซ่อมเรียบร้อยแล้ว!" });
    });
});

// ==========================================
// 📋 API ดึงข้อมูลงานซ่อมทั้งหมด (ใช้ในหน้ารายการ และ Dashboard)
// ==========================================
app.get('/api/repairs', (req, res) => {
    // 🌟 เติม c.phone เข้าไปในบรรทัด SELECT ครับ
    const sql = `
        SELECT r.repair_id, r.receive_date, r.problem_type, r.status, 
               d.device_type, d.brand, d.model,
               c.first_name, c.last_name, c.phone,
               t.first_name AS tech_first
        FROM Repairs r
        LEFT JOIN Devices d ON r.device_id = d.device_id
        LEFT JOIN Customers c ON d.customer_id = c.customer_id
        LEFT JOIN Technicians t ON r.technician_id = t.technician_id
        ORDER BY r.repair_id DESC
    `;
    
    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error("Get All Repairs Error:", err.message);
            return res.status(500).json({ success: false, message: "ฐานข้อมูลมีปัญหา" });
        }
        res.json({ success: true, data: rows });
    });
});

// ==========================================
// ➕ API สำหรับเปิดบิลงานซ่อมใหม่
// ==========================================
app.post('/api/repairs', (req, res) => {
    // รับค่ามาจากฟอร์มหน้าเว็บ
    const { device_id, technician_id, receive_date, description, status } = req.body;
    
    // 🌟 เปลี่ยนชื่อคอลัมน์จาก description เป็น problem_type ให้ตรงกับฐานข้อมูลของคุณ
    const sql = `INSERT INTO Repairs (device_id, technician_id, receive_date, problem_type, status) VALUES (?, ?, ?, ?, ?)`;
    
    db.run(sql, [device_id, technician_id, receive_date, description, status], function(err) {
        if (err) {
            console.error("Add Repair Error:", err.message);
            return res.status(500).json({ success: false, message: "บันทึกข้อมูลงานซ่อมไม่สำเร็จ" });
        }
        res.json({ success: true, message: "เปิดงานซ่อมใหม่สำเร็จ!", repair_id: this.lastID });
    });
});

// ==========================================
// ✏️ API สำหรับอัปเดตข้อมูลงานซ่อม (ใช้ PUT)
// ==========================================
app.put('/api/repairs/:id', (req, res) => {
    const repairId = req.params.id;
    const { device_id, technician_id, receive_date, description, status } = req.body;

    // 🌟 เปลี่ยนชื่อคอลัมน์ตรงนี้เป็น problem_type ด้วยเช่นกัน
    const sql = `UPDATE Repairs SET device_id = ?, technician_id = ?, receive_date = ?, problem_type = ?, status = ? WHERE repair_id = ?`;
    
    db.run(sql, [device_id, technician_id, receive_date, description, status, repairId], function(err) {
        if (err) {
            console.error("Update Repair Error:", err.message);
            return res.status(500).json({ success: false, message: "อัปเดตข้อมูลงานซ่อมไม่สำเร็จ" });
        }
        res.json({ success: true, message: "อัปเดตสถานะงานซ่อมเรียบร้อยแล้ว!" });
    });
});

// ==========================================
// 🔍 API ดึงข้อมูลรายละเอียดงานซ่อม (ตัวเดียวจบ ครอบจักรวาล)
// ==========================================
app.get('/api/repairs/:id', (req, res) => {
    const sql = `
        SELECT r.*,
               d.device_type, d.brand, d.model,
               c.first_name, c.last_name, c.phone, c.email, c.address,
               t.first_name AS tech_first, t.last_name AS tech_last, t.phone AS tech_phone,
               p.payment_id, p.total_cost AS amount, p.payment_status
        FROM Repairs r
        LEFT JOIN Devices d ON r.device_id = d.device_id
        LEFT JOIN Customers c ON d.customer_id = c.customer_id
        LEFT JOIN Technicians t ON r.technician_id = t.technician_id
        LEFT JOIN Payments p ON r.repair_id = p.repair_id
        WHERE r.repair_id = ?
    `;
    
    const repairId = Number(req.params.id);

    db.get(sql, [repairId], (err, row) => {
        if (err) {
            console.error("Repair Details Error:", err.message);
            return res.status(500).json({ success: false, message: "ฐานข้อมูลมีปัญหา" });
        }
        if (!row) return res.status(404).json({ success: false, message: "ไม่พบข้อมูลงานซ่อม" });
        res.json({ success: true, data: row });
    });
});

// ==========================================
// 💳 API สำหรับดึงข้อมูลการชำระเงินทั้งหมด
// ==========================================
app.get('/api/payments', (req, res) => {
    // 🌟 เปลี่ยนมาเจาะจงคอลัมน์ total_cost และ payment_status
    const sql = `
        SELECT p.payment_id, 
               p.repair_id, 
               p.total_cost AS amount,        /* ดึงยอดเงิน */
               p.payment_date, 
               p.payment_status AS status,    /* ดึงสถานะบิล */
               r.status AS repair_status,
               c.first_name, c.last_name
        FROM Payments p
        LEFT JOIN Repairs r ON p.repair_id = r.repair_id
        LEFT JOIN Devices d ON r.device_id = d.device_id
        LEFT JOIN Customers c ON d.customer_id = c.customer_id
        ORDER BY p.payment_date DESC, p.payment_id DESC
    `;
    
    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error("Payments Database Error:", err.message);
            return res.status(500).json({ success: false, message: "ดึงข้อมูลการชำระเงินไม่สำเร็จ" });
        }
        res.json({ success: true, data: rows });
    });
});

// ==========================================
// ➕ API สำหรับเพิ่มข้อมูลการชำระเงิน (บิลใหม่)
// ==========================================
app.post('/api/payments', (req, res) => {
    // 1. รับข้อมูลจากหน้าฟอร์ม
    const { repair_id, amount, payment_method, payment_date, status } = req.body;

    // 2. สั่งบันทึกลงตาราง Payments
    const sql = `INSERT INTO Payments (repair_id, amount, payment_method, payment_date, status) VALUES (?, ?, ?, ?, ?)`;
    
    db.run(sql, [repair_id, amount, payment_method, payment_date, status], function(err) {
        if (err) {
            console.error("Add Payment Error:", err.message);
            return res.status(500).json({ success: false, message: "บันทึกข้อมูลการชำระเงินไม่สำเร็จ" });
        }
        res.json({ success: true, message: "รับชำระเงินสำเร็จ!", payment_id: this.lastID });
    });
});

// ==========================================
// ✏️ API ดึงข้อมูลบิล 1 รายการ (เพื่อเอาไปโชว์ในช่องแก้ไข)
// ==========================================
app.get('/api/payments/:id', (req, res) => {
    const sql = `SELECT * FROM Payments WHERE payment_id = ?`;
    db.get(sql, [req.params.id], (err, row) => {
        if (err) return res.status(500).json({ success: false, message: "ฐานข้อมูลมีปัญหา" });
        if (!row) return res.status(404).json({ success: false, message: "ไม่พบข้อมูลบิลชำระเงิน" });
        res.json({ success: true, data: row });
    });
});

// ==========================================
// ✏️ API สำหรับอัปเดตข้อมูลการชำระเงิน (ใช้ PUT)
// ==========================================
app.put('/api/payments/:id', (req, res) => {
    const paymentId = req.params.id;
    const { repair_id, amount, payment_method, payment_date, status } = req.body;

    const sql = `UPDATE Payments SET repair_id = ?, amount = ?, payment_method = ?, payment_date = ?, status = ? WHERE payment_id = ?`;
    
    db.run(sql, [repair_id, amount, payment_method, payment_date, status, paymentId], function(err) {
        if (err) {
            console.error("Update Payment Error:", err.message);
            return res.status(500).json({ success: false, message: "อัปเดตข้อมูลการชำระเงินไม่สำเร็จ" });
        }
        res.json({ success: true, message: "แก้ไขข้อมูลการรับเงินเรียบร้อยแล้ว!" });
    });
});

// ==========================================
// 📊 API สำหรับรายงานการแจ้งซ่อม (กรองตามวันที่ และ ช่างได้)
// ==========================================
app.get('/api/reports/repairs', (req, res) => {
    // 🌟 รับค่า technicianId เพิ่มเติม
    const { startDate, endDate, technicianId } = req.query; 

    let sql = `
        SELECT r.repair_id, r.receive_date, r.status,
               c.first_name, c.last_name,
               d.brand, d.model,
               p.total_cost AS amount,
               t.first_name AS tech_first, t.last_name AS tech_last
        FROM Repairs r
        LEFT JOIN Devices d ON r.device_id = d.device_id
        LEFT JOIN Customers c ON d.customer_id = c.customer_id
        LEFT JOIN Payments p ON r.repair_id = p.repair_id
        LEFT JOIN Technicians t ON r.technician_id = t.technician_id
        WHERE 1=1
    `;
    const params = [];

    // 1. กรองตามวันที่
    if (startDate && endDate) {
        sql += ` AND r.receive_date BETWEEN ? AND ?`;
        params.push(startDate, endDate);
    }

    // 🌟 2. กรองตามช่าง (ถ้ามีการเลือกช่างมา)
    if (technicianId) {
        sql += ` AND t.technician_id = ?`;
        params.push(technicianId);
    }

    sql += ` ORDER BY t.first_name ASC, r.receive_date DESC`; 
    
    db.all(sql, params, (err, rows) => {
        if (err) {
            console.error("Report Error:", err.message);
            return res.status(500).json({ success: false, message: "ดึงข้อมูลรายงานไม่สำเร็จ" });
        }
        res.json({ success: true, data: rows });
    });
});

// ==========================================
// 💰 API สำหรับรายงานรายรับ (ดูตามช่างล้วนๆ)
// ==========================================
app.get('/api/reports/revenue', (req, res) => {
    const { technicianId } = req.query;

    let sql = `
        SELECT p.payment_id, 
               p.payment_date, 
               p.total_cost AS amount,
               p.payment_status AS status,
               r.repair_id,
               c.first_name, c.last_name,
               t.technician_id, t.first_name AS tech_first, t.last_name AS tech_last
        FROM Payments p
        LEFT JOIN Repairs r ON p.repair_id = r.repair_id
        LEFT JOIN Devices d ON r.device_id = d.device_id       /* 🌟 1. เพิ่มบรรทัดนี้เพื่อเชื่อมไปหาอุปกรณ์ก่อน */
        LEFT JOIN Customers c ON d.customer_id = c.customer_id /* 🌟 2. แก้ตัว r เป็นตัว d ตรงนี้ครับ */
        LEFT JOIN Technicians t ON r.technician_id = t.technician_id
        WHERE 1=1
    `;
    const params = [];

    // กรองตามช่าง
    if (technicianId) {
        sql += ` AND t.technician_id = ?`;
        params.push(technicianId);
    }

    // จัดเรียง
    sql += ` ORDER BY t.first_name ASC, p.payment_date DESC`; 
    
    db.all(sql, params, (err, rows) => {
        if (err) {
            console.error("Revenue Report Error:", err.message);
            return res.status(500).json({ success: false, message: "ดึงข้อมูลรายงานรายรับไม่สำเร็จ" });
        }
        res.json({ success: true, data: rows });
    });
});

// ==========================================
// 🗑️ API สำหรับลบข้อมูล (Delete) ทั้ง 5 ตาราง
// ==========================================

// 1. ลบลูกค้า
app.delete('/api/customers/:id', (req, res) => {
    db.run(`DELETE FROM Customers WHERE customer_id = ?`, [req.params.id], function(err) {
        if (err) return res.status(500).json({ success: false, message: "ลบลูกค้าไม่สำเร็จ (อาจมีข้อมูลอุปกรณ์ผูกอยู่)" });
        res.json({ success: true, message: "ลบข้อมูลลูกค้าเรียบร้อยแล้ว!" });
    });
});

// 2. ลบอุปกรณ์
app.delete('/api/devices/:id', (req, res) => {
    db.run(`DELETE FROM Devices WHERE device_id = ?`, [req.params.id], function(err) {
        if (err) return res.status(500).json({ success: false, message: "ลบอุปกรณ์ไม่สำเร็จ" });
        res.json({ success: true, message: "ลบข้อมูลอุปกรณ์เรียบร้อยแล้ว!" });
    });
});

// 3. ลบช่างซ่อม
app.delete('/api/technicians/:id', (req, res) => {
    db.run(`DELETE FROM Technicians WHERE technician_id = ?`, [req.params.id], function(err) {
        if (err) return res.status(500).json({ success: false, message: "ลบช่างซ่อมไม่สำเร็จ" });
        res.json({ success: true, message: "ลบข้อมูลช่างเรียบร้อยแล้ว!" });
    });
});

// 4. ลบงานซ่อม
// ==========================================
// 🗑️ API ลบข้อมูลงานซ่อม (พร้อมลบรายการชำระเงินที่เกี่ยวข้อง)
// ==========================================
app.delete('/api/repairs/:id', (req, res) => {
    const repairId = req.params.id;

    // จังหวะที่ 1: ลบบิลชำระเงิน (Payments) ที่ผูกกับงานซ่อมนี้ทิ้งก่อน
    const sqlDeletePayment = `DELETE FROM Payments WHERE repair_id = ?`;
    
    db.run(sqlDeletePayment, [repairId], function(err) {
        if (err) {
            console.error("Delete Payment Error:", err.message);
            return res.status(500).json({ success: false, message: "ระบบขัดข้อง ไม่สามารถลบบิลชำระเงินได้" });
        }

        // จังหวะที่ 2: เมื่อลบบิลเสร็จแล้ว ค่อยลบตัวงานซ่อม (Repairs)
        const sqlDeleteRepair = `DELETE FROM Repairs WHERE repair_id = ?`;
        
        db.run(sqlDeleteRepair, [repairId], function(err) {
            if (err) {
                console.error("Delete Repair Error:", err.message);
                return res.status(500).json({ success: false, message: "ระบบขัดข้อง ไม่สามารถลบงานซ่อมได้" });
            }
            
            res.json({ success: true, message: "ลบงานซ่อมและบิลชำระเงินที่เกี่ยวข้องเรียบร้อยแล้ว!" });
        });
    });
});

// 5. ลบบิลชำระเงิน
app.delete('/api/payments/:id', (req, res) => {
    db.run(`DELETE FROM Payments WHERE payment_id = ?`, [req.params.id], function(err) {
        if (err) return res.status(500).json({ success: false, message: "ลบบิลไม่สำเร็จ" });
        res.json({ success: true, message: "ลบข้อมูลบิลเรียบร้อยแล้ว!" });
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Backend API รันอยู่ที่ http://localhost:${PORT}`);
});