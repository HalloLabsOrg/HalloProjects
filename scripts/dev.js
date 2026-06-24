const { spawn, execSync } = require('child_process');
const readline = require('readline');
const fs = require('fs');
const path = require('path');

// Force colors in child processes
process.env.FORCE_COLOR = '1';

const killPort = (port) => {
  try {
    // Only target processes actually LISTENING on the port, not client connections (like Chrome)
    const stdout = execSync(`lsof -t -i :${port} -sTCP:LISTEN`).toString().trim();
    if (stdout) {
      const pids = stdout.split('\n').filter(Boolean);
      console.log(`🧹 Port ${port} is in use. Killing listening PID(s): ${pids.join(', ')}`);
      for (const pid of pids) {
        try {
          execSync(`kill -9 ${pid} 2>/dev/null || true`);
        } catch (e) {}
      }
    }
  } catch (e) {}
};

const cleanCaches = () => {
  console.log('🧹 Clearing cache directories (.turbo, .next, and .docusaurus)...');
  const directoriesToClean = [
    path.join(__dirname, '../apps/web/.next'),
    path.join(__dirname, '../apps/docs/.docusaurus'),
    path.join(__dirname, '../.turbo'),
    path.join(__dirname, '../apps/api/.turbo'),
    path.join(__dirname, '../apps/docs/.turbo'),
    path.join(__dirname, '../apps/web/.turbo'),
    path.join(__dirname, '../apps/worker/.turbo'),
    path.join(__dirname, '../packages/sdk/.turbo'),
    path.join(__dirname, '../packages/shared/.turbo'),
    path.join(__dirname, '../packages/templates/.turbo'),
    path.join(__dirname, '../packages/ui/.turbo'),
    path.join(__dirname, '../providers/coolify/.turbo'),
    path.join(__dirname, '../providers/github/.turbo'),
  ];

  for (const dir of directoriesToClean) {
    try {
      if (fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    } catch (e) {}
  }
};

console.log('🧹 Preparing environment: Clearing ports 3000, 3001, 4000, and 4001...');
killPort(3000);
killPort(3001);
killPort(4000);
killPort(4001);

console.log('🐳 Starting local Postgres and Redis database containers...');
try {
  execSync('docker compose -f docker/docker-compose.dev.yml up -d --remove-orphans', {
    stdio: 'inherit',
  });
} catch (err) {
  console.error('❌ Failed to start docker-compose containers:', err.message);
}

console.log('🚀 Starting HALLO Projects development workspace...');

const devProcess = spawn('npx', ['turbo', 'run', 'dev', '--color'], {
  shell: true,
});

// Forward stdin to the dev process
if (process.stdin.isTTY) {
  process.stdin.pipe(devProcess.stdin);
}

// Helper to strip ANSI escape codes
const stripAnsi = (str) =>
  str.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '');

// Regex to match lines that only contain a Turborepo package prefix like "@hallo/web:dev:" with no content
const prefixOnlyRegex = /^[a-zA-Z0-9\-@/]+:[a-zA-Z0-9\-]+:\s*$/;

const shouldFilterLine = (line) => {
  const cleanLine = stripAnsi(line);
  const trimmed = cleanLine.trim();
  if (!trimmed) return true;

  // Filter out pnpm/turbo lifecycle and shutdown noise
  if (cleanLine.includes('ELIFECYCLE')) return true;
  if (cleanLine.includes('Tasks:') && cleanLine.includes('successful')) return true;
  if (cleanLine.includes('Cached:') && cleanLine.includes('cached')) return true;
  if (trimmed.includes('Time:') && (trimmed.includes('s') || trimmed.includes('ms'))) return true;
  if (cleanLine.includes('>>> FULL TURBO')) return true;
  if (cleanLine.includes('Finishing writing to cache')) return true;
  if (cleanLine.includes('Shutting down Turborepo tasks')) return true;

  // Filter out prefix-only lines
  if (prefixOnlyRegex.test(trimmed)) return true;

  return false;
};

// Read and filter stdout line-by-line
const rlOut = readline.createInterface({
  input: devProcess.stdout,
  terminal: false,
});
rlOut.on('line', (line) => {
  if (!shouldFilterLine(line)) {
    process.stdout.write(line + '\n');
  }
});

// Read and filter stderr line-by-line
const rlErr = readline.createInterface({
  input: devProcess.stderr,
  terminal: false,
});
rlErr.on('line', (line) => {
  if (!shouldFilterLine(line)) {
    process.stderr.write(line + '\n');
  }
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

  console.log('\n🧹 Cleaning up ports 3000, 3001, 4000, and 4001...');
  killPort(3000);
  killPort(3001);
  killPort(4000);
  killPort(4001);

  console.log('🐳 Stopping database containers...');
  try {
    execSync('docker compose -f docker/docker-compose.dev.yml down', { stdio: 'inherit' });
  } catch (err) {
    console.error('❌ Failed to stop docker-compose containers:', err.message);
  }

  // Clean all build/development caches
  cleanCaches();
};

// When devProcess's stdio streams are fully closed, perform cleanup and exit
devProcess.on('close', (code) => {
  cleanup();
  // Exit with 0 if interrupted by user
  const exitCode = code === 130 || code === 1 || code === 143 || code === null ? 0 : code;
  process.exit(exitCode);
});

// If the parent process receives SIGINT or SIGTERM, we don't exit immediately;
// instead, we let the child process handle it, which will trigger the 'close' event.
process.on('SIGINT', () => {
  // Let devProcess exit first, which will trigger the close listener above.
});

process.on('SIGTERM', () => {
  try {
    devProcess.kill('SIGTERM');
  } catch (e) {}
});
