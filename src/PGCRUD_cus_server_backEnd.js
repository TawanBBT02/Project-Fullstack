const express = require('express');
const Sequelize = require('sequelize');
const app = express();
app.use(express.json());

const dbUrl = 'postgres://webadmin:PCHeog63776@node86422-project-fullstack.proen.app.ruk-com.cloud:11900/ProjectFullstack';

const sequelize = new Sequelize(dbUrl, {
    dialect: 'postgres',
    logging: false,
});

app.get('/', (req, res) => {
    res.send("Backend is running! Try /customers to see data.");
});

/*================================Customer======================== */
const Customer = sequelize.define('customer', {
    customer_id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
    first_name: Sequelize.STRING(100),
    last_name: Sequelize.STRING(100),
    phone: Sequelize.STRING(20),
    email: Sequelize.STRING(100),
    address: Sequelize.TEXT
}, {
    tableName: 'customers', 
    schema: 'public',
    timestamps: false,
    freezeTableName: true 
});

app.get('/customers', (req, res) => {
    Customer.findAll()
        .then(data => res.json(data))
        .catch(err => { console.error(err); res.status(500).send("Database Error"); });
});

app.post('/customers', (req, res) => {
    Customer.create(req.body)
        .then(data => res.status(201).send(data))
        .catch(err => { console.error(err); res.status(500).send("Create Error"); });
});

app.get('/customers/:id', (req, res) => {
    Customer.findByPk(req.params.id)
        .then(data => {
            if (data) res.json(data);
            else res.status(404).send("Customer not found");
        })
        .catch(err => { console.error(err); res.status(500).send("Database Error"); });
});

app.put('/customers/:id', (req, res) => {
    Customer.update(req.body, { where: { customer_id: req.params.id } })
        .then(() => res.send({ message: "Updated successfully" }))
        .catch(err => { console.error(err); res.status(500).send("Update Error"); });
});

app.delete('/customers/:id', (req, res) => {
    Customer.destroy({ where: { customer_id: req.params.id } })
        .then(() => res.send({ message: "Deleted successfully" }))
        .catch(err => { console.error(err); res.status(500).send("Delete Error"); });
});

/*==========================Device===============================*/
const Device = sequelize.define('device', {
    device_id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
    customer_id: { type: Sequelize.INTEGER, allowNull: false },
    device_type: Sequelize.STRING(50),
    brand: Sequelize.STRING(50),
    model: Sequelize.STRING(100),
    serial_number: Sequelize.STRING(100)
}, {
    tableName: 'devices',
    schema: 'public',
    timestamps: false,
    freezeTableName: true
});

Customer.hasMany(Device, { foreignKey: 'customer_id' });
Device.belongsTo(Customer, { foreignKey: 'customer_id' });

app.get('/devices', (req, res) => {
    Device.findAll({ include: [Customer] })
        .then(data => res.json(data))
        .catch(err => { console.error(err); res.status(500).send("Database Error"); });
});

app.post('/devices', (req, res) => {
    Device.create(req.body)
        .then(data => res.status(201).send(data))
        .catch(err => { console.error(err); res.status(500).send("Create Device Error"); });
});

app.get('/devices/:id', (req, res) => {
    Device.findByPk(req.params.id, { include: [Customer] })
        .then(data => res.json(data))
        .catch(err => res.status(500).send("Error fetching device"));
});

app.put('/devices/:id', (req, res) => {
    Device.update(req.body, { where: { device_id: req.params.id } })
    .then(() => res.send({ message: "Updated successfully" }))
    .catch(err => { console.error(err); res.status(500).send("Update Backend Error"); });
});

app.delete('/devices/:id', (req, res) => {
    Device.destroy({ where: { device_id: req.params.id } })
    .then(() => res.send({ message: "Deleted successfully" }))
    .catch(err => { console.error(err); res.status(500).send("Delete Backend Error"); });
});

/*=================================Technicians============================*/
const Technician = sequelize.define('technician', {
    technician_id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
    first_name: Sequelize.STRING(100),
    last_name: Sequelize.STRING(100),
    phone: Sequelize.STRING(20),
    email: Sequelize.STRING(100),
    hire_date: Sequelize.DATEONLY
}, {
    tableName: 'technicians',
    schema: 'public',
    timestamps: false,
    freezeTableName: true
});

app.get('/technicians', (req, res) => {
    Technician.findAll()
        .then(data => res.json(data))
        .catch(err => res.status(500).send("Database Error"));
});

app.post('/technicians', (req, res) => {
    Technician.create(req.body)
        .then(data => res.status(201).send(data))
        .catch(err => res.status(500).send("Create Error"));
});

app.get('/technicians/:id', (req, res) => {
    Technician.findByPk(req.params.id)
        .then(data => res.json(data))
        .catch(err => res.status(500).send("Fetch Error"));
});

app.put('/technicians/:id', (req, res) => {
    Technician.update(req.body, { where: { technician_id: req.params.id } })
        .then(() => res.send("Updated"))
        .catch(err => res.status(500).send("Update Error"));
});

app.delete('/technicians/:id', (req, res) => {
    Technician.destroy({ where: { technician_id: req.params.id } })
        .then(() => res.send("Deleted"))
        .catch(err => res.status(500).send("Delete Error"));
});

/*================================= Repairs API ============================*/
const Repair = sequelize.define('repair', {
    repair_id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
    device_id: Sequelize.INTEGER,
    technician_id: Sequelize.INTEGER,
    problem_type: Sequelize.STRING(50),
    issue_description: Sequelize.TEXT, 
    status: Sequelize.STRING(50),
    receive_date: Sequelize.DATEONLY,
    payment_id: Sequelize.INTEGER
}, {
    tableName: 'repairs',
    timestamps: false
});

/*============================== Repair Details API ============================*/
// (ย้ายขึ้นมาไว้ตรงนี้เพื่อให้ Repair รู้จัก RepairDetail ตอนทำ Association)
const RepairDetail = sequelize.define('repair_detail', {
    detail_id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
    repair_id: { type: Sequelize.INTEGER, allowNull: false },
    diagnostic_result: Sequelize.TEXT,
    details: Sequelize.TEXT,
    completed_date: Sequelize.DATEONLY,
    repair_result: Sequelize.STRING(50)
}, {
    tableName: 'repair_details',
    timestamps: false
});

// กำหนดความสัมพันธ์ทั้งหมดของ Repair
Device.hasMany(Repair, { foreignKey: 'device_id' });
Repair.belongsTo(Device, { foreignKey: 'device_id' });

Technician.hasMany(Repair, { foreignKey: 'technician_id' });
Repair.belongsTo(Technician, { foreignKey: 'technician_id' });

// เพิ่มความสัมพันธ์กับ RepairDetail ตรงนี้
Repair.hasMany(RepairDetail, { foreignKey: 'repair_id' });
RepairDetail.belongsTo(Repair, { foreignKey: 'repair_id' });

// Routes สำหรับ Repair
app.get('/repairs', (req, res) => {
    Repair.findAll({
        include: [{ model: Device, include: [Customer] }, Technician],
        order: [['repair_id', 'DESC']]
    })
    .then(data => res.json(data))
    .catch(err => res.status(500).send("Database Error: " + err.message));
});

app.post('/repairs', (req, res) => {
    Repair.create(req.body)
        .then(data => res.status(201).send(data))
        .catch(err => res.status(500).send("Create Error: " + err.message));
});

// *** จุดสำคัญ: แก้ไขให้ include RepairDetail มาด้วย ***
app.get('/repairs/:id', (req, res) => {
    Repair.findByPk(req.params.id, {
        include: [
            { model: Device, include: [Customer] }, 
            Technician,
            RepairDetail // เพิ่มเพื่อให้หน้า Detail เห็นประวัติการซ่อม
        ]
    })
    .then(data => res.json(data))
    .catch(err => res.status(500).send("Fetch Error: " + err.message));
});

app.put('/repairs/:id', (req, res) => {
    Repair.update(req.body, { where: { repair_id: req.params.id } })
        .then(() => res.send({ message: "Updated successfully" }))
        .catch(err => res.status(500).send("Update Error: " + err.message));
});

app.delete('/repairs/:id', (req, res) => {
    Repair.destroy({ where: { repair_id: req.params.id } })
        .then(() => res.send({ message: "Deleted successfully" }))
        .catch(err => res.status(500).send("Delete Error: " + err.message));
});

// Routes สำหรับ RepairDetail
app.post('/repair-details', (req, res) => {
    RepairDetail.create(req.body)
        .then(data => res.status(201).json(data))
        .catch(err => res.status(500).send("Create Detail Error: " + err.message));
});

app.get('/repair-details/main/:repair_id', (req, res) => {
    RepairDetail.findAll({ 
        where: { repair_id: req.params.repair_id },
        order: [['detail_id', 'ASC']]
    })
    .then(data => res.json(data))
    .catch(err => res.status(500).send("Fetch Detail Error: " + err.message));
});

/*============================== Finalize ============================*/
sequelize.sync({ alter: true }) 
    .then(() => {
        console.log("Database updated successfully with new columns!");
    })
    .catch(err => {
        console.error("Sync Error: ", err);
    });

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Backend: http://localhost:${port}`));