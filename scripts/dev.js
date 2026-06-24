const { spawn, execSync } = require('child_process');

console.log('🐳 Starting local Postgres and Redis database containers...');
try {
  execSync('docker compose -f docker/docker-compose.dev.yml up -d --remove-orphans', {
    stdio: 'inherit',
  });
} catch (err) {
  console.error('❌ Failed to start docker-compose containers:', err.message);
}

console.log('🚀 Starting HALLO Projects development workspace...');

const devProcess = spawn('npx', ['turbo', 'run', 'dev'], {
  stdio: 'inherit',
  shell: true,
});

// Open browser tabs after the dev servers have initialized (approx. 4 seconds)
setTimeout(() => {
  console.log('\n🌐 Opening main application (http://localhost:3000)...');
  spawn('open', ['http://localhost:3000'], { shell: true });

  console.log('📚 Opening documentation (http://localhost:3001/HalloProjects/)...\n');
  spawn('open', ['http://localhost:3001/HalloProjects/'], { shell: true });
}, 4000);

let isExiting = false;
// Clean up and propagate termination signals
const handleExit = () => {
  if (isExiting) return;
  isExiting = true;

  console.log('\n👋 Stopping development servers...');
  try {
    devProcess.kill('SIGINT');
  } catch (e) {}

  console.log('🐳 Stopping database containers...');
  try {
    execSync('docker compose -f docker/docker-compose.dev.yml down', { stdio: 'inherit' });
  } catch (err) {
    console.error('❌ Failed to stop docker-compose containers:', err.message);
  }

  process.exit();
};

devProcess.on('exit', handleExit);
process.on('SIGINT', handleExit);
process.on('SIGTERM', handleExit);
process.on('exit', handleExit);
