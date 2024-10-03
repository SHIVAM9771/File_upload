const express = require("express");
const fs = require("fs");
const path = require("path");
const fileUpload = require("express-fileupload");
const session = require("express-session");
const bodyParser = require("body-parser");

const app = express();
const uploadsDir = path.join(__dirname, "uploads");

// Middleware
app.use(express.static("public"));
app.use(fileUpload());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true })); // Add this line for form data handling
app.use(session({
    secret: "your_secret_key", // Change this to a secure random string
    resave: false,
    saveUninitialized: true,
}));

// Middleware to check if user is authenticated
function isAuthenticated(req, res, next) {
    if (req.session.isAuthenticated) {
        return next();
    }
    res.redirect("/login");
}

// Serve login page
app.get("/login", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "login.html"));
});

// Handle login
app.post("/login", (req, res) => {
    const { username, password } = req.body;
    // Replace with your own authentication logic
    if (username === "admin" && password === "password") {
        req.session.isAuthenticated = true;
        return res.redirect("/manage");
    } else {
        return res.redirect("/login?error=1");
    }
});

// Serve the index page
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Upload files
app.post("/upload",(req, res) => {
    if (!req.files || Object.keys(req.files).length === 0) {
        return res.status(400).send("No files were uploaded.");
    }

    const uploadedFiles = Array.isArray(req.files.files) ? req.files.files : [req.files.files];

    // Ensure the uploads directory exists
    if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Process each file upload
    const uploadPromises = uploadedFiles.map(file => {
        return new Promise((resolve, reject) => {
            const uploadPath = path.join(uploadsDir, file.name);
            file.mv(uploadPath, err => {
                if (err) {
                    return reject(err);
                }
                resolve();
            });
        });
    });

    Promise.all(uploadPromises)
        .then(() => res.send("Files uploaded successfully!"))
        .catch(err => res.status(500).send("Error uploading files: " + err.message));
});


// Get list of uploaded files
app.get("/files", isAuthenticated, (req, res) => {
    fs.readdir(uploadsDir, (err, files) => {
        if (err) {
            return res.status(500).send("Error reading files.");
        }
        res.json(files); // Return list of files as JSON
    });
});

// Rename file
app.post("/files/:filename/rename", isAuthenticated, (req, res) => {
    const oldName = req.params.filename;
    const newName = req.body.newName;

    const oldPath = path.join(uploadsDir, oldName);
    const newPath = path.join(uploadsDir, newName);

    fs.rename(oldPath, newPath, (err) => {
        if (err) {
            return res.status(500).send("Error renaming file.");
        }
        res.sendStatus(200); // Send OK status
    });
});

// Delete file
app.delete("/files/:filename", isAuthenticated, (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(uploadsDir, filename);
    
    fs.unlink(filePath, (err) => {
        if (err) {
            return res.status(500).send("Error deleting file.");
        }
        res.sendStatus(200); // Send OK status
    });
});

// Logout
app.get("/logout", (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).send("Error logging out.");
        }
        res.redirect("/login"); // Redirect to login page
    });
});

// Serve the manage page
app.get("/manage", isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, "public", "manage.html"));
});

// Start the server
app.listen(3000, () => {
    console.log("Server is running on http://localhost:3000");
});
