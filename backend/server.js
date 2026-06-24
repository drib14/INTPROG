const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const bcrypt = require("bcryptjs");

dotenv.config();

const app = express();

app.use(
    cors({
        origin: process.env.FRONTEND_URL,
    })
);

app.use(express.json());

app.post("/api/message", async (req, res) => {
    try {
        const { text, email, password } = req.body;

        if (!text || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "All fields are required",
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        // Later you will save this to MongoDB
        console.log({
            text,
            email,
            hashedPassword,
        });

        res.status(201).json({
            success: true,
            message: "Data received successfully",
            user: {
                text,
                email,
                hashedPassword,
            },
        });
    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: "Internal Server Error",
        });
    }
});

app.listen(process.env.PORT, () => {
    console.log(`Server running on port ${process.env.PORT}`);
});