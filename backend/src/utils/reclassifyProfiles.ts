import mongoose from 'mongoose';
import { env } from '../config/env';
import { CustomerBehavior } from '../models/CustomerBehavior';
import { segmentationService } from '../services/segmentationService';

async function reclassifyProfiles() {
  await mongoose.connect(env.mongoUri);
  console.log('Connected to DB');

  // Find all profiles that are unclassified or missing behavioralProfile
  const profiles = await CustomerBehavior.find({
    $or: [
      { behavioralProfile: 'unclassified' },
      { behavioralProfile: { $exists: false } },
    ],
  });

  console.log(`Found ${profiles.length} unclassified/missing profiles`);

  let reclassifiedCount = 0;
  for (const p of profiles) {
    const oldProfile = p.behavioralProfile || 'undefined';
    await segmentationService.recalculateSegment(p);
    await p.save();

    const changed = oldProfile !== p.behavioralProfile;
    if (changed) reclassifiedCount++;

    console.log(
      `  ${changed ? '✅' : '⬜'} session=${p.sessionId?.substring(0, 12)} ` +
      `userId=${p.userId || 'none'} ` +
      `${oldProfile} → ${p.behavioralProfile} ` +
      `(bScore=${Math.round(p.behaviorScore || 0)}, engagement=${Math.round(p.engagementScore || 0)})`
    );
  }

  console.log(`\nDone! Reclassified ${reclassifiedCount}/${profiles.length} profiles.`);

  // Print final distribution
  const all = await CustomerBehavior.find({}).select('behavioralProfile').lean();
  const dist: Record<string, number> = {};
  for (const a of all) {
    const key = a.behavioralProfile || 'undefined';
    dist[key] = (dist[key] || 0) + 1;
  }
  console.log('\n=== Final Profile Distribution ===');
  console.log(JSON.stringify(dist, null, 2));

  process.exit(0);
}

reclassifyProfiles().catch(err => {
  console.error(err);
  process.exit(1);
});
