const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const bcrypt = require("bcryptjs");
const { DBConnection } = require("./database/db.js");
const User = require("./model/User.js");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const { body, validationResult } = require("express-validator");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

DBConnection();

app.get("/", (req, res) => {
  res.send("Hello, world!");
});

app.post(
  "/register",
  [
    body("firstname").notEmpty().withMessage("First name is required"),
    body("lastname").notEmpty().withMessage("Last name is required"),
    body("email").isEmail().withMessage("Valid email is required"),
    body("password")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      //get all the data from body
      const { firstname, lastname, email, password } = req.body;

      // check if user already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(409).json({ message: "User already exists!" });
      }

      // encrypt the password
      const hashedPassword = await bcrypt.hash(password, 10);

      // save the user in DB
      const user = await User.create({
        firstname,
        lastname,
        email,
        password: hashedPassword,
      });

      // generate a token for user and send it
      const token = jwt.sign({ id: user._id, email }, process.env.SECRET_KEY, {
        expiresIn: "1d",
      });
      user.token = token;
      user.password = undefined;
      res.status(201).json({
        message: "You have successfully registered!",
        user: {
          id: user._id,
          firstname: user.firstname,
          lastname: user.lastname,
          email: user.email,
        },
        token,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

app.post("/login", async (req, res) => {
  try {
    //get all the user data
    const { email, password } = req.body;

    // check that all the data should exists
    if (!(email && password)) {
      return res.status(400).send("Please enter all the information");
    }

    //find the user in the database
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).send("User not found!");
    }

    //match the password
    const enteredPassword = await bcrypt.compare(password, user.password);
    if (!enteredPassword) {
      return res.status(401).send("Password is incorrect");
    }

    const token = jwt.sign({ id: user._id }, process.env.SECRET_KEY, {
      expiresIn: "1d",
    });
    user.token = token;
    user.password = undefined;

    //store cookies
    const options = {
      expires: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
      httpOnly: true, //only manipulate by server not by client/user
    };

    //send the token
    res.status(200).cookie("token", token, options).json({
      message: "You have successfully logged in!",
      success: true,
      token,
    });
  } catch (error) {
    console.log(error.message);
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
