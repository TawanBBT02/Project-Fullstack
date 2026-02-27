const sqlite3 = require('sqlite3').verbose();

// เชื่อมต่อหรือสร้างไฟล์ฐานข้อมูลใหม่ชื่อ computer_service.db
const db = new sqlite3.Database('./Database/project.sqlite', (err) => {
    if (err) {
        console.error('เกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล:', err.message);
    } else {
        console.log('เชื่อมต่อฐานข้อมูล SQLite สำเร็จแล้ว!');
        // เปิดใช้งานการตรวจสอบ Foreign Key
        db.run('PRAGMA foreign_keys = ON;');
        //createTables();
    }
});

// ฟังก์ชันสำหรับสร้างตาราง
function createTables() {
    // db.serialize จะช่วยให้คำสั่ง SQL ทำงานเรียงตามลำดับจากบนลงล่าง
    db.serialize(() => {
        
        // 1. ตาราง Customers
        db.run(`CREATE TABLE IF NOT EXISTS Customers (
            customer_id INTEGER PRIMARY KEY AUTOINCREMENT,
            first_name TEXT NOT NULL,
            last_name TEXT NOT NULL,
            phone TEXT,
            email TEXT,
            address TEXT
        )`, (err) => { if(err) console.error("Error Customers:", err.message); });

        // 2. ตาราง Devices
        db.run(`CREATE TABLE IF NOT EXISTS Devices (
            device_id INTEGER PRIMARY KEY AUTOINCREMENT,
            customer_id INTEGER,
            device_type TEXT,
            brand TEXT,
            model TEXT,
            serial_number TEXT,
            FOREIGN KEY (customer_id) REFERENCES Customers(customer_id) ON DELETE CASCADE
        )`, (err) => { if(err) console.error("Error Devices:", err.message); });

        // 3. ตาราง Technicians
        db.run(`CREATE TABLE IF NOT EXISTS Technicians (
            technician_id INTEGER PRIMARY KEY AUTOINCREMENT,
            first_name TEXT NOT NULL,
            last_name TEXT NOT NULL,
            phone TEXT,
            email TEXT,
            hire_date DATE
        )`, (err) => { if(err) console.error("Error Technicians:", err.message); });

        // 4. ตาราง Repairs
        db.run(`CREATE TABLE IF NOT EXISTS Repairs (
            repair_id INTEGER PRIMARY KEY AUTOINCREMENT,
            customer_id INTEGER,
            device_id INTEGER,
            technician_id INTEGER,
            problem_type TEXT,
            status TEXT,
            receive_date DATE,
            issue_description TEXT,
            FOREIGN KEY (customer_id) REFERENCES Customers(customer_id),
            FOREIGN KEY (device_id) REFERENCES Devices(device_id),
            FOREIGN KEY (technician_id) REFERENCES Technicians(technician_id)
        )`, (err) => { if(err) console.error("Error Repairs:", err.message); });

        // 5. ตาราง Repair_Details
        db.run(`CREATE TABLE IF NOT EXISTS Repair_Details (
            detail_id INTEGER PRIMARY KEY AUTOINCREMENT,
            repair_id INTEGER,
            details TEXT,
            diagnostic_result TEXT,
            completed_date DATE,
            repair_result TEXT,
            FOREIGN KEY (repair_id) REFERENCES Repairs(repair_id) ON DELETE CASCADE
        )`, (err) => { if(err) console.error("Error Repair_Details:", err.message); });

        // 6. ตาราง Payments
        db.run(`CREATE TABLE IF NOT EXISTS Payments (
            payment_id INTEGER PRIMARY KEY AUTOINCREMENT,
            repair_id INTEGER,
            total_cost REAL,
            payment_date DATE,
            payment_status TEXT,
            FOREIGN KEY (repair_id) REFERENCES Repairs(repair_id) ON DELETE CASCADE
        )`, (err) => { 
            if(err) console.error("Error Payments:", err.message); 
            else console.log("สร้างตารางทั้งหมดเสร็จสมบูรณ์!");
        });

    });

    // ปิดการเชื่อมต่อเมื่อรันเสร็จ (ถ้าใช้ไฟล์นี้เพื่อ setup ครั้งเดียว)
    // db.close(); 
}

// คำสั่งสร้างตาราง Users
const sqlCreateUsers = `
CREATE TABLE IF NOT EXISTS Users (
    user_id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER UNIQUE,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES Customers(customer_id)
);`;

db.run(sqlCreateUsers, (err) => {
    if (err) console.error("Error creating Users table:", err.message);
    else console.log("Users table ready.");
});
// ส่งออก db ไปใช้ในไฟล์อื่นได้ (ถ้าต้องการ)
module.exports = db;