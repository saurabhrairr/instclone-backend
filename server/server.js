const express = require("express");
const app = express();
const mongoose = require("mongoose");
const postmodel = require("./model/postschema");
const UserModel = require("./model/userschema");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
require('dotenv').config();

//midaleware
app.use(express.json({ limit: "30mb", extended: true }));
app.use(express.urlencoded({ extended: false }));
app.use(cors());


const crypto = require("crypto");

const secretKey = crypto.randomBytes(32).toString("hex");




app.listen(process.env.PORT || 3082, (err) => {
  if (!err) {
    console.log("servre connect 3082 port");
  } else {
    console.log(err);
  }
});

mongoose.connect(process.env.db, { useNewUrlParser: true, useUnifiedTopology: true }, (err) => {
  if (!err) {
    console.log("connected to Database");
  } else {
    console.log(err);
  }
});

// Signup Route
// Signup Route
app.post("/signup", async (req, res) => {
  try {
    const { email, password } = req.body;
    const existingUser = await UserModel.findOne({ email });

    if (existingUser) {
      return res.status(400).json({ error: "User with this email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
      email,
      password: hashedPassword,
    };

    const savedUser = await UserModel.create(newUser);

    res.status(201).json({ message: "Signup successful", user: savedUser });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});




app.post("/checkUser", async (req, res) => {
  try {
    const { email } = req.body;
    const existingUser = await UserModel.findOne({ email });

    if (existingUser) {
      return res.status(400).json({ error: "User with this email already exists" });
    }

    res.status(200).json({ isUserRegistered: false });
  } catch (error) {
    console.error("Error checking user:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});



app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find the user by email
    const user = await UserModel.findOne({ email });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Compare the provided password with the hashed password in the database
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(401).json({ error: "Invalid password" });
    }

    // Create a JWT token using the constant secret key
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      secretKey,
      {
        expiresIn: "1h", // Token expiration time
      }
    );

    res.status(200).json({ message: "Login successful", token });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});




const authenticateToken = (req, res, next) => {
  const token = req.header('Authorization');

  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  jwt.verify(token, secretKey, (err, user) => {
    if (err) {
      console.error('JWT verification error:', err);
      return res.status(403).json({ error: 'Forbidden' });
    }
    req.user = user;
    next();
  });
}

// Get all users Route
app.get("/users", async (req, res) => {
  try {
    // Fetch all users from the database
    const allUsers = await UserModel.find({}, { password: 0 }); // Exclude the password field from the response

    res.status(200).json({ users: allUsers });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});



app.post("/post", (req, res) => {
  postmodel
    .create({
      name: req.body.name,
      location: req.body.location,
      likes: req.body.likes,
      postimage: req.body.postimage,
      descripation: req.body.descripation,
      date: req.body.date,
      //some change done
    })
    .then(() => {
      res.status(200).send("added successfully");
    })
    .catch((err) => {
      res.status(400).send(err.message);
    });
});


app.put("/updatePost/:postId", async (req, res) => {
  try {
    const postId = req.params.postId;
    const { name, location, likes, postimage, descripation, date } = req.body;

    // Find the post by ID
    const existingPost = await postmodel.findById(postId);

    if (!existingPost) {
      return res.status(404).json({ error: "Post not found" });
    }

    // Update post fields
    existingPost.name = name || existingPost.name;
    existingPost.location = location || existingPost.location;
    existingPost.likes = likes || existingPost.likes;
    existingPost.postimage = postimage || existingPost.postimage;
    existingPost.descripation = descripation || existingPost.descripation;
    existingPost.date = date || existingPost.date;

    // Save the updated post to the database
    const updatedPost = await existingPost.save();

    res.json({ message: "Post updated successfully", post: updatedPost });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});








app.delete("/deletePost/:postId", async (req, res) => {
  try {
    const postId = req.params.postId;

    // Find the post by ID and remove it
    const deletedPost = await postmodel.findByIdAndRemove(postId);

    if (!deletedPost) {
      return res.status(404).json({ error: "Post not found" });
    }

    res.json({ message: "Post deleted successfully", deletedPost });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});
app.get("/post", (req, res) => {
  postmodel
    .find()
    .then((itemData) => {
      res.status(200).send({ item: itemData });
    })
    .catch((err) => {
      res.status(400).send(err.message);
    });
});




app.post("/addComment/:postId", authenticateToken, async (req, res) => {
  try {
    const postId = req.params.postId;
    const { text } = req.body;
    const { email } = req.user; // Get the currently logged-in user's name

    const post = await postmodel.findById(postId);
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    // Add new comment to the post with the logged-in user's name
    post.comments.push({ text, email });
    await post.save();

    res.json(post);
  } catch (error) {
    console.error('Error adding comment', error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});




app.post("/likePost/:postId", authenticateToken, async (req, res) => {
  try {
    const postId = req.params.postId;
    const { email } = req.user; // Get the currently logged-in user's name

    const post = await postmodel.findById(postId);
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    // Check if the user has already liked the post
    if (post.likes.includes(email)) {
      return res.status(400).json({ error: "User has already liked this post" });
    }

    // Add like to the post with the logged-in user's name
    post.likes.push(email);
    await post.save();

    res.json(post);
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

