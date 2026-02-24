const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const path = require('path');   // ✅ เพิ่มบรรทัดนี้

const app = express();
const port = process.env.PORT || 5500; // ✅ เปลี่ยนพอร์ตเป็น 5500 เพื่อไม่ชนกับ backend
const base_url = 'http://localhost:3545'; // ✅ แก้ให้ตรงกับ API backend

app.set("views", path.join(__dirname, "public/views")); // เอา / หน้าออกก็ได้
app.set("view engine", "ejs");

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// Serve static files
app.use(express.static(path.join(__dirname, "public")));

app.get('/', async (req, res) => {
    try {
        const response = await axios.get(`${base_url}/books`);
        res.render('books', { books: response.data });
    } catch (error) {
        console.error(error.message);
        res.status(500).send("Error");
    }
});

app.get('/books/:id', async (req, res) => {
    try {
        const response = await axios.get(`${base_url}/books/${req.params.id}`);
        res.render('book', { book: response.data });
    } catch (error) {
        console.error(error.message);
        res.status(500).send("Error");
    }
});

app.get("/create", (req, res) => {
    res.render("create");
});

app.post("/create", async (req, res) => {
    try {
        const data = {
            title: req.body.title,
            author: req.body.author,
        };

        await axios.post(`${base_url}/books`, data);
        res.redirect("/");
    } catch (error) {
        console.error(error.message);
        res.status(500).send("Error");
    }
});

app.get("/update/:id", async (req, res) => {
    try {
        const response = await axios.get(`${base_url}/books/${req.params.id}`);
        res.render("update", { book: response.data });
    } catch (error) {
        console.error(error.message);
        res.status(500).send("Error");
    }
});

app.post("/update/:id", async (req, res) => {
    try {
        const data = {
            title: req.body.title,
            author: req.body.author,
        };

        await axios.put(`${base_url}/books/${req.params.id}`, data);
        res.redirect("/");
    } catch (error) {
        console.error(error.message);
        res.status(500).send("Error");
    }
});

app.get("/delete/:id", async (req, res) => {
    try {
        await axios.delete(`${base_url}/books/${req.params.id}`);
        res.redirect("/");
    } catch (error) {
        console.error(error.message);
        res.status(500).send("Error");
    }
});

app.listen(port, () => {
    console.log(`Server is running on port http://localhost:${port}`);
});