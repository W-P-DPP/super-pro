const { execFileSync } = require('child_process');

function resolvePort() {
  const envPort = process.env.npm_config_port;
  if (envPort) {
    return envPort;
  }

  const argPort = process.argv
    .slice(2)
    .find((item) => item.startsWith('--port='));
  if (argPort) {
    return argPort.split('=')[1];
  }

  const positionalPort = process.argv.slice(2).find((item) => /^\d+$/.test(item));
  return positionalPort || '';
}

function validatePort(port) {
  const normalized = Number(port);
  if (!Number.isInteger(normalized) || normalized <= 0 || normalized > 65535) {
    throw new Error('Port must be an integer between 1 and 65535.');
  }

  return String(normalized);
}

function getOwningPidsByPort(port) {
  const script =
    `Get-NetTCPConnection -LocalPort ${port} -ErrorAction SilentlyContinue | ` +
    'Select-Object -ExpandProperty OwningProcess -Unique';

  try {
    const output = execFileSync('powershell', ['-NoProfile', '-Command', script], {
      encoding: 'utf8',
    }).trim();

    return [...new Set(output.split(/\r?\n/).map((line) => line.trim()).filter(Boolean))];
  } catch (error) {
    if (error && error.status === 1) {
      return [];
    }

    throw error;
  }
}

function killPid(pid) {
  execFileSync('taskkill', ['/F', '/PID', pid], {
    stdio: 'inherit',
  });
}

function main() {
  if (process.platform !== 'win32') {
    throw new Error('This script only supports Windows.');
  }

  const rawPort = resolvePort();
  if (!rawPort) {
    throw new Error('Usage: pnpm run kill:port -- --port=3000');
  }

  const port = validatePort(rawPort);
  const pids = getOwningPidsByPort(port);

  if (pids.length === 0) {
    console.log(`No process found on port ${port}`);
    return;
  }

  for (const pid of pids) {
    killPid(pid);
    console.log(`Killed PID ${pid} on port ${port}`);
  }
}

main();
