const { spawn } = require('child_process');

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

// Clean up and propagate termination signals
const handleExit = () => {
  console.log('\n👋 Stopping development servers...');
  devProcess.kill('SIGINT');
  process.exit();
};

process.on('SIGINT', handleExit);
process.on('SIGTERM', handleExit);
