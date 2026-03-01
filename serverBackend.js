const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const session = require('express-session');
const path = require('path');

const app = express();
const port = 3000;


// ตั้งค่าใช้งาน Session
app.use(session({
    secret: 'comrepair_secret_key', // รหัสลับสำหรับเข้ารหัส session
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 24 } // จำการล็อกอินไว้ 24 ชั่วโมง
}));

// เชื่อมต่อฐานข้อมูล
const db = new sqlite3.Database('./Database/project.sqlite', (err) => {
    if (err) console.error('Error connecting to database:', err.message);
    else console.log('เชื่อมต่อฐานข้อมูล project.sqlite สำเร็จ!');
});

// ตั้งค่าให้ Express ใช้ EJS เป็น View Engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'public/views'));

// ตั้งค่าให้อ่านข้อมูลที่ส่งมาจากฟอร์ม HTML แบบปกติได้
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

/*
// หน้าหลัก (แสดงหน้าเว็บ + ดึงข้อมูลลูกค้า)
app.get('/index', (req, res) => {
    const sqlTable = `
        SELECT r.repair_id AS id, r.receive_date AS date, 
               d.brand || ' ' || d.model AS device, 
               t.first_name AS tech, r.status
        FROM Repairs r
        JOIN Devices d ON r.device_id = d.device_id
        JOIN Technicians t ON r.technician_id = t.technician_id
        ORDER BY r.receive_date DESC LIMIT 5
    `;
    const sqlActive = `SELECT COUNT(*) AS count FROM Repairs WHERE status IN ('Pending', 'In Progress')`;
    const sqlPendingPay = `SELECT COUNT(*) AS count FROM Payments WHERE payment_status = 'Pending'`;

    db.get(sqlActive, [], (err, activeRow) => {
        db.get(sqlPendingPay, [], (err, pendingRow) => {
            db.all(sqlTable, [], (err, rows) => {
                res.render('index', {
                    title: 'หน้าหลัก', // ใส่ title ให้ตรงกับเงื่อนไขใน sidebar.ejs
                    customerName: "สมชาย ใจดี",
                    activeRepairs: activeRow.count,
                    pendingPayments: pendingRow.count,
                    myRepairs: rows
                });
            });
        });
    });
});
*/

// เมื่อมีคนเข้าเว็บมาที่หน้าแรก (Root URL)
app.get('/', (req, res) => {
    res.redirect('/login'); // โยนไปหน้า Login ทันที
});
/*================================== ส่วนจัดการการเข้าสู่ระบบ (Login) ========================== */

// หน้าหลัก (Dashboard)
app.get('/index', (req, res) => {
    // 1. เช็คว่าล็อกอินหรือยัง (ถ้ายังให้เด้งไปหน้า login)
    if (!req.session.user) {
        return res.redirect('/login');
    }

    // 2. คำสั่ง SQL
    const sqlTable = `
        SELECT r.repair_id AS id, r.receive_date AS date, 
               d.brand || ' ' || d.model AS device, 
               t.first_name AS tech, r.status
        FROM Repairs r
        LEFT JOIN Devices d ON r.device_id = d.device_id
        LEFT JOIN Technicians t ON r.technician_id = t.technician_id
        ORDER BY r.repair_id DESC
    `;
    const sqlActive = `SELECT COUNT(*) AS count FROM Repairs WHERE status IN ('Pending', 'In Progress')`;
    const sqlPendingPay = `SELECT COUNT(*) AS count FROM Payments WHERE payment_status = 'Pending'`;

    db.get(sqlActive, [], (err, activeRow) => {
        db.get(sqlPendingPay, [], (err, pendingRow) => {
            db.all(sqlTable, [], (err, rows) => {
                res.render('index', {
                    title: 'หน้าหลัก', // ใส่ title ให้ตรงกับเงื่อนไขใน sidebar.ejs
                    customerName: req.session.user.username, // ดึงชื่อผู้ใช้จาก session มาแสดง
                    activeRepairs: activeRow.count,
                    pendingPayments: pendingRow.count,
                    myRepairs: rows
                });
            });
        });
    });
});

/*================================== API Customer ========================== */

app.get('/customers', (req, res) => {
    const sql = `SELECT * FROM Customers ORDER BY customer_id DESC`;
    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).send(err.message);
        
        res.render('customers', {
            title: 'ลูกค้า', // สำคัญ: เพื่อให้ Sidebar ไฮไลท์สีส้มที่เมนูลูกค้า
            customers: rows
        });
    });
});

// 1. หน้าแสดงฟอร์มเพิ่มลูกค้า
app.get('/add_customer', (req, res) => {
    res.render('add_customer', {
        title: 'ลูกค้า' // เพื่อให้ sidebar เมนูลูกค้าเป็นสีส้ม (Active)
    });
});

// 2. รับข้อมูลจากฟอร์มบันทึกลง Database
app.post('/add_customer', (req, res) => {
    const { first_name, last_name, phone, email, address } = req.body;
    const sql = `INSERT INTO Customers (first_name, last_name, phone, email, address) VALUES (?, ?, ?, ?, ?)`;
    
    db.run(sql, [first_name, last_name, phone, email, address], function(err) {
        if (err) return res.status(500).send(err.message);
        
        // บันทึกเสร็จแล้ว กลับไปหน้าประวัติลูกค้า
        res.redirect('/customers');
    });
});

// API: ลบข้อมูลลูกค้า
app.post('/delete-customer/:id', (req, res) => {
    // ดึงไอดี (ID) ของลูกค้าที่ส่งมากับ URL
    const customerId = req.params.id; 
    
    // คำสั่ง SQL สำหรับลบข้อมูล
    const sql = `DELETE FROM Customers WHERE customer_id = ?`;
    
    db.run(sql, [customerId], function(err) {
        if (err) return res.status(500).send(err.message);
        
        // ลบเสร็จแล้ว สั่งให้รีเฟรชกลับไปหน้าแรก
    });
});

// 1. หน้าแสดงฟอร์มแก้ไขลูกค้า
app.get('/edit-customer/:id', (req, res) => {
    const custId = req.params.id;
    const sql = `SELECT * FROM Customers WHERE customer_id = ?`;

    db.get(sql, [custId], (err, row) => {
        if (err || !row) return res.status(404).send('ไม่พบข้อมูลลูกค้า');
        res.render('edit_customer', {
            title: 'ลูกค้า',
            customer: row
        });
    });
});

// 2. รับข้อมูลเพื่ออัปเดตลง Database (POST)
app.post('/update-customer/:id', (req, res) => {
    const custId = req.params.id;
    const { first_name, last_name, phone, email, address } = req.body;
    const sql = `UPDATE Customers SET first_name = ?, last_name = ?, phone = ?, email = ?, address = ? WHERE customer_id = ?`;

    db.run(sql, [first_name, last_name, phone, email, address, custId], function(err) {
        if (err) return res.status(500).send(err.message);
        res.redirect('/customers'); // แก้ไขเสร็จกลับไปหน้ารายชื่อลูกค้า
    });
});
/*================================== API Device ========================== */
// ==========================================
// ส่วนจัดการข้อมูลอุปกรณ์ (Devices)
// ==========================================

// 1. หน้าหลัก Devices (ดึงข้อมูลอุปกรณ์ และ ดึงรายชื่อลูกค้ามาทำ Dropdown)
app.get('/devices', (req, res) => {
    // JOIN ตาราง Devices กับ Customers เพื่อเอาชื่อเจ้าของมาโชว์
    const sql = `
        SELECT d.*, c.first_name, c.last_name 
        FROM Devices d
        JOIN Customers c ON d.customer_id = c.customer_id
        ORDER BY d.device_id DESC
    `;
    
    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).send(err.message);
        
        res.render('devices', {
            title: 'อุปกรณ์', // เพื่อให้ Sidebar ไฮไลท์เมนูอุปกรณ์
            devices: rows
        });
    });
});

// 1. หน้าแสดงฟอร์มเพิ่มอุปกรณ์
app.get('/add_device', (req, res) => {
    const sql = `SELECT customer_id, first_name, last_name, phone FROM Customers ORDER BY first_name ASC`;
    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).send(err.message);
        res.render('add_device', {
            title: 'อุปกรณ์',
            customers: rows // ส่งข้อมูลลูกค้าไปให้วนลูปใน EJS
        });
    });
});

// 2. รับข้อมูลเพิ่มอุปกรณ์ลงฐานข้อมูล
app.post('/add_device', (req, res) => {
    const { customer_id, device_type, brand, model, serial_number } = req.body;
    const sql = `INSERT INTO Devices (customer_id, device_type, brand, model, serial_number) VALUES (?, ?, ?, ?, ?)`;
    
    db.run(sql, [customer_id, device_type, brand, model, serial_number], function(err) {
        if (err) return res.status(500).send(err.message);
        res.redirect('/devices');
    });
});

// 3. ลบข้อมูลอุปกรณ์
app.post('/delete-device/:id', (req, res) => {
    const sql = `DELETE FROM Devices WHERE device_id = ?`;
    db.run(sql, [req.params.id], function(err) {
        if (err) return res.status(500).send(err.message);
        res.redirect('/devices');
    });
});
// ==========================================
// ส่วนแก้ไขข้อมูลอุปกรณ์ (Edit Device)
// ==========================================

// 1. หน้าแสดงฟอร์มแก้ไขอุปกรณ์
app.get('/edit-device/:id', (req, res) => {
    const deviceId = req.params.id;
    const sqlDevice = `SELECT * FROM Devices WHERE device_id = ?`;
    const sqlCustomers = `SELECT customer_id, first_name, last_name FROM Customers ORDER BY first_name ASC`;

    db.get(sqlDevice, [deviceId], (err, device) => {
        if (err || !device) return res.status(404).send('ไม่พบข้อมูลอุปกรณ์');
        db.all(sqlCustomers, [], (err, customers) => {
            res.render('edit_device', {
                title: 'อุปกรณ์',
                device: device,
                customers: customers
            });
        });
    });
});

// 2. รับข้อมูลเพื่ออัปเดต (POST)
app.post('/update-device/:id', (req, res) => {
    const deviceId = req.params.id;
    const { customer_id, device_type, brand, model, serial_number } = req.body;
    const sql = `UPDATE Devices SET customer_id = ?, device_type = ?, brand = ?, model = ?, serial_number = ? WHERE device_id = ?`;

    db.run(sql, [customer_id, device_type, brand, model, serial_number, deviceId], function(err) {
        if (err) return res.status(500).send(err.message);
        res.redirect('/devices');
    });
});

// ==========================================
// ส่วนจัดการข้อมูลช่างเทคนิค (Technicians)
// ==========================================

// 1. หน้าหลักดึงข้อมูลช่างเทคนิคทั้งหมด
app.get('/technicians', (req, res) => {
    const sql = `SELECT * FROM Technicians ORDER BY technician_id DESC`;
    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).send(err.message);
        
        res.render('technicians', {
            title: 'ช่างเทคนิค', // ชื่อ title ต้องตรงกับที่เช็คใน sidebar.ejs
            technicians: rows
        });
    });
});

// 1. หน้าแสดงฟอร์มเพิ่มช่าง
app.get('/add_technician', (req, res) => {
    res.render('add_technician', {
        title: 'ช่างเทคนิค' // เพื่อให้เมนูใน Sidebar ไฮไลท์สีส้ม
    });
});

// 2. รับข้อมูลจากฟอร์มบันทึกลงตาราง Technicians
app.post('/add_technician', (req, res) => {
    const { first_name, last_name, phone, email, hire_date } = req.body;
    const sql = `INSERT INTO Technicians (first_name, last_name, phone, email, hire_date) VALUES (?, ?, ?, ?, ?)`;
    
    db.run(sql, [first_name, last_name, phone, email, hire_date], function(err) {
        if (err) return res.status(500).send(err.message);
        
        // เมื่อบันทึกสำเร็จ ให้กลับไปหน้าตารางรายชื่อช่าง
        res.redirect('/technicians');
    });
});

// 3. ลบช่างเทคนิค
app.post('/delete-technician/:id', (req, res) => {
    const sql = `DELETE FROM Technicians WHERE technician_id = ?`;
    db.run(sql, [req.params.id], function(err) {
        if (err) return res.status(500).send(err.message);
        res.redirect('/technicians');
    });
});

// 1. หน้าแสดงฟอร์มแก้ไขช่าง
app.get('/edit-technician/:id', (req, res) => {
    const techId = req.params.id;
    const sql = `SELECT * FROM Technicians WHERE technician_id = ?`;

    db.get(sql, [techId], (err, row) => {
        if (err || !row) return res.status(404).send('ไม่พบข้อมูลช่างเทคนิค');
        res.render('edit_technician', {
            title: 'ช่างเทคนิค',
            tech: row
        });
    });
});

// 2. รับข้อมูลเพื่ออัปเดตลง Database (POST)
app.post('/update-technician/:id', (req, res) => {
    const techId = req.params.id;
    const { first_name, last_name, phone, email, hire_date } = req.body;
    const sql = `UPDATE Technicians SET first_name = ?, last_name = ?, phone = ?, email = ?, hire_date = ? WHERE technician_id = ?`;

    db.run(sql, [first_name, last_name, phone, email, hire_date, techId], function(err) {
        if (err) return res.status(500).send(err.message);
        res.redirect('/technicians'); // อัปเดตเสร็จกลับไปหน้ารายชื่อช่าง
    });
});

// ==========================================
// ส่วนจัดการข้อมูลการซ่อม (Repairs)
// ==========================================

// 1. หน้าหลัก (รวมร่าง Device กับ Customer ไว้ด้วยกัน)
app.get('/repairs', (req, res) => {
    // SQL สำหรับดึงงานซ่อม พร้อมชื่อลูกค้าและข้อมูลอุปกรณ์
    const sql = `
        SELECT r.*, c.first_name, c.last_name, c.phone, d.brand, d.model 
        FROM Repairs r
        JOIN Devices d ON r.device_id = d.device_id
        JOIN Customers c ON d.customer_id = c.customer_id
        ORDER BY r.repair_id DESC
    `;
    
    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).send(err.message);
        
        res.render('repairs', {
            title: 'งานซ่อม', // สำหรับ Sidebar Active
            repairs: rows
        });
    });
});

// 1. หน้าแสดงฟอร์มเปิดใบแจ้งซ่อม
app.get('/add_repair', (req, res) => {
    // ดึงรายชื่ออุปกรณ์ (พร้อมชื่อเจ้าของ) และ รายชื่อช่าง
    const sqlDevices = `SELECT d.device_id, d.brand, d.model, c.first_name, c.last_name 
                        FROM Devices d JOIN Customers c ON d.customer_id = c.customer_id`;
    const sqlTechs = `SELECT technician_id, first_name, last_name FROM Technicians`;

    db.all(sqlDevices, [], (err, devices) => {
        db.all(sqlTechs, [], (err, techs) => {
            res.render('add_repair', {
                title: 'งานซ่อม',
                devices: devices,
                technicians: techs
            });
        });
    });
});

// 2. รับข้อมูลจากฟอร์มบันทึกลงตาราง Repairs
app.post('/add_repair', (req, res) => {
    const { device_id, technician_id, receive_date, status, problem_type } = req.body;
    const sql = `INSERT INTO Repairs (device_id, technician_id, receive_date, status, problem_type) 
                 VALUES (?, ?, ?, ?, ?)`;
    
    db.run(sql, [device_id, technician_id, receive_date, status, problem_type], function(err) {
    if (err) return res.status(500).send(err.message);
    
    // ดึง ID ล่าสุดที่เพิ่ง Insert เข้าไป
    const newRepairId = this.lastID; 
    
    // ส่ง Script ไปยังฝั่ง Client
    res.send(`
        <script>
            // แสดงหน้าต่างยืนยัน
            if (confirm('บันทึกงานซ่อมสำเร็จ! 💻\\nคุณต้องการไปหน้า "สร้างบิลชำระเงิน" สำหรับงานนี้เลยหรือไม่?')) {
                // ถ้าตกลง ให้ไปหน้าสร้างบิล พร้อมแนบ ID งานซ่อมไปด้วย
                window.location.href = '/add_payment?repair_id=' + ${newRepairId};
            } else {
                // ถ้าไม่ ให้กลับไปหน้ารายการงานซ่อม
                window.location.href = '/repairs';
            }
        </script>
    `);
});
});

// 3. ลบข้อมูลการซ่อม
// ลบรายการแจ้งซ่อม
app.post('/delete-repair/:id', (req, res) => {
    const repairId = req.params.id;

    // 1. ลบข้อมูลในตาราง Payments ที่เกี่ยวข้องก่อน (เพื่อป้องกัน Error Foreign Key)
    const sqlDeletePayments = `DELETE FROM Payments WHERE repair_id = ?`;
    
    // 2. ลบข้อมูลในตาราง Repairs
    const sqlDeleteRepair = `DELETE FROM Repairs WHERE repair_id = ?`;

    db.run(sqlDeletePayments, [repairId], (err) => {
        if (err) {
            console.error("Error deleting payments:", err.message);
            return res.status(500).send("เกิดข้อผิดพลาดในการลบข้อมูลการชำระเงิน");
        }

        db.run(sqlDeleteRepair, [repairId], function(err) {
            if (err) {
                console.error("Error deleting repair:", err.message);
                return res.status(500).send("เกิดข้อผิดพลาดในการลบรายการแจ้งซ่อม");
            }
            
            console.log(`Deleted repair ID: ${repairId}`);
            // ลบสำเร็จแล้วกลับไปหน้ารายการเดิม
            res.redirect('/repairs');
        });
    });
});

// 1. หน้าแสดงฟอร์มแก้ไขงานซ่อม
app.get('/edit-repair/:id', (req, res) => {
    const repairId = req.params.id;
    const sqlRepair = `
        SELECT r.*, d.brand, d.model, c.first_name 
        FROM Repairs r 
        JOIN Devices d ON r.device_id = d.device_id 
        JOIN Customers c ON d.customer_id = c.customer_id 
        WHERE r.repair_id = ?`;
    const sqlTechs = `SELECT technician_id, first_name, last_name FROM Technicians`;

    db.get(sqlRepair, [repairId], (err, repair) => {
        db.all(sqlTechs, [], (err, techs) => {
            res.render('edit_repair', {
                title: 'งานซ่อม',
                repair: repair,
                technicians: techs
            });
        });
    });
});

// 2. รับข้อมูลเพื่ออัปเดต (POST)
app.post('/update-repair/:id', (req, res) => {
    const repairId = req.params.id;
    const { technician_id, receive_date, status, problem_type } = req.body;
    const sql = `UPDATE Repairs SET technician_id = ?, receive_date = ?, status = ?, problem_type = ? WHERE repair_id = ?`;

    db.run(sql, [technician_id, receive_date, status, problem_type, repairId], function(err) {
        if (err) return res.status(500).send(err.message);
        res.redirect('/repairs');
    });
});

// ==========================================
// ส่วนรายละเอียดการซ่อม (Repair Details)
// ==========================================

// 1. หน้าแสดงรายละเอียดของการซ่อม (เจาะจงรายบิล)
app.get('/repair-details/:id', (req, res) => {
    const repairId = req.params.id;
    
    // เพิ่ม LEFT JOIN Payments p ON r.repair_id = p.repair_id เข้าไป
    const sql = `
        SELECT r.*, 
               c.first_name, c.last_name, c.phone, 
               d.device_type, d.brand, d.model, d.serial_number,
               t.first_name as tech_first, t.last_name as tech_last,
               p.payment_id, p.total_cost, p.payment_status, p.payment_date
        FROM Repairs r
        JOIN Devices d ON r.device_id = d.device_id
        JOIN Customers c ON d.customer_id = c.customer_id
        JOIN Technicians t ON r.technician_id = t.technician_id
        LEFT JOIN Payments p ON r.repair_id = p.repair_id
        WHERE r.repair_id = ?
    `;

    db.get(sql, [repairId], (err, row) => {
        if (err || !row) return res.status(404).send('ไม่พบข้อมูลงานซ่อม');
        
        res.render('repair_details', {
            title: 'รายละเอียดงานซ่อม',
            repair: row
        });
    });
});

// 2. บันทึกรายละเอียดการตรวจเช็ค/ซ่อมแซม
app.post('/add-repair-detail/:id', (req, res) => {
    const repairId = req.params.id;
    const { details, diagnostic_result, completed_date, repair_result } = req.body;
    
    const sql = `INSERT INTO Repair_Details (repair_id, details, diagnostic_result, completed_date, repair_result) VALUES (?, ?, ?, ?, ?)`;
    db.run(sql, [repairId, details, diagnostic_result, completed_date, repair_result], function(err) {
        if (err) return res.status(500).send(err.message);
        
        // บันทึกเสร็จ ให้เด้งกลับมาที่หน้ารายละเอียดของบิลเดิม
        res.redirect('/repair-details/' + repairId);
    });
});

// 3. ลบรายละเอียด (กรณีช่างพิมพ์ผิด)
app.post('/delete-repair-detail/:repair_id/:detail_id', (req, res) => {
    const sql = `DELETE FROM Repair_Details WHERE detail_id = ?`;
    db.run(sql, [req.params.detail_id], function(err) {
        if (err) return res.status(500).send(err.message);
        res.redirect('/repair-details/' + req.params.repair_id);
    });
});

// ==========================================
// ส่วนจัดการข้อมูลการชำระเงิน (Payments)
// ==========================================

// 1. หน้าหลัก (ดึงประวัติการชำระเงิน + ดึงรายการซ่อมมาทำ Dropdown)
app.get('/payments', (req, res) => {
    // แก้ไข SQL ให้ JOIN ครบทุกตารางเพื่อดึงชื่อลูกค้า
    const sql = `
        SELECT 
            p.*, 
            c.first_name, 
            c.last_name 
        FROM Payments p
        LEFT JOIN Repairs r ON p.repair_id = r.repair_id
        LEFT JOIN Devices d ON r.device_id = d.device_id
        LEFT JOIN Customers c ON d.customer_id = c.customer_id
        ORDER BY p.payment_id DESC
    `;

    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error(err.message);
            return res.status(500).send("Database Error");
        }
        res.render('payments', {
            title: 'ระบบการชำระเงิน',
            payments: rows
        });
    });
});

// 1. เปิดหน้าฟอร์มเพิ่มการชำระเงิน
// 1. เปิดหน้าฟอร์มเพิ่มการชำระเงิน (อัปเดตใหม่ ให้รองรับ Dropdown)
app.get('/add_payment', (req, res) => {
    if (!req.session.user) return res.redirect('/login');

    // สั่ง SQL ให้ดึงงานซ่อม + ชื่ออุปกรณ์ + ชื่อลูกค้า
    // (สมมติว่าตาราง Repairs เชื่อมกับ Devices และ Devices เชื่อมกับ Customers นะครับ)
    const sql = `
        SELECT r.repair_id, d.brand, d.model, c.first_name, c.last_name
        FROM Repairs r
        LEFT JOIN Devices d ON r.device_id = d.device_id
        LEFT JOIN Customers c ON d.customer_id = c.customer_id
        -- กรองเอาเฉพาะงานที่ยังไม่มีในบิล (ถ้าอยากให้โชว์ทั้งหมด ลบบรรทัดล่างทิ้งได้เลยครับ)
        WHERE r.repair_id NOT IN (SELECT repair_id FROM Payments)
        ORDER BY r.repair_id DESC
    `;

    db.all(sql, [], (err, repairsData) => {
        if (err) {
            console.error("Error fetching repairs for payment dropdown:", err.message);
            return res.status(500).send("Database Error");
        }

        res.render('add_payment', { 
            title: 'สร้างบิลชำระเงินใหม่',
            customerName: req.session.user.username,
            repairs: repairsData, // ✅ ส่งข้อมูล Array ไปให้ <% repairs.forEach %> ใช้
            selectedRepairId: req.query.repair_id || null // สำหรับกรณีรับค่าจากหน้าอื่น
        });
    });
});

// ส่วนของ app.post('/add_payment', ...) ใช้ของเดิมที่ผมให้ไปก่อนหน้านี้ได้เลยครับ เพราะตัวแปรตรงกันหมดแล้ว

// 2. รับข้อมูลจากฟอร์มเพื่อบันทึกลงตาราง Payments
app.post('/add_payment', (req, res) => {
    if (!req.session.user) return res.redirect('/login');

    const { repair_id, total_cost, payment_date, payment_status } = req.body;

    const sql = `INSERT INTO Payments (repair_id, total_cost, payment_date, payment_status) VALUES (?, ?, ?, ?)`;
    
    db.run(sql, [repair_id, total_cost, payment_date, payment_status], function(err) {
        if (err) {
            console.error("Error adding payment:", err.message);
            return res.status(500).send("<script>alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล'); window.history.back();</script>");
        }
        
        // บันทึกสำเร็จ ให้เด้งไปดูผลลัพธ์ที่หน้ารายงานรายได้
        res.send("<script>alert('บันทึกการรับชำระเงินสำเร็จ!'); window.location.href='/report_revenue';</script>");
    });
});

// 2. รับข้อมูลเพื่อบันทึกลงตาราง Payments
app.post('/add_payment', (req, res) => {
    const { repair_id, total_cost, payment_date, payment_status } = req.body;

    const sql = `INSERT INTO Payments (repair_id, total_cost, payment_date, payment_status) VALUES (?, ?, ?, ?)`;

    db.run(sql, [repair_id, total_cost, payment_date, payment_status], function(err) {
        if (err) {
            console.error(err.message);
            return res.status(500).send("ไม่สามารถบันทึกข้อมูลการชำระเงินได้");
        }
        // เมื่อบันทึกเสร็จ ให้กลับไปหน้ารายการการชำระเงินทั้งหมด
        res.redirect('/payments');
    });
});

// 3. ลบข้อมูลการชำระเงิน
app.post('/delete-payment/:id', (req, res) => {
    const sql = `DELETE FROM Payments WHERE payment_id = ?`;
    db.run(sql, [req.params.id], function(err) {
        if (err) return res.status(500).send(err.message);
        res.redirect('/payments');
    });
});

// 1. หน้าแสดงฟอร์มแก้ไขการชำระเงิน
app.get('/edit-payment/:id', (req, res) => {
    const paymentId = req.params.id;
    const sql = `
        SELECT p.*, c.first_name, c.last_name 
        FROM Payments p
        JOIN Repairs r ON p.repair_id = r.repair_id
        JOIN Customers c ON r.customer_id = c.customer_id
        WHERE p.payment_id = ?
    `;

    db.get(sql, [paymentId], (err, row) => {
        if (err || !row) return res.status(404).send('ไม่พบข้อมูลการชำระเงิน');
        res.render('edit_payment', {
            title: 'การชำระเงิน',
            payment: row
        });
    });
});

// 2. รับข้อมูลเพื่ออัปเดต (POST)
app.post('/update-payment/:id', (req, res) => {
    const paymentId = req.params.id;
    const { total_cost, payment_date, payment_status } = req.body;
    const sql = `UPDATE Payments SET total_cost = ?, payment_date = ?, payment_status = ? WHERE payment_id = ?`;

    db.run(sql, [total_cost, payment_date, payment_status, paymentId], function(err) {
        if (err) return res.status(500).send(err.message);
        res.redirect('/payments');
    });
});

// เปลี่ยนสถานะบิลเป็น "ชำระแล้ว" (Paid)
app.get('/mark-paid/:id', (req, res) => {
    const paymentId = req.params.id;
    
    // สร้างวันที่ปัจจุบันในรูปแบบ YYYY-MM-DD
    const today = new Date().toISOString().split('T')[0];

    // อัปเดตสถานะเป็น Paid และเปลี่ยนวันที่ชำระเป็นวันนี้
    const sql = `UPDATE Payments SET payment_status = 'Paid', payment_date = ? WHERE payment_id = ?`;

    db.run(sql, [today, paymentId], function(err) {
        if (err) {
            console.error(err.message);
            return res.status(500).send("เกิดข้อผิดพลาดในการอัปเดตการชำระเงิน");
        }
        // เมื่ออัปเดตเสร็จ ให้โหลดหน้า payments ใหม่อีกครั้ง
        res.redirect('/payments');
    });
});

// ==========================================
// ส่วนรายงาน (Reports)
// ==========================================

// 📊 รายงานที่ 1: รายงานสถานะงานซ่อม (เพิ่มตัวกรอง Status)
app.get('/report_repairs', (req, res) => {
    if (!req.session.user) return res.redirect('/login');

    const tech_id = req.query.tech_id || '';
    const status = req.query.status || '';

    // 1. SQL สำหรับแสดงตารางงานซ่อม
    let sqlList = `
        SELECT r.repair_id, r.receive_date, r.status,
               c.first_name, c.last_name, d.brand, d.model,
               c.first_name || ' ' || c.last_name AS customer_name,
               d.brand || ' ' || d.model AS device_name
        FROM Repairs r
        LEFT JOIN Devices d ON r.device_id = d.device_id
        LEFT JOIN Customers c ON d.customer_id = c.customer_id
        LEFT JOIN Technicians t ON r.technician_id = t.technician_id
        WHERE 1=1 
    `;
    let params = [];
    if (tech_id) { sqlList += ` AND r.technician_id = ?`; params.push(tech_id); }
    if (status) { sqlList += ` AND r.status = ?`; params.push(status); }
    sqlList += ` ORDER BY r.repair_id DESC`;

    // 2. SQL สำหรับ นับจำนวนสถานะงาน (ส่งให้กราฟแท่ง)
    const sqlStatusCount = `SELECT status, COUNT(*) as count FROM Repairs GROUP BY status`;
    
    // 3. SQL สำหรับ นับสัดส่วนยี่ห้อ (ส่งให้กราฟโดนัท)
    const sqlBrandCount = `
        SELECT d.brand, COUNT(r.repair_id) as count 
        FROM Repairs r 
        LEFT JOIN Devices d ON r.device_id = d.device_id 
        GROUP BY d.brand 
        ORDER BY count DESC
    `;

    // 4. ดึงข้อมูลทั้งหมดรวดเดียว (ใช้ callback ซ้อนกันนิดหน่อยครับ)
    db.all("SELECT * FROM Technicians", [], (err, technicians) => {
        db.all(sqlStatusCount, [], (err, statusData) => {
            db.all(sqlBrandCount, [], (err, brandData) => {
                db.all(sqlList, params, (err, repairList) => {
                    
                    res.render('report_repairs', {
                        title: 'รายงานวิเคราะห์งานซ่อม',
                        customerName: req.session.user.username,
                        repairList: repairList,      // โชว์ในตาราง
                        technicians: technicians,    // โชว์ใน Dropdown
                        currentTech: tech_id,
                        currentStatus: status,
                        statusData: statusData,      // ✅ ข้อมูลจริง ส่งให้กราฟแท่ง
                        brandData: brandData         // ✅ ข้อมูลจริง ส่งให้กราฟโดนัท
                    });
                    
                });
            });
        });
    });
});

// 📈 รายงานที่ 2: รายงานสรุปยอดรายได้
app.get('/report_revenue', (req, res) => {
    // 1. เช็คว่าล็อกอินหรือยัง
    if (!req.session.user) return res.redirect('/login');

    // 2. รับค่าตัวกรองจากหน้าเว็บ (ถ้าไม่มีค่า ให้ถือว่าดู "รายวัน" ของ "วันนี้")
    const filterType = req.query.filterType || 'daily'; // 'daily' หรือ 'monthly'
    const filterDate = req.query.filterDate || new Date().toISOString().split('T')[0]; // ค่าเริ่มต้นคือวันนี้ (YYYY-MM-DD)
    const filterMonth = req.query.filterMonth || new Date().toISOString().slice(0, 7); // ค่าเริ่มต้นคือเดือนนี้ (YYYY-MM)

    let sql = ``;
    let params = [];
    let displayTitle = '';

    // 💡 หมายเหตุ: แก้ไขชื่อคอลัมน์ payment_date, amount, status ให้ตรงกับตาราง Payments ของคุณนะครับ
    if (filterType === 'daily') {
        // ค้นหาแบบรายวัน
        sql = `SELECT * FROM Payments WHERE DATE(payment_date) = ?`; 
        params = [filterDate];
        displayTitle = `ประจำวันที่ ${filterDate}`;
    } else {
        // ค้นหาแบบรายเดือน (ใช้ strftime ของ SQLite เพื่อดึงเฉพาะ ปี-เดือน)
        sql = `SELECT * FROM Payments WHERE strftime('%Y-%m', payment_date) = ?`;
        params = [filterMonth];
        displayTitle = `ประจำเดือน ${filterMonth}`;
    }

    // 3. ดึงข้อมูลจากฐานข้อมูล
    db.all(sql, params, (err, payments) => {
        if (err) {
            console.error("Error fetching revenue:", err.message);
            return res.status(500).send("เกิดข้อผิดพลาดในการดึงข้อมูล");
        }

        // 4. นำข้อมูลมาบวกเลขรวมยอดรายได้ทั้งหมดในวัน/เดือนนั้น (อิงจากคอลัมน์ total_cost)
        const totalRevenue = payments.reduce((sum, p) => sum + (p.total_cost || 0), 0);

        // 5. ส่งข้อมูลไปที่หน้าเว็บ
        res.render('report_revenue', {
            title: 'รายงานรายได้',
            customerName: req.session.user.username,
            payments: payments, // รายการชำระเงิน
            totalRevenue: totalRevenue, // ยอดรวมที่บวกแล้ว
            filterType: filterType,
            filterDate: filterDate,
            filterMonth: filterMonth,
            displayTitle: displayTitle
        });
    });
});

/*================================== ส่วนจัดการการเข้าสู่ระบบ (Login/Logout) ========================== */
app.get('/login', (req, res) => {
    res.render('login');
});

app.get('/logout', (req, res) => {
    // ล้าง session (ถ้ามี) แล้วกลับหน้า Login
    res.redirect('/login'); 
});

app.post('/login', (req, res) => {
    const { email, password } = req.body; 
    console.log("ข้อมูลที่ส่งมา:", req.body);
    const sql = `SELECT * FROM Users WHERE email = ? AND password = ?`;

    db.get(sql, [email, password], (err, user) => {
        if (err) return res.status(500).send("Database Error");
        
        if (user) {
            // ✅ บันทึกข้อมูล user ลงใน Session
            req.session.user = {
                id: user.user_id,
                username: user.username,
                role: user.role
            };
            
            console.log(`Login Successful: ${user.username}`);
            res.redirect('/index'); 
        } else {
            res.send("<script>alert('อีเมลหรือรหัสผ่านไม่ถูกต้อง'); window.location.href='/login';</script>");
        }
    });
});

/*================================== ส่วนจัดการการสมัครสมาชิก (Sign up) ========================== */

// 1. หน้าแสดงฟอร์ม Signup
app.get('/signup', (req, res) => {
    res.render('signup');
});

// 2. รับข้อมูลสมัครสมาชิก
app.post('/signup', (req, res) => {
    // 1. รับค่าให้ครบทั้ง 3 ตัว ตามที่ฟอร์มส่งมา
    const { username, email, password } = req.body; 

    // 2. เช็คก่อนว่ามีอีเมลนี้ในระบบหรือยัง
    const checkSql = `SELECT * FROM Users WHERE email = ?`;
    
    db.get(checkSql, [email], (err, row) => {
        if (err) {
            console.error(err.message);
            return res.status(500).send("Database Error");
        }
        
        // 3. ถ้าเจอว่ามีอีเมลนี้แล้ว ให้เด้ง Alert แจ้งเตือนแล้วถอยกลับ
        if (row) {
            return res.send("<script>alert('อีเมลนี้ถูกใช้งานแล้ว กรุณาใช้อีเมลอื่น'); window.history.back();</script>");
        }

        // 4. ถ้ายังไม่มี ให้บันทึกลงตาราง Users (ใส่ให้ครบทั้ง username, email, password)
        const insertSql = `INSERT INTO Users (username, email, password, role) VALUES (?, ?, ?, 'user')`;
        
        db.run(insertSql, [username, email, password], function(err) {
            if (err) {
                console.error(err.message);
                return res.status(500).send("เกิดข้อผิดพลาดในการบันทึกข้อมูล");
            }
            
            console.log(`User created with ID: ${this.lastID}`);
            // 5. สมัครสำเร็จ แจ้งเตือนแล้วโยนไปหน้า Login
            res.send("<script>alert('สมัครสมาชิกสำเร็จ! กรุณาเข้าสู่ระบบ'); window.location.href='/login';</script>");
        });
    });
});


/*================================== ส่วนจัดการการลืมรหัสผ่าน (Forgot Password) ========================== */

// หน้าสำหรับแสดงฟอร์มตั้งรหัสผ่านใหม่
// 1. เปิดหน้าลืมรหัสผ่าน
app.get('/forgot_password', (req, res) => {
    res.render('forgot_password');
});

// 2. รับข้อมูลเพื่อเปลี่ยนรหัสผ่าน
app.post('/forgot_password', (req, res) => {
    const { email, new_password } = req.body;

    // เช็คก่อนว่ามีอีเมลนี้ในระบบไหม
    const checkSql = `SELECT * FROM Users WHERE email = ?`;
    db.get(checkSql, [email], (err, user) => {
        if (err) return res.status(500).send("Database Error");
        
        if (!user) {
            // ถ้าไม่เจออีเมล ให้เด้งแจ้งเตือน
            return res.send("<script>alert('ไม่พบอีเมลนี้ในระบบ กรุณาตรวจสอบอีกครั้ง'); window.history.back();</script>");
        }

        // ถ้าเจออีเมล ให้ทำการอัปเดตรหัสผ่านใหม่
        const updateSql = `UPDATE Users SET password = ? WHERE email = ?`;
        db.run(updateSql, [new_password, email], function(err) {
            if (err) return res.status(500).send("Error updating password");
            
            // เปลี่ยนสำเร็จ แจ้งเตือนแล้วส่งกลับไปหน้า Login
            res.send("<script>alert('เปลี่ยนรหัสผ่านสำเร็จ! กรุณาเข้าสู่ระบบด้วยรหัสผ่านใหม่'); window.location.href='/login';</script>");
        });
    });
});


app.listen(port, () => {
    console.log(`🚀 เปิดเว็บบราวเซอร์ไปที่ http://localhost:${port}`);
});