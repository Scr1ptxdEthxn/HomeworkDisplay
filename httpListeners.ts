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

app.use("/y11", express.static(path.join(process.cwd(), "Homeworks/y11")));
app.use("/y10", express.static(path.join(process.cwd(), "Homeworks/y10")))

app.get("/cs", (req, res) => {
  if (req.query.recent != undefined) {
    const folderPath = path.join(process.cwd(), "Homeworks/y11/Computer Science");

    const files = fs.readdirSync(folderPath);

    const numberedFiles = files
      .map(file => {
        // Match "Year 11 Interleaved <number>.pdf"
        const match = file.match(/^Year 11 Interleaved (\d+)\.pdf$/);
        if (match) return { file, num: parseInt(match[1], 10) };
        return null;
      })
      .filter(Boolean) as { file: string; num: number }[];

    if (numberedFiles.length === 0) {
      return res.status(404).send("No files found");
    }

    const latestFile = numberedFiles.reduce((prev, current) =>
      current.num > prev.num ? current : prev
    );

    res.sendFile(path.join(folderPath, latestFile.file));
  }
})

app.get("/", (req, res) => {
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
