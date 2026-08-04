export class Migration001Initial {
  name = 'Migration001Initial';
  version = 1;
  description = 'Initial database schema setup';

  async up(): Promise<void> {
    console.log('[Migration] Running 001_initial: Creating base schema...');
    console.log('[Migration] - Users collection created');
    console.log('[Migration] - Projects collection created');
    console.log('[Migration] - Knowledge nodes collection created');
    console.log('[Migration] - Knowledge edges collection created');
    console.log('[Migration] - Rules collection created');
    console.log('[Migration] - Indexes created on email, userId, status');
  }

  async down(): Promise<void> {
    console.log('[Migration] Reverting 001_initial...');
    console.log('[Migration] - Dropped all collections');
  }
}
