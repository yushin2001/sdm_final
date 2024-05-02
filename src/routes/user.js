const express = require('express');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('../../swagger-output.json');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const mysql = require('mysql');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const session = require('express-session');
require('dotenv').config();

var router = express.Router();
router.use(bodyParser.json());

// const connection = require('../../database');
const User = require('../model/userModel');
const authMiddleware = require('../middlewares/authentication');

// GET routes
router.get("/", getMember);
router.get("/forgetPassword", forgetPassword);
router.get("/emailSend", emailSend)

// POST routes
router.post("/signup", signUp);
router.post("/signin", signIn);
router.post("/resetPassword", resetPassword);

// PUT routes
router.put("/", authMiddleware.authentication, updateMember);
// router.put("/emailVerify", emailVerify);

// DELETE routes
router.delete("/", authMiddleware.authentication, deleteMember);


// Configure the Google strategy for use 
passport.use(new GoogleStrategy({
  clientID: process.env.googleClientID,
  clientSecret: process.env.googleClientSecret,
  callbackURL: "/user/oauth2callback"
},
  async (accessToken, refreshToken, profile, done) => {
    try {
      const user = await User.findOne({ where: { oauthId: profile.id } });
      if (user) {
        return done(null, user);
      } else {
        const newUser = await User.create({
          oauthId: profile.id,
          email: profile.emails[0].value,
          name: profile.displayName,
          oauthProvider: 'google'
        });
        return done(null, newUser);
      }
    } catch (error) {
      return done(error);
    }
  }
));


passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});

router.use(session({
  secret: 'sdm_is_so_fun',
  resave: false,
  saveUninitialized: true
}));

router.use(passport.initialize());
router.use(passport.session());

// Define routes
router.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/oauth2callback',
  passport.authenticate('google', { failureRedirect: '/auth/failure' }),
  (req, res) => {
    res.redirect('/');
  });

router.get('/auth/failure', (req, res) => {
  res.send('Failed to authenticate.');
});

const SECRET_KEY = 'sdm_is_so_fun';

function generateVerificationCode(email) {
  const timestamp = Date.now();
  const data = email;
  const hash = crypto.createHmac('sha256', SECRET_KEY)
    .update(data)
    .digest('hex');
  const code = hash.substring(0, 6); // Take first 6 characters for simplicity
  return { code, timestamp };
}

function isVerificationCodeValid(timestamp) {
  const currentTime = Date.now();
  const codeTimestamp = parseInt(timestamp, 10); // Parse the timestamp
  // Check if the current time is within 10 minutes (600,000 milliseconds) of the code's timestamp
  return (currentTime - codeTimestamp) <= 600000;
}

const transporter = nodemailer.createTransport({
  service: 'gmail',
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.Email,
    pass: process.env.Password
  }
});

// async function signUp(req, res) {
//   try {
//     const { name, email, birthday, gender, password } = req.body;
//     console.log("email", email);
//     console.log("name", name);
//     console.log("birthday", birthday);
//     console.log("gender", gender);
//     console.log("password", password);

//     // Hash password
//     const hashedPassword = await bcrypt.hash(password, 12);

//     // Create user using Sequelize
//     const newUser = await User.create({
//       name: name,
//       email: email,
//       birthday: birthday,
//       gender, gender,
//       password: hashedPassword
//     });

//     console.log(newUser.id); // Assuming 'id' is the auto-generated field for user_id

//     // Create json web token
//     const token = jwt.sign(
//       { userId: newUser.id }, // Use the newly created user's id
//       process.env.JWT_SECRET,
//       { expiresIn: process.env.JWT_EXPIRES_IN } // JWT_EXPIRES_IN is the duration of the token
//     );

//     const code = generateVerificationCode(email);
//     // Example email sending code with nodemailer
//     const transporter = nodemailer.createTransport({
//       service: 'gmail',
//       host: 'smtp.gmail.com',
//       port: 465,
//       secure: true,
//       auth: {
//         user: process.env.Email,
//         pass: process.env.Password
//       }
//     });

//     const mailOptions = {
//       from: process.env.Email,
//       to: email,
//       subject: 'NTUgether Email Verification',
//       text: `Your verification code is: ${code}`
//     };

//     transporter.sendMail(mailOptions, (error, info) => {
//       if (error) {
//         console.log(error);
//         return res.status(500).send('Error sending email');
//       } else {
//         res.send('Verification code sent to your email. Please verify within 10 minutes.');
//         return res.status(201).json({
//           message: 'Member created successfully, verification email sent',
//           token: token, // JWT token
//         });
//       }
//     });


//   } catch (error) {
//     console.log(error);
//     if (error.name === 'SequelizeUniqueConstraintError') {
//       return res.status(409).json({ error: "Email already exists" });
//     }
//     return res.status(500).json({ error: "Internal server error" });
//   }
// }

async function signUp( req, res){
  try {
    const { name, email, birthday, gender, password, code } = req.body;
    console.log("email", email);
    console.log("name", name);
    console.log("birthday", birthday);
    console.log("gender", gender);
    console.log("password", password);
    console.log("code", code);

    const {code: validCode, timestamp} = generateVerificationCode(email);
    console.log("validCode", validCode);
    const isValid = isVerificationCodeValid(timestamp);

    // Use email to generate validCode
    if (code === validCode & isValid) {
      console.log('Email verified successfully');
      
    } else {
      return res.status(401).send('Invalid or expired verification code');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user using Sequelize
    const newUser = await User.create({
      name: name,
      email: email,
      birthday: birthday,
      gender, gender,
      password: hashedPassword
    });

    console.log(newUser.user_id); // Assuming 'id' is the auto-generated field for user_id

    // Create json web token
    const token = jwt.sign(
      { userId: newUser.user_id }, // Use the newly created user's id
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN } // JWT_EXPIRES_IN is the duration of the token
    );

    return res.status(201).json({
      message: 'Member created successfully.',
      token: token, // JWT token
    });

  } catch (error) {
    console.log(error);
    if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(409).json({ error: "Email already exists" });
    }
    return res.status(500).json({ error: "Internal server error" });
  }

}

async function emailSend ( req, res) {
  const { email } = req.query;
  try {
    const user = await User.findOne({ where: { email: email } });

    if (user) {
      return res.status(409).send("Email already exists.");
    } 

    const {code, timestamp} = generateVerificationCode(email);
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: process.env.Email,
        pass: process.env.Password
      }
    });

    const mailOptions = {
      from: process.env.Email,
      to: email,
      subject: 'NTUgether Email Verification',
      text: `Your verification code is: ${code}`
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log(error);
        return res.status(500).send('Error sending email');
      } else {
        res.send('Verification code sent to your email. Please verify within 10 minutes.');
      }
    });

  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: "Internal server error" });
  }

}

// async function emailVerify(req, res) {
//   const { email, code } = req.body;

//   // Re-generate the code based on the current timestamp and compare
//   const validCode = generateVerificationCode(email);
//   console.log("validCode", validCode);
//   console.log("code", code);

//   if (code === validCode) {
//     try {
//       // Use Sequelize to update the verified status for the user
//       const result = await User.update(
//         { verified: true },
//         { where: { email: email } }
//       );

//       if (result[0] > 0) { // result[0] contains the number of affected rows
//         res.send('Email verified successfully');
//       } else {
//         // No rows were updated, which means no user was found with that email
//         res.status(404).send('No user found with that email');
//       }
//     } catch (error) {
//       console.log(error);
//       return res.status(500).send('Error updating user verification status');
//     }
//   } else {
//     res.status(401).send('Invalid or expired verification code');
//   }
// }

async function signIn(req, res) {
  try {
    const { email, password } = req.body; // Extracting email and password from request query
    console.log("email", email);
    console.log("password", password);

    // Use Sequelize to find the user by email
    const user = await User.findOne({
      where: {
        email: email,
      },
      attributes: ['user_id', 'password'], // Select only the user_id and password fields
    });

    if (!user) {
      // If no user found with that email
      console.log("User does not exist");
      return res.status(404).json({ error: "User does not exist" });
    }
    const { user_id: userId, password: hashedPassword } = user;

    // Compare the provided password with the stored hashed password
    const isMatch = await bcrypt.compare(password, hashedPassword);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Passwords match, create JWT token
    const token = jwt.sign(
      { userId: userId },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN } // Use the same JWT expiry as in signUp
    );
    console.log('jwt token', token);

    // Successfully authenticated
    return res.status(200).json({
      message: 'Sign in successfully.',
      jwtToken: token,
    });

  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: "Internal server error during authentication" });
  }
}

async function forgetPassword(req, res) {
  try {
    const { email } = req.query;
    console.log(email);

    const user = await User.findOne({ where: { email: email } });

    if (!user) {
      return res.status(404).send("User not found.");
    }

    const {code, timestamp} = generateVerificationCode(email);

    const mailOptions = {
      from: process.env.Email,
      to: email,
      subject: 'Password Reset Request',
      text: `You have requested to reset your password. Your verification code is: ${code}. Please verify within 10 minute.`
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log(error);
        return res.status(500).send('Error sending email');
      } else {
        return res.status(200).json({
          message: 'You have requested to reset your password. Please verify within 10 minute.',
        });
      }
    });
  } catch (error) {
    console.log(error);
    res.status(500).send('Internal server error');
  }

}

async function resetPassword(req, res) {
  try {
    const { email, code, newPassword } = req.body;

    const user = await User.findOne({ where: { email: email } });
    if (!user) {
      return res.status(404).send('User not found');
    }

    const {code: validCode, timestamp} = generateVerificationCode(email);
    console.log("validCode", validCode);
    const isValid = isVerificationCodeValid(timestamp);

    console.log("validCode", validCode);
    console.log("code", code);
    if (code === validCode & isValid) {
      const hashedPassword = await bcrypt.hash(newPassword, 12);
      const result = await User.update({ password: hashedPassword }, { where: { email: email } });

      if (result[0] > 0) {
        res.send('Password reset successfully');
      } else {
        res.status(404).send('No user found with that email');
      }

    } else {
      res.status(401).send('Invalid or expired verification code');
    }



  } catch (error) {
    console.log(error);
    res.status(500).send('Internal server error');
  }
}


async function getMember(req, res) {
  const { name, email } = req.query;
  console.log("name", name);

  await User.findOne({
    where: {
      name: name,
      email: email
    }
  })
    .then(results => {

      if (results) {
        res.json({ members: results });

      } else {
        res.status(200).send("No member found.");
      }
    })
    .catch(error => {
      console.error("Error querying the database:", error);
      res.status(500).send("Internal Server Error");
    });
}

async function updateMember(req, res) {
  const { name, email, phoneNum, gender, aboutMe} = req.body;
  const user_id = req.user_id;
  const updateFields = {};
    if (name) updateFields.name = name;
    if (email) updateFields.email = email;
    if (phoneNum) updateFields.phoneNum = phoneNum;
    if (gender) updateFields.gender = gender;
    if (aboutMe) updateFields.self_introduction = aboutMe;

  try {
    // Update the user
    const [updatedRows] = await User.update(updateFields, { where: { user_id } });

    if (updatedRows > 0) {
      return res.status(200).send('Member updated successfully');
    } else {
      return res.status(404).send('Please update at least one row.');
    }
  } catch (error) {
    console.error('Error updating member:', error);
    return res.status(500).send('Internal Server Error');
  }
}


// Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjQsImlhdCI6MTcxNDYzNTY5MCwiZXhwIjoxNzE0NjM5MjkwfQ.q8p3_dumY9c-bCfu7aoJ7jlJ0uC7zXoWe8jfDE4KR5c

async function deleteMember(req, res) {
  // const { user_id } = req.body; // Get the id of the member to delete
  const user_id = req.user_id;

  try {
    const affectedRows = await User.destroy({ where: { user_id } });
    if (affectedRows > 0) {
      return res.status(200).send('Member deleted successfully');
    } else {
      return res.status(404).send('Member not found');
    }
  } catch (error) {
    console.log('Error deleting member:', error);
    return res.status(500).send('Internal Server Error');
  }
}

module.exports = router;