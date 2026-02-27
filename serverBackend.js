const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const port = 3000;

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

// หน้าหลัก (แสดงหน้าเว็บ + ดึงข้อมูลลูกค้า)
app.get('/', (req, res) => {
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
        res.redirect('/');
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
        res.redirect('/repairs');
    });
});

// 3. ลบข้อมูลการซ่อม
app.post('/delete-repair/:id', (req, res) => {
    const sql = `DELETE FROM Repairs WHERE repair_id = ?`;
    db.run(sql, [req.params.id], function(err) {
        if (err) return res.status(500).send(err.message);
        res.redirect('/repairs');
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
    const sql = `
        SELECT r.*, c.first_name, c.last_name, c.phone, 
               d.device_type, d.brand, d.model, d.serial_number,
               t.first_name as tech_first, t.last_name as tech_last
        FROM Repairs r
        JOIN Devices d ON r.device_id = d.device_id
        JOIN Customers c ON d.customer_id = c.customer_id
        JOIN Technicians t ON r.technician_id = t.technician_id
        WHERE r.repair_id = ?
    `;

    db.get(sql, [repairId], (err, row) => {
        if (err || !row) return res.status(404).send('ไม่พบข้อมูลงานซ่อม');
        
        res.render('repair_details', {
            title: 'งานซ่อม',
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
    // ใช้ LEFT JOIN เพื่อให้แน่ใจว่ารายการในตาราง Payments จะถูกดึงออกมาทั้งหมด
    const sql = `
        SELECT p.*, c.first_name, c.last_name 
        FROM Payments p
        LEFT JOIN Repairs r ON p.repair_id = r.repair_id
        LEFT JOIN Customers c ON r.customer_id = c.customer_id
        ORDER BY p.payment_id DESC
    `;
    
    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error(err.message);
            return res.status(500).send("Database Error");
        }
        
        res.render('payments', {
            title: 'การชำระเงิน',
            payments: rows // ตรวจสอบว่าส่งค่า rows (ที่มี 2 รายการ) ไปที่หน้า EJS
        });
    });
});

// 1. หน้าแสดงฟอร์มสร้างบิลใหม่
app.get('/add_payment', (req, res) => {
    // ดึงงานซ่อมที่ "ยังไม่มี" ในตาราง Payments (ใช้ LEFT JOIN และเช็ค NULL)
    const sql = `
        SELECT r.repair_id, r.problem_type, c.first_name, c.last_name, d.brand, d.model 
        FROM Repairs r
        JOIN Devices d ON r.device_id = d.device_id
        JOIN Customers c ON d.customer_id = c.customer_id
        LEFT JOIN Payments p ON r.repair_id = p.repair_id
        WHERE p.payment_id IS NULL
        ORDER BY r.repair_id DESC
    `;

    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).send(err.message);
        res.render('add_payment', {
            title: 'การชำระเงิน',
            repairs: rows
        });
    });
});

// 2. รับข้อมูลเพื่อบันทึกลงตาราง Payments
app.post('/add_payment', (req, res) => {
    const { repair_id, total_cost, payment_date, payment_status } = req.body;
    const sql = `INSERT INTO Payments (repair_id, total_cost, payment_date, payment_status) VALUES (?, ?, ?, ?)`;

    db.run(sql, [repair_id, total_cost, payment_date, payment_status], function(err) {
        if (err) return res.status(500).send(err.message);
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

// ==========================================
// ส่วนรายงาน (Reports)
// ==========================================

// 📊 รายงานที่ 1: รายงานสถานะงานซ่อม (เพิ่มตัวกรอง Status)
app.get('/report_repairs', (req, res) => {
    const { tech_id } = req.query;
    
    const sqlTechList = `SELECT technician_id, first_name, last_name FROM Technicians`;
    let whereClause = "";
    let params = [];

    if (tech_id) {
        whereClause = " WHERE r.technician_id = ? ";
        params.push(tech_id);
    }

    // SQL ดึงข้อมูลกราฟ และ รายการงานซ่อม (JOIN ให้ครบ)
    const sqlRepairList = `
        SELECT r.*, c.first_name, c.last_name, d.brand, d.model
        FROM Repairs r
        JOIN Devices d ON r.device_id = d.device_id
        JOIN Customers c ON d.customer_id = c.customer_id
        ${whereClause}
        ORDER BY r.repair_id DESC
    `;

    db.all(sqlTechList, [], (err, techs) => {
        db.all(sqlRepairList, params, (err, repairRows) => {
            // ... Logic คำนวณกราฟจาก repairRows ...
            res.render('report_repairs', {
                title: 'รายงานงานซ่อม',
                technicians: techs,
                selectedTech: tech_id || '',
                repairList: repairRows, // ข้อมูลตาราง
                deviceData: { /* ... */ } // ข้อมูลกราฟ
            });
        });
    });
});

// 📈 รายงานที่ 2: รายงานสรุปยอดรายได้
app.get('/report_revenue', (req, res) => {
    const selectedYear = req.query.year || '2026';
    
    // 1. ดึงรายได้รวมและจำนวนบิล (เฉพาะที่จ่ายแล้ว)
    const sqlSummary = `
        SELECT SUM(total_cost) as total, COUNT(*) as bills 
        FROM Payments 
        WHERE payment_status = 'Paid' AND strftime('%Y', payment_date) = ?
    `;

    // 2. ดึงรายได้แยกตามเดือน
    const sqlMonthly = `
        SELECT strftime('%m', payment_date) as month, SUM(total_cost) as monthly_total 
        FROM Payments 
        WHERE payment_status = 'Paid' AND strftime('%Y', payment_date) = ?
        GROUP BY month ORDER BY month ASC
    `;

    db.get(sqlSummary, [selectedYear], (err, summary) => {
        db.all(sqlMonthly, [selectedYear], (err, rows) => {
            
            // เตรียม Array รายได้ 12 เดือน (ตั้งต้นเป็น 0)
            const revenueData = new Array(12).fill(0);
            rows.forEach(row => {
                revenueData[parseInt(row.month) - 1] = row.monthly_total;
            });

            res.render('report_revenue', {
                title: 'รายงานรายได้',
                selectedYear: selectedYear,
                totalRevenue: summary.total || 0,
                totalBills: summary.bills || 0,
                revenueData: revenueData
            });
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
    // รับค่า username และ password จากฟอร์ม
    const { username, password } = req.body;

    // ค้นหาในตาราง Users
    const sql = `SELECT * FROM Users WHERE username = ? AND password = ?`;

    db.get(sql, [username, password], (err, user) => {
        if (err) {
            console.error(err.message);
            return res.status(500).send("เกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล");
        }
        
        if (user) {
            // กรณีเข้าสู่ระบบสำเร็จ (สามารถทำ Session ต่อได้ที่นี่)
            console.log(`Login Successful: ${user.username}`);
            res.redirect('/'); // ส่งไปหน้า Dashboard หลัก
        } else {
            // กรณีรหัสผ่านผิด
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
    const { email, password } = req.body; // รับค่าจากฟอร์ม signup.ejs

    // บันทึกลงตาราง Users โดยตรง (ไม่สร้างใน Customers ตามที่ต้องการ)
    // หมายเหตุ: customer_id จะเป็น NULL เพราะเราไม่ได้เชื่อมโยงกับตาราง Customers ในขั้นตอนนี้
    const sql = `INSERT INTO Users (username, password, role) VALUES (?, ?, ?)`;
    
    db.run(sql, [email, password, 'user'], function(err) {
        if (err) {
            console.error(err.message);
            return res.status(500).send("อีเมลนี้ถูกใช้งานไปแล้ว");
        }
        console.log(`User created with ID: ${this.lastID}`);
        res.redirect('/login');
    });
});


/*================================== ส่วนจัดการการลืมรหัสผ่าน (Forgot Password) ========================== */

app.post('/forgot_password', (req, res) => {
    const { username, newPassword } = req.body;

    // ตรวจสอบก่อนว่ามี User นี้อยู่ในระบบจริงไหม
    const sqlCheck = `SELECT * FROM Users WHERE username = ?`;

    db.get(sqlCheck, [username], (err, user) => {
        if (err) return res.status(500).send("Database Error");
        
        if (!user) {
            return res.send("<script>alert('ไม่พบอีเมลนี้ในระบบ'); window.history.back();</script>");
        }

        // ถ้าพบ User ให้ทำการอัปเดตรหัสผ่าน
        const sqlUpdate = `UPDATE Users SET password = ? WHERE username = ?`;
        
        db.run(sqlUpdate, [newPassword, username], (err) => {
            if (err) return res.status(500).send("Update Error");
            
            res.send("<script>alert('เปลี่ยนรหัสผ่านสำเร็จแล้ว กรุณาเข้าสู่ระบบด้วยรหัสผ่านใหม่'); window.location.href='/login';</script>");
        });
    });
});

app.listen(port, () => {
    console.log(`🚀 เปิดเว็บบราวเซอร์ไปที่ http://localhost:${port}`);
});