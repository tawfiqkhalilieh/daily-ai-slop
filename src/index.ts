import { GoogleGenAI } from "@google/genai";
import express from 'express';
import cors from 'cors';
import { join } from "path";
import ejs from "ejs";
// import { loadEnvFile} from 'node:process';
import { MongoClient, ServerApiVersion, ObjectId } from 'mongodb';
import schedule from 'node-schedule'
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
export const __dirname = path.dirname(__filename);

// if (!process.env.DATABASE_URL) {
//   loadEnvFile();
// } else {
//   // vercel loads env  
// }

const app = express();
// const PORT = process.env.PORT || 3000;

const uri = process.env.DATABASE_URL;

if (!uri) {
  throw new Error("DATABASE_URL");
}
// async function run() {
//   try {
//     await client.connect();
//     await client.db("blogs").command({ ping: 1 });
//     console.log("connected to db!");
//   } catch (e) {
//     throw e;
//   }
// }

// run().catch(console.dir);

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.engine("html", ejs.renderFile);
app.set('view engine', 'html');

const insertBlog = async (blog: {
  title: string,
  excerpt: string,
  date: string,
  read_time: string,
  content: string
}) => {


  const client = await new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    }
  });


  await client.db("blogs").collection('inventory').insertOne({
    title: blog.title,
    excerpt: blog.excerpt,
    date: blog.date,
    read_time: blog.read_time,
    content: blog.content,
  });
}

if (!process.env.GOOGLE_API_KEY) {
  throw new Error("GOOGLE_API_KEY");
}

const ai = new GoogleGenAI({
  apiKey: process.env.GOOGLE_API_KEY,
});

const generate_article = async () => {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: "You're an expert tech blogger. Choose a Tech topic, a language/frameowrk/design pattern, Write a detailed article about it in a human-like format. Include code snippets where relevant. The article should be at least 700 words long. the output should be in markdown format. in a valid json object with the keys: title, excerpt, date, read_time, content, respond with the json object only, no need for the formatting ```json and ```.",
    config: {
      temperature: 0.2,
    },
  });

  if (!response.text) {
    console.error("No response text received from AI model.");
    return;
  }

  let text = response.text.trim();

  text = text
    .trim()
    .replace(/^```[a-zA-Z]*\s*/, "")
    .replace(/```$/, "");

  const article = JSON.parse(text);

  //   console.log(
  //     {
  //       title: article.title,
  //       excerpt: article.excerpt,
  //       date: article.date,
  //       read_time: article.read_time,

  //     }
  //   );

  insertBlog({
    title: article.title,
    excerpt: article.excerpt,
    date: article.date,
    read_time: article.read_time,
    content: article.content,
  });

}

app.use(
  cors({
    origin: "*",
    optionsSuccessStatus: 200,
  })
);

app.set("views", join(__dirname, "/public/views"));

app.get('/styles.css', (_, res) => {
  res.sendFile("src/public/views/style.css", { root: '.' });
});


app.get("/articles", async (_, res) => {


  const client = await new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    }
  });


  await client.db("blogs").collection('inventory').find().toArray().then((articles) => {
    res.json(articles.map((article) => ({
      id: article._id.toString(),
      title: article.title,
      excerpt: article.excerpt,
      date: article.date,
      read_time: article.read_time,
    })));
  }).catch((err) => {
    console.error(err);
    res.status(500).send("Internal Server Error");
  });
});

app.get("/", async (_, res) => {
  res.render("index.html");
});

app.get("/article/:id", async (req, res) => {
  // @ts-ignore
  const id = req.params.id;

  if (!id) {
    return res.status(404).send("Article ID is required");
  }


  const client = await new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    }
  });


  await client.db("blogs").collection('inventory').findOne({ _id: new ObjectId(id) }).then((article) => {
    if (!article) {
      return res.status(404).send("Article not found");
    }

    res.render("article.html", {
      title: article.title,
      excerpt: article.excerpt,
      date: article.date,
      read_time: article.read_time,
      content: article.content
    });
  }).catch((err) => {
    console.error(err);
    res.status(500).send("Internal Server Error");
  });
});


// app.listen(PORT, () => {
//   console.log(`Server is running on port ${PORT}`);
// });

schedule.scheduleJob('0 0 * * *', () => {
  generate_article().catch(console.error);
});

export default app
