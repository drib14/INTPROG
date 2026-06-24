const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

const app = express();

app.use(cors({
    origin: process.env.FRONTEND_URL
}));

app.use(express.json());

app.listen(process.env.PORT, () => {
    console.log(`Server running on ${process.env.PORT}`);
});
