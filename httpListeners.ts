import express from "express";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import * as path from "path";
import fs from "fs";
import dotenv from "dotenv";
import { QuickDB } from "quick.db";
import * as crypto from "crypto";
const db = new QuickDB()


dotenv.config();
const app = express();
const PORT = 8451;

app.use(bodyParser.json());
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: false }));

app.use("/y11", express.static(path.join(process.cwd(), "Homeworks/y11")));
app.use("/y10", express.static(path.join(process.cwd(), "Homeworks/y10")))

app.post("/submit-form", async (req, res) => {
  let passwords = await db.get("passwords") as {user: string, pass: string, expiry: number, token: string}[] || []
  if (passwords.some(entry => entry.pass === req.body.password)) {
    res.cookie("Authorization", passwords.filter(e => e.pass === req.body.password)[0].token, {
      maxAge: passwords.filter(e => e.pass === req.body.password)[0].expiry - Date.now(),
      httpOnly: true,
      secure: true,
      sameSite: "strict"
    });
    return res.sendStatus(200);
  } else {
    return res.status(403).json({ message: "Unauth" });
  }
})

async function generateUniquePassword() {
    let attempts = 0;
    let byteSize = 12; // smaller than 32, since we just need a password
    while (true) {
        const pass = crypto.randomBytes(byteSize).toString("hex");

        const passwords = await db.get("passwords") as {user: string, pass:string, expiry: number}[] || [];

        // check if any existing user already has this password
        const exists = passwords.some(entry => entry.pass === pass);

        if (!exists) return pass;

        attempts++;
        if (attempts % 10 === 0) {
            byteSize *= 2; // increase randomness if collisions ever occur
        }
    }
}

app.post("/password-generate", async (req, res) => {
  if (req.headers.authorization == "xX4tV9pLz2mQe8Rj0BfYcTwUs") {
    if (!req.body.name) return res.status(400).json({ message: "name not supplied" })
    if (!req.body.duration || req.body.duration == 0) {res.status(201); req.body.duration = 9999999999}
    const pass = await generateUniquePassword();
    if (!db.get("passwords")) await db.set("passwords", [])
    await db.push("passwords", {user: req.body.name, pass: pass, expiry: Date.now() + (req.body.duration * 1000), token: crypto.randomBytes(32).toString("hex")})
    return res.json(pass)
  }
  else return res.status(403).json({message: "Unauthorized"})
})

app.get("/cs", async (req, res) => {
  let passwords = await db.get("passwords") as {token: string, expiry: number}[] || []
  console.log(passwords.filter(ent => ent.token === req.cookies.Authorization)[0]?.expiry)
  if (passwords.filter(ent => ent.token === req.cookies.Authorization)[0]?.expiry < Date.now()) res.clearCookie("Authorization") 
  if (!passwords.some(ent => ent.token === req.cookies.Authorization)) return res.sendFile(path.resolve("enterPassword.html"))
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

app.get("/", async (req, res) => {
  let passwords = await db.get("passwords") as {token: string, expiry: number}[] || []
  if (passwords.filter(ent => ent.token === req.cookies.Authorization)[0]?.expiry < Date.now()) res.clearCookie("Authorization") 
  if (!passwords.some(ent => ent.token === req.cookies.Authorization)) return res.sendFile(path.resolve("enterPassword.html"))
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
