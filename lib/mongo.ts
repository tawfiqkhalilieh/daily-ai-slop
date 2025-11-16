import { MongoClient } from "mongodb";

const uri = 'mongodb+srv://tawcoding_db_user:taw@cluster0.6if7z2g.mongodb.net/?appName=Cluster0';

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

if (!(global as any)._mongoClientPromise) {
  client = new MongoClient(uri);
  (global as any)._mongoClientPromise = client.connect();
}

clientPromise = (global as any)._mongoClientPromise;

export default clientPromise;

