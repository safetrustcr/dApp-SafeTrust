import { spawnSync } from 'node:child_process';

const result =
  process.platform === 'win32'
    ? spawnSync('cmd.exe', ['/c', 'pnpm', '--filter', '@safetrust/web', 'build'], {
        stdio: 'inherit',
      })
    : spawnSync('pnpm', ['--filter', '@safetrust/web', 'build'], {
        stdio: 'inherit',
      });

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 0);
