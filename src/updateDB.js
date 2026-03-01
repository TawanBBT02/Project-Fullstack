const sqlite3 = require('sqlite3').verbose();

// เชื่อมต่อฐานข้อมูล (แก้ไขชื่อไฟล์ ./project.sqlite ให้ตรงกับของคุณถ้าจำเป็น)
const db = new sqlite3.Database('./Database/project.sqlite', (err) => {
    if (err) {
        console.error("เชื่อมต่อฐานข้อมูลไม่สำเร็จ:", err.message);
    } else {
        console.log("เชื่อมต่อฐานข้อมูลสำเร็จ กำลังเริ่มรีเซ็ตตาราง Users...");
    }
});

db.serialize(() => {
    // 1. ลบตาราง Users เดิมทิ้งทั้งหมด
    db.run(`DROP TABLE IF EXISTS Users;`, (err) => {
        if (err) {
            console.error("ลบตารางไม่สำเร็จ:", err.message);
        } else {
            console.log("✅ ขั้นที่ 1: ลบตาราง Users เดิมทิ้งเรียบร้อยแล้ว");
        }
    });

    // 2. สร้างตาราง Users ขึ้นมาใหม่ ด้วยโครงสร้างที่ถูกต้อง
    const createTableSql = `
        CREATE TABLE Users (
            user_id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT DEFAULT 'user',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `;
    
    db.run(createTableSql, (err) => {
        if (err) {
            console.error("สร้างตารางไม่สำเร็จ:", err.message);
        } else {
            console.log("✅ ขั้นที่ 2: สร้างตาราง Users ใหม่สำเร็จ โครงสร้างพร้อมใช้งาน 100%!");
        }
    });
});

// ปิดการเชื่อมต่อ
db.close((err) => {
    if (err) {
        console.error(err.message);
    } else {
        console.log("🎉 ดำเนินการเสร็จสิ้น! สามารถลบไฟล์ resetUsersTable.js ทิ้งได้เลย");
    }
});