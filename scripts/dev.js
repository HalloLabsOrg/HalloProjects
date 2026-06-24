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

const cleanup = () => {
  if (isExiting) return;
  isExiting = true;

  console.log('\n🐳 Stopping database containers...');
  try {
    execSync('docker compose -f docker/docker-compose.dev.yml down', { stdio: 'inherit' });
  } catch (err) {
    console.error('❌ Failed to stop docker-compose containers:', err.message);
  }
};

// When devProcess exits, perform cleanup and exit the parent process
devProcess.on('exit', (code) => {
  cleanup();
  process.exit(code || 0);
});

// If the parent process receives SIGINT or SIGTERM, we don't exit immediately;
// instead, we let the child process handle it, which will trigger the 'exit' event.
process.on('SIGINT', () => {
  // Let devProcess exit first, which will trigger the exit listener above.
});

process.on('SIGTERM', () => {
  try {
    devProcess.kill('SIGTERM');
  } catch (e) {}
});
