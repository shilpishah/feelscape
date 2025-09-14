// app/api/run-python/route.ts
import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import path from "path";

export const runtime = "nodejs"; // important: allow Node JS modules

export async function POST(req: NextRequest) {
  try {
    // Optionally, read data from request body
    const body = await req.json();
    // const { someParam } = body;

    // Run Python script
    const pythonScriptPath = path.join(process.cwd(), "test.py");
    console.log(pythonScriptPath);
    const command = `python3 ${pythonScriptPath}`;
    console.log(command)
    const output = await new Promise<string>((resolve, reject) => {
      exec(command, (error, stdout, stderr) => {
        if (error) return reject(stderr || error.message);
        resolve(stdout);
      });
    });
    console.log(output);

    return NextResponse.json({ success: true, output });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : err },
      { status: 500 }
    );
  }
}
