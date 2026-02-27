const express = require('express');
const axios = require('axios');
const path = require('path');
const app = express();

const port = 5500;
const base_url = 'http://localhost:3000'; 

// --- [ZONE: CONFIGURATION] ---
// แก้ไข Path ให้ชี้เข้าหา public/views จากตำแหน่งไฟล์ปัจจุบัน
app.set("views", path.join(__dirname, "public/views"));
app.set("view engine", "ejs");

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, "public")));

/* ================================== 1. DASHBOARD & HOME ====================== */

app.get('/', (req, res) => {
    res.render('index'); // เรียก public/views/index.ejs
});

app.get('/dashboard', async (req, res) => {
    try {
        const response = await axios.get(`${base_url}/repairs`);
        res.render('Frepair/dashboard', { repairs: response.data });
    } catch (error) {
        res.render('Frepair/dashboard', { repairs: [] });
    }
});

/* ================================== 2. CUSTOMER ====================== */

app.get('/customers-list', async (req, res) => {
    try {
        const response = await axios.get(`${base_url}/customers`);
        res.render('Fcustomer/customers', { customers: response.data });
    } catch (error) { res.status(500).send("Error fetching customers"); }
});

app.get("/create-customer", (req, res) => res.render("Fcustomer/customer_form"));

app.post("/create-customer", async (req, res) => {
    try {
        await axios.post(`${base_url}/customers`, req.body);
        res.redirect("/customers-list");
    } catch (error) { res.status(500).send("Error creating customer"); }
});

app.get('/update-customer/:id', async (req, res) => {
    try {
        const response = await axios.get(`${base_url}/customers/${req.params.id}`);
        res.render('Fcustomer/update_customer', { customers: response.data });
    } catch (error) {
        res.status(500).send("Error fetching customer");
    }
});

app.post('/update-customer/:id', async (req, res) => {
    try {
        await axios.put(`${base_url}/customers/${req.params.id}`, req.body);
        res.redirect('/customers-list');
    } catch (error) {
        res.status(500).send("Error updating customer");
    }
});
/* ================================== 3. DEVICE ====================== */

app.get('/devices-list', async (req, res) => {
    try {
        const response = await axios.get(`${base_url}/devices`);
        res.render('Fdevice/devices', { devices: response.data });
    } catch (error) { res.status(500).send("Error fetching devices"); }
});

app.get("/add-device", async (req, res) => {
    try {
        const response = await axios.get(`${base_url}/customers`);
        res.render("Fdevice/device_form", { customers: response.data });
    } catch (error) { res.render("Fdevice/device_form", { customers: [] }); }
});

app.post("/add-device", async (req, res) => {
    try {
        await axios.post(`${base_url}/devices`, req.body);
        res.redirect("/devices-list");
    } catch (error) { res.status(500).send("Error adding device"); }
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

/* ================================== 4. TECHNICIAN ====================== */

app.get('/technicians-list', async (req, res) => {
    try {
        const response = await axios.get(`${base_url}/technicians`);
        res.render('Ftechnician/technicians', { technicians: response.data });
    } catch (error) { res.status(500).send("Error fetching technicians"); }
});

app.get('/add-technician', (req, res) => res.render('Ftechnician/technician_form'));

app.post('/add-technician', async (req, res) => {
    try {
        await axios.post(`${base_url}/technicians`, req.body);
        res.redirect('/technicians-list');
    } catch (error) { res.status(500).send("Error adding technician"); }
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

/* ================================== 5. REPAIR ====================== */

app.get('/add-repair', async (req, res) => {
    try {
        const custRes = await axios.get(`${base_url}/customers`);
        const devRes = await axios.get(`${base_url}/devices`);
        const techRes = await axios.get(`${base_url}/technicians`);
        res.render('Frepair/repair_form', { 
            customers: custRes.data, 
            devices: devRes.data, 
            technicians: techRes.data 
        });
    } catch (error) { res.status(500).send("Error loading repair form"); }
});

app.post('/add-repair', async (req, res) => {
    try {
        await axios.post(`${base_url}/repairs`, req.body);
        res.redirect('/dashboard');
    } catch (error) { res.status(500).send("Error saving repair"); }
});

app.get('/repair-detail/:id', async (req, res) => {
    try {
        const response = await axios.get(`${base_url}/repairs/${req.params.id}`);
        res.render('Frepair/repair_detail', { repair: response.data });
    } catch (error) { res.redirect('/dashboard'); }
});

/* ================================== 6. PAYMENT ====================== */

app.get('/payments-list', async (req, res) => {
    try {
        const response = await axios.get(`${base_url}/payments`);
        res.render('Fpayment/payments', { payments: response.data || [] });
    } catch (error) {
        res.render('Fpayment/payments', { payments: [] });
    }
});

app.get('/add-payment/:id', (req, res) => {
    res.render('Fpayment/payment_form', { repair_id: req.params.id });
});

app.post('/add-payment', async (req, res) => {
    try {
        await axios.post(`${base_url}/payments`, req.body);
        res.redirect('/payments-list');
    } catch (error) { res.status(500).send("Error processing payment"); }
});

// --- [START SERVER] ---
app.listen(port, () => {
    console.log(`Frontend running at http://localhost:${port}`);
});