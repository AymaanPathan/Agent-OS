/* eslint-disable @typescript-eslint/no-explicit-any */

const DEBUG = process.env.DEBUG_WORKFLOW === "true";

export function tlog(title: string, data?: any) {
  if (!DEBUG) return;
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`🟦 ${title}`);
  if (data !== undefined) {
    console.dir(data, { depth: null, colors: true });
  }
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
}

export function tstep(step: string) {
  if (!DEBUG) return;
  console.log(`\n✅ STEP: ${step}`);
}

export function terror(title: string, err: any) {
  if (!DEBUG) return;
  console.log(`\n❌ ERROR: ${title}`);
  console.dir(err, { depth: null, colors: true });
}
