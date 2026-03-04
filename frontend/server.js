// ไฟล์: frontend/server.js
const express = require('express');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = 3000; // หน้าบ้านรันพอร์ต 3000
const API_URL = 'http://localhost:5000'; // ชี้ไปหาหลังบ้าน

// ตั้งค่า EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'public/views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));

// --- โซนหน้าเว็บ ---
app.get('/', async (req, res) => {
    try {
        // ให้ Axios วิ่งไปขอข้อมูลจาก Backend
        const response = await axios.get(`${API_URL}/api/test`);
        
        // ได้ข้อมูลมาแล้ว เอาไปโชว์ในไฟล์ index.ejs
        res.render('login');
    } catch (error) {
        console.error("Frontend Error:", error.message);    
        res.send("<h1>เกิดข้อผิดพลาดในการเชื่อมต่อกับ Backend</h1>");
    }
});

// ต้องมีการ require express-session ไว้บนสุดด้วยนะครับ
const session = require('express-session'); 

// ... (โค้ด app.set view engine เดิม) ...

// 1. ตั้งค่าใช้งาน Session ให้ Frontend (เอาไว้จำว่าใครล็อกอิน)
app.use(session({
    secret: 'comrepair_v2_secret',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 24 } // 24 ชั่วโมง
}));

// ==========================================
// 🔐 ระบบ Login (ฝั่งหน้าบ้าน)
// ==========================================

// 1. เปิดหน้าเว็บ Login (ส่งตัวแปร error ว่างๆ ไปก่อน)
app.get('/login', (req, res) => {
    res.render('login', { error: null });
});

// 2. รับข้อมูลจากฟอร์มตอนผู้ใช้กดปุ่ม "เข้าสู่ระบบ"
app.post('/login', async (req, res) => {
    // ดึงค่า email และ password จากช่องกรอกข้อมูลในหน้าเว็บ
    const { email, password } = req.body;

    try {
        // ให้ Axios วิ่งเอาข้อมูลไปเช็คกับ API หลังบ้าน (พอร์ต 5000)
        const response = await axios.post('http://localhost:5000/api/login', {
            email: email,       
            password: password  
        });

        // ถ้าหลังบ้านตอบกลับมาว่ารหัสถูกต้อง
        if (response.data.success) {
            // บันทึกข้อมูลลง Session (เหมือนออกบัตรจอดรถให้)
            req.session.user = response.data.user;
            // เปิดประตู พาไปหน้างานซ่อม
            res.redirect('/index'); 
        }
    } catch (error) {
        // ถ้ารหัสผิด หรือหลังบ้านมีปัญหา
        const errorMsg = error.response ? error.response.data.message : "ไม่สามารถเชื่อมต่อหลังบ้านได้";
        console.log("❌ ล็อกอินไม่ผ่าน:", errorMsg);
        
        // ตีกลับไปหน้า Login พร้อมส่งข้อความแจ้งเตือนไปโชว์
        res.render('login', { error: errorMsg });
    }
});

// ==========================================
// 🌐 หน้าสมัครสมาชิก (ฝั่ง Frontend)
// ==========================================
app.get('/signup', (req, res) => {
    res.render('signup');
});

// ==========================================
// 🚪 ระบบ Logout (ออกจากระบบ)
// ==========================================
app.get('/logout', (req, res) => {
    req.session.destroy(); // ฉีกบัตรจอดรถทิ้ง
    res.redirect('/login'); // เตะกลับไปหน้า Login
});

// ==========================================
// 🏠 หน้าแรก (Dashboard)
// ==========================================
app.get('/index', (req, res) => {
    // 1. ดักยามหน้าประตู: ถ้ายังไม่ล็อกอิน เตะไปหน้า login
    if (!req.session || !req.session.user) {
        return res.redirect('/login');
    }
    
    // 2. ถ้าล็อกอินแล้ว เปิดหน้า index.ejs พร้อมส่งข้อมูล User ไปให้
    res.render('index', { 
        title: 'หน้าแรก - ภาพรวมระบบ',
        user: req.session.user 
    }); 
});

// ==========================================
// 👥 หน้าแสดงตารางลูกค้า
// ==========================================
app.get('/customers', (req, res) => {
    // ดักยามหน้าประตู
    if (!req.session || !req.session.user) {
        return res.redirect('/login'); 
    }
    
    // เปิดหน้า customers.ejs พร้อมส่งตัวแปรที่จำเป็นไปให้
    res.render('customers', { 
        title: 'จัดการข้อมูลลูกค้า',
        user: req.session.user 
    }); 
});

// ==========================================
// ➕ หน้าแบบฟอร์มเพิ่มลูกค้า
// ==========================================
app.get('/add_customer', (req, res) => {
    // ดักยามหน้าประตูเหมือนเดิม
    if (!req.session || !req.session.user) {
        return res.redirect('/login'); 
    }
    
    res.render('add_customer', { 
        title: 'เพิ่มลูกค้าใหม่',
        user: req.session.user 
    }); 
});

// ==========================================
// ✏️ หน้าแบบฟอร์มแก้ไขลูกค้า
// ==========================================
app.get('/edit_customer/:id', (req, res) => {
    if (!req.session || !req.session.user) return res.redirect('/login'); 
    
    res.render('edit_customer', { 
        title: 'แก้ไขข้อมูลลูกค้า',
        user: req.session.user,
        customerId: req.params.id // 🌟 ส่ง ID ลูกค้าไปให้หน้า EJS เพื่อให้ Axios ดึงข้อมูลถูกคน
    }); 
});

// ==========================================
// 💻 หน้าแสดงตารางอุปกรณ์
// ==========================================
app.get('/devices', (req, res) => {
    // ดักยามหน้าประตูเหมือนเดิม
    if (!req.session || !req.session.user) {
        return res.redirect('/login'); 
    }
    
    // เปิดหน้า devices.ejs
    res.render('devices', { 
        title: 'จัดการข้อมูลอุปกรณ์',
        user: req.session.user 
    }); 
});

// ==========================================
// ➕ หน้าแบบฟอร์มเพิ่มอุปกรณ์
// ==========================================
app.get('/add_device', (req, res) => {
    // ดักยามหน้าประตู
    if (!req.session || !req.session.user) {
        return res.redirect('/login'); 
    }
    
    res.render('add_device', { 
        title: 'เพิ่มอุปกรณ์ใหม่',
        user: req.session.user 
    }); 
});

// ==========================================
// ✏️ หน้าแบบฟอร์มแก้ไขอุปกรณ์
// ==========================================
app.get('/edit_device/:id', (req, res) => {
    if (!req.session || !req.session.user) return res.redirect('/login'); 
    
    res.render('edit_device', { 
        title: 'แก้ไขข้อมูลอุปกรณ์',
        user: req.session.user,
        deviceId: req.params.id // 🌟 ส่ง ID อุปกรณ์ไปให้หน้า EJS
    }); 
});

// ==========================================
// 🔧 หน้าแสดงตารางช่างซ่อม
// ==========================================
app.get('/technicians', (req, res) => {
    // ดักยามหน้าประตูเหมือนเดิม
    if (!req.session || !req.session.user) {
        return res.redirect('/login'); 
    }
    
    // เปิดหน้า technicians.ejs
    res.render('technicians', { 
        title: 'จัดการข้อมูลช่างซ่อม',
        user: req.session.user 
    }); 
});

// ==========================================
// ➕ หน้าแบบฟอร์มเพิ่มช่างซ่อม
// ==========================================
app.get('/add_technician', (req, res) => {
    // ดักยามหน้าประตู
    if (!req.session || !req.session.user) {
        return res.redirect('/login'); 
    }
    
    res.render('add_technician', { 
        title: 'เพิ่มช่างซ่อมใหม่',
        user: req.session.user 
    }); 
});

// ==========================================
// ✏️ หน้าแบบฟอร์มแก้ไขช่างซ่อม
// ==========================================
app.get('/edit_technician/:id', (req, res) => {
    if (!req.session || !req.session.user) return res.redirect('/login'); 
    
    res.render('edit_technician', { 
        title: 'แก้ไขข้อมูลช่างซ่อม',
        user: req.session.user,
        technicianId: req.params.id // 🌟 ส่ง ID ช่างไปให้หน้า EJS 
    }); 
});

// ==========================================
// 🛠️ หน้าแสดงตารางงานซ่อม
// ==========================================
app.get('/repairs', (req, res) => {
    if (!req.session.user) return res.redirect('/login'); 
    
    // 🌟 ส่งตัวแปร title (และข้อมูล user เผื่อ Sidebar ต้องใช้) ไปให้ EJS ด้วย
    res.render('repairs', { 
        title: 'รายการงานซ่อม',
        customerName: req.session.user.username // อันนี้เผื่อเมนูด้านข้างของคุณมีการโชว์ชื่อคนล็อกอินครับ
    }); 
});

// ==========================================
// ➕ หน้าแบบฟอร์มเพิ่มงานซ่อม
// ==========================================
app.get('/add_repair', (req, res) => {
    // ดักยามหน้าประตู
    if (!req.session || !req.session.user) {
        return res.redirect('/login'); 
    }
    
    res.render('add_repair', { 
        title: 'เปิดงานซ่อมใหม่',
        user: req.session.user 
    }); 
});

// ==========================================
// ✏️ หน้าแบบฟอร์มแก้ไขงานซ่อม
// ==========================================
app.get('/edit_repair/:id', (req, res) => {
    if (!req.session || !req.session.user) return res.redirect('/login'); 
    
    res.render('edit_repair', { 
        title: 'แก้ไขข้อมูลงานซ่อม',
        user: req.session.user,
        repairId: req.params.id // 🌟 ส่ง ID งานซ่อมไปให้หน้า EJS
    }); 
});

// ==========================================
// 🔍 หน้าดูรายละเอียดงานซ่อม
// ==========================================
app.get('/repair-details/:id', (req, res) => {
    // ดักยามหน้าประตู
    if (!req.session || !req.session.user) {
        return res.redirect('/login'); 
    }
    
    res.render('repair_details', { 
        title: 'รายละเอียดงานซ่อม',
        user: req.session.user,
        repairId: req.params.id // 🌟 ส่ง ID งานซ่อมไปให้หน้า EJS ใช้งาน
    }); 
});

// ==========================================
// 💳 หน้าแสดงตารางการชำระเงิน
// ==========================================
app.get('/payments', (req, res) => {
    // ดักยามหน้าประตูเหมือนเดิม
    if (!req.session || !req.session.user) {
        return res.redirect('/login'); 
    }
    
    // เปิดหน้า payments.ejs
    res.render('payments', { 
        title: 'ระบบการชำระเงิน',
        user: req.session.user 
    }); 
});

// ==========================================
// ➕ หน้าแบบฟอร์มรับชำระเงิน
// ==========================================
app.get('/add_payment', (req, res) => {
    // ดักยามหน้าประตู
    if (!req.session || !req.session.user) {
        return res.redirect('/login'); 
    }
    
    res.render('add_payment', { 
        title: 'รับชำระเงิน',
        user: req.session.user 
    }); 
});

// ==========================================
// ✏️ หน้าแบบฟอร์มแก้ไขข้อมูลการชำระเงิน
// ==========================================
app.get('/edit_payment/:id', (req, res) => {
    if (!req.session || !req.session.user) return res.redirect('/login'); 
    
    res.render('edit_payment', { 
        title: 'แก้ไขข้อมูลบิลชำระเงิน',
        user: req.session.user,
        paymentId: req.params.id // 🌟 ส่ง ID บิลไปให้หน้า EJS ใช้งาน
    }); 
});

// ==========================================
// 📊 หน้าแสดงรายงานการแจ้งซ่อม
// ==========================================
app.get('/report_repairs', (req, res) => {
    // ดักยามหน้าประตู
    if (!req.session || !req.session.user) {
        return res.redirect('/login'); 
    }
    
    res.render('report_repairs', { 
        title: 'รายงานการแจ้งซ่อม',
        user: req.session.user 
    }); 
});

// ==========================================
// 💰 หน้าแสดงรายงานรายรับ (บัญชี)
// ==========================================
app.get('/report_revenue', (req, res) => {
    // ดักยามหน้าประตู
    if (!req.session || !req.session.user) {
        return res.redirect('/login'); 
    }
    
    res.render('report_revenue', { 
        title: 'สรุปรายงานรายรับ',
        user: req.session.user 
    }); 
});

app.listen(PORT, () => {
    console.log(`🌐 Frontend Web รันอยู่ที่ http://localhost:${PORT}`);
});