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

// หน้าหลัก (แสดงหน้าเว็บ + ดึงข้อมูลลูกค้า)
app.get('/', (req, res) => {
    db.all("SELECT * FROM Customers", [], (err, rows) => {
        if (err) return res.status(500).send(err.message);
        
        // โยนข้อมูล rows ไปที่ไฟล์ index.ejs โดยตั้งชื่อตัวแปรว่า customers
        res.render('./index', { customers: rows });
    });
});

/*================================== API Customer ========================== */
// รับข้อมูลจากฟอร์มเพื่อบันทึก แล้วรีเฟรชกลับมาหน้าแรก
app.post('/add-customer', (req, res) => {
    const { first_name, last_name, phone, email, address } = req.body;
    const sql = `INSERT INTO Customers (first_name, last_name, phone, email, address) VALUES (?, ?, ?, ?, ?)`;
    
    db.run(sql, [first_name, last_name, phone, email, address], function(err) {
        if (err) return res.status(500).send(err.message);
        
        // บันทึกเสร็จ สั่งให้เว็บบราวเซอร์กลับไปโหลดหน้าแรก ('/') ใหม่
        res.redirect('/');
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

app.get('/edit-customer/:id', (req, res) => {
    const customerId = req.params.id;
    const sql = `SELECT * FROM Customers WHERE customer_id = ?`;
    
    // ใช้ db.get() เพราะเราต้องการดึงข้อมูลแค่คนเดียว (ไม่ใช่ db.all)
    db.get(sql, [customerId], (err, row) => {
        if (err) return res.status(500).send(err.message);
        if (!row) return res.status(404).send('ไม่พบข้อมูลลูกค้า');
        
        // ส่งข้อมูลลูกค้าคนนั้นไปให้ไฟล์ edit.ejs
        res.render('edit', { customer: row });
    });
});

// API: รับข้อมูลใหม่จากฟอร์มมาอัปเดตลงฐานข้อมูล (ตอนกดบันทึกการเปลี่ยนแปลง)
app.post('/update-customer/:id', (req, res) => {
    const customerId = req.params.id;
    const { first_name, last_name, phone, email, address } = req.body;
    
    // คำสั่ง SQL สำหรับแก้ไขข้อมูล (UPDATE)
    const sql = `UPDATE Customers 
                 SET first_name = ?, last_name = ?, phone = ?, email = ?, address = ? 
                 WHERE customer_id = ?`;
                 
    db.run(sql, [first_name, last_name, phone, email, address, customerId], function(err) {
        if (err) return res.status(500).send(err.message);
        
        // แก้ไขเสร็จแล้ว สั่งให้เด้งกลับไปหน้าแรก
        res.redirect('/');
    });
});

/*================================== API Device ========================== */
// ==========================================
// ส่วนจัดการข้อมูลอุปกรณ์ (Devices)
// ==========================================

// 1. หน้าหลัก Devices (ดึงข้อมูลอุปกรณ์ และ ดึงรายชื่อลูกค้ามาทำ Dropdown)
app.get('/devices', (req, res) => {
    // ใช้ JOIN เพื่อดึงชื่อลูกค้ามาแสดงคู่กับอุปกรณ์
    const sqlDevices = `
        SELECT Devices.*, Customers.first_name, Customers.last_name 
        FROM Devices 
        LEFT JOIN Customers ON Devices.customer_id = Customers.customer_id
    `;
    // ดึงรายชื่อลูกค้ามาเตรียมไว้ทำ Dropdown ให้เลือกตอนเพิ่มข้อมูล
    const sqlCustomers = `SELECT customer_id, first_name, last_name FROM Customers`;

    db.all(sqlDevices, [], (err, devices) => {
        if (err) return res.status(500).send(err.message);
        
        db.all(sqlCustomers, [], (err, customers) => {
            if (err) return res.status(500).send(err.message);
            // โยนข้อมูลทั้ง devices และ customers ไปให้หน้า devices.ejs
            res.render('devices', { devices: devices, customers: customers });
        });
    });
});

// 2. รับข้อมูลจากฟอร์มเพื่อบันทึกอุปกรณ์ใหม่
app.post('/add-device', (req, res) => {
    const { customer_id, device_type, brand, model, serial_number } = req.body;
    const sql = `INSERT INTO Devices (customer_id, device_type, brand, model, serial_number) VALUES (?, ?, ?, ?, ?)`;
    
    db.run(sql, [customer_id, device_type, brand, model, serial_number], function(err) {
        if (err) return res.status(500).send(err.message);
        res.redirect('/devices'); // บันทึกเสร็จให้โหลดหน้า devices ใหม่
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

// 1. ดึงข้อมูลอุปกรณ์ 1 ชิ้นมาแสดงในหน้าแก้ไข (พร้อมรายชื่อลูกค้าทำ Dropdown)
app.get('/edit-device/:id', (req, res) => {
    const deviceId = req.params.id;
    const sqlDevice = `SELECT * FROM Devices WHERE device_id = ?`;
    const sqlCustomers = `SELECT customer_id, first_name, last_name FROM Customers`;

    db.get(sqlDevice, [deviceId], (err, device) => {
        if (err) return res.status(500).send(err.message);
        if (!device) return res.status(404).send('ไม่พบข้อมูลอุปกรณ์');
        
        // ดึงรายชื่อลูกค้าทั้งหมดมาด้วย เพื่อให้เลือกเปลี่ยนเจ้าของได้
        db.all(sqlCustomers, [], (err, customers) => {
            if (err) return res.status(500).send(err.message);
            
            // ส่งไปทั้งข้อมูลอุปกรณ์ (device) และรายชื่อลูกค้า (customers)
            res.render('edit-device', { device: device, customers: customers });
        });
    });
});

// 2. รับข้อมูลจากฟอร์มมาอัปเดตลงฐานข้อมูล
app.post('/update-device/:id', (req, res) => {
    const deviceId = req.params.id;
    const { customer_id, device_type, brand, model, serial_number } = req.body;
    
    const sql = `UPDATE Devices 
                 SET customer_id = ?, device_type = ?, brand = ?, model = ?, serial_number = ? 
                 WHERE device_id = ?`;
                 
    db.run(sql, [customer_id, device_type, brand, model, serial_number, deviceId], function(err) {
        if (err) return res.status(500).send(err.message);
        
        res.redirect('/devices'); // บันทึกเสร็จเด้งกลับหน้าอุปกรณ์
    });
});

// ==========================================
// ส่วนจัดการข้อมูลช่างเทคนิค (Technicians)
// ==========================================

// 1. หน้าหลักดึงข้อมูลช่างเทคนิคทั้งหมด
app.get('/technicians', (req, res) => {
    const sql = `SELECT * FROM Technicians`;
    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).send(err.message);
        res.render('technicians', { technicians: rows });
    });
});

// 2. เพิ่มช่างเทคนิคใหม่
app.post('/add-technician', (req, res) => {
    const { first_name, last_name, phone, email, hire_date } = req.body;
    const sql = `INSERT INTO Technicians (first_name, last_name, phone, email, hire_date) VALUES (?, ?, ?, ?, ?)`;
    
    db.run(sql, [first_name, last_name, phone, email, hire_date], function(err) {
        if (err) return res.status(500).send(err.message);
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

// 4. หน้าฟอร์มแก้ไขช่างเทคนิค
app.get('/edit-technician/:id', (req, res) => {
    const sql = `SELECT * FROM Technicians WHERE technician_id = ?`;
    db.get(sql, [req.params.id], (err, row) => {
        if (err) return res.status(500).send(err.message);
        if (!row) return res.status(404).send('ไม่พบข้อมูลช่างเทคนิค');
        res.render('edit-technician', { technician: row });
    });
});

// 5. บันทึกการแก้ไขช่างเทคนิค
app.post('/update-technician/:id', (req, res) => {
    const { first_name, last_name, phone, email, hire_date } = req.body;
    const sql = `UPDATE Technicians SET first_name = ?, last_name = ?, phone = ?, email = ?, hire_date = ? WHERE technician_id = ?`;
    
    db.run(sql, [first_name, last_name, phone, email, hire_date, req.params.id], function(err) {
        if (err) return res.status(500).send(err.message);
        res.redirect('/technicians');
    });
});

// ==========================================
// ส่วนจัดการข้อมูลการซ่อม (Repairs)
// ==========================================

// 1. หน้าหลัก (รวมร่าง Device กับ Customer ไว้ด้วยกัน)
app.get('/repairs', (req, res) => {
    const sqlRepairs = `
        SELECT r.*, c.first_name AS c_fname, c.last_name AS c_lname, d.brand, d.model, t.first_name AS t_fname
        FROM Repairs r
        LEFT JOIN Customers c ON r.customer_id = c.customer_id
        LEFT JOIN Devices d ON r.device_id = d.device_id
        LEFT JOIN Technicians t ON r.technician_id = t.technician_id
        ORDER BY r.receive_date DESC
    `;
    
    // ดึงข้อมูลอุปกรณ์ พร้อมชื่อเจ้าของ (JOIN มาเลย)
    const sqlDevices = `
        SELECT d.device_id, d.brand, d.model, c.first_name, c.last_name 
        FROM Devices d 
        JOIN Customers c ON d.customer_id = c.customer_id
    `;
    const sqlTechnicians = `SELECT technician_id, first_name, last_name FROM Technicians`;

    db.all(sqlRepairs, [], (err, repairs) => {
        if (err) return res.status(500).send(err.message);
        db.all(sqlDevices, [], (err, devices) => {
            db.all(sqlTechnicians, [], (err, technicians) => {
                // ไม่ต้องส่ง customers แยกไปแล้ว ส่งแค่ devices กับ technicians พอ
                res.render('repairs', { repairs, devices, technicians });
            });
        });
    });
});

// 2. เพิ่มข้อมูลการซ่อม (ผู้ใช้ส่งมาแค่ device_id, เราหา customer_id ให้เอง)
app.post('/add-repair', (req, res) => {
    const { device_id, technician_id, problem_type, status, receive_date, issue_description } = req.body;
    
    // ค้นหาว่าอุปกรณ์นี้เป็นของลูกค้าคนไหน
    db.get(`SELECT customer_id FROM Devices WHERE device_id = ?`, [device_id], (err, row) => {
        if (err || !row) return res.status(500).send("หาข้อมูลลูกค้าไม่พบ");
        
        const customer_id = row.customer_id; // ได้รหัสลูกค้ามาแล้ว
        
        // บันทึกลงตาราง Repairs ได้เลย
        const sql = `INSERT INTO Repairs (customer_id, device_id, technician_id, problem_type, status, receive_date, issue_description) VALUES (?, ?, ?, ?, ?, ?, ?)`;
        db.run(sql, [customer_id, device_id, technician_id, problem_type, status, receive_date, issue_description], function(err) {
            if (err) return res.status(500).send(err.message);
            res.redirect('/repairs');
        });
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

// 4. หน้าฟอร์มแก้ไขงานซ่อม
app.get('/edit-repair/:id', (req, res) => {
    const sqlRepair = `SELECT * FROM Repairs WHERE repair_id = ?`;
    const sqlCustomers = `SELECT customer_id, first_name, last_name FROM Customers`;
    const sqlDevices = `SELECT device_id, brand, model FROM Devices`;
    const sqlTechnicians = `SELECT technician_id, first_name, last_name FROM Technicians`;

    db.get(sqlRepair, [req.params.id], (err, repair) => {
        if (err || !repair) return res.status(404).send('ไม่พบข้อมูลงานซ่อม');
        db.all(sqlCustomers, [], (err, customers) => {
            db.all(sqlDevices, [], (err, devices) => {
                db.all(sqlTechnicians, [], (err, technicians) => {
                    res.render('edit-repair', { repair, customers, devices, technicians });
                });
            });
        });
    });
});

// 5. บันทึกการแก้ไขงานซ่อม
app.post('/update-repair/:id', (req, res) => {
    const { customer_id, device_id, technician_id, problem_type, status, receive_date, issue_description } = req.body;
    const sql = `UPDATE Repairs 
                 SET customer_id=?, device_id=?, technician_id=?, problem_type=?, status=?, receive_date=?, issue_description=? 
                 WHERE repair_id=?`;
    db.run(sql, [customer_id, device_id, technician_id, problem_type, status, receive_date, issue_description, req.params.id], function(err) {
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
    
    // ปรับ Query เพิ่มการ LEFT JOIN กับตาราง Payments เพื่อเอาสถานะการจ่ายเงินมา
    const sqlRepair = `
        SELECT r.*, c.first_name, c.last_name, d.brand, d.model, p.payment_status 
        FROM Repairs r
        JOIN Devices d ON r.device_id = d.device_id
        JOIN Customers c ON d.customer_id = c.customer_id
        LEFT JOIN Payments p ON r.repair_id = p.repair_id
        WHERE r.repair_id = ?
    `;
    
    const sqlDetails = `SELECT * FROM Repair_Details WHERE repair_id = ? ORDER BY completed_date DESC`;

    db.get(sqlRepair, [repairId], (err, repair) => {
        if (err || !repair) return res.status(404).send('ไม่พบข้อมูลงานซ่อม');
        
        db.all(sqlDetails, [repairId], (err, details) => {
            if (err) return res.status(500).send(err.message);
            res.render('repair-details', { repair: repair, details: details });
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
    // ดึงข้อมูลการชำระเงิน พร้อมดึงชื่อลูกค้าและอุปกรณ์มาโชว์ด้วย
    const sqlPayments = `
        SELECT p.*, r.problem_type, c.first_name, c.last_name, d.brand 
        FROM Payments p
        JOIN Repairs r ON p.repair_id = r.repair_id
        JOIN Customers c ON r.customer_id = c.customer_id
        JOIN Devices d ON r.device_id = d.device_id
        ORDER BY p.payment_date DESC
    `;
    
    // ดึงรายการงานซ่อม (เอาเฉพาะที่ยังไม่ได้ลบ) มาให้เลือกตอนจะเก็บเงิน
    const sqlRepairs = `
        SELECT r.repair_id, r.problem_type, c.first_name, d.brand 
        FROM Repairs r
        JOIN Customers c ON r.customer_id = c.customer_id
        JOIN Devices d ON r.device_id = d.device_id
    `;

    db.all(sqlPayments, [], (err, payments) => {
        if (err) return res.status(500).send(err.message);
        db.all(sqlRepairs, [], (err, repairs) => {
            if (err) return res.status(500).send(err.message);
            res.render('payments', { payments: payments, repairs: repairs });
        });
    });
});

// 2. บันทึกข้อมูลการชำระเงินใหม่
app.post('/add-payment', (req, res) => {
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

// 4. หน้าฟอร์มแก้ไขการชำระเงิน
app.get('/edit-payment/:id', (req, res) => {
    const sqlPayment = `SELECT * FROM Payments WHERE payment_id = ?`;
    const sqlRepairs = `
        SELECT r.repair_id, r.problem_type, c.first_name, d.brand 
        FROM Repairs r
        JOIN Customers c ON r.customer_id = c.customer_id
        JOIN Devices d ON r.device_id = d.device_id
    `;

    db.get(sqlPayment, [req.params.id], (err, payment) => {
        if (err || !payment) return res.status(404).send('ไม่พบข้อมูลการชำระเงิน');
        db.all(sqlRepairs, [], (err, repairs) => {
            if (err) return res.status(500).send(err.message);
            res.render('edit-payment', { payment: payment, repairs: repairs });
        });
    });
});

// 5. บันทึกการแก้ไขการชำระเงิน
app.post('/update-payment/:id', (req, res) => {
    const { repair_id, total_cost, payment_date, payment_status } = req.body;
    const sql = `UPDATE Payments SET repair_id = ?, total_cost = ?, payment_date = ?, payment_status = ? WHERE payment_id = ?`;
    
    db.run(sql, [repair_id, total_cost, payment_date, payment_status, req.params.id], function(err) {
        if (err) return res.status(500).send(err.message);
        res.redirect('/payments');
    });
});

// ==========================================
// ส่วนรายงาน (Reports)
// ==========================================

// 📊 รายงานที่ 1: รายงานสถานะงานซ่อม (เพิ่มตัวกรอง Status)
app.get('/report-repairs', (req, res) => {
    // รับค่าจากช่องค้นหา
    let tech_filter = req.query.tech_id || '';
    let date_filter = req.query.receive_date || '';
    let status_filter = req.query.status || ''; // เพิ่มบรรทัดนี้เพื่อรับค่า status
    
    let sqlRepairs = `
        SELECT r.repair_id, r.receive_date, r.status, c.first_name AS c_fname, d.brand, d.model, t.first_name AS t_fname
        FROM Repairs r
        JOIN Customers c ON r.customer_id = c.customer_id
        JOIN Devices d ON r.device_id = d.device_id
        JOIN Technicians t ON r.technician_id = t.technician_id
        WHERE 1=1
    `;
    let params = [];
    
    if (tech_filter) { sqlRepairs += ` AND r.technician_id = ?`; params.push(tech_filter); }
    if (date_filter) { sqlRepairs += ` AND r.receive_date = ?`; params.push(date_filter); }
    if (status_filter) { sqlRepairs += ` AND r.status = ?`; params.push(status_filter); } // เพิ่มเงื่อนไขกรอง Status
    
    sqlRepairs += ` ORDER BY r.receive_date DESC`;

    // ส่วน Query อื่นๆ (Summary และ Techs) เหมือนเดิม
    let sqlSummary = `
        SELECT t.first_name, t.last_name, COUNT(r.repair_id) as pending_count
        FROM Technicians t
        LEFT JOIN Repairs r ON t.technician_id = r.technician_id AND r.status IN ('Pending', 'In Progress')
        GROUP BY t.technician_id
    `;
    let sqlTechs = `SELECT technician_id, first_name FROM Technicians`;

    db.all(sqlRepairs, params, (err, repairs) => {
        db.all(sqlSummary, [], (err, summary) => {
            db.all(sqlTechs, [], (err, techs) => {
                // ส่ง status_filter กลับไปด้วยเพื่อให้หน้าเว็บรู้ว่าตอนนี้เลือกอะไรอยู่
                res.render('report-repairs', { repairs, summary, techs, tech_filter, date_filter, status_filter });
            });
        });
    });
});

// 📈 รายงานที่ 2: รายงานสรุปยอดรายได้
app.get('/report-revenue', (req, res) => {
    let type_filter = req.query.device_type || '';
    let status_filter = req.query.payment_status || '';

    // 1. Query เดิม: สรุปตามประเภทอุปกรณ์ (จัดอันดับ)
    let sqlMain = `
        SELECT d.device_type, p.payment_status, COUNT(r.repair_id) AS total_jobs, SUM(p.total_cost) AS total_revenue
        FROM Payments p
        JOIN Repairs r ON p.repair_id = r.repair_id
        JOIN Devices d ON r.device_id = d.device_id
        WHERE 1=1
    `;
    let params = [];
    if (type_filter) { sqlMain += ` AND d.device_type LIKE ?`; params.push('%' + type_filter + '%'); }
    if (status_filter) { sqlMain += ` AND p.payment_status = ?`; params.push(status_filter); }
    sqlMain += ` GROUP BY d.device_type, p.payment_status ORDER BY total_revenue DESC`;

    // 2. Query ใหม่: สรุปรายวัน (15 วันล่าสุด)
    const sqlDaily = `
        SELECT payment_date, SUM(total_cost) as daily_total, COUNT(payment_id) as job_count
        FROM Payments WHERE payment_status = 'Paid'
        GROUP BY payment_date ORDER BY payment_date DESC LIMIT 15
    `;

    // 3. Query ใหม่: สรุปรายเดือน (แยกตามเดือน/ปี)
    const sqlMonthly = `
        SELECT strftime('%Y-%m', payment_date) as month, SUM(total_cost) as monthly_total, COUNT(payment_id) as job_count
        FROM Payments WHERE payment_status = 'Paid'
        GROUP BY month ORDER BY month DESC
    `;

    let sqlTypes = `SELECT DISTINCT device_type FROM Devices WHERE device_type IS NOT NULL`;

    db.all(sqlMain, params, (err, report) => {
        db.all(sqlDaily, [], (err, dailyReport) => {
            db.all(sqlMonthly, [], (err, monthlyReport) => {
                db.all(sqlTypes, [], (err, types) => {
                    res.render('report-revenue', { 
                        report, types, type_filter, status_filter,
                        dailyReport, monthlyReport // ส่งข้อมูลใหม่ไปด้วย
                    });
                });
            });
        });
    });
});

app.listen(port, () => {
    console.log(`🚀 เปิดเว็บบราวเซอร์ไปที่ http://localhost:${port}`);
});