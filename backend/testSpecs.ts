import mongoose from 'mongoose';
import { env } from './src/config/env';
import { Product } from './src/models/Product';

async function run() {
  await mongoose.connect(env.mongoUri);
  const ps = await Product.find({'specs': { $ne: {} }}).limit(10);
  ps.forEach(p => console.log(p.name, p.specs));
  process.exit(0);
}
run();
