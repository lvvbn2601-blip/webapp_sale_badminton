import mongoose from 'mongoose';
import { env } from './config/env';
import { User } from './models/User';
import { CustomerBehavior } from './models/CustomerBehavior';
import { v4 as uuidv4 } from 'uuid';

async function seedBehaviors() {
  await mongoose.connect(env.mongoUri);
  console.log('Connected to DB');

  const users = await User.find({});
  if (users.length === 0) {
    console.log('No users found to seed behaviors for.');
    process.exit(0);
  }

  console.log(`Found ${users.length} users. Clearing existing behaviors...`);
  await CustomerBehavior.deleteMany({});

  const segments = [
    'Potential Newcomers',
    'Brand Enthusiasts',
    'Professional Customers',
    'Hesitant Customers',
    'About to leave'
  ];

  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    const segment = segments[i % segments.length];
    
    let behaviorScore = 0;
    let rfmScore = { recency: Date.now(), frequency: 0, monetary: 0 };
    let brandAffinities = new Map<string, number>();
    let categoryAffinities = new Map<string, number>();
    let cartAbandonment = { isAbandoned: false, lastAddedAt: new Date(), notified30Min: false, notified2Hour: false };
    let lastActive = new Date();

    if (segment === 'Potential Newcomers') {
      behaviorScore = 40;
      rfmScore = { recency: Date.now(), frequency: 5, monetary: 50000 };
      categoryAffinities.set('Accessories', 25);
      categoryAffinities.set('Grip Wraps', 15);
    } else if (segment === 'Brand Enthusiasts') {
      behaviorScore = 80;
      rfmScore = { recency: Date.now(), frequency: 12, monetary: 2000000 };
      brandAffinities.set('Yonex', 60); // 75% affinity
      brandAffinities.set('Victor', 20);
    } else if (segment === 'Professional Customers') {
      behaviorScore = 150;
      rfmScore = { recency: Date.now(), frequency: 20, monetary: 15000000 };
      categoryAffinities.set('Rackets', 100);
      categoryAffinities.set('Shoes', 30);
    } else if (segment === 'Hesitant Customers') {
      behaviorScore = 15;
      rfmScore = { recency: Date.now(), frequency: 2, monetary: 0 };
      cartAbandonment = { isAbandoned: true, lastAddedAt: new Date(Date.now() - 3600 * 1000), notified30Min: true, notified2Hour: false };
    } else if (segment === 'About to leave') {
      behaviorScore = 10;
      lastActive = new Date(Date.now() - 20 * 24 * 3600 * 1000); // 20 days ago
      rfmScore = { recency: lastActive.getTime(), frequency: 1, monetary: 0 };
    }

    const behavior = new CustomerBehavior({
      userId: user._id,
      sessionId: uuidv4(),
      rfmScore,
      behaviorScore,
      segment,
      brandAffinities,
      categoryAffinities,
      lastActive,
      cartAbandonment,
      firstTimePurchaseTriggered: true,
    });

    await behavior.save();
    console.log(`Created behavior for ${user.email} -> ${segment}`);
  }

  console.log('Seeding complete!');
  process.exit(0);
}

seedBehaviors().catch(err => {
  console.error(err);
  process.exit(1);
});
