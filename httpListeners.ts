import express from "express";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import * as path from "path";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();
const app = express();
const PORT = 8451;

app.use(bodyParser.json());
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: false }));

app.use("/y11", express.static(path.join(process.cwd(), "Homeworks/y11")));
app.use("/y10", express.static(path.join(process.cwd(), "Homeworks/y10")))

app.post("/submit-form", (req, res) => {
  if (req.body.password === "Ethan1808") {
    res.cookie('Authorisation', 'cheese', {
      maxAge: 1000 * 60 * 15, // Expires in 15 minutes
      httpOnly: true, // Accessible only by the server
      secure: true, // Sent only over HTTPS
      sameSite: 'strict' // Prevents CSRF attacks
    });
  }
  else {
    return res.json({status: 403, message:"Unauth"})
  }
})

app.get("/cs", (req, res) => {
if (req.cookies.Authorisation != "cheese") return res.send(`<!DOCTYPE html>
<html lang="en">
<body>

<form action="/submit-form" method="post">
  <label for="password">Enter your password:</label>
  <input type="password" id="password" name="password" placeholder="Enter your secure password" required>
  <input type="submit" value="Submit">
</form>

</body>
</html>`)
if (req.query.recent != undefined) {
  const folderPath = path.join(process.cwd(), "Homeworks/y11/Computer Science");

  const files = fs.readdirSync(folderPath);

  const numberedFiles = files
    .map(file => {
      // Match both marked and unmarked variants
      const match = file.match(/^Year 11 Interleaved (\d+)( - Marked)?\.pdf$/);
      if (match) {
        return {
          file,
          num: parseInt(match[1], 10),
          marked: !!match[2],
        };
      }
      return null;
    })
    .filter(Boolean) as { file: string; num: number; marked: boolean }[];

  if (numberedFiles.length === 0) {
    return res.status(404).send("No files found");
  }

  // Sort by:
  // 1. Higher number first
  // 2. Marked before unmarked (for same number)
  numberedFiles.sort((a, b) => {
    if (b.num !== a.num) return b.num - a.num;
    return Number(b.marked) - Number(a.marked);
  });

  const latestFile = numberedFiles[0];
  res.sendFile(path.join(folderPath, latestFile.file));
}

})

app.get("/", (req, res) => {
  if (req.cookies.Authorisation != "cheese") return res.send(`<!DOCTYPE html>
<html lang="en">
<body>

<form action="/submit-form" method="post">
  <label for="password">Enter your password:</label>
  <input type="password" id="password" name="password" placeholder="Enter your secure password" required>
  <input type="submit" value="Submit">
</form>

</body>
</html>`)
  const y10dir = path.join("Homeworks", "y10");
  const baseDir = path.join("Homeworks", "y11");
  let html = "<h1>Year 10</h1>";

  let subjects = fs.readdirSync(y10dir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

  for (const subject of subjects) {
    html += `<h2>${subject}</h2>`;

    const files = fs.readdirSync(path.join(y10dir, subject));
    for (const f of files) {
      const display = path.parse(f).name;
      html += `<a href="/y10/${subject}/${f}">${display}</a><br>`;
    }
  }

  subjects = fs.readdirSync(baseDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

  html += "<h1>Year 11</h1>";

  for (const subject of subjects) {
    html += `<h2>${subject}</h2>`;

    const files = fs.readdirSync(path.join(baseDir, subject));
    for (const f of files) {
      const display = path.parse(f).name;
      html += `<a href="/y11/${subject}/${f}">${display}</a><br>`;
    }
  }

  res.send(html);
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
