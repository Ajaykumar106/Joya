import { NextResponse } from 'next/server';
import os from 'os';

function getCpuInfo() {
  const cpus = os.cpus();
  let idle = 0;
  let total = 0;

  for (const cpu of cpus) {
    for (const type in cpu.times) {
      total += cpu.times[type as keyof typeof cpu.times];
    }
    idle += cpu.times.idle;
  }

  return { idle, total };
}

function getCpuUsage(): Promise<number> {
  return new Promise((resolve) => {
    const start = getCpuInfo();

    setTimeout(() => {
      const end = getCpuInfo();

      const idleDifference = end.idle - start.idle;
      const totalDifference = end.total - start.total;

      if (totalDifference === 0) {
        resolve(0);
        return;
      }

      const percentageCpu = 100 - ~~(100 * idleDifference / totalDifference);
      resolve(percentageCpu);
    }, 100);
  });
}

function formatUptime(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}

export async function GET() {
  try {
    const cpuUsage = await getCpuUsage();
    
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const ramUsage = Math.round(((totalMem - freeMem) / totalMem) * 100);
    
    const uptime = formatUptime(os.uptime());
    
    const platform = os.platform();

    return NextResponse.json({
      cpu: cpuUsage,
      ram: ramUsage,
      uptime: uptime,
      platform: platform
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to retrieve system stats' },
      { status: 500 }
    );
  }
}
