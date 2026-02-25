const express = require('express');
const axios = require('axios');
const path = require('path');
const app = express();

const port = 5500; 
const base_url = 'http://localhost:3000'; 

app.set("views", path.join(__dirname, "public/views"));
app.set("view engine", "ejs");
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, "public")));

// 1. หน้าแรกของเว็บไซต์ (หน้าเมนูหลัก)
app.get('/', (req, res) => {
    res.render('index'); // เรียกไฟล์ index.ejs มาแสดงเป็นหน้าแรก
});

/* ==================================Customer======================*/

// 1. ย้ายหน้าแสดงรายชื่อลูกค้าไปไว้ที่ Route อื่น (เช่น /customers-list)
app.get('/customers-list', async (req, res) => {
    try {
        const response = await axios.get(`${base_url}/customers`);
        res.render('Fcustomer/customers', { customers: response.data }); 
    } catch (error) {
        console.error("Error fetching customers:", error.message);
        res.status(500).send("Error connecting to Backend");
    }
});

// 2. หน้าเพิ่มลูกค้า
app.get("/create-customer", (req, res) => res.render("Fcustomer/customer_form"));

app.post("/create-customer", async (req, res) => {
    try {
        await axios.post(`${base_url}/customers`, req.body);
        res.redirect("/");
    } catch (error) {
        res.status(500).send("Error saving data");
    }
});

// 3. หน้าแก้ไขลูกค้า (ดึงข้อมูลเก่ามาโชว์)
app.get("/update-customer/:id", async (req, res) => {
    try {
        const response = await axios.get(`${base_url}/customers/${req.params.id}`);
        // ตรวจสอบว่ามีข้อมูลส่งกลับมาไหม
        if (response.data) {
            res.render("Fcustomer/update_customer", { customer: response.data });
        } else {
            res.status(404).send("Customer not found");
        }
    } catch (error) {
        res.status(500).send("Error fetching customer data");
    }
});

// 4. รับข้อมูลที่แก้ไขแล้วส่งไปบันทึก
app.post("/update-customer/:id", async (req, res) => {
    try {
        await axios.put(`${base_url}/customers/${req.params.id}`, req.body);
        res.redirect("/"); 
    } catch (error) {
        res.status(500).send("Error updating customer");
    }
});

// 5. ลบข้อมูล
app.get("/delete-customer/:id", async (req, res) => {
    try {
        await axios.delete(`${base_url}/customers/${req.params.id}`);
        res.redirect("/");
    } catch (error) {
        res.status(500).send("Error deleting data");
    }
});

/*===================================จบ Customer================================*/
/*=================================== Devices ================================*/
// --- Frontend Routes สำหรับ Devices ---

// 1. แสดงรายการอุปกรณ์ทั้งหมด
app.get('/devices-list', async (req, res) => {
    try {
        const response = await axios.get(`${base_url}/devices`);
        // ตรวจสอบชื่อโฟลเดอร์ให้ตรงกับที่เก็บไฟล์ (Fdevice/devices.ejs)
        res.render('Fdevice/devices', { devices: response.data });
    } catch (error) {
        res.status(500).send("Error fetching devices");
    }
});

// 2. หน้าฟอร์มเพิ่มอุปกรณ์ (GET) - ดึงข้อมูลลูกค้ารอไว้ใส่ Dropdown
app.get("/add-device", async (req, res) => {
    try {
        // ต้องดึงข้อมูลลูกค้าจาก Backend เพื่อไปแสดงในเมนูเลือก
        const response = await axios.get(`${base_url}/customers`);
        res.render("Fdevice/device_form", { customers: response.data });
    } catch (error) {
        // หากดึงลูกค้าไม่ได้ ให้ส่ง array ว่างไปเพื่อให้หน้าฟอร์มยังเปิดได้โดยไม่ Error
        res.render("Fdevice/device_form", { customers: [] });
    }
});

// 3. รับข้อมูลจากฟอร์มส่งไปเพิ่มที่ Backend (POST)
app.post("/add-device", async (req, res) => {
    try {
        await axios.post(`${base_url}/devices`, req.body);
        res.redirect("/devices-list");
    } catch (error) {
        console.error("Error saving device:", error.message);
        res.status(500).send("Error saving device");
    }
});

// 1. หน้าสำหรับดึงข้อมูลอุปกรณ์เดิมมาแสดงในฟอร์มแก้ไข
app.get('/device/update/:id', async (req, res) => {
    try {
        // ดึงข้อมูลอุปกรณ์ที่ต้องการแก้ไข
        const deviceRes = await axios.get(`${base_url}/devices/${req.params.id}`);
        // ดึงรายชื่อลูกค้าทั้งหมดมาแสดงใน Dropdown เผื่อเลือกเจ้าของใหม่
        const customersRes = await axios.get(`${base_url}/customers`);
        
        res.render('Fdevice/update_device', { 
            device: deviceRes.data, 
            customers: customersRes.data 
        });
    } catch (error) {
        console.error("Error fetching device for update:", error.message);
        res.status(500).send("Error fetching device data");
    }
});

// 2. รับข้อมูลจากฟอร์มเพื่อส่งไป Update ที่ Backend (ใช้ POST ตามโครงสร้างเดิม)
app.post('/device/update/:id', async (req, res) => {
    try {
        await axios.put(`${base_url}/devices/${req.params.id}`, req.body);
        res.redirect('/devices-list');
    } catch (error) {
        console.error("Error updating device:", error.message);
        res.status(500).send("Error updating device");
    }
});

// 4. ลบข้อมูลอุปกรณ์
app.get("/device/delete/:id", async (req, res) => {
    try {
        await axios.delete(`${base_url}/devices/${req.params.id}`);
        res.redirect("/devices-list");
    } catch (error) {
        res.status(500).send("Error deleting device");
    }
});
/*===================================จบ Devices================================*/

/*=================================== Technicians ================================*/
app.get('/technicians-list', async (req, res) => {
    try {
        const response = await axios.get(`${base_url}/technicians`);
        res.render('Ftechnician/technicians', { technicians: response.data });
    } catch (error) {
        res.status(500).send("Error fetching technicians");
    }
});

app.get('/add-technician', (req, res) => {
    res.render('Ftechnician/technician_form');
});

app.post('/add-technician', async (req, res) => {
    try {
        await axios.post(`${base_url}/technicians`, req.body);
        res.redirect('/technicians-list');
    } catch (error) {
        res.status(500).send("Error saving technician");
    }
});

app.get('/technician/update/:id', async (req, res) => {
    try {
        const response = await axios.get(`${base_url}/technicians/${req.params.id}`);
        res.render('Ftechnician/update_technician', { technician: response.data });
    } catch (error) {
        res.status(500).send("Error fetching technician");
    }
});

app.post('/technician/update/:id', async (req, res) => {
    try {
        await axios.put(`${base_url}/technicians/${req.params.id}`, req.body);
        res.redirect('/technicians-list');
    } catch (error) {
        res.status(500).send("Error updating technician");
    }
});

app.get('/technician/delete/:id', async (req, res) => {
    try {
        await axios.delete(`${base_url}/technicians/${req.params.id}`);
        res.redirect('/technicians-list');
    } catch (error) {
        res.status(500).send("Error deleting technician");
    }
});
/*=================================== End Technicians ================================*/
/*=================================== Dashboard ================================*/
// ใน FrondEnd.js
// =================================== 
// 1. DASHBOARD & REPAIRS (Step 4)
// =================================== 

// หน้าหลัก Dashboard แสดงรายการงานซ่อมทั้งหมด
app.get('/dashboard', async (req, res) => {
    try {
        const response = await axios.get(`${base_url}/repairs`);
        res.render('Frepair/dashboard', { repairs: response.data });
    } catch (error) {
        console.error("Error loading dashboard:", error.message);
        res.render('Frepair/dashboard', { repairs: [] });
    }
});

// หน้าฟอร์มเปิดใบสั่งซ่อมใหม่ (แก้ไข: เพิ่มการดึง customers เพื่อแก้ปัญหา Dropdown ว่าง)
app.get('/add-repair', async (req, res) => {
    try {
        const custRes = await axios.get(`${base_url}/customers`);
        const devRes = await axios.get(`${base_url}/devices`);
        const techRes = await axios.get(`${base_url}/technicians`);
        
        res.render('Frepair/repair_form', { 
            customers: custRes.data, // ดึงรายชื่อลูกค้ามาแสดง
            devices: devRes.data, 
            technicians: techRes.data 
        });
    } catch (error) {
        console.error("Error loading repair form:", error.message);
        res.render('Frepair/repair_form', { customers: [], devices: [], technicians: [] });
    }
});

// บันทึกข้อมูลใบสั่งซ่อม
app.post('/add-repair', async (req, res) => {
    try {
        await axios.post(`${base_url}/repairs`, req.body);
        res.redirect('/dashboard');
    } catch (error) {
        console.error("Error creating repair:", error.message);
        res.status(500).send("Error creating repair order");
    }
});
/*=================================== End Repair ================================*/
/*=================================== Repair Detail ================================*/
// หน้าแสดงรายละเอียดงานซ่อมรายใบ
app.get('/repair-detail/:id', async (req, res) => {
    try {
        const response = await axios.get(`${base_url}/repairs/${req.params.id}`);
        // ถ้าดึงข้อมูลสำเร็จ ให้แสดงหน้ารายละเอียด
        res.render('Frepair/repair_detail', { repair: response.data });
    } catch (error) {
        // ถ้าเกิด Error (เช่น หา ID ไม่เจอ) ให้เด้งกลับไปหน้า Dashboard
        console.error("Error fetching repair detail:", error.message);
        res.redirect('/dashboard'); 
    }
});

/*============================== Repair Details (Frontend) ============================*/

// หน้าเปิดฟอร์มบันทึกรายละเอียด (ที่คุณเพิ่งส่งโค้ด HTML มา)
app.get('/add-repair-detail/:id', (req, res) => {
    // ส่ง repair_id ไปแสดงที่หน้าฟอร์ม
    res.render('Frepair/repair_detail_form', { repair_id: req.params.id });
});

// รับข้อมูลจากฟอร์มบันทึกรายละเอียด
app.post('/api/repair-details', async (req, res) => {
    try {
        await axios.post(`${base_url}/repair-details`, req.body);
        // เมื่อบันทึกเสร็จ ให้กลับไปหน้าดูรายละเอียดหลักของงานนั้น
        res.redirect(`/repair-detail/${req.body.repair_id}`);
    } catch (error) {
        console.error("Error saving repair details:", error.message);
        res.status(500).send("เกิดข้อผิดพลาดในการบันทึกข้อมูล");
    }
});
/*=================================== End Repair Detail ================================*/

/*=================================== End Dashboard ================================*/

app.listen(port, () => console.log(`Frontend running at: http://localhost:${port}`));