const express = require("express");
const Bundler = require("parcel-bundler");

// Create express app
const app = express();

// Body parser for push requests
app.use(express.urlencoded({ extended: false }));

// Use parcel bundler
const file = "index.html";
const options = {};
const bundler = new Bundler(file, options);
app.use(bundler.middleware());

// Detect 404 request
app.get("*", (req, res) => {
  const result = `${req.protocol}://${req.get("host")}${req.originalUrl}`;
  res.status(404);
  res.end(`Cannot GET ${result}`);
});

// Use server on port
const port = 1234;
app.listen(port, () => console.log(`Listening at http://localhost:${port}`));
