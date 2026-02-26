const express = require('express');
const Sequelize = require('sequelize');
const path = require('path'); 
const app = express();
app.use(express.json());

// --- การเชื่อมต่อ SQLite (กลับไปใช้ Path เดิม) ---
const sequelize = new Sequelize({
    dialect: 'sqlite',
    // ชี้ไปที่โฟลเดอร์ Database ที่อยู่นอกโฟลเดอร์ Backend
    storage: path.join(__dirname, '../Database/project.sqlite'), 
    logging: false
});

/*================================ Models Definition ======================== */

const Customer = sequelize.define('customer', {
    customer_id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
    first_name: Sequelize.STRING,
    last_name: Sequelize.STRING,
    phone: Sequelize.STRING,
    email: Sequelize.STRING,
    address: Sequelize.TEXT
}, { timestamps: false });

const Device = sequelize.define('device', {
    device_id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
    customer_id: { type: Sequelize.INTEGER, allowNull: false },
    device_type: Sequelize.STRING,
    brand: Sequelize.STRING,
    model: Sequelize.STRING,
    serial_number: Sequelize.STRING
}, { timestamps: false });

const Technician = sequelize.define('technician', {
    technician_id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
    first_name: Sequelize.STRING,
    last_name: Sequelize.STRING,
    phone: Sequelize.STRING,
    email: Sequelize.STRING,
    hire_date: Sequelize.DATEONLY
}, { timestamps: false });

const Repair = sequelize.define('repair', {
    repair_id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
    device_id: Sequelize.INTEGER,
    technician_id: Sequelize.INTEGER,
    problem_type: Sequelize.STRING,
    issue_description: Sequelize.TEXT, 
    status: Sequelize.STRING,
    receive_date: Sequelize.DATEONLY,
    payment_id: Sequelize.INTEGER 
}, { timestamps: false });

const RepairDetail = sequelize.define('repair_detail', {
    detail_id: { 
        type: Sequelize.INTEGER, 
        primaryKey: true, 
        autoIncrement: true  // <--- ให้มีตัวนี้แค่ตัวเดียวพอ
    },
    repair_id: { 
        type: Sequelize.INTEGER // <--- ห้ามใส่ autoIncrement ตรงนี้! เพราะเป็น Foreign Key
    },
    diagnostic_result: Sequelize.TEXT,
    details: Sequelize.TEXT,
    completed_date: Sequelize.DATEONLY,
    repair_result: Sequelize.STRING
}, { 
    tableName: 'repair_details', // ใส่ชื่อตารางให้ชัดเจน (เติม s)
    timestamps: false 
});

const Payment = sequelize.define('payment', {
    payment_id: { 
        type: Sequelize.INTEGER, 
        primaryKey: true, 
        autoIncrement: true  // <--- ให้มีตัวนี้แค่ตัวเดียว!
    },
    repair_id: { 
        type: Sequelize.INTEGER,
        allowNull: false 
        // ห้ามมี autoIncrement: true ตรงนี้เด็ดขาด
    },
    total_cost: Sequelize.DECIMAL(10, 2),
    payment_date: Sequelize.DATEONLY,
    payment_status: Sequelize.STRING(50)
}, { 
    tableName: 'payments', 
    timestamps: false 
});

/*================================ Associations ======================== */

Customer.hasMany(Device, { foreignKey: 'customer_id' });
Device.belongsTo(Customer, { foreignKey: 'customer_id' });

Device.hasMany(Repair, { foreignKey: 'device_id' });
Repair.belongsTo(Device, { foreignKey: 'device_id' });

Technician.hasMany(Repair, { foreignKey: 'technician_id' });
Repair.belongsTo(Technician, { foreignKey: 'technician_id' });

Repair.hasMany(RepairDetail, { foreignKey: 'repair_id' });
RepairDetail.belongsTo(Repair, { foreignKey: 'repair_id' });

Repair.hasOne(Payment, { foreignKey: 'repair_id' });
Payment.belongsTo(Repair, { foreignKey: 'repair_id' });

/*================================ API Routes ======================== */

// Customers
app.get('/customers', (req, res) => {
    Customer.findAll().then(data => res.json(data)).catch(err => res.status(500).send(err.message));
});
app.post('/customers', (req, res) => {
    Customer.create(req.body).then(data => res.status(201).send(data));
});
app.get('/customers/:id', (req, res) => {
    Customer.findByPk(req.params.id).then(data => res.json(data));
});
app.put('/customers/:id', (req, res) => {
    Customer.update(req.body, { where: { customer_id: req.params.id } }).then(() => res.send("Updated"));
});
app.delete('/customers/:id', (req, res) => {
    Customer.destroy({ where: { customer_id: req.params.id } }).then(() => res.send("Deleted"));
});

// Devices
app.get('/devices', (req, res) => {
    Device.findAll({ include: [Customer] }).then(data => res.json(data));
});
app.post('/devices', (req, res) => {
    Device.create(req.body).then(data => res.status(201).send(data));
});
app.get('/devices/:id', (req, res) => {
    Device.findByPk(req.params.id, { include: [Customer] }).then(data => res.json(data));
});

// Technicians
app.get('/technicians', (req, res) => {
    Technician.findAll().then(data => res.json(data));
});
app.post('/technicians', (req, res) => {
    Technician.create(req.body).then(data => res.status(201).send(data));
});

// Repairs (ดึงข้อมูล Payment มาแสดงที่หน้า Dashboard ได้เลย)
app.get('/repairs', (req, res) => {
    Repair.findAll({
        include: [{ model: Device, include: [Customer] }, Technician, Payment],
        order: [['repair_id', 'DESC']]
    }).then(data => res.json(data));
});

// Repair Detail (ดึงข้อมูลครบทุกอย่าง)
app.get('/repairs/:id', (req, res) => {
    Repair.findByPk(req.params.id, {
        include: [
            { model: Device, include: [Customer] }, 
            Technician, 
            RepairDetail, 
            Payment
        ]
    }).then(data => res.json(data));
});

app.post('/repairs', (req, res) => {
    Repair.create(req.body).then(data => res.status(201).send(data));
});

// Repair Details
app.post('/repair-details', (req, res) => {
    RepairDetail.create(req.body).then(data => res.status(201).json(data));
});

// Payments
app.post('/payments', async (req, res) => {
    try {
        const payment = await Payment.create(req.body);
        await Repair.update(
            { payment_id: payment.payment_id, status: 'Completed' }, 
            { where: { repair_id: req.body.repair_id } }
        );
        res.status(201).json(payment);
    } catch (err) {
        res.status(500).send(err.message);
    }
});

/*============================== Sync & Start ============================*/

// มั่นใจว่าลบไฟล์เก่าทิ้งแล้วรันด้วย force: true หนึ่งรอบเพื่อล้าง Constraint
// จากนั้นค่อยแก้เป็น alter: true หรือ sync() ปกติครับ
sequelize.sync({ alter: true }) 
    .then(() => console.log("SQLite Database & Tables Synced at ../Database/project.sqlite"))
    .catch(err => console.error("Sync Error: ", err));

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Backend SQLite: http://localhost:${port}`));