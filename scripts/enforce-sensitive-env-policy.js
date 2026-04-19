#!/usr/bin/env node

const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
const TEAM_ID = process.env.VERCEL_TEAM_ID;

if (!VERCEL_TOKEN) {
  console.error('Error: VERCEL_TOKEN environment variable is required');
  console.error('Set it with: export VERCEL_TOKEN=your_token');
  process.exit(1);
}

if (!TEAM_ID) {
  console.error('Error: VERCEL_TEAM_ID environment variable is required');
  console.error('Set it with: export VERCEL_TEAM_ID=your_team_id');
  process.exit(1);
}

async function enforceSensitiveEnvPolicy() {
  const response = await fetch(`https://api.vercel.com/v6/teams/${TEAM_ID}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${VERCEL_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sensitiveEnvironmentVariablePolicy: 'on',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error(`Failed to update team settings: ${response.status} ${error}`);
    process.exit(1);
  }

  const data = await response.json();
  console.log('Successfully enforced sensitive environment variable policy');
  console.log('Response:', JSON.stringify(data, null, 2));
}

enforceSensitiveEnvPolicy();
